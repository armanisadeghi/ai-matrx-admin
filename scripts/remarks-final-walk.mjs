// scripts/remarks-final-walk.mjs — REMARKS (comments, choices, ticks, edits, new-chat-about) FINAL WALK, live.
//
// Headless, as admin@admin.com, against the shared dev server (:3001). Agent: Content Writing Partner.
// The walk ABORTS (exit 2) if the picker will not hold it — General Chat is spend-gated by design and
// no spend is ever approved here.
//
// Items (PASS/FAIL each, with captured DOM text / request bodies / URLs):
//   1 comment chip survives a reload          5 in-place edit -> word-level diff in the user card
//   2 send chip only -> c1 card + reply cue   6 "New chat about this" -> /chat/new?c=<id> -> reply
//   3 choice click -> "I chose ..." chip      7 two browser contexts stay in step
//   4 tick two items -> one chip, ticks stay  8 no reply goes blank at stream end
//
//   node scripts/remarks-final-walk.mjs [outDir]       ITEMS=3,1,2 to run a subset (order kept as listed)
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const OUT = process.argv[2] || mkdtempSync(join(tmpdir(), "remarks-final-"));
const ONLY = process.env.ITEMS ? process.env.ITEMS.split(",") : null;
const ROOT = new URL("..", import.meta.url).pathname;
console.log("screenshots:", OUT);
const t0 = Date.now();
const now = () => Math.round((Date.now() - t0) / 1000);

// ---------- plumbing ----------
const MONITOR = () => {
  window.__blank = {};
  setInterval(() => {
    document.querySelectorAll('[data-message-group][aria-label="Assistant answer"]').forEach((g) => {
      const id = g.getAttribute("data-primary-message-id");
      const len = g.innerText.trim().length;
      const r = (window.__blank[id] ??= { max: 0, last: 0, blankAfter: false });
      r.last = len;
      if (len > r.max) r.max = len;
      if (r.max > 40 && len === 0) r.blankAfter = true;
    });
  }, 400);
};
const blankLog = {};
async function harvest(page, tag) {
  const b = await page.evaluate(() => window.__blank || {}).catch(() => ({}));
  for (const [id, r] of Object.entries(b)) {
    const k = `${tag}:${id.slice(0, 8)}`;
    const o = (blankLog[k] ??= { max: 0, blankAfter: false });
    o.max = Math.max(o.max, r.max);
    o.blankAfter ||= r.blankAfter;
  }
}
const replyChecks = []; // { label, lenAtDone, lenAfter10s[] }
const reqLog = [];
function hook(page, tag) {
  page.on("request", (rq) => {
    const u = rq.url();
    if (rq.method() !== "POST") return;
    const body = rq.postData() || "";
    if (/rpc\/|block_state|comment|remark/i.test(u) || /remark|comment_id|"kind":"comment"/.test(body))
      reqLog.push({ tag, s: now(), url: u.split(/localhost:\d+/)[1]?.slice(0, 90) ?? u.slice(0, 90), body: body.slice(0, 400) });
  });
}
async function signIn(browser, route, viewport = { width: 1400, height: 1000 }) {
  const login = execSync(`pnpm -s dev-login '${route}'`, { encoding: "utf8", cwd: ROOT });
  const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(MONITOR);
  const page = await ctx.newPage();
  await page.goto(url, { timeout: 180000 });
  if (page.url().includes("__dev-walk")) {
    await page.getByRole("button", { name: "Resume this preview" }).click();
    await page.waitForURL((u) => !u.href.includes("__dev-walk"), { timeout: 180000 });
  }
  return { ctx, page };
}
const headerBtns = (page) => page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText).filter((t) => /·/.test(t)));
async function pickAgent(page) {
  for (let a = 0; a < 6; a++) {
    const h = await headerBtns(page);
    if (h.some((t) => t.startsWith("Content Writing Partner"))) return true;
    await page.locator("button", { hasText: "General Chat ·" }).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByText("Content Writing Partner").first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(4000);
  }
  return false;
}
const AN = '[data-message-group][aria-label="Assistant answer"]';
const US = '[data-message-group][aria-label="Your message"]';
const origin = (page) => new URL(page.url()).origin;
const composer = (page) => page.locator("textarea[data-agent-main-input]").first();
const chips = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-composer-chip]")].map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim()).filter(Boolean),
  );
