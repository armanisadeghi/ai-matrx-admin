// scripts/forms/form-extras-proof.mjs — CD-PAGE-08's store half, proven on the one database.
//
//   node scripts/forms/form-extras-proof.mjs              the proofs against live, in ONE transaction that is ROLLED BACK
//   node scripts/forms/form-extras-proof.mjs --rehearse   applies formx_a_… inside that transaction first (before it is live)
//
// A disposable table ("Intake <tag>": name, plan, score) and a published form over it are made as admin@admin.com
// through the record store's own doors, and archived at the end. Every send, every password and every change happens
// inside one transaction that is rolled back, so no answer, password or record outlives the run. Before the migration the
// doors do not exist and every proof is RED; after it they are GREEN.
import pg from "pg";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { declareTable } from "@ai-matrx/records/core";
import { dsnFor, pgClient } from "../lib/pooled-db.mjs";
import { store } from "../airtable-walk/store.mjs";

const rehearse = process.argv.includes("--rehearse");
const MIGRATION = new URL("../../migrations/campaign/formx_a_a_form_can_be_locked_answered_again_and_keeps_its_score.sql", import.meta.url);
const must = (r, what) => { if (!r.ok) throw new Error(`${what}: ${JSON.stringify(r.error).slice(0, 300)}`); return r.data; };
const tag = Date.now().toString(36);

const { sb, client: records } = await store();
const { data: who } = await sb.auth.getUser();
const adminId = who.user.id;
const table = must(await declareTable(records, {
  name: `Intake ${tag}`, labelSingular: "Intake", labelPlural: "Intakes",
  fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "plan", label: "Plan", type: "text", sort: 20 },
    { key: "score", label: "Score", type: "number", sort: 30 }],
}), "table");
const formId = must(await records.formDeclare({
  table_id: table, title: `Intake form ${tag}`,
  questions: [{ field: "name", required: true }, { field: "plan", points: { pro: 7, basic: 2 } }],
  presentation: { allow_edit: true, score_field: "score" },
}), "form");
must(await records.anonPublish({ form_id: formId, published: true }), "publish");
console.log("TABLE", table, "FORM", formId);

const db = pgClient(pg, dsnFor("production", { app: "form-extras-proof" }));
await db.connect();
let failures = 0;
const results = [];
const proof = async (name, fn) => {
  await db.query("savepoint p");
  try { await fn(); results.push(`GREEN ${name}`); await db.query("release savepoint p"); }
  catch (e) { failures++; results.push(`RED   ${name} — ${String(e.message).split("\n")[0].slice(0, 200)}`); await db.query("rollback to savepoint p"); }
};
const one = async (sql, args) => (await db.query(sql, args)).rows[0];
const asAdmin = () => db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: adminId, role: "authenticated" })]);
const asStranger = () => db.query("select set_config('request.jwt.claims', '', true)");
const submit = (payload, key = randomBytes(12).toString("hex")) =>
  one("select * from custom.form_submit($1::uuid, 'https://proof.example', $2::jsonb, 'proof-bucket', null, $3)", [formId, JSON.stringify(payload), key]);
const recordOf = (id) => one("select data from custom.record where id = $1::uuid", [id]);
const expectRaise = async (fn, words) => {
  await db.query("savepoint r");
  try { await fn(); } catch (e) { await db.query("rollback to savepoint r"); if (!String(e.message).includes(words)) throw new Error(`raised "${e.message}", wanted "${words}"`); return; }
  throw new Error(`did not refuse (wanted "${words}")`);
};

