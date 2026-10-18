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
 *      asserts each call added exactly one audit row for that person.
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
  // Already wrote its own row before the helper existed; a direct insert counts.
  { fn: "admin.set_top_tier_model_access(uuid,boolean,text)", reaches: [HELPER, "admin.admin_audit_log"] },
  // Every support-session lifecycle event funnels through _support_session_log.
  { fn: "admin._support_session_log(admin.support_sessions,text,text)", reaches: [HELPER] },
  { fn: "admin._support_session_close(uuid,text,text)", reaches: [SUPPORT_LOG] },
  { fn: "admin.support_session_create(uuid,text,integer)", reaches: [SUPPORT_LOG] },
  { fn: "admin.support_session_extend(uuid,integer)", reaches: [SUPPORT_LOG, SUPPORT_CLOSE] },
  { fn: "admin.support_session_end(uuid)", reaches: [SUPPORT_CLOSE] },
  { fn: "admin.support_session_close_expired()", reaches: [SUPPORT_CLOSE] },
  { fn: "admin.support_session_abort(uuid)", reaches: [SUPPORT_CLOSE] },
  { fn: "admin.support_session_activate(uuid,uuid)", reaches: [SUPPORT_LOG] },
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
    const rows = async (): Promise<Array<{ id: string; action: string }>> => {
      const r = await c.query("select id, action from admin.admin_audit_log where target_user_id = $1", [target]);
      return r.rows;
    };

    let sessionId: string | null = null;
    const steps: Array<{ name: string; as: () => Promise<void>; run: () => Promise<unknown>; action: string }> = [
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
        run: () => c.query("select admin.support_session_end($1)", [sessionId]) },
      { name: "admin._audit_user_action as service_role (Next routes)", as: asServiceRole, action: "onboarding_flag_set",
        run: () => c.query(
          "select admin._audit_user_action('onboarding_flag_set', $1, null, '{\"onboarding_completed\":true}'::jsonb, 'audit guard', '{}'::jsonb, $2)",
          [target, adminId],
        ) },
      { name: "iam.close_account (self-serve)", as: asSelf, action: "account_close_self",
        run: () => c.query("select iam.close_account(null, 'audit guard self')") },
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
        if (delta !== 1 || act !== s.action) {
          failures.push(`${s.name}: ${delta} new audit row(s), last action ${act ?? "none"} (expected 1 × ${s.action})`);
          console.log(`FAIL  ${s.name}: +${delta} (${act ?? "none"})`);
        } else {
          console.log(`PASS  ${s.name}: +1 ${act}`);
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
