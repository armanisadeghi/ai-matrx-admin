// CD-PAGE-08 live walk: a stranger answers a public form that uses every Typeform extra — a password, a Spanish
// translation, a calculated score, a receipt to the person who answered, and an answer-again link.
// A disposable table "Bike rentals <tag>" and its form are made as admin@admin.com through the store's doors and
// archived after; the receipt goes to an undeliverable fixtures.aimatrx.com address.
//   ORIGIN=http://<session>.localhost:3001 SHOTS=<dir> node scripts/forms/form-extras-walk.mjs
import fs from "node:fs";
import { chromium } from "playwright";
import pg from "pg";
import { declareTable } from "@ai-matrx/records/core";
import { dsnFor, pgClient } from "../lib/pooled-db.mjs";
import { store } from "../airtable-walk/store.mjs";

const ORIGIN = process.env.ORIGIN ?? "http://close-page.localhost:3001";
const SHOTS = process.env.SHOTS ?? "/tmp/cd-page-08";
fs.mkdirSync(SHOTS, { recursive: true });
const say = (...a) => console.log(...a);
const must = (r, w) => { if (!r.ok) throw new Error(`${w}: ${JSON.stringify(r.error).slice(0, 300)}`); return r.data; };
let fails = 0;
const check = (label, ok, detail = "") => { if (!ok) fails++; say((ok ? "PASS " : "FAIL ") + label + (detail ? `  (${String(detail).slice(0, 240)})` : "")); };
const tag = Date.now().toString(36);
const PASSWORD = `harbor-bikes-${tag}`;
const RECEIPT_TO = `walk.receipt.${tag}@fixtures.aimatrx.com`;

