/**
 * pnpm check:sign-in-capture — the sign-in history capture can never be silently removed or made able to
 * fail a sign-in. Live database, direct connection, READ ONLY (pg_trigger + pg_get_functiondef).
 *
 *   1. Both triggers exist and are ENABLED: on_auth_session_record_sign_in on auth.sessions
 *      (-> iam._record_sign_in) and on_auth_amr_claim_record_sign_in_method on auth.mfa_amr_claims
 *      (-> iam._record_sign_in_method), AFTER INSERT, row level.
 *   2. Both function bodies still catch and return: an `exception when others` block, and a
 *      `return null` after it (a body without them would raise into the sign-in's own statement).
 *   What it does NOT assert: that query cancel (statement_timeout) is caught - PostgreSQL cannot.
 *
 *   --self-test   run the judge against deliberately broken copies (a body with the exception block
 *                 removed, a disabled trigger, a missing trigger) and a good one: red, red, red, green.
 */
import process from "node:process";
import { connectDirect, loadDbEnv } from "./lib/direct-db";

export interface TriggerRow {
  name: string;
  table: string;
  fn: string;
  enabled: string; // pg_trigger.tgenabled: 'O' origin (on), 'A' always, 'D' disabled, 'R' replica
  afterInsertRow: boolean;
}
export interface FnRow {
  name: string;
  def: string;
}

const WANT_TRIGGERS = [
  { name: "on_auth_session_record_sign_in", table: "auth.sessions", fn: "_record_sign_in" },
  { name: "on_auth_amr_claim_record_sign_in_method", table: "auth.mfa_amr_claims", fn: "_record_sign_in_method" },
];
const WANT_FNS = ["_record_sign_in", "_record_sign_in_method"];

/** The judge: every reason the capture is not guaranteed. Empty = green. */
export function judgeCapture(triggers: TriggerRow[], fns: FnRow[]): string[] {
  const out: string[] = [];
  for (const w of WANT_TRIGGERS) {
    const t = triggers.find((x) => x.name === w.name && x.table === w.table);
    if (!t) out.push(`trigger ${w.name} on ${w.table} is missing`);
    else {
      if (t.enabled !== "O" && t.enabled !== "A") out.push(`trigger ${w.name} is disabled (tgenabled=${t.enabled})`);
      if (t.fn !== w.fn) out.push(`trigger ${w.name} runs ${t.fn}, expected ${w.fn}`);
      if (!t.afterInsertRow) out.push(`trigger ${w.name} is not AFTER INSERT FOR EACH ROW`);
    }
  }
  for (const name of WANT_FNS) {
    const f = fns.find((x) => x.name === name);
    if (!f) {
      out.push(`function iam.${name} is missing`);
      continue;
    }
    const catchAt = f.def.search(/exception\s+when\s+others\s+then/i);
    if (catchAt < 0) out.push(`iam.${name} lost its "exception when others" guard - an error inside it would fail the sign-in`);
    else if (!/return\s+null\s*;/i.test(f.def.slice(catchAt))) out.push(`iam.${name} no longer returns NULL after its guard`);
    if (!/security\s+definer/i.test(f.def)) out.push(`iam.${name} is no longer SECURITY DEFINER`);
  }
  return out;
}

const GOOD_DEF = `create or replace function iam._X() returns trigger language plpgsql security definer as $$
begin begin insert into t values (1); exception when others then begin null; end; end; return null; end; $$`;

function selfTest(): number {
  const trig = (): TriggerRow[] =>
    WANT_TRIGGERS.map((w) => ({ ...w, enabled: "O", afterInsertRow: true }));
  const fns = (def: string): FnRow[] => WANT_FNS.map((name) => ({ name, def }));
  const noGuard = GOOD_DEF.replace("exception when others then begin null; end;", "");
  const noReturn = GOOD_DEF.replace("return null;", "return new;");
  const disabled = trig().map((t, i) => (i === 0 ? { ...t, enabled: "D" } : t));
  const cases: Array<[string, TriggerRow[], FnRow[], boolean]> = [
    ["function body lost its exception guard", trig(), fns(noGuard), false],
    ["function body no longer returns NULL", trig(), fns(noReturn), false],
    ["a trigger is disabled", disabled, fns(GOOD_DEF), false],
    ["a trigger is missing", trig().slice(1), fns(GOOD_DEF), false],
    ["everything intact", trig(), fns(GOOD_DEF), true],
  ];
  let bad = 0;
  for (const [name, t, f, wantGreen] of cases) {
    const reasons = judgeCapture(t, f);
    const green = reasons.length === 0;
    if (green !== wantGreen) bad++;
    console.log(`${green === wantGreen ? "PASS" : "FAIL"}  ${name}: judged ${green ? "green" : "red"} (${reasons[0] ?? "no findings"})`);
  }
  console.log(bad ? `self-test FAILED (${bad})` : "self-test passed: red on every planted break, green on the intact copy");
  return bad ? 1 : 0;
}

async function main(): Promise<number> {
  if (process.argv.includes("--self-test")) return selfTest();
  const env = loadDbEnv();
  if (!("host" in env)) {
    console.error(`UNMEASURED: missing ${env.missing.join(", ")}`);
    return 2;
  }
  const db = await connectDirect(env, "check-sign-in-capture");
  try {
    const t = await db.query<{ name: string; table: string; fn: string; enabled: string; after_insert_row: boolean }>(
      `select g.tgname as name, c.relnamespace::regnamespace::text || '.' || c.relname as "table", p.proname as fn,
              g.tgenabled::text as enabled,
              ((g.tgtype & 1) = 1 and (g.tgtype & 2) = 0 and (g.tgtype & 4) = 4) as after_insert_row
         from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_proc p on p.oid = g.tgfoid
        where not g.tgisinternal and g.tgname = any($1)`,
      [WANT_TRIGGERS.map((w) => w.name)],
    );
    const f = await db.query<{ name: string; def: string }>(
      `select p.proname as name, pg_get_functiondef(p.oid) as def from pg_proc p
        where p.pronamespace = 'iam'::regnamespace and p.proname = any($1)`,
      [WANT_FNS],
    );
    const reasons = judgeCapture(
      t.rows.map((r) => ({ name: r.name, table: r.table, fn: r.fn, enabled: r.enabled, afterInsertRow: r.after_insert_row })),
      f.rows,
    );
    for (const r of reasons) console.log(`FAIL  ${r}`);
    console.log(`triggers found: ${t.rows.map((r) => `${r.name}(${r.enabled})`).join(", ") || "none"}; functions: ${f.rows.map((r) => r.name).join(", ")}`);
    console.log(reasons.length ? `check:sign-in-capture FAILED (${reasons.length})` : "check:sign-in-capture passed");
    return reasons.length ? 1 : 0;
  } finally {
    await db.end();
  }
}

main().then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error(e);
    process.exit(1);
  },
);
