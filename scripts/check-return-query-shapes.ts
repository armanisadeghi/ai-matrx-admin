#!/usr/bin/env npx tsx
/**
 * check-return-query-shapes — every set-returning plpgsql function that returns a TABLE's row type
 * must get that row's columns from a read of the table (or from EXECUTE), never from a cached
 * expansion of the TYPE alone.
 *
 * THE CLASS (DEFECT-46, 2026-10-18). Test-data L2 added `test_run_id` + `test_expires_at` to ~550
 * tables. Postgres re-plans a cached statement when a TABLE it reads changes, but not when only a
 * row TYPE it expands changes. So in every pooled session that had already run them,
 *   custom.applicable_fields        `return query select * from jsonb_populate_recordset(null::custom.record, …)`
 *   public.dict_upsert_entries_for  `RETURN QUERY SELECT * FROM public.dict_list_entries_for(…)`
 * kept expanding `*` to the OLD width while the caller expected the new one — "structure of query
 * does not match function result type … (19) does not match expected column count (21)" — breaking
 * agent context (active_selection) and every `table` search until those sessions recycled. A fresh
 * session was fine, so the function looked correct to anyone who tried it by hand.
 *
 * WHAT IS JUDGED: each RETURN QUERY statement (not RETURN QUERY EXECUTE) of a plpgsql function whose
 * result is SETOF <a table's row type>. It passes when the statement reads that table as a relation
 * (FROM / JOIN / UPDATE / INSERT INTO / DELETE FROM, qualified or not) — then any column change
 * re-plans it. Otherwise it is flagged; the fix is RETURN QUERY EXECUTE '<same select>' USING …
 * (planned per call against the current width; measured +0.04 ms).
 *
 *   pnpm check:return-query-shapes              judge the LIVE database (exit 1 on any finding)
 *   pnpm check:return-query-shapes --self-test  fixture bodies, no database
 *   pnpm check:return-query-shapes --prove      on live, in a pg_temp sandbox: build both shapes,
 *                                               add a column, show the flagged shape fails and the
 *                                               EXECUTE shape survives (the cause, reproduced)
 * Exit: 0 clean · 1 finding / self-test or proof failed · 2 UNMEASURED (no credentials / no database).
 */
import process from "node:process";
import { loadDbEnv } from "./lib/direct-db";
import { openGateDb } from "./lib/gate-db";
import { exitAfterDrain } from "./lib/exit-after-drain";

export interface ShapeFunction {
  readonly name: string; // regprocedure text
  readonly src: string; // prosrc
  readonly relSchema: string;
  readonly relName: string;
}

export interface ShapeFinding {
  readonly name: string;
  readonly returns: string;
  readonly statement: string;
}

/** Blank out comments and quoted text (keeping length), so neither can satisfy or break a match. */
export function maskSql(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === "--") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (two === "/*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (src[i] === "'") {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "'" && src[j + 1] === "'") j += 2;
        else if (src[j] === "'") break;
        else j += 1;
      }
      const stop = Math.min(j + 1, src.length);
      out += "'" + src.slice(i + 1, stop - 1).replace(/[^\n]/g, " ") + (stop - 1 > i ? "'" : "");
      i = stop;
    } else if (src[i] === "$") {
      const tag = /^\$[A-Za-z_]*\$/.exec(src.slice(i));
      if (!tag) {
        out += src[i];
        i += 1;
        continue;
      }
      const end = src.indexOf(tag[0], i + tag[0].length);
      const stop = end === -1 ? src.length : end + tag[0].length;
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else {
      out += src[i];
      i += 1;
    }
  }
  return out;
}

