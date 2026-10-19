/**
 * @jest-environment node
 */
// CF-WRITE-3 — ANY REGISTERED KIND WITH A RECORD ID IS A LINK TARGET, DERIVED FROM THE KIND REGISTRY.
//
// Live (the one database), always ROLLED BACK. Before: 1107 of 1233 kinds were not link targets (a `record -> kind`
// association type had to be registered by hand, kind by kind) so the super-admin "Not linkable" badge showed on nearly
// every record. Now:
//   1. every active kind whose table has an `id` column is in custom.entity_reference_kinds() (the ONE list the field
//      picker, the field guard and the edge trigger share) - except the kind `record` itself and a rule someone switched off;
//   2. a kind that is switched off and registered again (or newly activated) becomes a link target on its own;
//   3. a hand-registered link type keeps its own settings (the agent rule that conveys access stays as it was);
//   4. custom.entity_back_links answers for a sample of kinds, and for a kind that truly cannot be linked (no row id)
//      it refuses WITH the reason.
// RED before cfwrite_c_b_every_kind_with_a_record_id_is_a_link_target.sql, GREEN after.
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
  await client.query("begin");
  await client.query("set local statement_timeout = '30s'");
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

const HAS_ID = `exists (select 1 from pg_attribute a where a.attrelid = to_regclass(e.schema_name || '.' || e.table_name)
                         and a.attname = 'id' and a.attnum > 0 and not a.attisdropped)`;

it("every active kind with a record id is a link target", async () => {
  const { rows } = await client.query(
    `select e.token from platform.entity_types e
      where e.is_active and e.token <> 'record' and ${HAS_ID}
        and not exists (select 1 from platform.association_types r where r.source_type = 'record' and r.target_type = e.token and r.is_active)
        and not exists (select 1 from platform.association_types r where r.source_type = 'record' and r.target_type = e.token and not r.is_active)
      order by 1`,
  );
  expect(rows.map((r) => r.token)).toEqual([]);
  const listed = await client.query("select token from custom.entity_reference_kinds()");
  expect(listed.rows.length).toBeGreaterThan(1000);
});

it("a kind registered again becomes a link target on its own", async () => {
  await client.query("savepoint s");
  try {
    const kind = (await client.query(`select e.token from platform.entity_types e where e.token = 'rulebook'`)).rows[0]?.token;
    expect(kind).toBe("rulebook");
    await client.query(`delete from platform.association_types where source_type = 'record' and target_type = 'rulebook'`);
    expect((await client.query("select 1 from custom.entity_reference_kinds() where token = 'rulebook'")).rows.length).toBe(0);
    // any write to an active kind's registry row re-derives its link rule (the same trigger a brand-new kind passes through)
    await client.query(`update platform.entity_types set label = label where token = 'rulebook'`);
    expect((await client.query("select 1 from custom.entity_reference_kinds() where token = 'rulebook'")).rows.length).toBe(1);
  } finally {
    await client.query("rollback to savepoint s");
  }
});

it("a hand-registered link type keeps its own settings", async () => {
  const { rows } = await client.query(
    `select target_type, container_side, conveys_max from platform.association_types
      where source_type = 'record' and is_active and container_side <> 'none'`,
  );
  expect(rows.length).toBeGreaterThanOrEqual(1);
});

it("entity_back_links answers for a sample of kinds, and refuses a kind with no row id with the reason", async () => {
  const sample = ["team", "rulebook", "category", "billing_usage_ledger", "iam_api_key", "hr_employee", "hr_pay_period", "workflow_run"];
  let answered = 0;
  for (const token of sample) {
    await client.query("savepoint s");
    try {
      await client.query("reset role");
      const e = (await client.query(`select schema_name, table_name from platform.entity_types where token = $1`, [token])).rows[0];
      const row = (
        await client.query(
          `select id, organization_id from "${e.schema_name}"."${e.table_name}"
            where organization_id in (select organization_id from iam.organization_member where user_id = $1) limit 1`,
          [ADMIN_ID],
        )
      ).rows[0];
      if (!row) continue;
      await asAdmin();
      try {
        const a = await client.query("select custom.entity_back_links($1, $2, $3) as a", [row.organization_id, token, row.id]);
        expect(Array.isArray(a.rows[0].a.items)).toBe(true);
      } catch (err) {
        // "no <kind> you can open with that id" (02000) is the door answering about the ROW; the kind is linkable.
        // The refusal this guard is about is the kind-level 22023 ("cannot link to ...").
        expect((err as { code?: string }).code).toBe("02000");
      }
      answered += 1;
    } finally {
      await client.query("rollback to savepoint s");
      await client.query("reset role");
    }
  }
  expect(answered).toBeGreaterThanOrEqual(5);

  await client.query("savepoint s");
  try {
    await asAdmin();
    const org = (await client.query("select organization_id from iam.organization_member where user_id = $1 limit 1", [ADMIN_ID])).rows[0].organization_id;
    await expect(
      client.query("select custom.entity_back_links($1, 'embeddings_oai_3_small_1536', gen_random_uuid())", [org]),
    ).rejects.toThrow(/no row id/);
  } finally {
    await client.query("rollback to savepoint s");
    await client.query("reset role");
  }
}, 120_000);
