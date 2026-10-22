// CD-PAGE-12 live walk: a portal's owner turns on sign-up, a password, Google and comment notices in the portal
// builder; a stranger signs herself up from the portal's sign-in page; she signs in by her emailed link, finds her
// own rows by search (never by a field she is not shown), sets a password and signs back in with it; the office
// comments on her record and a notice to her address is queued.
//
// The business is Rincon Plumbing Co (an admin@admin.com test organization). The stranger is a persona from the
// persona factory (an undeliverable fixtures.aimatrx.com address, tagged and removed after). Every table and the
// portal are archived after.
//   ORIGIN=http://<session>.localhost:3001 SHOTS=<dir> node scripts/forms/portal-access-walk.mjs
//   ORIGIN=https://www.aimatrx.com ADMIN_ORIGIN=http://<session>.localhost:3001 … (the stranger on the live site)
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { walkSignIn } from "../airtable-walk/walk-signin.mjs";
import { createFixtureUser, deleteFixtureUser, fixtureConfirmLink, testTarget } from "../lib/persona.mjs";
import { declareTable } from "@ai-matrx/records/core";

const root = path.resolve(new URL(".", import.meta.url).pathname, "../..");
for (const f of [path.join(root, ".env.local"), path.join(root, "../aidream/.env")]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const ORIGIN = process.env.ORIGIN ?? "http://close-page.localhost:3001";
// The owner's builder needs a signed-in browser (dev-login on a preview host); the stranger's half can run on the
// live site. ADMIN_ORIGIN defaults to ORIGIN.
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN ?? ORIGIN;
const SHOTS = process.env.SHOTS ?? "/tmp/cd-page-12";
fs.mkdirSync(SHOTS, { recursive: true });
// admin@admin.com's own Workspace (the persona is in no organization, so she is an outsider to it).
const ORG = process.env.WALK_ORG_ID ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
process.env.WALK_ORG_ID = ORG;
const { client: records } = await (await import("../airtable-walk/store.mjs")).store();
const say = (...a) => console.log(...a);
let fails = 0;
const check = (label, ok, detail = "") => { if (!ok) fails++; say((ok ? "PASS " : "FAIL ") + label + (detail ? `  (${String(detail).slice(0, 200)})` : "")); };

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: process.env.AI_ADMIN_USERNAME, password: process.env.AI_ADMIN_PASSWORD });
if (authErr || auth?.user?.email !== "admin@admin.com") throw new Error("not signed in as admin@admin.com");
const c = sb.schema("custom");
async function door(fn, args) {
  const { data, error } = await c.rpc(fn, { p_organization_id: ORG, ...args });
  if (error) throw new Error(`custom.${fn}: ${error.message} ${error.hint ?? ""}`);
  return data;
}
const sfx = Date.now().toString(36);
const table = async (name, singular, plural, fields) => {
  const r = await declareTable(records, { name: `${name} ${sfx}`, labelSingular: singular, labelPlural: plural, fields });
  if (!r.ok) throw new Error(`table ${name}: ${JSON.stringify(r.error)}`);
  return r.data;
};
const field = (t, spec) => door("field_declare", { p_table_id: t, p_spec: spec });
const write = (t, doc) => door("record_write", { p_table_id: t, p_data: doc });