try {
  await db.query("begin read write");
  await db.query("set local statement_timeout = '60s'");
  if (rehearse) await db.query(fs.readFileSync(MIGRATION, "utf8"));
  const secret = randomBytes(24).toString("base64url");
  let firstRecord = null;

  await proof("a form with no password is open", async () => {
    const r = await one("select custom.form_unlock($1::uuid, null, null) as r", [formId]);
    if (r.r?.state !== "open" || r.r.unlock) throw new Error(JSON.stringify(r.r));
  });
  await proof("a send keeps the score on the row and only the answer-again secret's hash", async () => {
    await asStranger();
    const out = await submit({ name: "Ana", plan: "pro", _edit: secret });
    if (out.state !== "accepted" || !out.record_id) throw new Error(JSON.stringify(out));
    firstRecord = out.record_id;
    const rec = await recordOf(out.record_id);
    if (Number(rec.data.score) !== 7) throw new Error(`score ${rec.data.score}`);
    const sub = await one("select metadata from custom.anon_submission where id = $1::uuid", [out.submission_id]);
    if (!/^[0-9a-f]{64}$/.test(sub.metadata.edit_hash ?? "") || JSON.stringify(sub.metadata).includes(secret)) throw new Error(JSON.stringify(sub.metadata));
  });
  await proof("the answer-again link opens the respondent's own answers; another secret opens nothing", async () => {
    const r = (await one("select custom.form_response_read($1::uuid, $2, null) as r", [formId, secret])).r;
    if (r.state !== "found" || r.answers.name !== "Ana" || r.answers.plan !== "pro") throw new Error(JSON.stringify(r));
    if ("score" in r.answers) throw new Error("handed back a column the form does not ask");
    const other = (await one("select custom.form_response_read($1::uuid, $2, null) as r", [formId, randomBytes(24).toString("base64url")])).r;
    if (other.state !== "not_found") throw new Error(JSON.stringify(other));
  });
  await proof("a change through the link rewrites the same record and its score", async () => {
    const out = await one("select * from custom.form_response_update($1::uuid, $2, 'https://proof.example', $3::jsonb, 'proof-bucket')",
      [formId, secret, JSON.stringify({ name: "Ana Ruiz", plan: "basic" })]);
    if (out.state !== "accepted" || out.record_id !== firstRecord) throw new Error(JSON.stringify(out));
    const rec = await recordOf(firstRecord);
    if (rec.data.name !== "Ana Ruiz" || rec.data.plan !== "basic" || Number(rec.data.score) !== 2) throw new Error(JSON.stringify(rec.data));
    const read = (await one("select custom.form_response_read($1::uuid, $2, null) as r", [formId, secret])).r;
    if (!read.edited_at) throw new Error("the change is not dated");
  });
  await proof("a change still answers the form's own refusals (a key it does not ask, a missing required answer)", async () => {
    await expectRaise(() => one("select * from custom.form_response_update($1::uuid, $2, 'x', $3::jsonb, 'b')", [formId, secret, JSON.stringify({ score: 99 })]), 'does not have a field called "score"');
    await expectRaise(() => one("select * from custom.form_response_update($1::uuid, $2, 'x', $3::jsonb, 'b')", [formId, secret, JSON.stringify({ name: "" })]), "This form needs name");
  });
  let fingerprint = null;
  await proof("the owner sets a password; a wrong one is locked, the right one opens with a fingerprint", async () => {
    await asAdmin();
    const set = (await one("select custom.form_set_password((select organization_id from custom.anon_form where id = $1::uuid), $1::uuid, 'harbor-42') as r", [formId])).r;
    if (set.has_password !== true) throw new Error(JSON.stringify(set));
    await asStranger();
    const wrong = (await one("select custom.form_unlock($1::uuid, 'nope', null) as r", [formId])).r;
    if (wrong.state !== "locked" || wrong.wrong !== true) throw new Error(JSON.stringify(wrong));
    const right = (await one("select custom.form_unlock($1::uuid, 'harbor-42', null) as r", [formId])).r;
    if (right.state !== "open" || !/^[0-9a-f]{64}$/.test(right.unlock)) throw new Error(JSON.stringify(right));
    fingerprint = right.unlock;
    const again = (await one("select custom.form_unlock($1::uuid, null, $2) as r", [formId, fingerprint])).r;
    if (again.state !== "open") throw new Error(JSON.stringify(again));
  });
  await proof("a protected form refuses a send without the password and takes one with it", async () => {
    await expectRaise(() => submit({ name: "Bo", plan: "pro" }), "This form needs its password");
    const out = await submit({ name: "Bo", plan: "pro", _unlock: fingerprint });
    if (out.state !== "accepted") throw new Error(JSON.stringify(out));
  });
  await proof("a password of three letters is refused in words, and '' clears it", async () => {
    await asAdmin();
    await expectRaise(() => one("select custom.form_set_password((select organization_id from custom.anon_form where id = $1::uuid), $1::uuid, 'abc')", [formId]), "4 to 128 characters");
    const cleared = (await one("select custom.form_set_password((select organization_id from custom.anon_form where id = $1::uuid), $1::uuid, '') as r", [formId])).r;
    if (cleared.has_password !== false) throw new Error(JSON.stringify(cleared));
    await asStranger();
  });
  await proof("a stranger cannot set a form's password", async () => {
    await asStranger();
    await expectRaise(() => one("select custom.form_set_password((select organization_id from custom.anon_form where id = $1::uuid), $1::uuid, 'harbor-42')", [formId]), "Nobody is signed in");
  });
  await proof("when the form stops allowing changes the link says so", async () => {
    await db.query("update custom.anon_form set presentation = presentation || '{\"allow_edit\": false}'::jsonb where id = $1::uuid", [formId]);
    const r = (await one("select custom.form_response_read($1::uuid, $2, null) as r", [formId, secret])).r;
    if (r.state !== "off") throw new Error(JSON.stringify(r));
  });
} catch (e) {
  failures++;
  results.push(`RED   setup — ${String(e.message).split("\n")[0]}`);
} finally {
  await db.query("rollback").catch(() => undefined);
  await db.end();
  for (const line of results) console.log(line);
  const archivedForm = await records.formArchive({ form_id: formId });
  let t; for (let i = 0; i < 10; i++) { t = await records.tableArchive({ table_id: table }); if (!t.ok || t.data?.done !== false) break; }
  console.log("cleanup form:", archivedForm.ok, "table:", t?.ok);
}
console.log(failures === 0 ? `ALL GREEN (${rehearse ? "rehearsed, rolled back" : "live, rolled back"})` : `${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
