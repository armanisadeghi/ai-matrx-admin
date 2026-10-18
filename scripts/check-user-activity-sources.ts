/**
 * pnpm check:user-activity — admin.user_activity (the Activity tab's one read) survives a broken
 * source and pages without losing or repeating a row.
 *
 * Live database, direct connection (the five SUPABASE_MATRIX_* variables `pnpm db:apply` uses),
 * READ ONLY, always rolled back. Planting a broken body would be DDL, which the production guard
 * refuses on live (and the clone is for migration rehearsal only), so the break is planted through
 * the function's own test seam: the transaction-local setting `matrx.test_break_activity_source`
 * names one source, and that source's branch raises INSIDE its per-source wrapper — the exact path
 * a real branch error takes.
 *
 *   1. PLANTED BREAK — breaks `feedback`, calls admin.user_activity for the test admin. Green only
 *      when the call does NOT throw, `sources` reports feedback {ok:false, error:"planted…"} and
 *      every other source ok:true.
 *   2. PAGING — walks three pages via next_before: newest first within a page, every row at or
 *      before the cursor, no item key twice, no source failing.
 *   3. TIE — plants 7 admin audit rows for the test admin in ONE transaction (one created_at, so more
 *      rows than the 3-row page share one instant), walks the 'admin' source 3 rows at a time on the
 *      composite cursor (next_before, next_before_key), and is green only when all 7 come back exactly
 *      once (N1: the old cursor stepped 1 µs past the instant and dropped 4). Rolled back.
 *
 *   --self-test   prove the judge goes red on a feed that threw / hid the break, green on a good one
 */
import process from "node:process";
import { connectDirect, loadDbEnv } from "./lib/direct-db";

const TEST_ADMIN_EMAIL = "admin@admin.com";
const BROKEN = "feedback";
const SOURCE_COUNT = 13;

interface Item {
  at: string;
  key: string;
  kind: string;
}
interface Source {
  kind: string;
  ok: boolean;
  error?: string;
}
interface Page {
  items: Item[];
  next_before: string | null;
  next_before_key?: string | null;
  sources: Source[];
}

/** The judge for the planted break: the feed answered, and named the broken source. */
export function judgeBreak(result: Page | Error): string[] {
  if (result instanceof Error) return [`a broken source took the whole feed down: ${result.message}`];
  const out: string[] = [];
  const fb = result.sources.find((s) => s.kind === BROKEN);
  if (!fb || fb.ok || !fb.error?.includes("planted")) out.push(`${BROKEN} source not reported broken: ${JSON.stringify(fb)}`);
  const others = result.sources.filter((s) => s.kind !== BROKEN);
  for (const s of others) if (!s.ok) out.push(`source ${s.kind} unexpectedly failed: ${s.error}`);
  if (others.length !== SOURCE_COUNT - 1) out.push(`expected ${SOURCE_COUNT - 1} other sources, got ${others.length}`);
  return out;
}

function selfTest(): number {
  const ok = (kind: string): Source => ({ kind, ok: true });
  const kinds = ["admin", "org_admin", "support", "sign_in", "account", "conversation", "run", "notification", "sms", "billing", "error", "contact"];
  const good: Page = { items: [], next_before: null, sources: [...kinds.map(ok), { kind: BROKEN, ok: false, error: "planted: feedback" }] };
  const hidden: Page = { items: [], next_before: null, sources: [...kinds.map(ok), ok(BROKEN)] };
  const cases: Array<[string, Page | Error, boolean]> = [
    ["the call threw (no per-source wrapper)", new Error("planted: feedback"), false],
    ["the break was swallowed (source reads ok)", hidden, false],
    ["the break is reported and the rest answered", good, true],
  ];
  let bad = 0;
  for (const [name, input, wantPass] of cases) {
    const pass = judgeBreak(input).length === 0;
    if (pass !== wantPass) bad++;
    console.log(`${pass === wantPass ? "PASS" : "FAIL"}  ${name}: judged ${pass ? "green" : "red"}, expected ${wantPass ? "green" : "red"}`);
  }
  console.log(bad ? `self-test FAILED (${bad})` : "self-test passed: the judge goes red on a fatal or hidden break, green on a reported one");
  return bad ? 1 : 0;
}

type Db = Awaited<ReturnType<typeof connectDirect>>;

