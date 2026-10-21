/** Deterministic owned-provider races for admin MFA reset.
 *
 * Advisory-lock triggers are test instrumentation only. They stop native GoTrue
 * transactions at an observed database boundary; timeouts detect deadlocks but
 * never decide who won a race.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { AuthClient } from "@supabase/supabase-js";
import { makePersona } from "../lib/persona.mjs";
import { totp } from "../lib/totp";

const authTarget = new URL(process.env.MATRX_MFA_AUTH_URL ?? "http://refused.invalid");
const dbTarget = new URL(process.env.MATRX_MFA_DB_URL ?? "postgres://refused.invalid/no");
assert.equal(authTarget.hostname, "127.0.0.1");
assert.equal(authTarget.protocol, "http:");
assert.ok(authTarget.port);
assert.equal(dbTarget.hostname, "127.0.0.1");
assert.equal(dbTarget.protocol, "postgres:");
assert.ok(dbTarget.port);
assert.equal(dbTarget.pathname, "/casa_mfa_reset", "Requires the explicitly owned disposable database");

const migration = "migrations/campaign/20261021204916_admin_mfa_reset_revokes_sessions.sql";
const db = new pg.Client({ connectionString: dbTarget.href, application_name: "casa-race-control" });
const authClients: Array<InstanceType<typeof AuthClient>> = [];
const ownedUsers: string[] = [];
let checks = 0;
const check = (condition: unknown, message: string) => {
  assert.ok(condition, message);
  checks++;
  console.log(`PASS ${message}`);
};
const authClient = () => {
  const value = new AuthClient({ url: authTarget.origin, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
  authClients.push(value);
  return value;
};
const pause = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const bounded = async <T>(promise: Promise<T>, label: string, milliseconds = 12_000) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds))]);
const scalar = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows[0];

function sessionId(accessToken: string) {
  const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8")) as { session_id?: string };
  assert.ok(payload.session_id, "provider access token carries session_id");
  return payload.session_id;
}

async function waitFor(label: string, probe: () => Promise<boolean>, milliseconds = 8_000) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (await probe()) return;
    await pause(10);
  }
  throw new Error(`${label} was not observed`);
}

async function waitForApplication(applicationName: string, waitEventType: string) {
  await waitFor(`${applicationName} ${waitEventType} wait`, async () => {
    const row = await scalar(
      `select exists(select 1 from pg_stat_activity
        where datname=current_database() and application_name=$1
          and (($2='AdvisoryLock' and wait_event='advisory') or wait_event_type=$2)) as yes`,
      [applicationName, waitEventType],
    );
    return row.yes;
  });
}

async function waitForProviderLock(fragment: string) {
  await waitFor(`native provider lock containing ${fragment}`, async () => {
    const row = await scalar(
      `select exists(
         select 1 from pg_stat_activity
          where datname=current_database()
            and pid <> pg_backend_pid()
            and application_name not like 'casa-%'
            and wait_event_type='Lock'
            and query ilike $1
       ) as yes`,
      [`%${fragment}%`],
    );
    return row.yes;
  });
}

async function nativeRefresh(refreshToken: string) {
  const response = await fetch(`${authTarget.origin}/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const body = await response.json().catch(() => ({})) as { refresh_token?: string };
  return { ok: response.ok, status: response.status, refreshToken: body.refresh_token };
}

async function createPerson() {
  const persona = await makePersona();
  const password = randomBytes(24).toString("base64url");
  const auth = authClient();
  const result = await auth.signUp({ email: persona.email, password, options: { data: { full_name: persona.fullName } } });
  if (result.error) throw result.error;
  assert.ok(result.data.user && result.data.session);
  ownedUsers.push(result.data.user.id);
  await db.query("insert into iam.users(id) values($1) on conflict do nothing", [result.data.user.id]);
  return { uid: result.data.user.id, email: persona.email, password, auth };
}

async function withFactor(person: Awaited<ReturnType<typeof createPerson>>) {
  const enrolled = await person.auth.mfa.enroll({ factorType: "totp", friendlyName: "Race proof" });
  if (enrolled.error) throw enrolled.error;
  const verified = await person.auth.mfa.challengeAndVerify({ factorId: enrolled.data.id, code: totp(enrolled.data.totp.secret) });
  if (verified.error) throw verified.error;
  return { ...person, factorId: enrolled.data.id, secret: enrolled.data.totp.secret };
}

async function passwordSession(person: Awaited<ReturnType<typeof withFactor>>) {
  const auth = authClient();
  const result = await auth.signInWithPassword({ email: person.email, password: person.password });
  if (result.error || !result.data.session) throw result.error ?? new Error("password login returned no session");
  return { auth, session: result.data.session };
}

async function reset(actorId: string, userId: string, factorId: string, label: string) {
  const connection = new pg.Client({ connectionString: dbTarget.href, application_name: `casa-reset-${label}` });
  await connection.connect();
  try {
    await connection.query("begin");
    await connection.query("set local role authenticated");
    await connection.query("set local lock_timeout='10s'; set local statement_timeout='15s'");
    await connection.query(
      "select set_config('request.jwt.claims',$1,true),set_config('matrx.admin_lane','on',true)",
      [JSON.stringify({ sub: actorId })],
    );
    const result = await connection.query("select iam.remove_mfa_factor($1,$2,$3) as result", [userId, factorId, `race ${label}`]);
    await connection.query("commit");
    return result.rows[0].result as { revoked: { sessions: number; refresh_tokens: number } };
  } catch (error) {
    await connection.query("rollback");
    throw error;
  } finally {
    await connection.end();
  }
}

async function hold(key: number) {
  const connection = new pg.Client({ connectionString: dbTarget.href, application_name: "casa-barrier-holder" });
  await connection.connect();
  await connection.query("select pg_advisory_lock($1::bigint)", [key]);
  return async () => {
    await connection.query("select pg_advisory_unlock($1::bigint)", [key]);
    await connection.end();
  };
}

async function armSessionUpdate(id: string, key: number, tag: string) {
  await db.query("insert into casa_mfa_race.session_update(session_id,barrier_key,tag) values($1,$2,$3)", [id, key, tag]);
}

async function armAudit(userId: string, key: number, tag: string) {
  await db.query("insert into casa_mfa_race.audit_insert(user_id,barrier_key,tag) values($1,$2,$3)", [userId, key, tag]);
}

async function assertRemoved(userId: string, factorId: string) {
  const state = await scalar(
    `select
       (select count(*)::int from auth.mfa_factors where id=$2) factors,
       (select count(*)::int from auth.sessions where user_id=$1) sessions,
       (select count(*)::int from auth.refresh_tokens where user_id=$1::text) legacy_tokens`,
    [userId, factorId],
  );
  check(state.factors === 0, "removed factor is never restored by a concurrent provider transaction");
  check(state.sessions === 0, "reset leaves no pre-existing subject session");
  check(state.legacy_tokens === 0, "reset leaves no legacy subject refresh token");
}

async function installBarriers() {
  await db.query(`
    create schema if not exists casa_mfa_race;
    create table casa_mfa_race.session_update(session_id uuid primary key, barrier_key bigint not null, tag text not null);
    create table casa_mfa_race.audit_insert(user_id uuid primary key, barrier_key bigint not null, tag text not null);
    create function casa_mfa_race.block_session_update() returns trigger language plpgsql as $$
    declare v_key bigint; v_tag text;
    begin
      select barrier_key,tag into v_key,v_tag from casa_mfa_race.session_update where session_id=new.id;
      if found then
        perform set_config('application_name','casa-native-update-'||v_tag,true);
        perform pg_advisory_xact_lock(v_key);
      end if;
      return new;
    end $$;
    create function casa_mfa_race.block_reset_audit() returns trigger language plpgsql as $$
    declare v_key bigint; v_tag text;
    begin
      select barrier_key,tag into v_key,v_tag from casa_mfa_race.audit_insert where user_id=new.target_user_id;
      if found and new.action='mfa_factor_remove' then
        perform set_config('application_name','casa-reset-audit-'||v_tag,true);
        perform pg_advisory_xact_lock(v_key);
      end if;
      return new;
    end $$;
    create trigger casa_mfa_race_session_update before update on auth.sessions
      for each row execute function casa_mfa_race.block_session_update();
    create trigger casa_mfa_race_audit_insert before insert on admin.admin_audit_log
      for each row execute function casa_mfa_race.block_reset_audit();
  `);
}

async function main() {
  await db.connect();
  try {
    await db.query(await readFile(migration, "utf8"));
    await installBarriers();
    const actor = await createPerson();
    await db.query("insert into public.current_user_is_admin values($1,true) on conflict(user_id) do update set is_admin=true", [actor.uid]);
    const unrelated = await withFactor(await createPerson());
    const unrelatedBefore = await scalar(
      "select (select count(*)::int from auth.sessions where user_id=$1) sessions,(select count(*)::int from auth.mfa_factors where user_id=$1) factors",
      [unrelated.uid],
    );

    // Native refresh linearizes first: its session UPDATE is held, and reset waits on that exact row.
    {
      const subject = await withFactor(await createPerson());
      const current = (await subject.auth.getSession()).data.session;
      assert.ok(current);
      const key = 912_001;
      const release = await hold(key);
      await armSessionUpdate(sessionId(current.access_token), key, "refresh-wins");
      try {
        const refreshing = nativeRefresh(current.refresh_token);
        await waitForApplication("casa-native-update-refresh-wins", "AdvisoryLock");
        const resetting = reset(actor.uid, subject.uid, subject.factorId, "refresh-wins");
        await waitForApplication("casa-reset-refresh-wins", "Lock");
        await release();
        const refreshed = await bounded(refreshing, "refresh winner");
        check(refreshed.ok && Boolean(refreshed.refreshToken), "native refresh commits before the waiting reset");
        assert.ok(refreshed.refreshToken);
        await bounded(resetting, "reset after refresh");
        check(!(await nativeRefresh(current.refresh_token)).ok, "old refresh token is unusable after the reset");
        check(!(await nativeRefresh(refreshed.refreshToken)).ok, "newly issued refresh token is unusable after the reset");
        await assertRemoved(subject.uid, subject.factorId);
      } catch (error) {
        await release().catch(() => undefined);
        throw error;
      }
    }

    // Reset linearizes first: the audit barrier proves factor/session deletion already ran.
    {
      const subject = await withFactor(await createPerson());
      const current = (await subject.auth.getSession()).data.session;
      assert.ok(current);
      const key = 912_002;
      const release = await hold(key);
      await armAudit(subject.uid, key, "refresh-loses");
      try {
        const resetting = reset(actor.uid, subject.uid, subject.factorId, "refresh-loses");
        await waitForApplication("casa-reset-audit-refresh-loses", "AdvisoryLock");
        const before = Number((await scalar("select xact_rollback from pg_stat_database where datname=current_database()")).xact_rollback);
        const refreshing = nativeRefresh(current.refresh_token);
        await waitFor("provider refresh retry while reset holds deleted rows", async () =>
          Number((await scalar("select xact_rollback from pg_stat_database where datname=current_database()")).xact_rollback) > before,
        );
        await release();
        await bounded(resetting, "reset before refresh");
        check(!(await bounded(refreshing, "refresh after reset")).ok, "refresh that enters after reset deletion is refused");
        check(!(await nativeRefresh(current.refresh_token)).ok, "reset-loser refresh token remains unusable");
        await assertRemoved(subject.uid, subject.factorId);
      } catch (error) {
        await release().catch(() => undefined);
        throw error;
      }
    }

    // Native MFA verification linearizes first and issues a token; reset still destroys its session.
    {
      const subject = await withFactor(await createPerson());
      const aal1 = await passwordSession(subject);
      const challenge = await aal1.auth.mfa.challenge({ factorId: subject.factorId });
      if (challenge.error) throw challenge.error;
      const key = 912_003;
      const release = await hold(key);
      await armSessionUpdate(sessionId(aal1.session.access_token), key, "verify-wins");
      try {
        const verifying = aal1.auth.mfa.verify({ factorId: subject.factorId, challengeId: challenge.data.id, code: totp(subject.secret) });
        await waitForApplication("casa-native-update-verify-wins", "AdvisoryLock");
        const resetting = reset(actor.uid, subject.uid, subject.factorId, "verify-wins");
        await waitForApplication("casa-reset-verify-wins", "Lock");
        await release();
        const verified = await bounded(verifying, "verify winner");
        if (verified.error) throw verified.error;
        const elevated = (await aal1.auth.getSession()).data.session;
        if (!elevated) throw new Error("verify winner was not installed in the client");
        check(true, "native MFA verification commits before the waiting reset");
        await bounded(resetting, "reset after verify");
        check(!(await nativeRefresh(aal1.session.refresh_token)).ok, "pre-verification refresh token is unusable after reset");
        check(!(await nativeRefresh(elevated.refresh_token)).ok, "verification-issued refresh token is unusable after reset");
        await assertRemoved(subject.uid, subject.factorId);
      } catch (error) {
        await release().catch(() => undefined);
        throw error;
      }
    }

    // Reset linearizes first; a verification already challenged against the factor cannot resurrect it.
    {
      const subject = await withFactor(await createPerson());
      const aal1 = await passwordSession(subject);
      const challenge = await aal1.auth.mfa.challenge({ factorId: subject.factorId });
      if (challenge.error) throw challenge.error;
      const key = 912_004;
      const release = await hold(key);
      await armAudit(subject.uid, key, "verify-loses");
      try {
        const resetting = reset(actor.uid, subject.uid, subject.factorId, "verify-loses");
        await waitForApplication("casa-reset-audit-verify-loses", "AdvisoryLock");
        let settled = false;
        const verifying = aal1.auth.mfa.verify({ factorId: subject.factorId, challengeId: challenge.data.id, code: totp(subject.secret) }).finally(() => { settled = true; });
        await waitForProviderLock("mfa_");
        check(!settled, "native verification is blocked behind the reset transaction");
        await release();
        await bounded(resetting, "reset before verify");
        check(Boolean((await bounded(verifying, "verification after reset")).error), "verification that loses to reset is refused");
        await assertRemoved(subject.uid, subject.factorId);
      } catch (error) {
        await release().catch(() => undefined);
        throw error;
      }
    }

    // The auth.users fence holds a concurrent fresh login until reset commits; it then starts at AAL1.
    {
      const subject = await withFactor(await createPerson());
      const old = (await subject.auth.getSession()).data.session;
      assert.ok(old);
      const key = 912_005;
      const release = await hold(key);
      await armAudit(subject.uid, key, "login-after");
      try {
        const resetting = reset(actor.uid, subject.uid, subject.factorId, "login-after");
        await waitForApplication("casa-reset-audit-login-after", "AdvisoryLock");
        const fresh = authClient();
        let settled = false;
        const loggingIn = fresh.signInWithPassword({ email: subject.email, password: subject.password }).finally(() => { settled = true; });
        await waitForProviderLock("sessions");
        check(!settled, "fresh login is blocked by the reset user-row fence");
        await release();
        await bounded(resetting, "reset before fresh login");
        const login = await bounded(loggingIn, "fresh login after reset");
        if (login.error || !login.data.session) throw login.error ?? new Error("fresh login returned no session");
        const assurance = await fresh.mfa.getAuthenticatorAssuranceLevel();
        check(assurance.data?.currentLevel === "aal1", "fresh login after reset begins at AAL1");
        check((await nativeRefresh(login.data.session.refresh_token)).ok, "fresh post-reset login remains usable");
        check(!(await nativeRefresh(old.refresh_token)).ok, "pre-reset token remains unusable after fresh login");
        const state = await scalar("select (select count(*)::int from auth.mfa_factors where id=$2) factors,(select count(*)::int from auth.sessions where user_id=$1) sessions", [subject.uid, subject.factorId]);
        check(state.factors === 0 && state.sessions === 1, "fresh login creates one session without restoring the factor");
      } catch (error) {
        await release().catch(() => undefined);
        throw error;
      }
    }

    const unrelatedAfter = await scalar(
      "select (select count(*)::int from auth.sessions where user_id=$1) sessions,(select count(*)::int from auth.mfa_factors where user_id=$1) factors",
      [unrelated.uid],
    );
    check(JSON.stringify(unrelatedAfter) === JSON.stringify(unrelatedBefore), "all race families leave an unrelated person's factors and sessions unchanged");
    console.log(JSON.stringify({ checks, provider: "GoTrue v2.197.0", synchronization: "observed PostgreSQL lock barriers", hostedDataTouched: false }));
  } finally {
    await db.query("drop schema if exists casa_mfa_race cascade").catch(() => undefined);
    if (ownedUsers.length) await db.query("delete from auth.users where id=any($1::uuid[])", [ownedUsers]).catch(() => undefined);
    await Promise.all(authClients.map(value => value.signOut({ scope: "local" }).catch(() => undefined)));
    await db.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Owned reset race rehearsal failed");
  process.exitCode = 1;
});