const target = testTarget();
let managers = null, calls = null, portal = null, persona = null, strangerPage = null;
const browser = await chromium.launch({ headless: true });
try {
  managers = await table("Property managers", "Property manager", "Property managers",
    [{ key: "building", label: "Building", type: "text", sort: 10 }, { key: "manager_email", label: "Manager email", type: "text", sort: 20 }]);
  calls = await table("Service calls", "Service call", "Service calls",
    [{ key: "problem", label: "What is wrong", type: "text", sort: 10 }, { key: "unit", label: "Unit or area", type: "text", sort: 20 },
      { key: "internal_notes", label: "Office notes", type: "text", sort: 90 }]);
  await field(calls, { key: "building", label: "Building", type: "relation", relation_target: managers });
  const mesa = await write(managers, { building: "Mesa Verde Apartments", manager_email: "mesa.manager@rincon-clients.test" });
  await write(calls, { problem: "Water heater pilot out at Mesa", unit: "Unit 3B", building: mesa });
  portal = await door("portal_declare", {
    p_title: "Your service calls", p_client_table_id: managers,
    p_tables: [{ table_id: calls, names_via: "building", visible_fields: ["problem", "unit"], editable_fields: [], comments: true }],
    p_portal_id: null, p_slug: `rincon-access-walk-${sfx}`, p_sign_in_method: "magic_link", p_config: null });
  const slug = (await door("portal_card", { p_portal_id: portal })).slug;
  say("PORTAL", portal, "slug", slug, "TABLES", managers, calls);

  // 1. The owner turns the ways in on, in the portal builder.
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    ctx.setDefaultNavigationTimeout(300000);
    const page = await ctx.newPage();
    say("admin:", await walkSignIn(page, ADMIN_ORIGIN));
    await page.goto(`${ADMIN_ORIGIN}/make?make=portal&org=${ORG}&id=${portal}`, { waitUntil: "domcontentloaded" });
    const editor = page.locator("[data-portal-access-editor]");
    await editor.waitFor({ timeout: 300000 });
    // A switch pressed before the page hydrates does not stay on: press until it says it is on.
    for (const key of ["self_signup", "password", "google", "notify_comments"]) {
      const sw = editor.locator(`[data-portal-access-switch="${key}"]`);
      for (let t = 0; t < 10 && (await sw.getAttribute("aria-checked")) !== "true"; t++) {
        await sw.click();
        await page.waitForTimeout(1500);
      }
    }
    await page.screenshot({ path: `${SHOTS}/cd-page-12-0-owner-switches-on.png` });
    // The design-system Select is a menu button (role button, its choices menuitemradio).
    await editor.getByRole("button", { name: "Name goes in" }).click();
    await page.getByRole("menuitemradio", { name: "Building" }).click();
    await editor.getByRole("button", { name: "Email goes in" }).click();
    await page.getByRole("menuitemradio", { name: "Manager email" }).click();
    await editor.locator("[data-portal-access-save]").click();
    await editor.locator("[data-portal-access-said]").waitFor({ timeout: 60000 });
    const said = await editor.locator("[data-portal-access-said]").innerText();
    await editor.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/cd-page-12-1-owner-switches.png` });
    check("owner: the sign-in switches save", said === "Saved", said);
    const access = (await door("portal_card", { p_portal_id: portal })).config?.access ?? {};
    check("owner: the store holds every switch and both columns", access.self_signup && access.password && access.google && access.notify_comments
      && access.name_field === "building" && access.email_field === "manager_email", JSON.stringify(access));
    await ctx.close();
  }

  // 2. A stranger signs herself up on the sign-in page.
  persona = await createFixtureUser(target, { suite: "portal/self-signup", purpose: "a building manager signs herself up (CD-PAGE-12)" });
  const herBuilding = `Harbor Point Condos ${sfx}`;
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  ctx.setDefaultNavigationTimeout(300000);
  const page = await ctx.newPage();
  strangerPage = page;
  await page.goto(`${ORIGIN}/portal/c/${slug}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-portal-ways-in]").waitFor({ timeout: 300000 });
  const ways = await page.locator("[data-portal-ways-in]").innerText();
  await page.screenshot({ path: `${SHOTS}/cd-page-12-2-sign-in-ways.png` });
  check("stranger: the sign-in page offers Google, a password and sign-up", /Continue with Google/.test(ways) && /Use a password/.test(ways) && /Sign up/.test(ways), ways.replace(/\s+/g, " "));
  await page.locator("[data-portal-sign-up]").click();
  await page.locator("[data-portal-name]").fill(herBuilding);
  await page.locator("#portal-email").fill(persona.email);
  await page.getByRole("button", { name: /Sign up and email me a link/ }).click();
  await page.getByText("Check your email").waitFor({ timeout: 120000 });
  await page.screenshot({ path: `${SHOTS}/cd-page-12-3-signed-up.png` });
  const rows = await door("read_records", { p_table_id: managers, p_limit: 50, p_offset: 0 }).catch(async () => null);
  const list = Array.isArray(rows) ? rows : rows?.records ?? rows?.rows ?? [];
  const hers = list.find((r) => (r.document ?? r.data ?? r)?.building === herBuilding);
  check("stranger: signing up made her a client row with her name and address", Boolean(hers) && (hers.document ?? hers.data ?? hers).manager_email === persona.email,
    hers ? JSON.stringify(hers.document ?? hers.data ?? hers) : `${list.length} rows`);
  const herId = hers?.id ?? hers?.record_id;

  // The office logs her calls.
  const heater = await write(calls, { problem: "Water heater replacement", unit: "Unit 2C", internal_notes: "Bill at the overtime rate", building: herId });
  await write(calls, { problem: "Garbage disposal jammed", unit: "Unit 4A", building: herId });
  await write(calls, { problem: "Roof drain clogged", unit: "Roof", building: herId });

  // 3. She signs in by her link and searches.
  const link = (await fixtureConfirmLink(target, persona, { origin: ORIGIN })) + `&redirectTo=${encodeURIComponent(`/portal/c/${slug}`)}`;
  await page.goto(link, { waitUntil: "domcontentloaded" });
  await page.waitForURL((u) => u.pathname === `/portal/c/${slug}`, { timeout: 300000 });
  await page.locator("[data-portal-search]").waitFor({ timeout: 300000 });
  const body = await page.locator("main").innerText();
  check("client: her link opens her portal with her three calls", /Water heater replacement/.test(body) && /Garbage disposal jammed/.test(body) && /Roof drain clogged/.test(body));
  check("client: another client's call is not on her portal", !/Mesa/.test(body));
  check("client: the office notes are not on her portal", !/overtime/.test(body));
  await page.locator("[data-portal-search] input[name=q]").fill("water heater");
  await page.locator("[data-portal-search] button[type=submit]").click();
  await page.waitForURL((u) => u.searchParams.get("q") === "water heater", { timeout: 120000 });
  await page.locator("[data-portal-search-found]").waitFor({ timeout: 120000 });
  const found = await page.locator("[data-portal-search-found]").getAttribute("data-portal-search-found");
  const after = await page.locator("main").innerText();
  await page.screenshot({ path: `${SHOTS}/cd-page-12-4-search.png`, fullPage: true });
  check("client: a search keeps only the call that says it", found === "1" && /Water heater replacement/.test(after) && !/Garbage disposal/.test(after), `found ${found}`);
  await page.goto(`${ORIGIN}/portal/c/${slug}?q=overtime`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-portal-search-found]").waitFor({ timeout: 120000 });
  const hidden = await page.locator("[data-portal-search-found]").getAttribute("data-portal-search-found");
  check("client: a search never finds a call by a field she is not shown", hidden === "0", `found ${hidden}`);

  // 4. She sets a password, signs out, and signs back in with it.
  const password = `Harbor-${crypto.randomUUID()}`;
  await page.goto(`${ORIGIN}/portal/c/${slug}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-portal-password-setter] button").click();
  await page.locator("[data-portal-password-setter] input[type=password]").fill(password);
  await page.locator("[data-portal-password-setter] button[type=submit]").click();
  await page.getByText("Password saved.").waitFor({ timeout: 60000 });
  check("client: she sets a password from her portal", true);
  await ctx.clearCookies();
  await page.goto(`${ORIGIN}/portal/c/${slug}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-portal-use-password]").click();
  await page.locator("#portal-email").fill(persona.email);
  await page.locator("#portal-password").fill(password);
  await page.locator("[data-portal-password-form] button[type=submit]").click();
  await page.locator("[data-portal-search]").waitFor({ timeout: 300000 });
  const back = await page.locator("main").innerText();
  await page.screenshot({ path: `${SHOTS}/cd-page-12-5-password-back-in.png` });
  check("client: her email and password sign her back into her portal", /Water heater replacement/.test(back));

  // 5. The office comments on her call; a notice to her address is queued. Her own comment queues none.
  const comment = await door("comment_write", { p_record_id: heater, p_body: "The technician is on the way, about 20 minutes out." });
  const commentId = typeof comment === "string" ? comment : comment?.id ?? comment?.comment_id;
  const { data: notices, error: nErr } = await sb.schema("communication").from("notification").select("channel, to_address, subject, deep_link")
    .eq("event_key", "custom.portal.client_notice").like("dedupe_key", `portal-comment:${commentId}:%`);
  check("office: a comment on her call queues a notice to her address", !nErr && (notices ?? []).some((n) => n.to_address === persona.email),
    nErr ? nErr.message : JSON.stringify(notices));
  if (nErr) say("(the notice table is not readable by the signed-in owner; checked in the store instead)");
  await ctx.close();
} catch (e) {
  fails++;
  say("WALK ERROR", e.message);
  if (strangerPage) {
    await strangerPage.screenshot({ path: `${SHOTS}/cd-page-12-error.png`, fullPage: true }).catch(() => {});
    say("stranger page at error:", strangerPage.url(), (await strangerPage.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400));
  }
} finally {
  await browser.close();
  if (portal) say("cleanup portal:", JSON.stringify(await c.rpc("portal_archive", { p_organization_id: ORG, p_portal_id: portal, p_confirm_title: "Your service calls", p_reason: "CD-PAGE-12 walk fixture" }).then((r) => r.error?.message ?? "archived")));
  for (const t of [calls, managers]) if (t) { let r; for (let i = 0; i < 10; i++) { r = await records.tableArchive({ table_id: t }); if (!r.ok || r.data?.done !== false) break; } say("cleanup table:", JSON.stringify(r).slice(0, 80)); }
  if (persona) { await deleteFixtureUser(target, persona.id).catch((e) => say("persona teardown:", e.message)); say("cleanup persona: removed"); }
  say(fails === 0 ? "RESULT PASS" : `RESULT FAIL (${fails})`);
}