async function feed(db: Db, userId: string, before: string | null): Promise<Page> {
  const r = await db.query<{ p: Page }>("select admin.user_activity($1, $2, null, 25) as p", [userId, before]);
  return r.rows[0].p;
}

async function main(): Promise<number> {
  if (process.argv.includes("--self-test")) return selfTest();
  const env = loadDbEnv();
  if (!("host" in env)) {
    console.error(`UNMEASURED: missing ${env.missing.join(", ")}`);
    return 2;
  }
  const db = await connectDirect(env, "check-user-activity");
  const failures: string[] = [];
  try {
    await db.query("begin"); // rolled back in finally; only the tie step writes
    const who = await db.query<{ id: string }>("select id from auth.users where email = $1", [TEST_ADMIN_EMAIL]);
    const userId = who.rows[0]?.id;
    if (!userId) throw new Error(`no ${TEST_ADMIN_EMAIL} user`);

    // 2. PAGING (every source real).
    const seen = new Set<string>();
    let before: string | null = null;
    for (let n = 1; n <= 3; n++) {
      const page = await feed(db, userId, before);
      for (let i = 1; i < page.items.length; i++) {
        if (Date.parse(page.items[i].at) > Date.parse(page.items[i - 1].at)) failures.push(`page ${n}: item ${i} is newer than item ${i - 1}`);
      }
      for (const it of page.items) {
        if (before && Date.parse(it.at) > Date.parse(before)) failures.push(`page ${n}: ${it.key} is after the cursor ${before}`);
        if (seen.has(it.key)) failures.push(`page ${n}: ${it.key} repeated from an earlier page`);
        seen.add(it.key);
      }
      const broken = page.sources.filter((s) => !s.ok);
      if (broken.length) failures.push(`page ${n}: sources failing: ${JSON.stringify(broken)}`);
      console.log(`page ${n}: ${page.items.length} items, next_before ${page.next_before ?? "none"}`);
      if (!page.next_before) break;
      before = page.next_before;
    }

    // 3. TIE (writes 7 audit rows inside a savepoint, rolled back with everything else).
    await db.query("savepoint tie");
    const planted = await db.query<{ id: string }>(
      "select admin._audit_user_action('update', $1, null, null, 'activity tie guard', '{}'::jsonb, null) as id from generate_series(1, 7)",
      [userId],
    );
    const want = new Set(planted.rows.map((r) => `admin:${r.id}`));
    const got: string[] = [];
    let cur: { before: string | null; key: string | null } = { before: null, key: null };
    for (let n = 0; n < 40; n++) {
      const r = await db.query<{ p: Page }>(
        "select admin.user_activity($1, $2, array['admin'], 3, $3) as p",
        [userId, cur.before, cur.key],
      );
      const page = r.rows[0].p;
      got.push(...page.items.map((i) => i.key).filter((k) => want.has(k)));
      if (!page.next_before || want.size === new Set(got).size) break;
      cur = { before: page.next_before, key: page.next_before_key ?? null };
    }
    const missing = [...want].filter((k) => !got.includes(k));
    const twice = got.filter((k, i) => got.indexOf(k) !== i);
    if (missing.length) failures.push(`tie: ${missing.length} of 7 same-instant rows never paged in`);
    if (twice.length) failures.push(`tie: ${twice.length} same-instant row(s) repeated`);
    console.log(`tie: ${new Set(got).size}/7 same-instant rows paged in, ${twice.length} repeated`);
    await db.query("rollback to savepoint tie");

    // 1. PLANTED BREAK.
    await db.query("select set_config('matrx.test_break_activity_source', $1, true)", [BROKEN]);
    let result: Page | Error;
    try {
      await db.query("savepoint call");
      result = await feed(db, userId, null);
    } catch (e) {
      await db.query("rollback to savepoint call");
      result = e as Error;
    }
    const judged = judgeBreak(result);
    failures.push(...judged);
    if (!(result instanceof Error)) {
      const fb = result.sources.find((s) => s.kind === BROKEN);
      console.log(`planted break: ${BROKEN}=${JSON.stringify(fb)}; ${result.sources.filter((s) => s.ok).length} sources ok; ${result.items.length} items`);
    }
  } finally {
    await db.query("rollback").catch(() => undefined);
    await db.end();
  }
  for (const f of failures) console.log(`FAIL  ${f}`);
  console.log(failures.length ? `check:user-activity FAILED (${failures.length})` : "check:user-activity passed");
  return failures.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error(e);
    process.exit(1);
  },
);
