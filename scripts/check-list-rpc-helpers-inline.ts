#!/usr/bin/env npx tsx
/**
 * check:list-rpc-helpers-inline — A PER-ROW HELPER INSIDE A LIST READ INLINES (2026-10-16).
 *
 * /work's filter options failed with 57014 (statement timeout) for the person with 34k
 * conversations. One cause: chat.conversation_lane — a pure CASE over four text arguments, called
 * ~6 times per row through cvx_audience — carried `SET search_path`. A SQL function with ANY SET
 * clause is never inlined, so the planner made a real call, with a configuration save/restore, for
 * every row of every list, facet and count read (measured: ~1.5s of a 4.2s facet read).
 * Fix: 20261016210000_cvx_list_reads_fit_the_statement_ceiling.sql + 20261016211000_list_rpc_helpers_inline.sql.
 *
 * This guard reads the live catalog: every `public` list RPC (*_list_scoped, *_list_facets,
 * *_scope_counts, *_list_counts, *_lane_facets), the SQL helpers it names, and the helpers THOSE
 * name (three levels). It FAILS on a helper that is plain SQL, returns one value, reads no table
 * (no FROM / JOIN in its body) and still carries a SET clause — that setting protects nothing and
 * costs a call per row. An exemption needs its reason in EXEMPT.
 *
 *   pnpm check:list-rpc-helpers-inline               # exit 1 on a finding; 2 when the database cannot be read
 *   pnpm check:list-rpc-helpers-inline --self-test   # RED on the pre-fix catalog shape, GREEN on the fixed one (no DDL on live)
 *
 * No credentials -> exit 0 with a SKIP line (like every live-DB check in this repo).
 */
import process from "node:process";
import { connectDirect, loadDbEnv } from "./lib/direct-db";

/** schema.name -> why the SET clause stays. */
export const EXEMPT: Readonly<Record<string, string>> = {
  "public.has_permission": "a thin door over the plpgsql reader has_permission_for; inlining it saves nothing",
};

const LIST_RPC = "(_list_scoped|_list_facets|_scope_counts|_list_counts|_lane_facets)$";

/**
 * `procs` is the catalog in normal mode and a planted VALUES list in the self-test, so the SAME
 * detector runs in both. Columns: fn (schema.name), name, is_list, inlinable_shape, has_config, src.
 */
const DETECT = (procs: string) => `
with recursive procs0(fn, name, is_list, inlinable_shape, has_config, src) as (${procs}),
-- a call is schema.name( — or a bare name( only for public (the list RPCs run on search_path public)
procs as materialized (
  select p.*, case when p.fn like 'public.%' then '\\m(public\\.)?' || p.name || '\\s*\\('
                   else '\\m' || replace(p.fn, '.', '\\.') || '\\s*\\(' end as pat
    from procs0 p),
reach(fn, depth) as (
  select h.fn, 1 from procs h join procs l on l.is_list and l.src ~ h.pat
   where not h.is_list
  union
  select h.fn, r.depth + 1 from reach r join procs p on p.fn = r.fn
    join procs h on not h.is_list and h.fn <> p.fn and p.src ~ h.pat
   where r.depth < 3
)
select distinct p.fn from reach r join procs p on p.fn = r.fn
 where p.inlinable_shape and p.has_config
 order by 1`;

const CATALOG = `
select n.nspname || '.' || p.proname, p.proname::text,
       (n.nspname = 'public' and p.proname ~ '${LIST_RPC}'),
       (l.lanname = 'sql' and not p.proretset and p.prokind = 'f' and p.provolatile in ('i', 's')
        and p.prosrc !~* '\\m(from|join)\\M'),
       p.proconfig is not null, p.prosrc
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
 where n.nspname not in ('pg_catalog', 'information_schema', 'extensions', 'graphql', 'auth', 'storage',
                         'realtime', 'vault', 'pgsodium', 'net', 'supabase_functions', 'cron', 'pgbouncer')
   -- only the list RPCs and the functions that could be a per-row helper (one-value SQL functions)
   and ((n.nspname = 'public' and p.proname ~ '${LIST_RPC}') or (l.lanname = 'sql' and not p.proretset))`;

/** The shape this incident had: list RPC -> cvx_audience (inlinable, no SET) -> conversation_lane (SET). */
const planted = (laneHasConfig: boolean) => `values
  ('public.cvx_list_facets', 'cvx_list_facets', true, false, true, 'select public.cvx_audience(r.provider, r.a, r.b, r.c, r.d) from r'),
  ('public.cvx_audience', 'cvx_audience', false, true, false, 'select case when chat.conversation_lane(a, b, c, d) = ''x'' then 1 end'),
  ('chat.conversation_lane', 'conversation_lane', false, true, ${laneHasConfig}, 'select case when a = ''x'' then ''y'' end'),
  ('public.reads_a_table', 'reads_a_table', false, false, true, 'select 1 from t')`;

type Q = { query: (q: string, v?: unknown[]) => Promise<{ rows: { fn: string }[] }> };

async function main(): Promise<number> {
  const env = loadDbEnv();
  if ("missing" in env) {
    console.log("[SKIP] check:list-rpc-helpers-inline — no database credentials in this environment (UNMEASURED, not a pass).");
    return 0;
  }
  const c = (await connectDirect(env, "check-list-rpc-helpers-inline")) as unknown as Q & { end(): Promise<void> };
  try {
    await c.query("begin read only");
    if (process.argv.includes("--self-test")) {
      const red = (await c.query(DETECT(planted(true)))).rows.map((r) => r.fn);
      const green = (await c.query(DETECT(planted(false)))).rows.map((r) => r.fn);
      await c.query("rollback");
      const ok = red.length === 1 && red[0] === "chat.conversation_lane" && green.length === 0;
      console.log(`[${ok ? "OK" : "FAIL"}] self-test: pre-fix shape flagged ${JSON.stringify(red)} (want ["chat.conversation_lane"]), fixed shape flagged ${JSON.stringify(green)} (want []).`);
      return ok ? 0 : 1;
    }
    const found = (await c.query(DETECT(CATALOG))).rows.map((r) => r.fn).filter((f) => !(f in EXEMPT));
    await c.query("rollback");
    if (found.length === 0) {
      console.log(`[OK] every pure SQL helper a list RPC reaches inlines (${Object.keys(EXEMPT).length} exempt, each with a reason in the script).`);
      return 0;
    }
    for (const fn of found) {
      console.log(`[FAIL] ${fn} is a pure SQL expression called per row by a list RPC but carries a SET clause, so it is never inlined; \`alter function ${fn}(…) reset search_path\`.`);
    }
    return 1;
  } finally {
    await c.end();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[FAIL] check:list-rpc-helpers-inline: ${String(err)}`);
    process.exit(2);
  },
);