const counts = (page) => page.evaluate(([a, u]) => ({ an: document.querySelectorAll(a).length, us: document.querySelectorAll(u).length }), [AN, US]);
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});

async function settle(page, wantAnswers, label, quick = false) {
  const start = Date.now();
  let last = "", stable = Date.now();
  while (Date.now() - start < 200000) {
    await page.waitForTimeout(1000);
    const s = await page.evaluate((an) => {
      const a = [...document.querySelectorAll(an)];
      return { n: a.length, sig: a.map((e) => e.innerText.length).join(","), min: Math.min(...a.map((e) => e.innerText.trim().length)) };
    }, AN);
    if (s.n < wantAnswers || (quick && s.min < 150)) { stable = Date.now(); continue; }
    if (s.sig !== last) { last = s.sig; stable = Date.now(); }
    else if (Date.now() - stable > (quick ? 2000 : 8000)) break;
  }
  if (quick) return []; // a person's first click lands right after the stream ends: no extra waiting
  const lens = await page.evaluate((an) => [...document.querySelectorAll(an)].map((e) => e.innerText.trim().length), AN);
  await page.waitForTimeout(10000);
  const lens10 = await page.evaluate((an) => [...document.querySelectorAll(an)].map((e) => e.innerText.trim().length), AN);
  replyChecks.push({ label, lenAtDone: lens, lenAfter10s: lens10 });
  return lens10;
}

async function startChat(page, prompt) {
  await page.goto(`${origin(page)}/chat/new`);
  await page.waitForTimeout(6000);
  if (!(await pickAgent(page))) { console.log("ABORT: picker fell back to General Chat (spend-gated)"); process.exit(2); }
  const ta = page.locator('textarea[placeholder*="How can I help"]').first();
  await ta.fill(prompt);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 60000 });
  const url = page.url();
  const h = await headerBtns(page);
  if (h.some((t) => t.startsWith("General Chat"))) { console.log("ABORT: conversation opened on General Chat"); process.exit(2); }
  return url;
}
async function reload(page, tag) {
  await harvest(page, tag);
  await page.reload();
  await page.waitForTimeout(12000);
}
async function sendReply(page, text) {
  const c0 = await counts(page);
  const ta = composer(page);
  await ta.click();
  if (text) await ta.fill(text);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);
  let c1 = await counts(page);
  if (c1.us === c0.us) {
    // Enter alone did nothing (empty text + chip): use the real send button.
    const sent = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('[data-agent-input-shell] button')].filter((b) => /send|submit/i.test((b.getAttribute("aria-label") || "") + (b.title || "")));
      bs.at(-1)?.click();
      return bs.length;
    });
    await page.waitForTimeout(4000);
    c1 = await counts(page);
    console.log("  send button fallback, candidates:", sent, "us", c0.us, "->", c1.us);
  }
  return { before: c0, after: c1 };
}
async function selectText(page, answerIdx, minLen = 45) {
  return page.evaluate(([an, idx, minLen]) => {
    const g = [...document.querySelectorAll(an)][idx < 0 ? document.querySelectorAll(an).length + idx : idx];
    const ps = [...g.querySelectorAll("[data-message-content] p")];
    for (const p of ps) {
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const n = w.nextNode();
      if (!n || n.length < minLen) continue;
      p.scrollIntoView({ block: "center" });
      const m = n.data.slice(0, 90).match(/^.{25,}?[.?!—,]/);
      const end = m ? m[0].length : Math.min(60, n.length);
      const r = document.createRange();
      r.setStart(n, 0);
      r.setEnd(n, end);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      document.dispatchEvent(new Event("selectionchange"));
      return n.data.slice(0, end);
    }
    return null;
  }, [AN, answerIdx, minLen]);
}
async function addComment(page, answerIdx, text) {
  const sel = await selectText(page, answerIdx);
  if (!sel) throw new Error("no passage to select");
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Comment", exact: true }).click({ timeout: 10000 });
  const panel = page.locator("[data-selection-panel]");
  await panel.locator("textarea").fill(text);
  const sw = panel.getByRole("switch");
  const on = (await sw.getAttribute("aria-checked")) === "true";
  if (!on) await sw.click();
  await panel.getByRole("button", { name: "Comment", exact: true }).click();
  await page.waitForTimeout(3500);
  return { passage: sel, switchWasOn: on };
}

