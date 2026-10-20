/**
 * @jest-environment node
 */
// LINK-PICKER-2 — THE COMMON LINK TARGETS ANSWER AT ONCE, AND ONLY KINDS A LINK CAN HOLD ARE OFFERED.
//
// Live (the one database), always ROLLED BACK, as admin@admin.com in Cedar Ridge Dental.
//   1. agent and file (the two commonest pickers) each list at least one row and answer in under FAST_PICKER_MS
//      once warm. Before linkpicker2 the search asked the access ladder about every container that reaches any
//      agent (3-6 s, called twice): 14 s for agent, 10 s for file, cut by the 8 s limit.
//   2. custom.entity_reference_kinds() offers no kind whose table identifies its rows by anything but a uuid (activity,
//      courts, opinions ... 26 of them): a link is a uuid edge and cannot hold their ids. Before linkpicker2_d the list
//      offered all 26 and only the write gate refused them.
// RED before linkpicker2 (run with the four inverse files applied inside a rolled-back transaction), GREEN after.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const ADMIN_ID = "87a6e699-3622-4869-8843-d0867456c0dd";
const ORG = "23c2ac41-8044-49ed-9af9-35761370e5c0";
const FAST_PICKER_MS = 500;

function dbEnv(): Record<string, string> {
  const text = readFileSync("/Users/armanisadeghi/code/aidream/.env", "utf8");
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^(SUPABASE_MATRIX_(?:HOST|PORT|USER|PASSWORD|DATABASE_NAME))=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function connect(): Promise<Client> {
  const e = dbEnv();
  const c = new Client({
    host: e.SUPABASE_MATRIX_HOST,
    port: Number(e.SUPABASE_MATRIX_PORT),
    user: e.SUPABASE_MATRIX_USER,
    password: e.SUPABASE_MATRIX_PASSWORD,
    database: e.SUPABASE_MATRIX_DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query("begin");
  return c;
}

async function asAdmin(c: Client): Promise<void> {
  await c.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [
    JSON.stringify({ sub: ADMIN_ID, role: "authenticated", email: "admin@admin.com" }),
    ADMIN_ID,
  ]);
  await c.query("set local role authenticated");
  await c.query("set local statement_timeout = '20s'");
}

async function timedSearch(c: Client, token: string): Promise<{ ms: number; rows: number }> {
  const t = Date.now();
  const { rows } = await c.query("select jsonb_array_length(custom.entity_reference_search($1::uuid, $2::text[], null, 20)) as n", [ORG, [token]]);
  return { ms: Date.now() - t, rows: Number(rows[0].n) };
}

describe.each(["agent", "file"])("the %s picker", (token) => {
  it(`lists rows in under ${FAST_PICKER_MS} ms once warm`, async () => {
    const c = await connect();
    try {
      await asAdmin(c);
      await timedSearch(c, token); // warm the caches the way a person's first open does
      const best = Math.min(...(await Promise.all([0, 1, 2].map(() => timedSearch(c, token)))).map((r) => r.ms));
      const again = await timedSearch(c, token);
      expect(again.rows).toBeGreaterThan(0);
      expect(Math.min(best, again.ms)).toBeLessThan(FAST_PICKER_MS);
    } finally {
      await c.query("rollback");
      await c.end();
    }
  }, 120_000);
});

it("no kind the picker offers has an id a link cannot hold", async () => {
  const c = await connect();
  try {
    const { rows } = await c.query(`
      select k.token, a.atttypid::regtype::text as id_type
        from custom.entity_reference_kinds() k
        join platform.entity_types e on e.token = k.token
        join pg_catalog.pg_namespace n on n.nspname = e.schema_name
        join pg_catalog.pg_class cl on cl.relnamespace = n.oid and cl.relname = e.table_name
        join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attname = 'id' and a.attnum > 0 and not a.attisdropped
       where a.atttypid <> 'uuid'::regtype
       order by 1`);
    expect(rows).toEqual([]);
  } finally {
    await c.query("rollback");
    await c.end();
  }
});
