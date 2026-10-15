/**
 * LANE AT-FORMULA: THE TWO EVALUATORS, SAME CASES. Every case in
 * aidream/apps/shared/kit/src/formula-airtable.cases.ts is (1) read by the store's own parser
 * (custom._fxp_tokens + custom._fxp_level), (2) worked out by custom.formula_eval on production
 * inside a read-only transaction, and (3) worked out by the client evaluator
 * (@ai-matrx/kit/formula). The store's answer must equal the documented expectation, the client's
 * must equal it, and the two must equal each other. Writes nothing.
 *
 * RUN: pnpm tsx scripts/campaign-tests/formula_airtable_parity.mts
 */
import process from "node:process";
import { connectDirect, loadDbEnv } from "../lib/direct-db";
import { evaluateFormula, parseFormula } from "../../../aidream/apps/shared/kit/src/formula";
import { AIRTABLE_CASES } from "../../../aidream/apps/shared/kit/src/formula-airtable.cases";

const env = loadDbEnv();
if ("missing" in env) throw new Error(`no database connection variables: ${env.missing.join(", ")}`);
const client = await connectDirect(env, "formula-airtable-parity");

const norm = (v: unknown): unknown => {
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "number") return Number(v);
  return v;
};

let bad = 0;
let n = 0;
try {
  await client.query("begin read only");
  for (const c of AIRTABLE_CASES) {
    n += 1;
    // the client
    const parsed = parseFormula(c.formula);
    const clientRes = parsed.ok ? evaluateFormula(parsed.ast, () => undefined) : { ok: false as const, error: parsed.error };
    const clientVal = clientRes.ok ? norm(clientRes.value) : `ERROR: ${clientRes.error}`;
    // the store
    let storeVal: unknown;
    try {
      const r = await client.query(
        "select custom.formula_eval(null::uuid, (custom._fxp_level(custom._fxp_tokens($1), 0, 0)) -> 'n', '{}'::jsonb, '{}'::jsonb) as v",
        [c.formula],
      );
      storeVal = norm(r.rows[0].v);
    } catch (e) {
      storeVal = `ERROR: ${(e as Error).message}`;
      await client.query("rollback");
      await client.query("begin read only");
    }
    const ok = storeVal === c.expect && clientVal === c.expect;
    if (!ok) {
      bad += 1;
      console.log(`DISAGREE  ${c.formula}\n   expected ${JSON.stringify(c.expect)}\n   store    ${JSON.stringify(storeVal)}\n   client   ${JSON.stringify(clientVal)}`);
    }
  }
  await client.query("rollback");
} finally {
  await client.end();
}
console.log(`${n - bad} of ${n} cases: store = client = Airtable's documented answer`);
process.exit(bad ? 1 : 0);