// ---------- item harness ----------
const results = [];
async function item(n, name, fn) {
  if (ONLY && !ONLY.includes(String(n))) return;
  const fails = [], ev = {};
  const t = { ev, ok: (c, msg) => { if (!c) fails.push(msg); return c; } };
  console.log(`\n=== ITEM ${n}: ${name} (t+${now()}s)`);
  try { await fn(t); } catch (e) { fails.push("walk error: " + (e?.message || e).toString().split("\n")[0]); }
  results.push({ n, name, status: fails.length ? "FAIL" : "PASS", fails, ev });
  console.log(`--- ${n} ${fails.length ? "FAIL" : "PASS"}`, fails.length ? JSON.stringify(fails) : "");
  console.log("    evidence:", JSON.stringify(ev).slice(0, 1800));
}

const browser = await chromium.launch({ headless: true });
const S = {}; // shared state across items
const A = await signIn(browser, "/chat/new");
hook(A.page, "A");
const page = A.page;

// ===== chat C: the comment chat (items 1, 2, 7, 6 source) =====
await item(1, "comment: highlight -> Comment (With next message) -> chip -> reload -> chip stays", async (t) => {
  S.cUrl = await startChat(page, "In one short paragraph, tell me how to launch a bakery.");
  console.log("  chat C", S.cUrl);
  await settle(page, 1, "C reply1");
  const r = await addComment(page, -1, "Make this warmer and more specific.");
  t.ev.comment = r;
  t.ev.chipsAfterComment = await chips(page);
  await shot(page, "1-after-comment");
  S.commentChips = t.ev.chipsAfterComment;
  t.ok(t.ev.chipsAfterComment.length >= 1, "no chip after Comment with 'With next message' on");
  await reload(page, "C");
  t.ev.chipsAfterReload = await chips(page);
  await shot(page, "1-after-reload");
  t.ok(JSON.stringify(t.ev.chipsAfterReload) === JSON.stringify(t.ev.chipsAfterComment), "chip changed or vanished after reload");
  t.ev.requests = reqLog.filter((x) => /warmer|comment|remark/i.test(x.body + x.url)).slice(-4);
});