/** The text of every `RETURN QUERY …;` in a body (masked), up to its terminating `;` at depth 0. */
export function returnQueryStatements(src: string): string[] {
  const masked = maskSql(src);
  const out: string[] = [];
  const re = /\breturn\s+query\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    let depth = 0;
    let j = m.index + m[0].length;
    for (; j < masked.length; j += 1) {
      const ch = masked[j];
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      else if (ch === ";" && depth <= 0) break;
    }
    out.push(masked.slice(m.index + m[0].length, j).trim());
  }
  return out;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function judgeFunction(fn: ShapeFunction): ShapeFinding[] {
  const q = (s: string) => `"?${esc(s)}"?`;
  const rel = new RegExp(
    `\\b(from|join|update|into)\\s+(?:${q(fn.relSchema)}\\s*\\.\\s*)?${q(fn.relName)}(?![\\w"])(?!\\s*\\()`,
    "i",
  );
  return returnQueryStatements(fn.src)
    .filter((s) => !/^execute\b/i.test(s) && !rel.test(s))
    .map((s) => ({
      name: fn.name,
      returns: `${fn.relSchema}.${fn.relName}`,
      statement: s.replace(/\s+/g, " ").slice(0, 160),
    }));
}

const LIVE_SQL = `
select p.oid::regprocedure::text as name, p.prosrc as src, n2.nspname as rel_schema, c.relname as rel_name
  from pg_catalog.pg_proc p
  join pg_catalog.pg_language l on l.oid = p.prolang and l.lanname = 'plpgsql'
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_type t on t.oid = p.prorettype
  join pg_catalog.pg_class c on c.oid = t.typrelid and c.relkind in ('r', 'p')
  join pg_catalog.pg_namespace n2 on n2.oid = c.relnamespace
 where p.proretset
   and n.nspname <> 'information_schema' and n.nspname not like 'pg\\_%'
 order by 1`;

