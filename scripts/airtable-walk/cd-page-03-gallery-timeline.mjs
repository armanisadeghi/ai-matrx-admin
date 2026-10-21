// CD-PAGE-03 live walk: gallery and timeline page layouts inside an Interface. A disposable "Shoots" table
// (title, cover picture link, start and end dates) and an Interface with one Gallery page and one Timeline
// page, owned by admin@admin.com; both archived after. Cards and bars must draw every row.
//   ORIGIN=http://<session>.localhost:3001 SHOTS=<dir> node scripts/airtable-walk/cd-page-03-gallery-timeline.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { ORIGIN } from "./lib.mjs";
import { walkSignIn } from "./walk-signin.mjs";

const say = (...a) => console.log(...a);
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const SHOTS = process.env.SHOTS ?? "/tmp/cd-page-03";
mkdirSync(SHOTS, { recursive: true });
const { client } = await store();
const tag = Date.now().toString(36);
const id = () => crypto.randomUUID();
let table = null, iface = null, fails = 0;
const check = (label, ok, detail = "") => { if (!ok) fails++; say((ok ? "PASS " : "FAIL ") + label + (detail ? `  (${detail})` : "")); };
const ROWS = [
  ["Harbor sunrise", "2026-11-02", "2026-11-04"],
  ["Mill street portraits", "2026-11-06", "2026-11-10"],
  ["Orchard wedding", "2026-11-12", "2026-11-13"],
  ["Studio product set", "2026-11-16", "2026-11-20"],
];
const browser = await chromium.launch({ headless: true });
try {
  table = must(await declareTable(client, { name: `Shoots ${tag}`, labelSingular: "Shoot", labelPlural: "Shoots",
    fields: [{ key: "name", label: "Shoot", type: "text", sort: 10 }, { key: "cover", label: "Cover", type: "url", sort: 20 },
      { key: "starts", label: "Starts", type: "datetime", sort: 30 }, { key: "ends", label: "Ends", type: "datetime", sort: 40 }] }), "table");
  for (const [name, starts, ends] of ROWS)
    must(await client.recordWrite({ table_id: table, data: { name, starts, ends, cover: `https://picsum.photos/seed/${encodeURIComponent(name)}/400/240` } }), "row");
  const gallery = { id: id(), name: "Gallery", charts: [], blocks: [
    { id: id(), kind: "layout", layout: "gallery", title: "Shoot cards", table_id: table, image_field: "cover", columns: ["name", "starts"], span: 12 }] };
  const timeline = { id: id(), name: "Timeline", charts: [], blocks: [
    { id: id(), kind: "layout", layout: "timeline", title: "Shoot schedule", table_id: table, date_field: "starts", end_field: "ends", columns: ["name"], span: 12 }] };
  const pages = [gallery, timeline];
  const published = { pages, version: 1, at: new Date().toISOString(), by: null };
  iface = must(await client.dashboardDeclare({ table_id: table, name: `Shoot board ${tag}`, blocks: [],
    presentation: { kind: "interface", icon: "layout-dashboard", color: "violet", draft: { pages }, published, versions: [published] }, dashboard_id: null }), "interface");
  say("TABLE", table, "INTERFACE", iface);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160)));
  say("signed in as", await walkSignIn(p, ORIGIN, { member: false }));
  await p.goto(`${ORIGIN}/data/interfaces/${iface}?page=${gallery.id}`, { waitUntil: "domcontentloaded", timeout: 300000 });
  await p.waitForSelector('[data-records-page-layout="gallery"]', { timeout: 300000 });
  await p.waitForSelector("[data-records-gallery-card]", { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(3000);
  const cards = await p.locator("[data-records-gallery-card]").count();
  const cardText = await p.locator('[data-records-page-layout="gallery"]').innerText();
  check("gallery: one card per row", cards === ROWS.length, `${cards} cards`);
  check("gallery: every shoot named on its card", ROWS.every(([n]) => cardText.includes(n)));
  check("gallery: cards carry the cover picture", (await p.locator("[data-records-gallery-cover] img").count()) >= 1, `${await p.locator("[data-records-gallery-cover] img").count()} covers`);
  await p.screenshot({ path: `${SHOTS}/cd-page-03-gallery.png`, fullPage: true });

  await p.click(`[data-records-interface-page="${timeline.id}"]`);
  await p.waitForSelector('[data-records-page-layout="timeline"]', { timeout: 120000 });
  await p.waitForSelector("[data-timeline-bar]", { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(3000);
  const bars = await p.locator("[data-timeline-bar]").count();
  const tlText = await p.locator('[data-records-page-layout="timeline"]').innerText();
  check("timeline: one bar per row", bars === ROWS.length, `${bars} bars`);
  check("timeline: every shoot named", ROWS.every(([n]) => tlText.includes(n)));
  const widths = await p.locator("[data-timeline-bar]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  check("timeline: a 5-day shoot draws longer than a 2-day one", widths.length === 4 && Math.max(widths[1], widths[3]) > Math.min(widths[0], widths[2]), JSON.stringify(widths));
  await p.screenshot({ path: `${SHOTS}/cd-page-03-timeline.png`, fullPage: true });
  say("console errors:", errs.length, errs.slice(0, 3).join(" || "));
} catch (e) {
  fails++; say("WALK ERROR", e.message.split("\n")[0]);
} finally {
  await browser.close();
  if (iface) say("cleanup interface:", JSON.stringify(await client.dashboardDelete({ dashboard_id: iface })).slice(0, 80));
  if (table) { let r; for (let i = 0; i < 10; i++) { r = await client.tableArchive({ table_id: table }); if (!r.ok || r.data?.done !== false) break; } say("cleanup table:", JSON.stringify(r).slice(0, 80)); }
}
say(fails ? `RESULT FAIL (${fails})` : "RESULT PASS");
process.exit(fails ? 1 : 0);