const { client } = await store();
let table = null, formId = null;
const db = pgClient(pg, dsnFor("production", { app: "form-extras-walk" }));
await db.connect();
const browser = await chromium.launch({ headless: true });
try {
  table = must(await declareTable(client, { name: `Bike rentals ${tag}`, labelSingular: "Rental", labelPlural: "Rentals",
    fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "email", label: "Email", type: "text", sort: 20 },
      { key: "plan", label: "Plan", type: "text", sort: 30 }, { key: "score", label: "Score", type: "number", sort: 40 }] }), "table");
  formId = must(await client.formDeclare({
    table_id: table, title: `Rent a bike ${tag}`,
    questions: [{ field: "name", ask: "What is your name?", required: true }, { field: "email", ask: "Where should we send your receipt?" },
      { field: "plan", ask: "Which plan, day or week?", points: { week: 7, day: 2 } }],
    presentation: {
      allow_edit: true, score_field: "score", notify: { email_respondent: true, respondent_field: "email" },
      languages: [{ code: "es", label: "Español", title: `Alquila una bici ${tag}`,
        questions: { name: { ask: "¿Cómo se llama?" }, email: { ask: "¿Adónde enviamos su recibo?" }, plan: { ask: "¿Qué plan, day o week?" } } }],
    },
  }), "form");
  must(await client.anonPublish({ form_id: formId, published: true }), "publish");
  const pw = must(await client.formSetPassword({ form_id: formId, password: PASSWORD }), "password");
  check("owner: the form carries a password", pw.has_password === true);
  say("TABLE", table, "FORM", formId);

  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
  ctx.setDefaultNavigationTimeout(300000);
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);

  // 1. Password.
  await page.goto(`${ORIGIN}/f/${formId}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-view-link-unlock]").waitFor({ timeout: 300000 });
  const locked = await page.locator("main").innerText();
  check("stranger: a protected form shows only its password box", /Password needed/.test(locked) && !/What is your name/.test(locked));
  await page.locator("input[name=password]").fill("not-the-password");
  await page.getByRole("button", { name: "Open" }).click();
  await page.locator("[data-view-link-wrong]").filter({ hasText: "That password is not right." }).waitFor({ timeout: 120000 });
  check("stranger: a wrong password is told so", true);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Open" }).click();
  await page.locator("[data-records-form-question]").first().waitFor({ timeout: 300000 });
  await page.screenshot({ path: `${SHOTS}/cd-page-08-1-unlocked.png` });
  check("stranger: the right password opens the form", /What is your name/.test(await page.locator("main").innerText()));

  // 2. Language.
  await page.goto(`${ORIGIN}/f/${formId}?lang=es`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-records-form-question]").first().waitFor({ timeout: 300000 });
  const es = await page.locator("main").innerText();
  await page.screenshot({ path: `${SHOTS}/cd-page-08-2-spanish.png` });
  check("stranger: ?lang=es draws the form in Spanish, its buttons too", /¿Cómo se llama\?/.test(es) && /Siguiente|Enviar/.test(es) && es.includes(`Alquila una bici ${tag}`), es.replace(/\s+/g, " ").slice(0, 200));
  check("stranger: the page offers its languages", (await page.locator("[data-form-languages] a").count()) === 2);

  // 3. Answer it in Spanish; the answers land under the form's own keys, with the score and a receipt.
  const answers = ["Lucía Ortega", RECEIPT_TO, "week"];
  for (const a of answers) {
    await page.locator("[data-records-form-question] input, [data-records-form-question] textarea").first().fill(a);
    await page.getByRole("button", { name: /Siguiente|Enviar/ }).last().click();
    await page.waitForTimeout(1200);
  }
  await page.locator("[data-form-edit-link]").waitFor({ timeout: 180000 });
  await page.screenshot({ path: `${SHOTS}/cd-page-08-3-sent.png` });
  const sentText = await page.locator("main").innerText();
  check("stranger: the sent page speaks Spanish too (no English left over)", /Respuestas recibidas/.test(sentText) && /Copiar mi enlace/.test(sentText) && !/Answers received|Copy my link/.test(sentText), sentText.replace(/\s+/g, " ").slice(0, 200));
  const row = (await db.query("select r.id, r.data from custom.record r join custom.anon_submission s on s.record_id = r.id where s.form_id = $1::uuid order by s.created_at desc limit 1", [formId])).rows[0];
  check("store: her answers became a row under the form's keys", row?.data?.name === "Lucía Ortega" && row?.data?.plan === "week", JSON.stringify(row?.data));
  check("store: the calculated score is on her row", Number(row?.data?.score) === 7, `score ${row?.data?.score}`);
  const receipt = (await db.query("select to_address from communication.notification where event_key = 'custom.form.respondent_copy' and to_address = $1", [RECEIPT_TO])).rows;
  check("store: a receipt to the address she gave is queued", receipt.length === 1, JSON.stringify(receipt));

  // 4. The answer-again link.
  await page.locator("[data-form-edit-link] button").click();
  await page.waitForTimeout(500);
  const link = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  const shown = await page.locator("[data-form-edit-link]").innerText();
  const editUrl = /#answer=/.test(link) ? link : (shown.match(/https?:\/\/\S+#answer=\S+/)?.[0] ?? "");
  check("stranger: the sent page hands her a change-your-answers link", /#answer=[A-Za-z0-9_-]{24,}/.test(editUrl), shown.replace(/\s+/g, " "));
  const fresh = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const p2 = await fresh.newPage();
  p2.setDefaultTimeout(120000);
  // A new browser has no unlock cookie: the password first, then the link opens her answers.
  await p2.goto(editUrl.replace(/^https?:\/\/[^/]+/, ORIGIN), { waitUntil: "domcontentloaded", timeout: 300000 });
  if (await p2.locator("[data-view-link-unlock]").count()) {
    await p2.locator("input[name=password]").fill(PASSWORD);
    await p2.getByRole("button", { name: "Open" }).click();
    await p2.waitForLoadState("domcontentloaded");
    await p2.goto(editUrl.replace(/^https?:\/\/[^/]+/, ORIGIN), { waitUntil: "domcontentloaded", timeout: 300000 });
  }
  await p2.locator("[data-form-editing]").waitFor({ timeout: 300000 });
  check("stranger: the link opens her own answers to change", true);
  const field = () => p2.locator("[data-records-form-question] input, [data-records-form-question] textarea").first();
  for (let i = 0; i < 3; i++) {
    const v = await field().inputValue().catch(() => "");
    if (i === 2) await field().fill("day");
    else check(`stranger: her answer ${i + 1} is filled in`, v === answers[i], v);
    await p2.getByRole("button", { name: /Next|Save changes/ }).last().click();
    await p2.waitForTimeout(1200);
  }
  await p2.waitForTimeout(4000);
  await p2.screenshot({ path: `${SHOTS}/cd-page-08-4-changed.png` });
  const again = (await db.query("select data, (select count(*) from custom.anon_submission where form_id = $2::uuid) as sends from custom.record where id = $1::uuid", [row.id, formId])).rows[0];
  check("store: the change rewrote the same row and its score", again?.data?.plan === "day" && Number(again?.data?.score) === 2 && Number(again.sends) === 1, JSON.stringify(again));
  await fresh.close();
  await ctx.close();
} catch (e) {
  fails++;
  say("WALK ERROR", e.message);
} finally {
  await browser.close();
  await db.end().catch(() => {});
  if (formId) say("cleanup form:", JSON.stringify((await client.formArchive({ form_id: formId })).ok));
  if (table) { let r; for (let i = 0; i < 10; i++) { r = await client.tableArchive({ table_id: table }); if (!r.ok || r.data?.done !== false) break; } say("cleanup table:", JSON.stringify(r).slice(0, 80)); }
  say(fails === 0 ? "RESULT PASS" : `RESULT FAIL (${fails})`);
}