await item(2, "send with only the chip -> card shows c1 -> one c1 cue -> opens canvas thread, agent reply no Edit", async (t) => {
  const r = await sendReply(page, "");
  t.ev.sent = r;
  t.ok(r.after.us === r.before.us + 1, "send with only the chip did not send");
  const cardProbe = (us) => {
    const e = [...document.querySelectorAll(us)].at(-1);
    const hits = [...e.querySelectorAll("*")].filter((x) => x.children.length === 0 && /^c\d+$/.test((x.textContent || "").trim())).map((x) => `${x.tagName}:${x.textContent.trim()}`);
    return { text: e.innerText.slice(0, 300), hits };
  };
  const cardInfo = await page.evaluate(cardProbe, US);
  t.ev.cardRightAfterSend = cardInfo;
  await settle(page, r.before.an + 1, "C reply2 (comment reply)");
  const cardLater = await page.evaluate(cardProbe, US);
  t.ev.cardAfterReply = cardLater;
  t.ok(cardLater.hits.some((h) => /:c1$/.test(h)), "user card does not show c1 after the reply finished (before any reload): " + JSON.stringify(cardLater.hits));
  const cues = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-label="Assistant answer"] *')]
      .filter((e) => e.children.length === 0 && /^·?\s*c1$/.test((e.textContent || "").trim()))
      .map((e) => ({ tag: e.tagName, text: e.textContent.trim(), cls: String(e.className).slice(0, 60), block: e.parentElement?.parentElement?.innerText.slice(0, 160) })),
  );
  t.ev.cues = cues;
  t.ok(cues.length === 1, `expected exactly one c1 reply cue in the reply, found ${cues.length}`);
  // A fresh load closes the thread panel, so the cue click is the only thing that can open it.
  await reload(page, "C");
  t.ev.cardAfterReload = await page.evaluate(cardProbe, US);
  const panelFind = () =>
    page.evaluate(() => {
      const r = [...document.querySelectorAll("button")].find((b) => /^Resolve$/.test(b.innerText.trim()));
      let root = r;
      for (let i = 0; i < 12 && root?.parentElement; i++) { root = root.parentElement; if (root.getBoundingClientRect().height > 500) break; }
      return root ? { text: root.innerText.slice(0, 700), buttons: [...root.querySelectorAll("button")].map((b) => (b.getAttribute("aria-label") || b.innerText).trim()).filter(Boolean) } : null;
    });
  t.ev.panelOpenAfterReload = !!(await panelFind());
  // Close the thread panel (its rightmost header button), so ONLY the cue can bring it back.
  const closed = await page.evaluate(() => {
    const bs = [...document.querySelectorAll("button")].filter((b) => { const r = b.getBoundingClientRect(); return r.top < 50 && r.left > 1200 && r.width > 0; }).sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
    bs[0]?.click();
    return bs.map((b) => b.getAttribute("aria-label") || b.innerText || "?");
  });
  await page.waitForTimeout(1500);
  t.ev.panelClosedBeforeCue = { headerButtons: closed, stillOpen: !!(await panelFind()) };
  await shot(page, "2-before-cue-click");
  const cue = page.locator(`${AN} *`).filter({ hasText: /^·?\s*c1$/ }).last();
  await cue.scrollIntoViewIfNeeded();
  await cue.click({ timeout: 10000 });
  await page.waitForTimeout(4000);
  await shot(page, "2-after-cue-click");
  const panel = await panelFind();
  t.ev.panel = panel;
  t.ok(!!panel, "clicking the c1 cue opened no canvas thread");
  if (panel) {
    t.ok(/Make this warmer/.test(panel.text), "thread does not show the comment");
    t.ok(/Content Writing Partner/.test(panel.text), "thread has no reply authored by the agent (Content Writing Partner)");
    t.ok(!panel.buttons.some((b) => /^Edit\b/.test(b)), "an Edit control is offered on the agent's reply: " + JSON.stringify(panel.buttons));
  }
  t.ev.url = page.url();
});

await item(7, "two contexts on the same chat: chip appears in B within 20s, clears when A sends", async (t) => {
  if (!S.cUrl) throw new Error("chat C missing");
  const B = await signIn(browser, new URL(S.cUrl).pathname);
  hook(B.page, "B");
  await B.page.waitForTimeout(12000);
  t.ev.bChipsStart = await chips(B.page);
  await addComment(page, -1, "Second comment from context A.");
  const aChips = await chips(page);
  t.ev.aChips = aChips;
  let seen = null;
  for (let i = 0; i < 24; i++) {
    const c = await chips(B.page);
    if (c.length > t.ev.bChipsStart.length) { seen = { afterS: i * 1, chips: c }; break; }
    await B.page.waitForTimeout(1000);
  }
  t.ev.bSawChip = seen;
  t.ok(!!seen, "B never showed A's comment chip within 20s");
  await shot(B.page, "7-B-after-comment");
  const cA = await counts(page);
  await sendReply(page, "");
  let cleared = null;
  for (let i = 0; i < 24; i++) {
    const c = await chips(B.page);
    if (c.length === 0) { cleared = { afterS: i }; break; }
    await B.page.waitForTimeout(1000);
  }
  t.ev.bCleared = cleared;
  t.ev.bChipsAfterSend = await chips(B.page);
  t.ok(!!cleared, "B still shows the chip 20s after A sent");
  await shot(B.page, "7-B-after-send");
  await settle(page, cA.an + 1, "C reply4 (context A send)");
  await harvest(B.page, "B");
  await B.ctx.close();
});

