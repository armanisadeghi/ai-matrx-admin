// AT-SHARE live walk: row 1 (table shared to an outsider), row 2 (request edit access), row 3 (activity feed), on the live DB.
// Disposable table owned by admin@admin.com; the outsider is a tagged fixture persona (not in admin's organization). Archives the table after.
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
const table = must(await declareTable(client, { name: "AT-SHARE Walk Orders " + Date.now().toString(36), labelSingular: "Order", labelPlural: "Orders",
  fields: [{ key: "order", label: "Order", type: "text", sort: 10 }, { key: "status", label: "Status", type: "select", sort: 20, options: ["New", "Packed"] }] }), "table");
for (const o of ["Order 101", "Order 102", "Order 103", "order 101 "]) must(await client.recordWrite({ table_id: table, data: { order: o, status: "New" } }), "row");
say("TABLE", table);
const browser = await chromium.launch({ headless: true });
let result = "FAIL";
try {
  await withFixtureUser(testTarget(), { suite: "at-share/walk", purpose: "outside viewer asks for edit" }, async (user) => {
    // ROW 1: the table goes to an outsider through the share door.
    const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: table, p_principal_kind: "person", p_principal_id: user.id, p_level: "viewer" });
    say("ROW1 share_grant:", g.error ? "ERROR " + g.error.message : JSON.stringify(g.data.message));
    if (g.error) throw new Error("row 1 failed");
    try {
    // ADMIN: Activity feed, and no Request button (owner).
    const actx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const ap = await actx.newPage();
    await signIn(ap, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
    await ap.goto(`${ORIGIN}/data/${table}`, { waitUntil: "domcontentloaded", timeout: 240000 });
    await ap.waitForSelector("[data-activity-feed]", { timeout: 240000 });
    say("ADMIN request button present:", await ap.locator("[data-request-edit-access]").count());
    await ap.click("[data-activity-feed]");
    await ap.waitForSelector("[data-activity-entry]", { timeout: 60000 });
    const entries = await ap.locator("[data-activity-entry]").allInnerTexts();
    say("ROW3 activity entries:", entries.length); entries.slice(0, 6).forEach((e) => say("  -", e.replace(/\n/g, " | ")));
    await ap.screenshot({ path: "/tmp/at/atshare-activity.png" });
    await ap.keyboard.press("Escape");
    await ap.click("[data-find-duplicates]");
    await ap.getByRole("button", { name: "Order", exact: true }).click();
    await ap.click("[data-find-duplicates-run]");
    await ap.waitForSelector("[data-duplicate-group]", { timeout: 60000 });
    say("ROW4 dedupe groups:", await ap.locator("[data-duplicate-group]").count(), "| members:", (await ap.locator("[data-duplicate-group] li").allInnerTexts()).join(" / "));
    await ap.screenshot({ path: "/tmp/at/atshare-dupes.png" });
    await ap.keyboard.press("Escape");
    // OUTSIDER: opens the table, sees the request button, asks.
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const host = new URL(ORIGIN).hostname;
    await ctx.addCookies(await fixtureSessionCookies(testTarget(), user, { host }));
    const op = await ctx.newPage(); globalThis.__p = op;
    await op.goto(`${ORIGIN}/data/${table}`, { waitUntil: "domcontentloaded", timeout: 240000 });
    await op.waitForSelector("[data-request-edit-access]", { timeout: 240000 });
    await op.waitForTimeout(2000);
    say("ROW1 outsider opened the table; body mentions an order:", /Order 10[123]/.test(await op.locator("body").innerText()));
    await op.click("[data-request-edit-access]");
    await op.fill("textarea", "I keep the packing list.");
    await op.screenshot({ path: "/tmp/at/atshare-request.png" });
    await op.click("[data-request-edit-access-send]");
    await op.waitForSelector("[data-request-edit-access-said]", { timeout: 60000 });
    say("ROW2 outsider sees:", await op.locator("[data-request-edit-access-said]").innerText());
    // OWNER: the request is in the inbox; approve grants Edit.
    const list = await sb.rpc("access_request_list", { p_box: "inbox" });
    const mine = JSON.stringify(list.data ?? []).includes(table);
    say("ROW2 owner inbox holds the request:", mine, list.error?.message ?? "");
    const row = (Array.isArray(list.data) ? list.data : list.data?.requests ?? []).find((r) => JSON.stringify(r).includes(table));
    const dec = await sb.rpc("access_request_decide", { p_request_id: row.id, p_decision: "grant", p_level: "editor", p_note: null });
    say("ROW2 decide(grant editor):", dec.error?.message ?? dec.data?.status);
    await op.reload({ waitUntil: "domcontentloaded" });
    await op.waitForSelector("[data-activity-feed]", { timeout: 240000 });
    await op.waitForTimeout(2500);
    say("ROW2 after approval the request button is gone:", (await op.locator("[data-request-edit-access]").count()) === 0);
    result = "PASS";
    } catch (inner) { say('INNER ERROR', inner.message.split('\n')[0]); try { await (globalThis.__p ?? {}).screenshot?.({ path: '/tmp/at/atshare-fail.png' }); } catch {} }
  });
} catch (e) { say('WALK ERROR', e.message); } finally {
  await browser.close();
  try { const a = await client.tableArchive({ table_id: table }); say("cleanup archive:", JSON.stringify(a).slice(0, 120)); } catch (e) { say("cleanup archive failed:", e.message); }
}
say("RESULT", result);
