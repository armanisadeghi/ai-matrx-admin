/**
 * @jest-environment node
 */
// RECORD-VIEW-AUDIT-3 — A CUSTOM VALUE SAVE ASKS THE PERSON'S RIGHT ON THE PARENT RECORD, NOT THE TABLE'S GRANTS.
//
// Live (the one database), always ROLLED BACK. admin@admin.com saves one custom value through the door the
// Custom fields section uses (custom.entity_row_write) on a row of each kind:
//   - hr_pay_period       HR's write guard arms only rows with a subject employee; a pay period has none.
//   - crm_sending_identity authenticated has no table-wide SELECT; the door read the row with to_jsonb(x).
//   - crm_deal            the control: a table whose own guard and grants were never in the way.
// RED before cfwrite_a_a_custom_value_write_follows_the_access_ladder.sql, GREEN after.
// And it proves the table's own rule for its own columns was not weakened: archiving a pay period through the
// same door (a real-column write) is still refused by HR's guard.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const ADMIN_ID = "87a6e699-3622-4869-8843-d0867456c0dd";

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
});
afterAll(async () => {
  await client.end();
});

async function asAdmin(): Promise<void> {
  await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [
    JSON.stringify({ sub: ADMIN_ID, role: "authenticated", email: "admin@admin.com" }),
    ADMIN_ID,
  ]);
  await client.query("set local role authenticated");
}

async function aRowOf(schema: string, table: string): Promise<{ id: string; organization_id: string }> {
  await client.query("reset role");
  await client.query("set local role authenticated");
  const { rows } = await client.query(
    `select id, organization_id from ${schema}.${table} where organization_id is not null order by id limit 1`,
  );
  if (rows.length === 0) throw new Error(`admin@admin.com can open no ${schema}.${table} row; the proof needs one`);
  return rows[0];
}

async function saveOne(token: string, schema: string, table: string): Promise<{ stored: unknown }> {
  const row = await aRowOf(schema, table);
  await client.query("select custom.entity_row_write($1, $2, $3, '{}'::jsonb, $4::jsonb)", [
    row.organization_id,
    token,
    row.id,
    JSON.stringify({ zz_audit3_probe: "saved" }),
  ]);
  await client.query("reset role");
  const back = await client.query(`select custom_fields ->> 'zz_audit3_probe' as v from ${schema}.${table} where id = $1`, [row.id]);
  await asAdmin();
  return { stored: back.rows[0].v };
}

describe.each([
  ["hr_pay_period", "hr", "pay_period"],
  ["crm_sending_identity", "crm", "sending_identity"],
  ["crm_deal", "crm", "deal"],
])("saving a custom value on %s", (token, schema, table) => {
  it("is accepted for a person who may edit the record", async () => {
    await client.query("begin");
    try {
      await asAdmin();
      const { stored } = await saveOne(token, schema, table);
      expect(stored).toBe("saved");
    } finally {
      await client.query("rollback");
    }
  });
});

describe("the table's own rule for its own columns stands", () => {
  it("archiving a pay period through the same door is still refused by HR's guard", async () => {
    await client.query("begin");
    try {
      await asAdmin();
      const row = await aRowOf("hr", "pay_period");
      await expect(
        client.query("select custom.entity_row_write($1, 'hr_pay_period', $2, '{}'::jsonb, '{}'::jsonb, null, true)", [
          row.organization_id,
          row.id,
        ]),
      ).rejects.toThrow(/hr_write_forbidden|no privileged HR write path/);
    } finally {
      await client.query("rollback");
    }
  });
});
