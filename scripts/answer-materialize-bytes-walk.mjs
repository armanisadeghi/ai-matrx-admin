// scripts/answer-materialize-bytes-walk.mjs — live proof that saving a chat answer's blocks as
// canvas rows (materialization) keeps every byte of the answer (2026-10-21). Headless,
// admin@admin.com via the login form (credentials from .env.local, never printed). Sends ONE short
// message to the Test Reply agent (cheap test agent, never General Chat) holding a chart, a
// progress tracker and a recipe, waits for the saved row, then compares it with the text the
// answer held before it was saved (content_history, reason artifact_materialization): every line
// must still be there and each saved <artifact> must wrap its block's body byte for byte. Archives
// the chat with the same status write the app's Archive makes.
//   node scripts/answer-materialize-bytes-walk.mjs <outDir> [origin] [width]
import { chromium } from "playwright";
import pg from "pg";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const readEnv = (path) =>
  existsSync(path)
    ? Object.fromEntries(
        readFileSync(path, "utf8").split("\n").map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
          .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
      )
    : {};
const env = readEnv(resolve(ROOT, ".env.local"));
const dbEnv = [env, readEnv(resolve(ROOT, ".env")), readEnv(resolve(ROOT, "..", "aidream", ".env"))].find(
  (e) => e.SUPABASE_MATRIX_USER && e.SUPABASE_MATRIX_PASSWORD && e.SUPABASE_MATRIX_HOST,
);
const OUT = process.argv[2] ?? "/tmp/answer-materialize-bytes";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const WIDTH = Number(process.argv[4] ?? 1440);
const PHONE = WIDTH < 768;
const TAG = PHONE ? "m" : "d";
const AGENT = process.env.CHAT_AGENT ?? "8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f";
mkdirSync(OUT, { recursive: true });
const RUN = `MB${Date.now().toString(36).slice(-5)}`;

const BLOCKS = [
  "```chart",
  `{"type":"pie","title":"${RUN} visits","data":[{"label":"Web","value":6},{"label":"App","value":4}]}`,
  "```",
  "",
  "<progress_tracker>",
  `### ${RUN} Launch`,
  "- [x] Plan",
  "- [ ] Ship",
  "</progress_tracker>",
  "",
  "<cooking_recipe>",
  `### ${RUN} Pancakes`,
  "Prep: 10 minutes",
  "#### Ingredients",
  "- 2 eggs",
  "#### Instructions",
  "1. Mix for 3 minutes",
  "</cooking_recipe>",
];
const MESSAGE = [
  `${RUN} chat. Repeat everything below back exactly, character for character, with no other words.`,
  "",
  ...BLOCKS,
].join("\n");

const textOf = (content) =>
  (Array.isArray(content) ? content : []).filter((b) => b?.type === "text").map((b) => b.text ?? "").join("");
const TAG_RE = /<artifact\b[^>]*\bid="([0-9a-f-]{36})"[^>]*>\n([\s\S]*?)\n<\/artifact>/g;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  PHONE
    ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: WIDTH, height: 900 } },
);
const page = await context.newPage();
await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
await page.goto(`${ORIGIN}/chat/a/${AGENT}`, { waitUntil: "domcontentloaded", timeout: 120000 });
const box = page.locator("textarea").first();
await box.waitFor({ timeout: 90000 });
await sleep(3000);
await box.fill(MESSAGE);
const send = page.getByRole("button", { name: /^send/i }).first();
if (await send.isVisible().catch(() => false)) await (PHONE ? send.tap() : send.click());
else await box.press("Enter");

let conversationId = null;
for (let i = 0; i < 90 && !conversationId; i++) {
  await sleep(1000);
  conversationId = page.url().match(/\/chat\/(?:c\/)?([0-9a-f-]{36})/)?.[1] ?? null;
}
const db = new pg.Client({
  host: dbEnv.SUPABASE_MATRIX_HOST, port: 5432 /* session pooler */,
  user: dbEnv.SUPABASE_MATRIX_USER, password: dbEnv.SUPABASE_MATRIX_PASSWORD,
  database: dbEnv.SUPABASE_MATRIX_DATABASE_NAME ?? "postgres", ssl: { rejectUnauthorized: false },
  application_name: "answer-materialize-bytes-walk",
});
await db.connect();
const results = { run: RUN, width: WIDTH, conversationId, chatUrl: page.url() };

// The saved row: wait for the materializer's history entry.
let row = null;
for (let i = 0; i < 60 && conversationId; i++) {
  const { rows } = await db.query(
    `select m.id::text, m.content, (select h->'content' from jsonb_array_elements(m.content_history) h
       where h->>'reason' = 'artifact_materialization' limit 1) as before
     from chat.message m where m.conversation_id = $1 and m.role = 'assistant' and m.deleted_at is null
     order by m.position desc limit 1`,
    [conversationId],
  );
  if (rows[0]?.before) { row = rows[0]; break; }
  await sleep(2000);
}
await page.screenshot({ path: `${OUT}/${TAG}-01-saved.png` });

if (!row) {
  results.error = "no artifact_materialization entry appeared on the answer row";
} else {
  const before = textOf(row.before);
  const after = textOf(row.content);
  results.messageId = row.id;
  // 1. Every line of the answer as written is still in the saved answer (wrapper lines aside).
  const wrapper = /^(```\w*|<\/?(progress_tracker|cooking_recipe)>)$/;
  results.missingLines = before.split("\n").filter((l) => l.trim() && !wrapper.test(l.trim()) && !after.includes(l));
  // 2. Each saved artifact wraps a body that is a byte-exact slice of the answer as written.
  results.artifacts = [...after.matchAll(TAG_RE)].map((m) => ({ id: m[1], bodyExact: before.includes(`\n${m[2]}\n`), body: m[2] }));
  // 3. The lines the message asked for.
  results.expectedLinesMissing = BLOCKS.filter((l) => l.trim() && !wrapper.test(l.trim()) && !after.includes(l));
  results.ok =
    results.missingLines.length === 0 &&
    results.artifacts.length === 3 &&
    results.artifacts.every((a) => a.bodyExact);
}
await page.reload({ waitUntil: "domcontentloaded" });
await sleep(10000);
await page.screenshot({ path: `${OUT}/${TAG}-02-reloaded.png`, fullPage: false });
results.reloadedText = await page.evaluate(() => {
  const answers = [...document.querySelectorAll("[data-record-annotations]")];
  return (answers[answers.length - 1]?.innerText ?? "").slice(0, 2000);
});

// Archive the walk chat (the same status write the app's Archive makes).
if (conversationId) {
  const a = await db.query(`update chat.conversation set status = 'archived' where id = $1 returning status`, [conversationId]);
  results.archived = a.rows[0]?.status ?? null;
}
await db.end();
writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(results, null, 1));
console.log(`${TAG} run=${RUN} chat=${results.chatUrl} message=${results.messageId ?? "-"}`);
console.log(`${TAG} ok=${results.ok} missingLines=${JSON.stringify(results.missingLines ?? null)} expectedMissing=${JSON.stringify(results.expectedLinesMissing ?? null)}`);
console.log(`${TAG} artifacts=${JSON.stringify((results.artifacts ?? []).map((a) => ({ id: a.id.slice(0, 8), exact: a.bodyExact })))} archived=${results.archived}`);
if (results.error) console.log(`${TAG} error: ${results.error}`);
await browser.close();
