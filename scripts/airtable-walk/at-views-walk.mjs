// AT-VIEWS walk: Map over Clinic Locations, Org chart over Team Directory, on the shared preview, as admin.
// usage: node scripts/airtable-walk/at-views-walk.mjs <clinicsTableId> <teamTableId> <outDir>
import { chromium } from "playwright";
import { store } from "./store.mjs";
import { ORIGIN, out } from "./lib.mjs";
import { walkSignIn } from "./walk-signin.mjs";

const [CLINICS, TEAM, DIR] = process.argv.slice(2);
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const fields = async (t) => must(await client.fields({ table_id: t }), "fields");
const clinicFields = await fields(CLINICS);
const teamFields = await fields(TEAM);
const key = (fs, label) => fs.find((f) => f.label === label)?.key;
const mapView = must(await client.viewDeclare({ table_id: CLINICS, spec: { name: "Clinic map", definition: { layout: "map", map_field: key(clinicFields, "Address") } } }), "map view");
const orgView = must(await client.viewDeclare({ table_id: TEAM, spec: { name: "Org chart", definition: { layout: "orgchart", parent_field: key(teamFields, "Reports to") } } }), "org view");
out("views", mapView, orgView);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.setDefaultNavigationTimeout(180000);
const page = await ctx.newPage();
const errs = []; page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
out("signed in as", await walkSignIn(page, ORIGIN));
const shot = (n) => page.screenshot({ path: `${DIR}/${n}.png` });
const box = async (sel) => page.locator(sel).first().boundingBox();

// ── MAP ──
await page.goto(`${ORIGIN}/data/${CLINICS}?view=${mapView}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-records-map-layout]", { timeout: 240000 });
const before = await box("[data-records-map-box]");
await page.waitForTimeout(25000); // lookups run one a second on the server
const after = await box("[data-records-map-box]");
out("map box before/after", JSON.stringify(before), JSON.stringify(after));
out("map status", await page.locator("[data-records-map-status]").innerText());
out("leaflet markers", await page.locator(".leaflet-marker-icon").count());
await shot("map-desktop");
await page.locator(".leaflet-marker-icon").first().click({ force: true }).catch((e) => out("pin click err", e.message.slice(0, 80)));
await page.waitForTimeout(2500);
await shot("map-pin-opens-record");
const saved = must(await client.list({ table_id: CLINICS }), "list").rows.map((r) => [r.document.name, r.document.latitude ?? null, r.document.longitude ?? null]);
out("saved places on the records", JSON.stringify(saved));
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${ORIGIN}/data/${CLINICS}?view=${mapView}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-records-map-layout]", { timeout: 240000 }); await page.waitForTimeout(6000);
out("mobile map overflow-x", await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await shot("map-phone");

// ── ORG CHART ──
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${ORIGIN}/data/${TEAM}?view=${orgView}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-records-org-layout]", { timeout: 240000 }); await page.waitForTimeout(3000);
out("org cards", await page.locator("[data-records-org-card]").count(), "status", await page.locator("[data-records-org-status]").innerText());
const ob = await box("[data-records-org-box]");
await shot("org-desktop");
await page.locator('[data-records-org-toggle]').nth(1).click(); await page.waitForTimeout(500);
out("org cards after collapse", await page.locator("[data-records-org-card]").count(), "box same", JSON.stringify(await box("[data-records-org-box]")) === JSON.stringify(ob));
await shot("org-collapsed");
await page.getByRole("button", { name: "Expand all" }).click();
await page.locator("[data-records-org-card]").first().click(); await page.waitForTimeout(2500);
await shot("org-card-opens-record");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${ORIGIN}/data/${TEAM}?view=${orgView}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-records-org-layout]", { timeout: 240000 }); await page.waitForTimeout(3000);
out("mobile org overflow-x", await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await shot("org-phone");
out("console errors", JSON.stringify(errs.slice(0, 6)));
await browser.close();
