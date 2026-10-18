/**
 * pnpm check:user-action-audit — every admin action on one person writes ONE
 * admin.admin_audit_log row, inside the database, so no screen or route can skip it.
 *
 * Two halves, both against the live database (direct connection, the same five
 * SUPABASE_MATRIX_* variables `pnpm db:apply` uses):
 *
 *   1. STATIC — reads pg_get_functiondef for every DECLARED per-person action and fails
 *      when its body does not call the audit helper (admin._audit_user_action) or one of
 *      the declared audited inner functions it is allowed to reach it through.
 *   2. LIVE — makes a disposable persona through the persona factory (tagged, expiring,
 *      torn down in `finally`), then inside ONE transaction that is always ROLLED BACK
 *      runs each action once against it as the test super admin (admin lane on) and
 *      asserts each call added exactly one audit row for that person, with the expected action
 *      word AND a non-empty metadata.reason (every admin action on a person carries its reason —
 *      users one-roof B3). A step marked `none` asserts the call wrote NO row (a reopen of a person
 *      who was not closed changes nothing).
 *
 *   --static-only   skip the live half
 *   --self-test     prove the static judge goes red on a body without the helper and
 *                   green on one with it (no database)
 */
import process from "node:process";
import { existsSync } from "node:fs";
import { connectDirect, loadDbEnv, type DbEnv } from "./lib/direct-db";
import { testTarget, withFixtureUser } from "./lib/persona.mjs";

const HELPER = "admin._audit_user_action";

interface Declared {
  readonly fn: string; // regprocedure text
  readonly reaches: readonly string[]; // any one of these names in the body satisfies it
}

/** Inner functions that themselves call the helper (they are checked too). */
const SUPPORT_LOG = "admin._support_session_log";
const SUPPORT_CLOSE = "admin._support_session_close";

export const DECLARED: readonly Declared[] = [
  { fn: "iam.close_account(uuid,text)", reaches: [HELPER] },
  { fn: "iam.reopen_account(uuid,text)", reaches: [HELPER] },
  { fn: "iam.sign_out_everywhere(uuid,text)", reaches: [HELPER] },
  { fn: "iam.admin_confirm_email(uuid,text)", reaches: [HELPER] },
  { fn: "iam.end_session(uuid,uuid,text)", reaches: [HELPER] },
  { fn: "iam.remove_mfa_factor(uuid,uuid,text)", reaches: [HELPER] },
  { fn: "iam.revoke_api_key_for_person(uuid,uuid,text)", reaches: [HELPER] },
  { fn: "billing.user_plan_set(uuid,text,text,timestamptz)", reaches: [HELPER] },
  { fn: "billing.free_months_apply(uuid[],text,integer,text)", reaches: [HELPER] },
  { fn: "billing.usage_reset_apply(uuid,billing.meter_period[],text)", reaches: [HELPER] },
  // p_note is the audit reason since lane Q (20261018170000).
  { fn: "admin.set_top_tier_model_access(uuid,boolean,text)", reaches: [HELPER] },
  // Lane Q (users one-roof adversarial fixes, 2026-10-18).
  { fn: "iam.admin_manage_organization_membership(text,uuid,uuid,text,text)", reaches: [HELPER] },
  { fn: "iam.admin_set_account_flags(uuid,boolean,boolean,text)", reaches: [HELPER] },
  { fn: "billing.coupon_create(text,text,integer,integer,jsonb,timestamptz,text)", reaches: [HELPER] },
  { fn: "billing.coupon_revoke(uuid,text)", reaches: [HELPER] },
  { fn: "public.admin_set_guest_block(uuid,boolean,text,timestamptz)", reaches: [HELPER] },
  { fn: "admin.record_contact(text,uuid,text,text,jsonb,uuid)", reaches: [HELPER] },
  // Every support-session lifecycle event funnels through _support_session_log.
  { fn: "admin._support_session_log(admin.support_sessions,text,text,text)", reaches: [HELPER] },
  { fn: "admin._support_session_close(uuid,text,text,text)", reaches: [SUPPORT_LOG] },
  { fn: "admin.support_session_create(uuid,text,integer)", reaches: [SUPPORT_LOG] },
  { fn: "admin.support_session_extend(uuid,integer)", reaches: [SUPPORT_LOG, SUPPORT_CLOSE] },
  { fn: "admin.support_session_end(uuid,text)", reaches: [SUPPORT_CLOSE] },
  { fn: "admin.support_session_close_expired()", reaches: [SUPPORT_CLOSE] },
  { fn: "admin.support_session_abort(uuid)", reaches: [SUPPORT_CLOSE] },
  { fn: "admin.support_session_activate(uuid,uuid)", reaches: [SUPPORT_LOG] },
  // Final lane: notes about a person (add in the function; edit/pin/delete through the notes trigger).
  { fn: "admin.add_user_note(uuid,uuid,text,platform.shown_to,text)", reaches: [HELPER] },
  { fn: "admin._person_note_audit()", reaches: [HELPER] },
];

