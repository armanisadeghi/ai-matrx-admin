/**
 * @jest-environment node
 */
// CF-WRITE-3 — THE CONTROL IS ENABLED EXACTLY WHEN THE WRITE WOULD BE TAKEN.
//
// Live (the one database), always ROLLED BACK, as admin@admin.com. For a sample of tokens - every HR kind and a spread of
// the others - custom.entity_record_read's may_edit must AGREE with the outcome of the real write through the one door
// (custom.entity_row_write): a save needs may_edit = true; a refusal needs may_edit = false. A disagreement is a control
// that is enabled and then refuses (hr_employee did: the ladder said editor, HR's own gate said no).
// The full sweep over every token is scripts/custom-fields-write/census_probe.py (exit 1 on any DISAGREE).
// RED before cfwrite_c_a_may_edit_asks_the_gate_the_write_uses.sql, GREEN after.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const ADMIN_ID = "87a6e699-3622-4869-8843-d0867456c0dd";
const OTHERS = ["team", "rulebook", "category", "billing_usage_ledger", "iam_api_key", "workflow_run", "agent", "note"];

function dbEnv(): Record<string, string> {
  const text = readFileSync("/Users/armanisadeghi/code/aidream/.env", "utf8");
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^(SUPABASE_MATRIX_(?:HOST|PORT|USER|PASSWORD|DATABASE_NAME))=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

let client: Client;
let tokens: Array<{ token: string; schema_name: string; table_name: string }> = [];

beforeAll(async () => {
  const e = dbEnv();
  client = new Client({
    host: e.SUPABASE_MATRIX_HOST,
    port: Number(e.SUPABASE_MATRIX_PORT),
    user: e.SUPABASE_MATRIX_USER,
    password: e.SUPABASE_MATRIX_PASSWORD,
    database: e.SUPABASE_MATRIX_DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query("begin");
  await client.query("set local statement_timeout = '8s'");
  const { rows } = await client.query(
    `select token, schema_name, table_name from platform.entity_types
      where is_active and custom_fields_enabled and (schema_name = 'hr' or token = any($1)) order by token`,
    [OTHERS],
  );
  tokens = rows;
}, 60_000);
afterAll(async () => {
  await client.query("rollback");
  await client.end();
});

async function asAdmin(): Promise<void> {
  await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [
    JSON.stringify({ sub: ADMIN_ID, role: "authenticated", email: "admin@admin.com" }),
    ADMIN_ID,
  ]);
  await client.query("set local role authenticated");
}

type Outcome = { token: string; mayEdit: boolean | null; saved: boolean | null; words: string };

/** One token: a row she can open, her may_edit, and the real write through the door - all inside a rolled-back transaction. */
async function probe(t: { token: string; schema_name: string; table_name: string }): Promise<Outcome> {
  await client.query("savepoint s");
  try {
    await asAdmin();
    let cands: Array<{ id: string; organization_id: string }>;
    try {
      const has = await client.query(
        `select exists(select 1 from pg_attribute a where a.attrelid = to_regclass($1) and a.attname = 'custom_fields' and not a.attisdropped) as cf,
                exists(select 1 from pg_attribute a where a.attrelid = to_regclass($1) and a.attname = 'organization_id' and not a.attisdropped) as org`,
        [`${t.schema_name}.${t.table_name}`],
      );
      if (!has.rows[0].cf || !has.rows[0].org) return { token: t.token, mayEdit: null, saved: null, words: "no columns" };
      const r = await client.query(
        `select distinct on (organization_id) id, organization_id from "${t.schema_name}"."${t.table_name}"
          where organization_id in (select organization_id from iam.organization_member where user_id = $1) limit 8`,
        [ADMIN_ID],
      );
      cands = r.rows;
    } catch (e) {
      return { token: t.token, mayEdit: null, saved: null, words: `unreadable: ${String(e).slice(0, 80)}` };
    }
    for (const c of cands) {
      await client.query("savepoint r");
      let may: boolean | null = null;
      try {
        const a = await client.query("select custom.entity_record_read($1, $2, $3) as a", [c.organization_id, t.token, c.id]);
        may = a.rows[0].a.may_edit;
      } catch {
        await client.query("rollback to savepoint r");
        continue;
      }
      await client.query("savepoint w");
      try {
        await client.query("select custom.entity_row_write($1, $2, $3, '{}'::jsonb, $4::jsonb)", [
          c.organization_id,
          t.token,
          c.id,
          '{"zz_probe":"x"}',
        ]);
        return { token: t.token, mayEdit: may, saved: true, words: "" };
      } catch (e) {
        await client.query("rollback to savepoint w");
        return { token: t.token, mayEdit: may, saved: false, words: String((e as Error).message).slice(0, 140) };
      }
    }
    return { token: t.token, mayEdit: null, saved: null, words: "no row she can open" };
  } finally {
    await client.query("rollback to savepoint s");
    await client.query("reset role");
  }
}

it("may_edit agrees with the write on every sampled token", async () => {
  expect(tokens.length).toBeGreaterThan(10);
  const disagreements: string[] = [];
  let compared = 0;
  const hrEmployee: Outcome[] = [];
  for (const t of tokens) {
    const o = await probe(t);
    if (o.mayEdit === null || o.saved === null) continue;
    compared += 1;
    if (t.token === "hr_employee") hrEmployee.push(o);
    // a party refuses only because the probe's key is not a declared field - the probe's artifact, not a person gate
    if (t.token === "party" && !o.saved && o.words.includes("no field called")) continue;
    if (o.saved !== o.mayEdit) disagreements.push(`${o.token}: may_edit=${o.mayEdit} but the write ${o.saved ? "saved" : `refused (${o.words})`}`);
  }
  expect(compared).toBeGreaterThan(5);
  // the case that motivated this guard must have been compared, not skipped
  expect(hrEmployee.length).toBe(1);
  expect(disagreements).toEqual([]);
}, 240_000);