await item(6, "New chat about this -> /chat/new?c=<id> chip -> reload -> send -> /chat/<id> reply references passage", async (t) => {
  if (!S.cUrl) throw new Error("chat C missing");
  await page.goto(S.cUrl);
  await page.waitForTimeout(12000);
  const sourceChipsBefore = await chips(page);
  t.ev.sourceChipsBefore = sourceChipsBefore;
  const passage = await selectText(page, 0);
  t.ev.passage = passage;
  await page.waitForTimeout(1200);
  // "New chat about this" lives in the selection toolbar's "..." overflow (opened with a real press).
  const box = await page.evaluate(() => {
    const c = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Comment");
    const r = [...c.parentElement.querySelectorAll("button")].at(-1).getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.getByRole("menuitem", { name: "New chat about this" }).click({ timeout: 10000 });
  await page.waitForURL(/\/chat\/new/, { timeout: 30000 });
  await page.waitForTimeout(6000);
  t.ev.urlNew = page.url();
  t.ok(/\/chat\/new\?.*c=/.test(t.ev.urlNew), "URL is not /chat/new?c=<id>: " + t.ev.urlNew);
  t.ev.chips = await chips(page);
  t.ok(t.ev.chips.length >= 1, "no chip on the new chat");
  await shot(page, "6-new-chat");
  await reload(page, "E");
  t.ev.chipsAfterReload = await chips(page);
  t.ev.urlAfterReload = page.url();
  t.ok(JSON.stringify(t.ev.chipsAfterReload) === JSON.stringify(t.ev.chips), "chip lost/changed after reload");
  if (!(await pickAgent(page))) { console.log("ABORT: picker fell back to General Chat (spend-gated)"); process.exit(2); }
  t.ev.chipsAfterPick = await chips(page);
  const ta = composer(page).or(page.locator('textarea[placeholder*="How can I help"]').first());
  await ta.first().click();
  await page.keyboard.type("What do you make of this?");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 60000 });
  t.ev.urlSent = page.url();
  S.eUrl = page.url();
  if ((await headerBtns(page)).some((x) => x.startsWith("General Chat"))) { console.log("ABORT: opened on General Chat"); process.exit(2); }
  await settle(page, 1, "E reply (new chat about this)");
  const reply = await page.evaluate((an) => [...document.querySelectorAll(an)].map((e) => e.innerText).join("\n").slice(0, 1200), AN);
  t.ev.reply = reply.slice(0, 500);
  const words = (passage || "").toLowerCase().match(/[a-z]{5,}/g) || [];
  const hit = words.filter((w) => reply.toLowerCase().includes(w));
  t.ev.passageWordsInReply = `${hit.length}/${words.length}`;
  t.ok(!/cut off|truncated|incomplete/i.test(reply), "reply says the passage was cut off");
  t.ok(words.length > 0 && hit.length >= Math.min(2, words.length), "reply does not reference the passage");
  const body = await page.evaluate(() => document.body.innerText);
  t.ok(!/Run Comment Reply/i.test(body), 'a "Run Comment Reply" card is on the page');
  await page.goto(S.cUrl);
  await page.waitForTimeout(12000);
  t.ev.sourceChips = await chips(page);
  t.ok(JSON.stringify(t.ev.sourceChips) === JSON.stringify(sourceChipsBefore), `source chat composer chips changed (stray chip): ${JSON.stringify(sourceChipsBefore)} -> ${JSON.stringify(t.ev.sourceChips)}`);
});

