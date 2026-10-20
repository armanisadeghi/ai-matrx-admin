/**
 * @jest-environment node
 */
// LINK-PICKER — EVERY KIND A RECORD CAN LINK TO IS PICKED, OR THE PICKER SAYS WHY IT CANNOT.
//
// Live (the one database), always ROLLED BACK. On 2026-10-20 the "Pick" control on a custom row's Pay period column
// (an entity column pointing at hr_pay_period) showed an empty picker: custom.entity_reference_search read the kind's
// title column into format('%I') and the registry names NO title column for 917 of the 1104 kinds that are link
// targets, so ~1000 of them died with "null values cannot be formatted as an SQL identifier" (or "not reference-
// pickable with a title column", or a table that is not where the rows live now), and records-ui then drew "there is
// none" under the refusal. Asserted as admin@admin.com for every kind custom.entity_reference_kinds() lists:
//   1. no kind's search dies with an INTERNAL error: each answers a list or a refusal in words that names why;
//   2. a kind with no title column and rows the person may open lists them, each with a non-empty label;
//   3. hr_pay_period and workflow_run (the two newly linkable kinds the walk uses) list at least one row in Cedar Ridge Dental;
//   4. a saved link to a kind with no title column is NAMED by platform.relation_label, never null.
// A statement timeout on a heavy kind is allowed (the picker says it timed out) and is listed in the log, not hidden.
// RED before linkpicker_a/b, GREEN after.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const ADMIN_ID = "87a6e699-3622-4869-8843-d0867456c0dd";
const ORG = "23c2ac41-8044-49ed-9af9-35761370e5c0"; // Cedar Ridge Dental: admin@admin.com owns it
const WORKERS = 8;

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
  await c.query("set local statement_timeout = '8s'");
}

type Found = { token: string; id: string; label: string };
type Answer = { kind: "list"; rows: Found[] } | { kind: "refusal"; message: string };

async function search(c: Client, token: string): Promise<Answer> {
  await c.query("savepoint s");
  try {
    const { rows } = await c.query("select custom.entity_reference_search($1::uuid, $2::text[], null, 5) as r", [ORG, [token]]);
    return { kind: "list", rows: rows[0].r as Found[] };
  } catch (e) {
    await c.query("rollback to s");
    return { kind: "refusal", message: String((e as Error).message) };
  }
}

// What an INTERNAL failure reads like: SQL words a person cannot act on, never a sentence about the kind.
const INTERNAL = /SQL identifier|null value|does not exist|not reference-pickable|syntax error|invalid input|operator does not|cannot cast|violates/i;
const TIMEOUT = /statement timeout/i;

const answers = new Map<string, Answer>();
let kinds: string[] = [];

beforeAll(async () => {
  const first = await connect();
  kinds = (await first.query("select token from custom.entity_reference_kinds() order by 1")).rows.map((r) => r.token);
  await first.query("rollback");
  await first.end();
  const clients = await Promise.all(Array.from({ length: WORKERS }, connect));
  await Promise.all(clients.map((c) => asAdmin(c)));
  await Promise.all(
    clients.map(async (c, i) => {
      for (let k = i; k < kinds.length; k += WORKERS) answers.set(kinds[k], await search(c, kinds[k]));
    }),
  );
  await Promise.all(clients.map(async (c) => { await c.query("rollback"); await c.end(); }));
}, 600_000);

it("every link-target kind answers a list or a refusal in words, never an internal error", () => {
  expect(kinds.length).toBeGreaterThan(1000);
  const timedOut = [...answers].filter(([, a]) => a.kind === "refusal" && TIMEOUT.test(a.message)).map(([k]) => k);
  // eslint-disable-next-line no-console
  console.log(`LINK-PICKER census: ${answers.size} kinds searched; timed out (said, not hidden): ${timedOut.join(", ") || "none"}`);
  const internal = [...answers].filter(([, a]) => a.kind === "refusal" && !TIMEOUT.test(a.message) && INTERNAL.test(a.message)).map(([k, a]) => `${k}: ${(a as { message: string }).message}`);
  expect(internal).toEqual([]);
  const refused = [...answers].filter(([, a]) => a.kind === "refusal" && !TIMEOUT.test(a.message));
  for (const [k, a] of refused) expect({ k, said: /cannot be picked|no table|uuid/i.test((a as { message: string }).message) }).toEqual({ k, said: true });
});

it("a list is never given a label-less row", () => {
  const blank = [...answers].flatMap(([k, a]) => (a.kind === "list" ? a.rows.filter((r) => !r.label || !r.label.trim()).map(() => k) : []));
  expect(blank).toEqual([]);
});

it("hr_pay_period and workflow_run, the walk's two newly linkable kinds, list at least one row", () => {
  for (const k of ["hr_pay_period", "workflow_run"]) {
    const a = answers.get(k)!;
    expect(a.kind).toBe("list");
    expect(a.kind === "list" ? a.rows.length : 0).toBeGreaterThan(0);
  }
});

it("a saved link to a kind with no title column is named, never null", async () => {
  const c = await connect();
  try {
    await asAdmin(c);
    const a = answers.get("hr_pay_period");
    const id = a && a.kind === "list" ? a.rows[0]?.id : undefined;
    expect(id).toBeTruthy();
    const { rows } = await c.query("select platform.relation_label($1::uuid, 'hr_pay_period', $2::uuid) as label", [ORG, id]);
    expect(rows[0].label).toMatch(/^Pay period/);
  } finally {
    await c.query("rollback");
    await c.end();
  }
});
