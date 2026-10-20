/**
 * @jest-environment node
 */
// ACCESS-BATCH-AGREE — ONE QUESTION, ONE ANSWER: THE BATCH AND THE ONE-AT-A-TIME ACCESS CHECKS AGREE.
//
// Live (the one database), one connection, always ROLLED BACK. For a sample of kinds (rows of each, soft-deleted ones
// included where the table has them) and three readers (admin@admin.com, test@test.com, a person in one organization):
//   1. the access kernel's set form, iam.has_access_for_many, answers every id exactly as the one-at-a-time kernel,
//      iam.has_access_for;
//   2. the link picker's batch gate (PICKER_BATCH, the set form the search walks with) admits exactly the ids that are a
//      live row AND that the one-at-a-time kernel opens - the per-row gate's answer (custom._entity_reference_target_ok
//      is the batch gate asked about one id, by construction).
// RED before accessbatchagree_a: the picker had no set form of its gate, and the kernel's set form (what LINK-PICKER-2
// tried, PICKER_BATCH_SQL=kernel) admits soft-deleted kg_chunks rows the per-row gate refuses. GREEN after: the per-row
// gate IS the batch gate asked about one id.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const ORG = "23c2ac41-8044-49ed-9af9-35761370e5c0";
const READERS: Record<string, string> = {
  admin: "87a6e699-3622-4869-8843-d0867456c0dd",
  member: "4060701e-706a-4c76-b3ca-0bbc69fa5a14",
  outsider: "929274b1-a889-41ee-8a7f-dbaec7b0ee54",
};
const KINDS = ["kg_chunks", "io_outbox", "agent", "file", "workflow_run", "hr_pay_period", "contact_submission", "web_result"];
const PER_KIND = 6;
const PICKER_BATCH =
  process.env.PICKER_BATCH_SQL === "kernel"
    ? "select m.target as id from iam.has_access_for_many($4::uuid, $3::uuid[], 'viewer', $2) m where m.allowed and $1::uuid is not null"
    : "select a as id from custom._entity_reference_allowed_for($4::uuid, $1::uuid, $2, $3::uuid[]) a";

function dbEnv(): Record<string, string> {
  const text = readFileSync("/Users/armanisadeghi/code/aidream/.env", "utf8");
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^(SUPABASE_MATRIX_(?:HOST|PORT|USER|PASSWORD|DATABASE_NAME))=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

let c: Client;
const samples: Record<string, string[]> = {};
const live: Record<string, Set<string>> = {};

beforeAll(async () => {
  const e = dbEnv();
  c = new Client({
    host: e.SUPABASE_MATRIX_HOST,
    port: Number(e.SUPABASE_MATRIX_PORT),
    user: e.SUPABASE_MATRIX_USER,
    password: e.SUPABASE_MATRIX_PASSWORD,
    database: e.SUPABASE_MATRIX_DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query("begin");
  await c.query("set local statement_timeout = '30s'");
  for (const kind of KINDS) {
    const src = await c.query("select s.schema_name, s.table_name from platform.entity_read_source($1) s", [kind]);
    const { schema_name: sch, table_name: tab } = src.rows[0];
    const sd = await c.query("select exists (select 1 from pg_attribute a where a.attrelid = to_regclass(format('%I.%I', $1::text, $2::text)) and a.attname = 'deleted_at' and not a.attisdropped) as sd", [sch, tab]);
    const q = `(select id from "${sch}"."${tab}" order by id limit ${PER_KIND})` + (sd.rows[0].sd ? ` union (select id from "${sch}"."${tab}" where deleted_at is not null limit 3)` : "");
    samples[kind] = (await c.query(`select array_agg(id) as ids from (${q}) z`)).rows[0].ids ?? [];
    const alive = sd.rows[0].sd ? `select array_agg(id::text) as ids from "${sch}"."${tab}" where id = any($1::uuid[]) and deleted_at is null` : `select array_agg(id::text) as ids from "${sch}"."${tab}" where id = any($1::uuid[])`;
    live[kind] = new Set((await c.query(alive, [samples[kind]])).rows[0].ids ?? []);
  }
}, 120_000);

afterAll(async () => {
  await c.query("rollback");
  await c.end();
});

test("the kernel's set form answers every id as the one-at-a-time kernel does", async () => {
  const disagree: string[] = [];
  for (const [who, uid] of Object.entries(READERS)) {
    for (const kind of KINDS) {
      const { rows } = await c.query(
        "select m.target::text as id, m.allowed as batch, coalesce(iam.has_access_for($1::uuid, $2, m.target, 'viewer'), false) as one from iam.has_access_for_many($1::uuid, $3::uuid[], 'viewer', $2) m",
        [uid, kind, samples[kind]],
      );
      for (const r of rows) if (r.batch !== r.one) disagree.push(`${kind} ${who} ${r.id} batch=${r.batch} one=${r.one}`);
    }
  }
  expect(disagree).toEqual([]);
}, 300_000);

test("the link picker's batch gate admits exactly the live rows the one-at-a-time kernel opens", async () => {
  // custom._entity_reference_target_ok is custom._entity_reference_allowed asked about one id (by construction, in its
  // body), and that is custom._entity_reference_allowed_for the signed-in person: so this is the per-row picker answer.
  const disagree: string[] = [];
  for (const [who, uid] of Object.entries(READERS)) {
    for (const kind of KINDS) {
      const batch = new Set((await c.query(PICKER_BATCH, [ORG, kind, samples[kind], uid])).rows.map((r) => String(r.id)));
      const { rows } = await c.query(
        "select x::text as id, coalesce(iam.has_access_for($1::uuid, $2, x, 'viewer'), false) as opens from unnest($3::uuid[]) x",
        [uid, kind, samples[kind]],
      );
      for (const r of rows.map((x) => ({ id: x.id as string, one: x.opens === true && live[kind].has(x.id) }))) if (r.one !== batch.has(r.id)) disagree.push(`${kind} ${who} ${r.id} batch=${batch.has(r.id)} one=${r.one}`);
    }
  }
  expect(disagree).toEqual([]);
}, 300_000);