// ===== chat K: the choice chat (item 3) — its own chat so the numbering in chat C starts at c1 =====
await item(3, "choice click -> \"I chose ...\" chip", async (t) => {
  S.kUrl = await startChat(page, "Help me pick between three launch channels for my bakery.");
  console.log("  chat K", S.kUrl);
  await settle(page, 1, "K reply1 (choices)", true); // FIRST interaction with a just-finished reply must save
  const optionLabel = () =>
    page.evaluate((an) => {
      const e = [...document.querySelectorAll(`${an} button[aria-label^='Edit ']`)].map((b) => b.getAttribute("aria-label").slice(5)).filter((x) => x !== "content");
      return e[0] ?? null;
    }, AN);
  let label = await optionLabel();
  t.ok(label, "the reply offered no option buttons");
  if (!label) return;
  // 1) click while the reply is still the live one (no reload yet)
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(3500);
  const liveChips = await chips(page);
  const toast = await page.evaluate(() => [...document.querySelectorAll("[data-sonner-toast],[role=status],[role=alert]")].map((e) => e.innerText.slice(0, 200)).filter(Boolean));
  t.ev.liveClick = { label, chips: liveChips, toast };
  await shot(page, "3-live-click");
  t.ok(liveChips.some((c) => /I chose/.test(c)), `LIVE click (no reload) staged no "I chose" chip; toast: ${JSON.stringify(toast)}`);
  // 2) after a reload
  if (!liveChips.some((c) => /I chose/.test(c))) {
    await reload(page, "K");
    label = await optionLabel();
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(3500);
    t.ev.afterReloadClick = { label, chips: await chips(page) };
    t.ok(t.ev.afterReloadClick.chips.some((c) => /I chose/.test(c)), 'even after a reload the click staged no "I chose" chip');
  }
  await reload(page, "K");
  t.ev.chipsAfterReload = await chips(page);
  t.ok(t.ev.chipsAfterReload.some((c) => /I chose/.test(c)), '"I chose" chip gone after reload');
  // send it (chip only) so the chat is clean for the comment items
  const r = await sendReply(page, "");
  t.ev.sent = r;
  await settle(page, 2, "K reply2 (after I chose)");
  t.ev.userCard = await page.evaluate((us) => [...document.querySelectorAll(us)].at(-1)?.innerText.slice(0, 200), US);
  t.ev.chipsAfterSend = await chips(page);
});

// ===== chat D: the checklist chat (items 4, 5) =====
await item(4, "checklist: tick two (real clicks) -> one chip naming them -> reload after 10s -> ticks persist", async (t) => {
  S.dUrl = await startChat(page, "Give me a launch checklist I can tick off as I go.");
  console.log("  chat D", S.dUrl);
  await settle(page, 1, "D reply1 (checklist)");
  const boxes = page.locator(`${AN} :is([role=checkbox],input[type=checkbox])`);
  const n = await boxes.count();
  t.ev.checkboxes = n;
  t.ok(n >= 2, "the reply has fewer than two tickable items");
  if (n < 2) return;
  const names = await page.evaluate((an) => [...document.querySelectorAll(`${an} :is([role=checkbox],input[type=checkbox])`)].slice(0, 2).map((e) => (e.closest("li,label,div")?.innerText || "").trim().slice(0, 80)), AN);
  t.ev.tickedNames = names;
  await boxes.nth(0).click();
  await page.waitForTimeout(1200);
  await boxes.nth(1).click();
  await page.waitForTimeout(3500);
  t.ev.chipsAfterTicks = await chips(page);
  await shot(page, "4-ticked");
  // One chip for both ticks, naming them ("Checked 2: <first>…<second>"), never one chip per tick.
  t.ok(t.ev.chipsAfterTicks.length === 1 && /(Checked|ticked)\s*2/i.test(t.ev.chipsAfterTicks[0]), `expected ONE chip naming the two ticks, got ${JSON.stringify(t.ev.chipsAfterTicks)}`);
  await page.waitForTimeout(10000);
  await reload(page, "D");
  const state = await page.evaluate((an) => [...document.querySelectorAll(`${an} :is([role=checkbox],input[type=checkbox])`)].map((e) => e.getAttribute("aria-checked") ?? String(e.checked)), AN);
  t.ev.afterReloadStates = state.slice(0, 8);
  t.ok(state.slice(0, 2).every((s) => s === "true"), "ticks did not persist after reload: " + JSON.stringify(state.slice(0, 4)));
  t.ev.chipsAfterReload = await chips(page);
  t.ok(t.ev.chipsAfterReload.length === 1, "chip lost after reload: " + JSON.stringify(t.ev.chipsAfterReload));
  await sendReply(page, "");
  await settle(page, 2, "D reply2 (after ticks)");
});

