// scripts/rich-content-paste-read-split-perf.mjs
//
// PASTE / READ / SPLIT FRAME PERF, LIVE, SIGNED IN AS admin@admin.com (review 6b live proof).
// Long tasks and long animation frames while a 25-block note is pasted into the editor, then (desktop
// only) switched to Read and to Split. THE PHONE HAS NO READ OR SPLIT MODE, so on `m` only the paste
// is measured (the earlier perf7.mjs asked the phone for Read and threw before it logged).
//
//   node scripts/rich-content-paste-read-split-perf.mjs <d|m> [runLabel] [origin]
//     d = 1440x900 desktop, m = 375x812 phone. Credentials come from .env.local (never printed).
//   Prints one `PERF` JSON line: version (from /api/version, fetched by Node), per-phase maxFrame,
//   maxTask, framesOver200, tasksOver200, blocking, top frames. Pass bar: no frame over 200 ms.
//   The note it creates is soft-deleted in `finally` (only if its label/content carries the marker).
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const MARK = "RV5";
const phone = process.argv[2] === "m";
const run = process.argv[3] || "1";
const ORIGIN = process.argv[4] || "https://www.aimatrx.com";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const F = "```";
const j = (v) => JSON.stringify(v, null, 2);
const fence = (l, b) => `${F}${l}\n${b}\n${F}`;
const BLOCKS = [
  "# RV5 blocks note",
  "Intro line with **bold** text.",
  fence("chart", j({ type: "pie", title: "RV5 visits", data: [{ label: "Web", value: 6 }, { label: "App", value: 4 }] })),
  fence("quiz", j({ quiz_title: "RV5 Capitals", multiple_choice: [{ id: "q1", question: "Capital of France?", options: ["Paris", "Rome", "Oslo"], correctAnswer: 0, explanation: "Paris." }, { id: "q2", question: "2+2?", options: ["3", "4"], correctAnswer: 1, explanation: "Four." }] })),
  fence("math_problem", j({ math_problem: { title: "RV5 Sum", problem_statement: "Solve 2x + 3 = 7", solutions: [{ steps: [{ explanation: "Subtract 3", equation: "2x = 4" }, { explanation: "Divide by 2", equation: "x = 2" }] }] } })),
  fence("timeline", "**2020**\n- Launch: the first release\n**2021**\n- Growth: ten customers"),
  fence("comparison", j({ comparison: { title: "RV5 Plans", items: ["Alpha", "Beta"], criteria: [{ name: "Price", values: [10, 20], type: "cost", weight: 2 }, { name: "Speed", values: [5, 8], type: "benefit", weight: 1 }] } })),
  fence("stats", j({ title: "RV5 Totals", stats: [{ label: "Revenue", value: "$1.2M" }, { label: "Growth", value: "50%" }] })),
  fence("mermaid", "graph TD\nA[Start]-->B[End]"),
  "<flashcards>\nFront: Capital of France?\nBack: Paris\n\nFront: Capital of Italy?\nBack: Rome\n</flashcards>",
  fence("tasks", "## Sprint 12\n- [ ] Write the plan\n- [x] Book the room"),
  fence("csv", "name,age\nAna,3\nBen,5"),
  fence("svg", '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#4a90d9"/></svg>'),
  "<progress_tracker>\n### Launch\n- [x] Plan\n- [ ] Ship\n- [ ] Celebrate\n</progress_tracker>",
  "<troubleshooting>\n### The app will not start\n- Check the cable\n- Restart the router\n</troubleshooting>",
  "<cooking_recipe>\n### Pancakes\nPrep: 10 minutes prep\nCook: 20 minutes cooking\n#### Ingredients\n- 2 eggs\n- 1 cup flour\n#### Instructions\n1. Mix for 3 minutes\n2. Fry\n</cooking_recipe>",
  fence("decision_tree", j({ decision_tree: { title: "RV5 Pick", root: { question: "Is it raining?", yes: { question: "Is it windy?", yes: { action: "Stay home" }, no: { action: "Take an umbrella" } }, no: { action: "Go for a walk" } } } })),
  fence("table", "| a | b |\n| - | - |\n| 1 | 2 |"),
  "| Name | Score |\n| --- | --- |\n| Ana | 9 |\n| Ben | 7 |",
  "<info>\nRV5 info body\n</info>",
  "<info>\n\n</info>",
  "<plan>\nship it\n</plan>",
  "<foo>\nfoo body\n</foo>",
  fence("map", j({ title: "RV5 Offices", markers: [{ name: "Paris", lat: 48.85, lng: 2.35 }] })),
  fence("diff", "--- a/x.txt\n+++ b/x.txt\n@@ -1 +1 @@\n-old\n+new"),
  fence("yaml", "name: Ana\nage: 3"),
  fence("python", "print('hello')"),
  "The end.",
];
const NOTE = BLOCKS.join("\n\n");