/** The judge: does this body reach the audit write? Comments are stripped first. */
export function bodyReaches(body: string, reaches: readonly string[]): boolean {
  const code = body.replace(/--[^\n]*/g, "").toLowerCase();
  return reaches.some((name) => code.includes(name.toLowerCase()));
}

function selfTest(): number {
  const without = "begin update auth.users set banned_until = now(); -- admin._audit_user_action\nend";
  const withHelper = "begin perform admin._audit_user_action('account_close', v_uid); end";
  const cases: Array<[string, boolean, boolean]> = [
    ["body without the helper (mentioned only in a comment)", bodyReaches(without, [HELPER]), false],
    ["body that calls the helper", bodyReaches(withHelper, [HELPER]), true],
  ];
  let bad = 0;
  for (const [name, got, want] of cases) {
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}: reaches=${got} expected=${want}`);
  }
  console.log(bad ? `self-test FAILED (${bad})` : "self-test passed: the judge goes red without the helper, green with it");
  return bad ? 1 : 0;
}

type Client = Awaited<ReturnType<typeof connectDirect>>;

async function staticHalf(c: Client): Promise<string[]> {
  const failures: string[] = [];
  for (const d of DECLARED) {
    const r = await c.query(
      "select case when to_regprocedure($1) is null then null else pg_get_functiondef(to_regprocedure($1)) end as d",
      [d.fn],
    );
    const body: string | null = r.rows[0]?.d ?? null;
    if (body == null) {
      failures.push(`${d.fn}: does not exist`);
      continue;
    }
    if (!bodyReaches(body, d.reaches)) failures.push(`${d.fn}: never calls ${d.reaches.join(" / ")}`);
  }
  return failures;
}

const ADMIN_EMAIL = "admin@admin.com";

async function liveHalf(c: Client, target: string): Promise<string[]> {
  const failures: string[] = [];
  await c.query("begin");
  try {
    const a = await c.query("select id from auth.users where email = $1", [ADMIN_EMAIL]);
    const adminId: string | undefined = a.rows[0]?.id;
    if (!adminId) return [`test super admin ${ADMIN_EMAIL} not found`];

    const asAdmin = async () => {
      await c.query("reset role");
      await c.query("select set_config('matrx.admin_lane', 'on', true)");
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: adminId, role: "authenticated" }),
      ]);
      await c.query("set local role authenticated");
    };
    const asSelf = async () => {
      await c.query("reset role");
      await c.query("select set_config('matrx.admin_lane', 'off', true)");
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: target, role: "authenticated" }),
      ]);
      await c.query("set local role authenticated");
    };
    const asServiceRole = async () => {
      await c.query("reset role");
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "service_role" })]);
      await c.query("set local role service_role");
    };
    // Every row for the person, as the owner. created_at is now() and so the same for every row in
    // one transaction: new rows are found by id, never by time.
    const rows = async (): Promise<Array<{ id: string; action: string; reason: string | null }>> => {
      const r = await c.query(
        "select id, action, nullif(btrim(metadata->>'reason'), '') as reason from admin.admin_audit_log where target_user_id = $1",
        [target],
      );
      return r.rows;
    };
    const t = await c.query("select email from auth.users where id = $1", [target]);
    const targetEmail: string | null = t.rows[0]?.email ?? null;
    // An organization the test admin owns, for the membership steps (the person is added, re-roled and
    // removed inside this rolled-back transaction).
    const o = await c.query(
      `select m.container_id as id from iam.memberships m
        where m.user_id = $1 and m.container_type = 'organization' and m.role = 'owner'
          and m.status = 'active' and m.deleted_at is null
          and not exists (select 1 from iam.memberships x where x.container_id = m.container_id
                           and x.container_type = 'organization' and x.user_id = $2 and x.deleted_at is null)
        order by m.created_at limit 1`,
      [adminId, target],
    );
    const orgId: string | undefined = o.rows[0]?.id;
    let couponId: string | null = null;

    let sessionId: string | null = null;
    let noteId: string | null = null;
    const steps: Array<{ name: string; as: () => Promise<void>; run: () => Promise<unknown>; action: string; none?: boolean; noReason?: boolean }> = [
      { name: "iam.sign_out_everywhere", as: asAdmin, action: "sign_out_everywhere",
        run: () => c.query("select iam.sign_out_everywhere($1, 'audit guard')", [target]) },
      { name: "iam.admin_confirm_email", as: asAdmin, action: "email_verified",
        run: async () => {
          // The target may already be verified (then nothing is audited): make it unverified first, as the owner.
          await c.query("reset role");
          await c.query("update auth.users set email_confirmed_at = null where id = $1", [target]);
          await asAdmin();
          await c.query("select iam.admin_confirm_email($1, 'audit guard')", [target]);
        } },
      // Security tab (lane S): each fixture row is written as the owner, inside the rolled-back transaction.
      { name: "iam.end_session", as: asAdmin, action: "session_end",
        run: async () => {
          await c.query("reset role");
          const r = await c.query("insert into auth.sessions (id, user_id, created_at, updated_at) values (gen_random_uuid(), $1, now(), now()) returning id", [target]);
          await asAdmin();
          await c.query("select iam.end_session($1, $2, 'audit guard')", [target, r.rows[0].id]);
        } },
      { name: "iam.remove_mfa_factor", as: asAdmin, action: "mfa_factor_remove",
        run: async () => {
          await c.query("reset role");
          const r = await c.query(
            "insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values (gen_random_uuid(), $1, 'audit guard', 'totp', 'unverified', now(), now()) returning id",
            [target],
          );
          await asAdmin();
          await c.query("select iam.remove_mfa_factor($1, $2, 'audit guard')", [target, r.rows[0].id]);
        } },
      { name: "iam.revoke_api_key_for_person", as: asAdmin, action: "api_key_revoke",
        run: async () => {
          await c.query("reset role");
          // A personal key: the mint trigger reads auth.uid() from the claims, so they name the target.
          await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: target, role: "authenticated" })]);
          const r = await c.query(
            `insert into iam.api_keys (organization_id, key_id, secret_hash, display_prefix, name, service_user_id, created_by)
             select o.organization_id, 'guard' || substr(md5(random()::text), 1, 10), md5(random()::text), 'mx_live_guard…', 'audit guard', $1, $1
               from iam.system_orgs o where o.key = 'system' returning id`,
            [target],
          );
          await asAdmin();
          await c.query("select iam.revoke_api_key_for_person($1, $2, 'audit guard')", [target, r.rows[0].id]);
        } },
      { name: "iam.close_account (admin)", as: asAdmin, action: "account_close",
        run: () => c.query("select iam.close_account($1, 'audit guard')", [target]) },
      { name: "iam.reopen_account", as: asAdmin, action: "account_reopen",
        run: () => c.query("select iam.reopen_account($1, 'audit guard')", [target]) },
      // B2: a person banned with no open closure row is unbanned and audited (orphan ban)…
      { name: "iam.reopen_account (orphan ban)", as: asAdmin, action: "account_reopen",
        run: async () => {
          await c.query("reset role");
          await c.query("update auth.users set banned_until = now() + interval '100 years' where id = $1", [target]);
          await asAdmin();
          const r = await c.query("select iam.reopen_account($1, 'audit guard') j", [target]);
          if (r.rows[0].j.reopened !== true || r.rows[0].j.orphan_ban !== true) throw new Error(`answered ${JSON.stringify(r.rows[0].j)}`);
          await c.query("reset role");
          const b = await c.query("select banned_until from auth.users where id = $1", [target]);
          if (b.rows[0].banned_until !== null) throw new Error("still banned after an orphan-ban reopen");
        } },
      // …and a person who was not closed is told so, with nothing changed and nothing audited.
      { name: "iam.reopen_account (not closed)", as: asAdmin, action: "", none: true,
        run: async () => {
          const r = await c.query("select iam.reopen_account($1, 'audit guard') j", [target]);
          if (r.rows[0].j.reopened !== false || r.rows[0].j.was_not_closed !== true) throw new Error(`answered ${JSON.stringify(r.rows[0].j)}`);
        } },
      { name: "iam.admin_set_account_flags (onboarding)", as: asAdmin, action: "onboarding_flag_set",
        run: () => c.query("select iam.admin_set_account_flags($1, true, null, 'audit guard')", [target]) },
      { name: "iam.admin_set_account_flags (full MCP access)", as: asAdmin, action: "mcp_full_access_grant",
        run: () => c.query("select iam.admin_set_account_flags($1, null, true, 'audit guard')", [target]) },
      { name: "iam.admin_manage_organization_membership (add)", as: asAdmin, action: "org_membership_add",
        run: () => {
          if (!orgId) throw new Error(`${ADMIN_EMAIL} owns no organization to add the person to`);
          return c.query("select iam.admin_manage_organization_membership('add', $1, $2, 'member', 'audit guard')", [orgId, target]);
        } },
      { name: "iam.admin_manage_organization_membership (set_role)", as: asAdmin, action: "org_membership_set_role",
        run: () => c.query("select iam.admin_manage_organization_membership('set_role', $1, $2, 'admin', 'audit guard')", [orgId, target]) },
      { name: "iam.admin_manage_organization_membership (remove)", as: asAdmin, action: "org_membership_remove",
        run: () => c.query("select iam.admin_manage_organization_membership('remove', $1, $2, null, 'audit guard')", [orgId, target]) },
      { name: "billing.coupon_create (for the person)", as: asAdmin, action: "coupon_create",
        run: async () => {
          const r = await c.query(
            "select id from billing.coupon_create('existing_account', 'personal-pro', 1, 1, jsonb_build_array(jsonb_build_object('user_id', $1::text)), null, 'audit guard')",
            [target],
          );
          couponId = r.rows[0].id;
        } },
      { name: "billing.coupon_revoke", as: asAdmin, action: "coupon_revoke",
        run: () => c.query("select billing.coupon_revoke($1, 'audit guard')", [couponId]) },
      { name: "public.admin_set_guest_block (guest who is the person)", as: asAdmin, action: "guest_block",
        run: async () => {
          await c.query("reset role");
          const g = await c.query(
            "insert into users.guest_executions (fingerprint, auth_user_id) values ('audit-guard-' || md5(random()::text), $1) returning id",
            [target],
          );
          await asAdmin();
          await c.query("select public.admin_set_guest_block($1, true, 'audit guard', null)", [g.rows[0].id]);
        } },
      { name: "admin.record_contact (direct message)", as: asAdmin, action: "message_sent",
        run: () => c.query(
          "select admin.record_contact('message_sent', $1, null, 'audit guard', jsonb_build_object('conversation_id', gen_random_uuid()))",
          [target],
        ) },
      { name: "admin.record_contact (email, by address, server)", as: asServiceRole, action: "email_sent",
        run: () => c.query(
          "select admin.record_contact('email_sent', null, $1, 'audit guard', '{}'::jsonb, $2)",
          [targetEmail, adminId],
        ) },
      { name: "billing.user_plan_set (clear)", as: asAdmin, action: "plan_clear",
        run: () => c.query("select billing.user_plan_set($1, null, 'audit guard')", [target]) },
      { name: "billing.free_months_apply", as: asAdmin, action: "free_months_grant",
        run: async () => {
          const r = await c.query("select billing.free_months_apply(array[$1]::uuid[], 'personal-pro', 1, 'audit guard') j", [target]);
          if (r.rows[0].j.applied !== 1) throw new Error(`free_months_apply applied ${JSON.stringify(r.rows[0].j)}`);
        } },
      { name: "billing.usage_reset_apply", as: asAdmin, action: "usage_reset",
        run: () => c.query("select billing.usage_reset_apply($1, null, 'audit guard')", [target]) },
      { name: "admin.set_top_tier_model_access", as: asAdmin, action: "top_tier_models_grant",
        run: () => c.query("select admin.set_top_tier_model_access($1, true, 'audit guard')", [target]) },
      { name: "admin.support_session_create", as: asAdmin, action: "support_session_created",
        run: async () => {
          const r = await c.query("select id from admin.support_session_create($1, 'audit guard', 5)", [target]);
          sessionId = r.rows[0].id;
          // Make it active the way support_session_activate would (that door is backend-only).
          await c.query("reset role");
          await c.query(
            "update admin.support_sessions set status = 'active', started_at = now(), expires_at = now() + interval '10 minutes' where id = $1",
            [sessionId],
          );
        } },
      { name: "admin.support_session_extend", as: asAdmin, action: "support_session_extended",
        run: () => c.query("select * from admin.support_session_extend($1, 5)", [sessionId]) },
      { name: "admin.support_session_end", as: asAdmin, action: "support_session_ended",
        run: async () => {
          // From the admin console a reason is required (refused without one) and is the 'ended' row's reason.
          await c.query("savepoint no_reason");
          let refused = false;
          try { await c.query("select admin.support_session_end($1)", [sessionId]); } catch { refused = true; }
          await c.query("rollback to savepoint no_reason");
          if (!refused) throw new Error("support_session_end without a reason was accepted from the admin console");
          await c.query("select admin.support_session_end($1, 'audit guard end')", [sessionId]);
          await c.query("reset role");
          const r = await c.query(
            "select metadata->>'reason' as r from admin.admin_audit_log where target_user_id = $1 and action = 'support_session_ended' order by created_at desc limit 1",
            [target],
          );
          if (r.rows[0]?.r !== "audit guard end") throw new Error(`the ended row carries "${r.rows[0]?.r}", not the end reason`);
        } },
      { name: "admin._audit_user_action as service_role (Next routes)", as: asServiceRole, action: "onboarding_flag_set",
        run: () => c.query(
          "select admin._audit_user_action('onboarding_flag_set', $1, null, '{\"onboarding_completed\":true}'::jsonb, 'audit guard', '{}'::jsonb, $2)",
          [target, adminId],
        ) },
      { name: "admin.add_user_note", as: asAdmin, action: "note_add",
        run: async () => {
          const org = await c.query(
            `select m.container_id as id from iam.memberships m join iam.organizations o on o.id = m.container_id
              where m.user_id = $1 and m.container_type = 'organization' and m.status = 'active' and m.deleted_at is null
                and not o.is_system order by m.created_at limit 1`,
            [adminId],
          );
          const r = await c.query("select admin.add_user_note($1, $2, 'audit guard note', 'my_team') as id", [target, org.rows[0]?.id]);
          noteId = r.rows[0].id;
        } },
      { name: "note pin (trigger)", as: asAdmin, action: "note_pin",
        run: () => c.query("select admin.set_user_note_pinned($1, $2, true)", [noteId, target]) },
      { name: "note edit (trigger)", as: asAdmin, action: "note_edit",
        run: () => c.query("update workbench.notes set content = 'audit guard note, edited' where id = $1", [noteId]) },
      { name: "note delete (trigger)", as: asAdmin, action: "note_delete",
        run: () => c.query("update workbench.notes set deleted_at = now() where id = $1", [noteId]) },
      // F1: the DATABASE refuses an admin action on a person with no reason — no screen can skip it.
      { name: "refused: iam.sign_out_everywhere with an empty reason", as: asAdmin, action: "", none: true,
        run: async () => {
          await c.query("savepoint refuse");
          try {
            await c.query("select iam.sign_out_everywhere($1, '  ')", [target]);
          } catch (e) {
            await c.query("rollback to savepoint refuse");
            if ((e as { code?: string }).code !== "22023") throw e;
            return;
          }
          throw new Error("an empty reason was accepted");
        } },
      { name: "refused: _audit_user_action (server, named admin actor) with no reason", as: asServiceRole, action: "", none: true,
        run: async () => {
          await c.query("savepoint refuse");
          try {
            await c.query("select admin._audit_user_action('onboarding_flag_set', $1, null, null, null, '{}'::jsonb, $2)", [target, adminId]);
          } catch (e) {
            await c.query("rollback to savepoint refuse");
            if ((e as { code?: string }).code !== "22023") throw e;
            return;
          }
          throw new Error("a reason-less admin action was accepted");
        } },
      // Self-serve closure is exempt from the reason rule: no reason given, still one row.
      { name: "iam.close_account (self-serve, no reason: exempt)", as: asSelf, action: "account_close_self", noReason: true,
        run: () => c.query("select iam.close_account(null, null)") },
    ];

    for (const s of steps) {
      await c.query("savepoint step");
      try {
        await c.query("reset role"); // count as the owner: the caller's RLS hides audit rows
        const seen = new Set((await rows()).map((r) => r.id));
        await s.as();
        await s.run();
        await c.query("reset role");
        const fresh = (await rows()).filter((r) => !seen.has(r.id));
        const delta = fresh.length;
        const act = fresh.map((r) => r.action).join(",") || null;
        if (s.none) {
          if (delta !== 0) {
            failures.push(`${s.name}: ${delta} audit row(s) written for a call that changed nothing (${act})`);
            console.log(`FAIL  ${s.name}: +${delta} (${act})`);
          } else console.log(`PASS  ${s.name}: no row (nothing changed)`);
        } else if (delta !== 1 || act !== s.action) {
          failures.push(`${s.name}: ${delta} new audit row(s), last action ${act ?? "none"} (expected 1 × ${s.action})`);
          console.log(`FAIL  ${s.name}: +${delta} (${act ?? "none"})`);
        } else if (s.noReason) {
          console.log(`PASS  ${s.name}: +1 ${act} (no reason, exempt)`);
        } else if (!fresh[0].reason) {
          failures.push(`${s.name}: the ${act} row carries no reason (metadata.reason empty)`);
          console.log(`FAIL  ${s.name}: +1 ${act} WITHOUT a reason`);
        } else {
          console.log(`PASS  ${s.name}: +1 ${act} (reason "${fresh[0].reason}")`);
        }
        await c.query("release savepoint step");
      } catch (e) {
        await c.query("rollback to savepoint step");
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(`${s.name}: threw ${msg}`);
        console.log(`FAIL  ${s.name}: threw ${msg}`);
      }
    }
  } finally {
    await c.query("rollback");
  }
  return failures;
}

async function main(): Promise<number> {
  const args = new Set(process.argv.slice(2));
  if (args.has("--self-test")) return selfTest();
  const env = loadDbEnv();
  if ("missing" in env) {
    console.error(`check:user-action-audit: missing ${env.missing.join(", ")} (looked in ${env.looked.join(", ")})`);
    return 2;
  }
  console.log(`check:user-action-audit: connection from ${(env as DbEnv).from}`);
  const c = await connectDirect(env as DbEnv, "check-user-action-audit");
  try {
    const failures = await staticHalf(c);
    for (const f of failures) console.log(`FAIL  static ${f}`);
    if (!failures.length) console.log(`PASS  static: all ${DECLARED.length} declared actions reach the audit write`);
    if (!args.has("--static-only")) {
      for (const f of [".env.local", ".env"]) {
        if (!process.env.SUPABASE_SECRET_KEY && existsSync(f)) process.loadEnvFile(f);
      }
      const live: string[] = await withFixtureUser(
        testTarget(),
        { suite: "check/user-action-audit", purpose: "target of every admin action, rolled back", ttlHours: 1 },
        (user: { id: string }) => liveHalf(c, user.id),
      );
      failures.push(...live);
    }
    if (failures.length) {
      console.log(`\ncheck:user-action-audit FAILED: ${failures.length} finding(s)`);
      return 1;
    }
    console.log("\ncheck:user-action-audit passed (live half rolled back)");
    return 0;
  } finally {
    await c.end();
  }
}

main().then((code) => process.exit(code), (e) => {
  console.error(e);
  process.exit(2);
});