await item(5, "in-place edit appends words -> chip -> send -> user card shows compact word-level diff", async (t) => {
  if (!S.dUrl) throw new Error("chat D missing");
  const idx = await page.evaluate((an) => document.querySelectorAll(an).length - 1, AN);
  const msgId = await page.evaluate(([an, i]) => [...document.querySelectorAll(an)][i].getAttribute("data-primary-message-id"), [AN, idx]);
  const group = page.locator(`[data-message-group][data-primary-message-id="${msgId}"]`);
  const firstP = group.locator("[data-message-content] p").first();
  const original = (await firstP.innerText()).trim();
  t.ev.originalParagraph = original.slice(0, 160);
  await firstP.click({ button: "right" });
  await page.waitForTimeout(700);
  await page.locator('[role="menu"] :text-is("Edit content"), [role="menu"] :text-is("Edit")').first().click({ timeout: 15000 });
  const pm = page.locator(`[data-in-place-editor] .ProseMirror`).first();
  await pm.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await pm.locator("p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Celebrate with the team.");
  await page.waitForTimeout(400);
  await page.keyboard.press("Meta+s");
  await page.locator("[data-in-place-editor]").first().waitFor({ state: "detached", timeout: 30000 });
  await page.waitForTimeout(3500);
  t.ev.chips = await chips(page);
  await shot(page, "5-chip");
  t.ok(t.ev.chips.some((c) => /Celebrate with the team/.test(c)), 'no "+ Celebrate with the team." chip: ' + JSON.stringify(t.ev.chips));
  const c0 = await counts(page);
  await sendReply(page, "");
  const card = await page.evaluate((us) => { const e = [...document.querySelectorAll(us)].at(-1); return { text: e?.innerText.slice(0, 1500), html: e?.innerHTML.slice(0, 3000) }; }, US);
  t.ev.cardText = card.text;
  t.ev.cardMarks = (card.html.match(/<(ins|del|mark)[^>]*>[^<]*/g) || []).slice(0, 8);
  await shot(page, "5-card");
  const occurrences = original ? card.text.split(original.slice(0, 40)).length - 1 : 0;
  t.ev.originalOccurrencesInCard = occurrences;
  t.ok(/Celebrate with the team/.test(card.text), "card does not show the added words");
  t.ok(occurrences <= 1, `card shows the original paragraph ${occurrences} times (full-paragraph -/+ lines)`);
  await settle(page, c0.an + 1, "D reply3 (after edit)");
});

// ---------- item 8 ----------
await item(8, "no reply goes blank at stream end", async (t) => {
  await harvest(page, "last");
  t.ev.replyChecks = replyChecks.map((r) => ({ label: r.label, atDone: r.lenAtDone.join("/"), after10s: r.lenAfter10s.join("/") }));
  t.ev.monitor = Object.entries(blankLog).map(([k, v]) => `${k} max=${v.max} blankAfter=${v.blankAfter}`);
  for (const r of replyChecks) {
    t.ok(r.lenAfter10s.length > 0 && r.lenAfter10s.every((l) => l > 0), `a reply body is empty 10s after completion in "${r.label}": ${r.lenAfter10s.join("/")}`);
    t.ok(r.lenAfter10s.length === 0 || r.lenAfter10s.every((l, i) => (r.lenAtDone[i] ?? l) === 0 || l >= (r.lenAtDone[i] ?? 0) * 0.5), `a reply shrank by half after completion in "${r.label}"`);
  }
  for (const [k, v] of Object.entries(blankLog)) t.ok(!v.blankAfter, `reply ${k} went blank after having text (max ${v.max})`);
  t.ok(replyChecks.length >= 1, "no replies observed");
});

await browser.close();
console.log("\n===== RESULTS =====");
for (const r of results.sort((a, b) => a.n - b.n)) console.log(`${r.n}. ${r.status}  ${r.name}${r.fails.length ? "\n     - " + r.fails.join("\n     - ") : ""}`);
console.log("request log (tail):", JSON.stringify(reqLog.slice(-8), null, 1));
process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