const sb = async () => {
  const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  await c.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
  return c;
};
async function trash(ids) {
  const c = await sb();
  const out = [];
  for (const id of ids) {
    const { data } = await c.schema("workbench").from("notes").select("id,label,content").eq("id", id).maybeSingle();
    if (!data || !(new RegExp(MARK).test(`${data.label} ${data.content}`) || data.label === "New Note")) { out.push({ id, skipped: true }); continue; }
    const { error } = await c.schema("workbench").from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    out.push({ id, ok: !error });
  }
  return out;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...(phone ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } }),
  colorScheme: "light",
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const tap = (loc) => (phone ? loc.tap().catch(() => loc.click()) : loc.click());
const mode = async (name) => {
  const b = page.getByRole("button", { name: new RegExp(`^${name}$`) }).or(page.getByRole("radio", { name: new RegExp(`^${name}$`) })).first();
  await tap(b);
  await sleep(2500);
};
const R = { vp: phone ? 375 : 1440, run };
const created = [];
const arm = () => page.evaluate(() => {
  window.__lt = window.__lt || []; window.__lf = window.__lf || [];
  if (!window.__obs) {
    window.__obs = 1;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ s: Math.round(e.startTime), d: Math.round(e.duration) }); }).observe({ type: "longtask" });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lf.push({ s: Math.round(e.startTime), d: Math.round(e.duration), b: Math.round(e.blockingDuration), scripts: (e.scripts || []).filter((s) => s.duration > 30).map((s) => `${Math.round(s.duration)}ms ${s.invokerType}:${(s.invoker || "").slice(0, 40)} ${(s.sourceFunctionName || "").slice(0, 30)} ${(s.sourceURL || "").split("/").pop().slice(0, 24)}`) }); }).observe({ type: "long-animation-frame" });
  }
  window.__t0 = Math.round(performance.now());
});
const collect = async (label) => {
  const m = await page.evaluate(() => ({ t0: window.__t0, lt: window.__lt, lf: window.__lf }));
  const lt = m.lt.filter((x) => x.s >= m.t0 - 5);
  const lf = m.lf.filter((x) => x.s >= m.t0 - 5);
  R[label] = { maxTask: Math.max(0, ...lt.map((x) => x.d)), tasksOver200: lt.filter((x) => x.d > 200).length, maxFrame: Math.max(0, ...lf.map((x) => x.d)), framesOver200: lf.filter((x) => x.d > 200).length, blocking: lf.reduce((a, x) => a + x.b, 0), top: lf.sort((a, b) => b.d - a.d).slice(0, 3) };
};
try {
  await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
  R.version = (await (await fetch(`${ORIGIN}/api/version`)).json().catch(() => ({}))).commit?.slice(0, 10) ?? null;
  page.on("response", async (res) => {
    if (!/\/rest\/v1\/notes/.test(res.url()) || res.request().method() !== "POST") return;
    try { const j = await res.json(); for (const r of Array.isArray(j) ? j : [j]) if (r?.id && !created.includes(r.id)) created.push(r.id); } catch {}
  });
  await page.goto(`${ORIGIN}/notes`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const nb = page.getByRole("button", { name: /^new note$/i }).first();
  await nb.waitFor({ timeout: 90000 });
  await sleep(3000); await tap(nb); await sleep(5000);
  if (phone) await mode("Write").catch(() => {});
  await page.locator(".ProseMirror").first().click();
  await page.keyboard.type(`${MARK} first line.`);
  await sleep(2500);
  await arm();
  await page.evaluate((text) => { const el = document.activeElement?.closest?.(".ProseMirror") || document.querySelector(".ProseMirror"); const dt = new DataTransfer(); dt.setData("text/plain", text); (document.activeElement || el).dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, NOTE);
  await sleep(9000);
  await collect("paste");
  if (!phone) {
    await sleep(2000);
    await arm(); await mode("Read"); await sleep(6500); await collect("read");
    await mode("Write"); await sleep(5000);
    await arm(); await mode("Split"); await sleep(6500); await collect("split");
  }
  console.log("PERF", JSON.stringify(R));
} finally {
  console.log("CLEANUP", JSON.stringify(await trash(created)));
  await browser.close();
}
