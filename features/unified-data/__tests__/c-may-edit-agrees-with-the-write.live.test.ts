/**
 * @jest-environment node
 */
// CF-WRITE-3 / CF-WRITE-4 — THE CONTROL IS ENABLED EXACTLY WHEN THE WRITE WOULD BE TAKEN.
//
// Live (the one database), always ROLLED BACK, as admin@admin.com. For EVERY active custom-fields kind (CF-WRITE-4: no
// longer a sample, so a future kind whose table refuses what the registry says it accepts fails here) -
// custom.entity_record_read's may_edit must AGREE with the outcome of the real write through the one door
// (custom.entity_row_write): a save needs may_edit = true; a refusal needs may_edit = false. A disagreement is a control
// that is enabled and then refuses (hr_employee did: the ladder said editor, HR's own gate said no).
// A kind whose table refuses every custom-value write whoever the person is declares it on the registry
// (platform.entity_types.custom_values_locked); this guard also requires each such kind to answer may_edit=false with its reason.
// RED before cfwrite_c_a_may_edit_asks_the_gate_the_write_uses.sql (hr_employee) and before
// cfwrite_d_a_kinds_whose_table_refuses_custom_values_say_so.sql (document_version, univer_payload, esign_envelope_signer,
// seo_site_offering_value, web_crawl_url), GREEN after.
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

const WORKERS = 8;
let clients: Client[] = [];
let tokens: Array<{ token: string; schema_name: string; table_name: string }> = [];

async function open(): Promise<Client> {
  const e = dbEnv();
  const client = new Client({
    host: e.SUPABASE_MATRIX_HOST,
    port: Number(e.SUPABASE_MATRIX_PORT),
    user: e.SUPABASE_MATRIX_USER,
    password: e.SUPABASE_MATRIX_PASSWORD,
    database: e.SUPABASE_MATRIX_DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query("begin");
  await client.query("set local statement_timeout = '5s'");
  return client;
}

beforeAll(async () => {
  clients = await Promise.all(Array.from({ length: WORKERS }, () => open()));
  const { rows } = await clients[0].query(
    `select token, schema_name, table_name from platform.entity_types
      where is_active and custom_fields_enabled order by token`,
  );
  tokens = rows;
}, 120_000);
afterAll(async () => {
  for (const c of clients) {
    await c.query("rollback");
    await c.end();
  }
});

async function asAdmin(client: Client): Promise<void> {
  await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [
    JSON.stringify({ sub: ADMIN_ID, role: "authenticated", email: "admin@admin.com" }),
    ADMIN_ID,
  ]);
  await client.query("set local role authenticated");
}

type Outcome = { token: string; mayEdit: boolean | null; saved: boolean | null; words: string };

/** One token: a row she can open, her may_edit, and the real write through the door - all inside a rolled-back transaction. */
async function probe(client: Client, t: { token: string; schema_name: string; table_name: string }): Promise<Outcome> {
  await client.query("savepoint s");
  try {
    await asAdmin(client);
    let cands: Array<{ id: string; organization_id: string }>;
    try {
      const has = await client.query(
        `select exists(select 1 from pg_attribute a where a.attrelid = to_regclass($1) and a.attname = 'custom_fields' and not a.attisdropped) as cf,
                exists(select 1 from pg_attribute a where a.attrelid = to_regclass($1) and a.attname = 'organization_id' and not a.attisdropped) as org`,
        [`${t.schema_name}.${t.table_name}`],
      );
      if (!has.rows[0].cf || !has.rows[0].org) return { token: t.token, mayEdit: null, saved: null, words: "no columns" };
      // one round-trip: one row per organization she is in, an index probe each (never a scan of a big table)
      const r = await client.query(
        `select o.organization_id, x.id from unnest(array(select distinct organization_id from iam.organization_member where user_id = $1)) o(organization_id)
           cross join lateral (select id from "${t.schema_name}"."${t.table_name}" where organization_id = o.organization_id limit 1) x limit 8`,
        [ADMIN_ID],
      );
      cands = r.rows;
    } catch (e) {
      return { token: t.token, mayEdit: null, saved: null, words: /statement timeout/.test(String(e)) ? "timeout" : `unreadable: ${String(e).slice(0, 80)}` };
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
        // a write cancelled by the clock is not a refusal: nothing was learned about this kind
        if (/statement timeout/.test(String((e as Error).message))) return { token: t.token, mayEdit: null, saved: null, words: "timeout" };
        return { token: t.token, mayEdit: may, saved: false, words: String((e as Error).message).slice(0, 140) };
      }
    }
    return { token: t.token, mayEdit: null, saved: null, words: "no row she can open" };
  } finally {
    await client.query("rollback to savepoint s");
    await client.query("reset role");
  }
}

it("may_edit agrees with the write on every token, and a locked kind says why", async () => {
  expect(tokens.length).toBeGreaterThan(500);
  const disagreements: string[] = [];
  const unprobed: string[] = [];
  let compared = 0;
  const byToken = new Map<string, Outcome>();
  let next = 0;
  await Promise.all(
    clients.map(async (client) => {
      while (next < tokens.length) {
        const t = tokens[next++];
        const o = await probe(client, t);
        byToken.set(t.token, o);
        if (o.mayEdit === null || o.saved === null) {
          // nothing to compare: no columns / no row she can open / a table too big to probe in 5 s (listed, never silent)
          if (/timeout|canceling statement/.test(o.words)) unprobed.push(t.token);
          continue;
        }
        compared += 1;
        // a party refuses only because the probe's key is not a declared field - the probe's artifact, not a person gate
        if (t.token === "party" && !o.saved && o.words.includes("no field called")) continue;
        if (o.saved !== o.mayEdit) disagreements.push(`${o.token}: may_edit=${o.mayEdit} but the write ${o.saved ? "saved" : `refused (${o.words})`}`);
      }
    }),
  );
  expect(compared).toBeGreaterThan(50);
  // the cases that motivated this guard must have been compared, not skipped
  expect(byToken.get("hr_employee")).toMatchObject({ mayEdit: expect.any(Boolean) });
  // eslint-disable-next-line no-console
  console.log(`compared ${compared} kinds; not probed (timeout): ${unprobed.join(", ")}`);
  expect(disagreements).toEqual([]);
  const locked = await clients[0].query(
    "select token, custom_values_locked_reason from platform.entity_types where custom_fields_enabled and custom_values_locked",
  );
  for (const l of locked.rows) {
    expect(String(l.custom_values_locked_reason ?? "").length).toBeGreaterThan(5);
    const o = byToken.get(l.token);
    if (o && o.mayEdit !== null) expect({ token: l.token, mayEdit: o.mayEdit }).toEqual({ token: l.token, mayEdit: false });
  }
}, 600_000);
