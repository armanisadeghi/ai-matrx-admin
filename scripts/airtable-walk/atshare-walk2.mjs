// AT-SHARE walk 2 (live): header controls draw once (desktop + 390px), dedupe Merge from a group, outsider sends a request that names the
// table, admin approves, outsider holds Edit and the button is gone. Disposable table owned by admin@admin.com; the outsider is a tagged
// fixture persona. The age prompt is closed with its X (never answered), so the fixture stays removable.
import { chromium } from "playwright";
import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { ORIGIN, env } from "./lib.mjs";
import { signIn } from "../lib/seat-browser.mjs";
import { withFixtureUser, testTarget, fixtureSessionCookies } from "../lib/persona.mjs";

const say = (...a) => console.log(...a);
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const { sb, client } = await store();
const ORG = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const table = must(await declareTable(client, { name: "AT-SHARE Walk2 Orders " + Date.now().toString(36), labelSingular: "Order", labelPlural: "Orders",
  fields: [{ key: "order", label: "Order", type: "text", sort: 10 }, { key: "status", label: "Status", type: "select", sort: 20, options: ["New", "Packed"] }] }), "table");
for (const o of ["Order 101", "Order 102", "order 101 "]) must(await client.recordWrite({ table_id: table, data: { order: o, status: "New" } }), "row");
say("TABLE", table);
const browser = await chromium.launch({ headless: true });
const visible = (p, sel) => p.locator(`${sel}:visible`);
try {
  await withFixtureUser(testTarget(), { suite: "at-share/walk2", purpose: "outside viewer asks for edit" }, async (user) => {
    try {
      const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: table, p_principal_kind: "person", p_principal_id: user.id, p_level: "viewer" });
      if (g.error) throw new Error("share_grant: " + g.error.message);
      // ADMIN
      const actx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const ap = await actx.newPage(); ap.setDefaultTimeout(240000); ap.setDefaultNavigationTimeout(240000);
      await signIn(ap, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
      await ap.goto(`${ORIGIN}/data/${table}`, { waitUntil: "domcontentloaded" });
      await visible(ap, "[data-activity-feed]").first().waitFor();
      await ap.waitForTimeout(4000);
      say("HEADER desktop: Activity in DOM =", await ap.locator("[data-activity-feed]").count(), "| Find duplicates in DOM =", await ap.locator("[data-find-duplicates]").count());
      await ap.setViewportSize({ width: 390, height: 800 }); await ap.waitForTimeout(2500);
      say("HEADER 390px: Activity in DOM =", await ap.locator("[data-activity-feed]").count(), "| visible =", await visible(ap, "[data-activity-feed]").count());
      await ap.screenshot({ path: "/tmp/at/atshare2-390.png" });
      await ap.setViewportSize({ width: 1600, height: 1000 }); await ap.waitForTimeout(1500);
      // DEDUPE MERGE
      await visible(ap, "[data-find-duplicates]").first().click();
      await ap.getByRole("button", { name: "Order", exact: true }).click();
      await visible(ap, "[data-find-duplicates-run]").first().click();
      await ap.locator("[data-duplicate-group]").first().waitFor();
      say("DEDUPE groups:", await ap.locator("[data-duplicate-group]").count());
      await ap.locator("[data-duplicates-merge]").first().click();
      await ap.locator("[data-duplicates-merge-confirm]").first().click();
      await ap.locator("[data-duplicates-merged]").first().waitFor();
      say("DEDUPE merged:", await ap.locator("[data-duplicates-merged]").first().innerText());
      await ap.screenshot({ path: "/tmp/at/atshare2-merge.png" });
      // OUTSIDER
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      await ctx.addCookies(await fixtureSessionCookies(testTarget(), user, { host: new URL(ORIGIN).hostname }));
      const op = await ctx.newPage(); op.setDefaultTimeout(240000); op.setDefaultNavigationTimeout(240000);
      await op.goto(`${ORIGIN}/data/${table}`, { waitUntil: "domcontentloaded" });
      await visible(op, "[data-request-edit-access]").first().waitFor();
      const close = op.getByRole("button", { name: /close/i });
      if (await close.count()) await close.first().click().catch(() => {});
      await visible(op, "[data-request-edit-access]").first().click();
      await op.fill("textarea", "I keep the packing list.");
      await visible(op, "[data-request-edit-access-send]").first().click();
      await visible(op, "[data-request-edit-access-said]").first().waitFor();
      say("REQUEST outsider sees:", await visible(op, "[data-request-edit-access-said]").first().innerText());
      const list = await sb.schema("iam").rpc("access_request_list", { p_box: "inbox" });
      const rows = Array.isArray(list.data) ? list.data : list.data?.requests ?? [];
      const row = rows.find((r) => JSON.stringify(r).includes(table));
      say("REQUEST inbox row names:", row ? `${row.entity_label} "${row.entity_title}"` : "NOT FOUND");
      // ADMIN approves from the access-requests surface
      await ap.goto(`${ORIGIN}/user-settings/access-requests`, { waitUntil: "domcontentloaded" });
      await ap.waitForTimeout(6000);
      await ap.screenshot({ path: "/tmp/at/atshare2-inbox.png" });
      say("INBOX page mentions the table:", (await ap.locator("body").innerText()).includes("AT-SHARE Walk2 Orders"));
      const approve = ap.getByRole("button", { name: /^(approve|grant|allow)/i });
      say("INBOX approve buttons:", await approve.count());
      if (await approve.count()) await approve.first().click();
      await ap.waitForTimeout(3000);
      await op.reload({ waitUntil: "domcontentloaded" });
      await visible(op, "[data-activity-feed]").first().waitFor();
      await op.waitForTimeout(3000);
      say("AFTER approval: outsider request button count =", await op.locator("[data-request-edit-access]").count());
      const lvl = await sb.schema("custom").rpc("my_level", { p_organization_id: ORG, p_id: table, p_type: "table" });
      say("admin level on table:", lvl.data);
    } catch (inner) { say("INNER ERROR", String(inner.message).split("\n")[0]); }
  });
} catch (e) { say("WALK ERROR", String(e.message).split("\n")[0]); }
finally {
  await browser.close();
  try { const a = await client.tableArchive({ table_id: table }); say("cleanup archive:", JSON.stringify(a).slice(0, 100)); } catch (e) { say("cleanup archive failed:", e.message); }
}
