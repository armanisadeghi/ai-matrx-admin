import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { store } from "/Users/armanisadeghi/code/matrx-frontend/scripts/airtable-walk/store.mjs";
import { start, ORIGIN } from "/Users/armanisadeghi/code/matrx-frontend/scripts/airtable-walk/lib.mjs";
const STATE = new URL("./state.json", import.meta.url);
const st = JSON.parse(readFileSync(STATE, "utf8"));
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const CH = randomUUID();
const page = must(await client.dashboardDeclare({ table_id: st.bookings, name: "Venue Bookings page",
  blocks: [{ id: CH, kind: "bar", title: "Bookings by status", group_by: ["status"], measures: [{ op: "count" }] }],
  presentation: { kind: "page", page_blocks: [{ id: "h", kind: "heading", text: "Venue desk" }, { id: CH, kind: "chart" }] } }), "page");
st.page = page; writeFileSync(STATE, JSON.stringify(st));
const run = must(await client.dashboardRun({ dashboard_id: page }), "run");
console.log("run block ids:", JSON.stringify(run.blocks.map((b) => b.id)), "chart id expected", CH);
const { browser, page: pg, who } = await start(false);
console.log("signed in:", who);
await pg.goto(`${ORIGIN}/data/pages/${page}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await pg.waitForSelector("text=Venue desk", { timeout: 120000 }); await pg.waitForTimeout(6000);
const n = await pg.locator("[data-records-page-block=chart]").count();
const drawn = await pg.locator("[data-records-page-block=chart] svg, [data-records-page-block=chart] canvas, [data-records-page-block=chart] [class*=bar]").count();
console.log("chart blocks on the page:", n, "drawn marks:", drawn);
await pg.screenshot({ path: "/tmp/atdbfix-chart-page.png", fullPage: true });
console.log((await pg.locator("[data-records-page-block=chart]").first().innerText().catch(() => "")).slice(0, 200));
await browser.close();