function selfTest(): number {
  const fn = (src: string, relSchema = "custom", relName = "record"): ShapeFunction => ({
    name: "t.f()",
    src,
    relSchema,
    relName,
  });
  const cases: Array<[string, ShapeFunction, number]> = [
    [
      "the DEFECT-46 applicable_fields shape is flagged (both statements)",
      fn(`begin if x then return query select * from jsonb_populate_recordset(null::custom.record, v_hit::jsonb); return; end if;
          return query select * from jsonb_populate_recordset(null::custom.record, v_json); end`),
      2,
    ],
    [
      "the DEFECT-46 dict_upsert shape (SELECT * FROM <function>()) is flagged",
      fn(`BEGIN RETURN QUERY SELECT * FROM public.dict_list_entries_for(p_user_id, p_level, p_owner_id); END;`, "dictionary", "dict_entries"),
      1,
    ],
    ["RETURN QUERY EXECUTE passes", fn(`begin return query execute 'select * from jsonb_populate_recordset(null::custom.record, $1)' using v; end`), 0],
    ["a qualified table read passes", fn(`begin return query select r.* from custom.record r where r.id = p; end`), 0],
    ["an unqualified, quoted table read passes", fn(`begin return query select * from "record" where id = p; end`), 0],
    ["UPDATE … RETURNING passes", fn(`begin return query with c as (select 1) update custom.record n set x = 1 from c returning n.*; end`), 0],
    ["a JOIN read passes", fn(`begin return query select r.* from x join custom.record r on r.id = x.id; end`), 0],
    ["a table name only in a comment does not pass", fn(`begin return query -- from custom.record\n select * from jsonb_populate_recordset(null::custom.record, v); end`), 1],
    ["a table name only in a string does not pass", fn(`begin return query select * from jsonb_populate_recordset(null::custom.record, 'from custom.record'::jsonb); end`), 1],
    ["a same-named FUNCTION is not a table read", fn(`begin return query select * from custom.record(p); end`), 1],
    ["a longer table name is not this table", fn(`begin return query select * from custom.record_history h; end`), 1],
    ["a semicolon inside parentheses does not end the statement", fn(`begin return query select * from (select 1) s join custom.record r on true; end`), 0],
  ];
  let failed = 0;
  for (const [what, f, want] of cases) {
    const got = judgeFunction(f).length;
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? "[ OK ]" : "[FAIL]"} ${what}${ok ? "" : ` — expected ${want} finding(s), got ${got}`}`);
  }
  console.log(failed ? `self-test FAILED (${failed})` : `self-test passed (${cases.length} cases)`);
  return failed ? 1 : 0;
}

async function prove(client: { query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }> }): Promise<number> {
  // ONE transaction, rolled back: the gate connection may go through the transaction pooler, where only a
  // transaction is sure to stay on one server session. pg_temp objects only; nothing on live is touched.
  const attempt = async (sql: string): Promise<string> => {
    await client.query("savepoint d46_try");
    try {
      await client.query(sql);
      await client.query("release savepoint d46_try");
      return "";
    } catch (e) {
      await client.query("rollback to savepoint d46_try");
      return String((e as Error).message);
    }
  };
  await client.query("begin");
  try {
    await client.query(`create temp table d46_probe(a int, b int) on commit drop`);
    await client.query(`create function pg_temp.d46_flagged() returns setof pg_temp.d46_probe language plpgsql as $$
      begin return query select * from jsonb_populate_recordset(null::pg_temp.d46_probe, '[{"a":1}]'); end $$`);
    await client.query(`create function pg_temp.d46_execute() returns setof pg_temp.d46_probe language plpgsql as $$
      begin return query execute 'select * from jsonb_populate_recordset(null::pg_temp.d46_probe, $1)' using '[{"a":1}]'::jsonb; end $$`);
    await client.query(`select * from pg_temp.d46_flagged()`);
    await client.query(`select * from pg_temp.d46_execute()`);
    await client.query(`alter table pg_temp.d46_probe add column c int`);
    const flaggedError = await attempt(`select * from pg_temp.d46_flagged()`);
    const executeError = await attempt(`select * from pg_temp.d46_execute()`);
    const ok1 = /structure of query does not match function result type/.test(flaggedError);
    const ok2 = executeError === "";
    console.log(`${ok1 ? "[ OK ]" : "[FAIL]"} the flagged shape fails after the table gains a column${ok1 ? ` (${flaggedError})` : ` — it did not: '${flaggedError}'`}`);
    console.log(`${ok2 ? "[ OK ]" : "[FAIL]"} the EXECUTE shape survives the same change${ok2 ? "" : ` — ${executeError}`}`);
    return ok1 && ok2 ? 0 : 1;
  } finally {
    await client.query("rollback");
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) return selfTest();
  const env = loadDbEnv();
  if (!("host" in env)) {
    console.error("UNMEASURED: no database credentials. A guard that cannot measure has not passed.");
    return 2;
  }
  let client;
  try {
    client = await openGateDb(env, { gate: "check:return-query-shapes" });
  } catch (error) {
    console.error(`UNMEASURED: could not reach the database — ${String(error)}`);
    return 2;
  }
  try {
    if (args.includes("--prove")) return await prove(client as never);
    const res = await client.query(LIVE_SQL);
    const fns: ShapeFunction[] = res.rows.map((r: Record<string, string>) => ({
      name: r.name!,
      src: r.src!,
      relSchema: r.rel_schema!,
      relName: r.rel_name!,
    }));
    const findings = fns.flatMap(judgeFunction);
    console.log(`judged ${fns.length} set-returning plpgsql functions that return a table's row type`);
    for (const f of findings) {
      console.log(`[FAIL] ${f.name} returns ${f.returns} from a cached TYPE expansion — RETURN QUERY ${f.statement}`);
    }
    if (findings.length) {
      console.log(
        `${findings.length} statement(s) go stale when their table gains a column. Fix: RETURN QUERY EXECUTE '<same select>' USING … (DEFECT-46).`,
      );
      return 1;
    }
    console.log("[ OK ] every RETURN QUERY reads its table or uses EXECUTE");
    return 0;
  } finally {
    await client.end();
  }
}

main().then(
  (code) => exitAfterDrain(code),
  (error) => {
    console.error(error);
    exitAfterDrain(1);
  },
);
