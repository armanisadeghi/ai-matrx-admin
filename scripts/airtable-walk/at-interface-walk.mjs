// AT-INTERFACE live walk: "Agency Ops" — an Interface over Clients / Projects / Content (Overview KPIs + chart, Content
// board, Calendar, Approval review), published, shared View to a client contact who is NOT in the organization (a tagged
// persona) and who sees only their own client's rows. Disposable tables + interface owned by admin@admin.com; archived after.
//   ORIGIN=http://<session>.localhost:3001 node scripts/airtable-walk/at-interface-walk.mjs [--keep]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { ORIGIN, env } from "./lib.mjs";
import { walkSignIn } from "./walk-signin.mjs";
import { withFixtureUser, testTarget, fixtureSessionCookies } from "../lib/persona.mjs";

const say = (...a) => console.log(...a);
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const KEEP = process.argv.includes("--keep");
const SHOTS = process.env.SHOTS ?? "/tmp/at-interface";
mkdirSync(SHOTS, { recursive: true });
const { sb, client } = await store();
const ORG = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const tag = Date.now().toString(36);
const id = () => crypto.randomUUID();
const NW = "dana.reyes@northwind-outfitters.com";

const tables = [];
let iface = null;
let result = "FAIL";
let walkVerdicts = [];
const browser = await chromium.launch({ headless: true });
try {
  await withFixtureUser(testTarget(), { suite: "at-interface/walk", purpose: "client contact opens the Agency Ops interface shared with them" }, async (contact) => {
    say("CONTACT persona", contact.email);
    const clients = must(await declareTable(client, { name: `Clients ${tag}`, labelSingular: "Client", labelPlural: "Clients",
      fields: [{ key: "name", label: "Client", type: "text", sort: 10 }, { key: "contact_email", label: "Contact email", type: "email", sort: 20 }] }), "clients");
    tables.push(clients);
    const projects = must(await declareTable(client, { name: `Projects ${tag}`, labelSingular: "Project", labelPlural: "Projects",
      fields: [{ key: "name", label: "Project", type: "text", sort: 10 }, { key: "client", label: "Client", type: "text", sort: 20 },
        { key: "client_contact", label: "Client contact", type: "email", sort: 25 },
        { key: "stage", label: "Stage", type: "select", sort: 30, options: ["Planning", "Active", "Wrapped"] }, { key: "due", label: "Due", type: "datetime", sort: 40 }] }), "projects");
    tables.push(projects);
    const content = must(await declareTable(client, { name: `Content ${tag}`, labelSingular: "Post", labelPlural: "Posts",
      fields: [{ key: "title", label: "Post", type: "text", sort: 10 }, { key: "client", label: "Client", type: "text", sort: 20 },
        { key: "client_contact", label: "Client contact", type: "email", sort: 25 },
        { key: "status", label: "Status", type: "select", sort: 30, options: ["Idea", "Drafting", "Ready for approval", "Approved", "Published"] },
        { key: "channel", label: "Channel", type: "select", sort: 40, options: ["Instagram", "LinkedIn", "Newsletter"] },
        { key: "publish_on", label: "Publish date", type: "datetime", sort: 50 }, { key: "internal_notes", label: "Agency notes", type: "long_text", sort: 60 }] }), "content");
    tables.push(content);
    for (const c of [{ name: "Comtech", contact_email: contact.email }, { name: "Northwind Outfitters", contact_email: NW }])
      must(await client.recordWrite({ table_id: clients, data: c }), "client row");
    for (const p of [{ name: "Comtech Q4 launch", client: "Comtech", client_contact: contact.email, stage: "Active", due: "2026-11-20" },
      { name: "Northwind winter catalog", client: "Northwind Outfitters", client_contact: NW, stage: "Active", due: "2026-11-05" },
      { name: "Comtech brand refresh", client: "Comtech", client_contact: contact.email, stage: "Planning", due: "2027-01-15" }])
      must(await client.recordWrite({ table_id: projects, data: p }), "project row");
    for (const [title, cl, cc, status, channel, publish_on, internal_notes] of [
      ["Comtech Q4 webinar promo", "Comtech", contact.email, "Ready for approval", "LinkedIn", "2026-10-21", "Keith wants it shorter."],
      ["Comtech case study: Lakeside", "Comtech", contact.email, "Ready for approval", "Newsletter", "2026-10-24", "Margin is thin."],
      ["Comtech hiring post", "Comtech", contact.email, "Drafting", "LinkedIn", "2026-10-29", "Not ready."],
      ["Northwind fall layering guide", "Northwind Outfitters", NW, "Ready for approval", "Instagram", "2026-10-20", "Client hates teal."],
      ["Northwind boot care reel", "Northwind Outfitters", NW, "Approved", "Instagram", "2026-10-22", "Shot list done."],
      ["Northwind gift guide", "Northwind Outfitters", NW, "Idea", "Newsletter", "2026-11-18", "Needs a hook."],
    ]) must(await client.recordWrite({ table_id: content, data: { title, client: cl, client_contact: cc, status, channel, publish_on, internal_notes } }), "post row");
    say("TABLES", JSON.stringify({ clients, projects, content }));

    const chartId = id();
    const scope = { me_field: "client_contact" };
    const pages = [
      { id: id(), name: "Overview", charts: [{ id: chartId, title: "Content by status", subject: content, kind: "bar", groupBy: ["status"], measures: [{ op: "count" }], span: 12 }], blocks: [
        { id: id(), kind: "number", title: "Waiting for approval", table_id: content, filter: { status: "Ready for approval" }, ...scope, span: 4 },
        { id: id(), kind: "number", title: "Active projects", table_id: projects, filter: { stage: "Active" }, ...scope, span: 4 },
        { id: id(), kind: "number", title: "Clients", table_id: clients, me_field: "contact_email", span: 4 },
        { id: chartId, kind: "chart", span: 12 }] },
      { id: id(), name: "Content board", charts: [], blocks: [
        { id: id(), kind: "layout", layout: "kanban", title: "Content board", table_id: content, group_field: "status", columns: ["title", "client", "channel"], ...scope, span: 12 }] },
      { id: id(), name: "Calendar", charts: [], blocks: [
        { id: id(), kind: "layout", layout: "calendar", title: "Publishing calendar", table_id: content, date_field: "publish_on", columns: ["title", "client"], ...scope, span: 12 }] },
      { id: id(), name: "Approval review", charts: [], blocks: [
        { id: id(), kind: "number", title: "Waiting on you", table_id: content, filter: { status: "Ready for approval" }, ...scope, span: 4 },
        { id: id(), kind: "review", title: "Posts to approve", table_id: content, filter: { status: "Ready for approval" }, ...scope,
          columns: ["title", "status", "channel", "publish_on"], field_groups: [{ title: "Post", fields: ["title", "channel", "publish_on"] }, { title: "Approval", fields: ["status"] }], span: 12 }] },
    ];
    const published = { pages, version: 1, at: new Date().toISOString(), by: null };
    iface = must(await client.dashboardDeclare({ table_id: content, name: `Agency Ops ${tag}`,
      blocks: [{ id: chartId, title: "Content by status", kind: "bar", group_by: ["status"], measures: [{ op: "count" }], span: 12 }],
      presentation: { kind: "interface", icon: "layout-dashboard", color: "violet", draft: { pages }, published, versions: [published] }, dashboard_id: null }), "interface");
    say("INTERFACE", iface, `${ORIGIN}/data/interfaces/${iface}`);
    const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: iface, p_principal_kind: "user", p_principal_id: contact.id, p_level: "viewer" });
    say("SHARE interface -> contact (View):", g.error ? "ERROR " + g.error.message : "ok");
    if (g.error) throw new Error("share failed");

    // ADMIN — every page draws; builder controls present
    const actx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const ap = await actx.newPage();
    const aerr = []; ap.on("console", (m) => m.type() === "error" && aerr.push(m.text().slice(0, 160)));
    await walkSignIn(ap, ORIGIN, { member: false });
    await ap.goto(`${ORIGIN}/data/interfaces/${iface}`, { waitUntil: "domcontentloaded", timeout: 300000 });
    await ap.waitForSelector("[data-records-page-number]", { timeout: 300000 });
    await ap.waitForTimeout(5000);
    say("ADMIN numbers:", JSON.stringify(await ap.locator("[data-records-page-number]").allInnerTexts()), "| chart bars drawn:", await ap.locator("[data-records-page-block=chart] svg").count());
    say("ADMIN builder controls: edit", await ap.locator("[data-records-interface-edit]").count(), "history", await ap.locator("[data-records-interface-history]").count(), "print", await ap.locator("[data-records-page-print]").count());
    await ap.screenshot({ path: `${SHOTS}/admin-overview.png`, fullPage: true });
    for (const p of pages.slice(1)) {
      await ap.click(`[data-records-interface-page="${p.id}"]`);
      await ap.waitForSelector(`[data-records-interface-page="${p.id}"][aria-current="page"]`, { timeout: 30000 }).catch(() => say("  (page did not switch)"));
      await ap.waitForTimeout(5000);
      say(`ADMIN ${p.name}: Northwind shown`, /Northwind/.test(await ap.locator("[data-records-interface]").innerText()), "| layout:", await ap.locator("[data-records-page-layout]").getAttribute("data-records-page-layout").catch(() => "-"));
      await ap.screenshot({ path: `${SHOTS}/admin-${p.name.replace(/\s+/g, "-").toLowerCase()}.png`, fullPage: true });
    }
    // Edit: a draft change shows Publish; Clear changes puts it back
    await ap.click("[data-records-interface-edit]");
    await ap.waitForSelector("[data-records-interface-editor]");
    const nameBox = ap.locator('input[aria-label="Page name"]');
    await nameBox.fill("Approvals"); await nameBox.press("Tab");
    await ap.waitForSelector("[data-records-interface-publish]", { timeout: 60000 });
    say("ADMIN draft edit -> Publish offered:", await ap.locator("[data-records-interface-publish]").count(), "| Clear offered:", await ap.locator("[data-records-interface-clear]").count());
    await ap.click("[data-records-interface-clear]");
    await ap.waitForTimeout(3000);
    say("ADMIN after Clear changes, Publish offered:", await ap.locator("[data-records-interface-publish]").count());
    const verdicts = [];
    const check = (label, ok, detail = "") => { say((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "  — " + String(detail).slice(0, 200))); verdicts.push([label, ok]); };
    check("Clear changes removes the Publish button", (await ap.locator("[data-records-interface-publish]").count()) === 0);
    // Publish: a draft rename, then Publish -> button gone, History lists two versions
    const histCount = async () => { await ap.locator("[data-records-interface-history]").first().click().catch(() => {}); const n = await ap.getByRole("option").count(); await ap.keyboard.press("Escape"); return n; };
    const before = await ap.locator("[data-records-interface-history]").count() ? await histCount() : 0;
    const reviewId = pages[3].id;
    await ap.click(`[data-records-interface-page="${reviewId}"]`);
    await ap.waitForTimeout(3000);
    const box = ap.locator('input[aria-label="Page name"]');
    await box.fill("Approvals now"); await box.press("Tab");
    await ap.waitForSelector("[data-records-interface-publish]", { timeout: 60000 });
    await ap.click("[data-records-interface-publish]");
    await ap.waitForFunction(() => !document.querySelector("[data-records-interface-publish]"), null, { timeout: 60000 }).catch(() => {});
    await ap.waitForTimeout(3000);
    check("Publish takes the Publish button away", (await ap.locator("[data-records-interface-publish]").count()) === 0);
    check("the published page carries its new name in the nav", /Approvals now/.test(await ap.locator("[data-records-interface-pages]").innerText()));
    const after = await histCount();
    check("Publish adds a version to History", after > before, `${before} -> ${after}`);
    // History restore: pick the oldest version; the old name returns
    await ap.locator("[data-records-interface-history]").first().click();
    await ap.getByRole("option").last().click();
    await ap.waitForTimeout(4000);
    const nav = await ap.locator("[data-records-interface-pages]").innerText();
    check("History restore brings the earlier page name back", /Approval review/.test(nav) && !/Approvals now/.test(nav), nav.replace(/\n/g, " | "));
    await ap.screenshot({ path: `${SHOTS}/admin-after-restore.png`, fullPage: true });
    // CSV and Print on the review page
    await ap.click(`[data-records-interface-page="${reviewId}"]`);
    await ap.waitForSelector("[data-records-page-csv]", { timeout: 60000 }).catch(() => {});
    const csvButtons = await ap.locator("[data-records-page-csv]").count();
    check("a CSV button is offered on a list/review block", csvButtons > 0, csvButtons);
    if (csvButtons) {
      const [dl] = await Promise.all([ap.waitForEvent("download", { timeout: 60000 }).catch(() => null), ap.locator("[data-records-page-csv]").first().click()]);
      if (dl) { const path = `${SHOTS}/${dl.suggestedFilename()}`; await dl.saveAs(path); const { readFileSync } = await import("node:fs"); const csv = readFileSync(path, "utf8"); check("CSV downloads the visible rows with a header", /title|Post/i.test(csv.split("\n")[0]) && /Comtech Q4 webinar promo/.test(csv), csv.slice(0, 160)); }
      else check("CSV downloads a file", false, "no download event");
    }
    await ap.evaluate(() => { window.__printed = 0; window.__frames = 0; window.print = () => { window.__printed++; }; new MutationObserver((m) => m.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeName === "IFRAME") window.__frames++; }))).observe(document.documentElement, { childList: true, subtree: true }); });
    const popup = ap.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
    await ap.locator("[data-records-page-print]").click();
    const pop = await popup;
    await ap.waitForTimeout(3000);
    const sig = await ap.evaluate(() => ({ printed: window.__printed, frames: window.__frames }));
    check("Print opens a print view of the page", !!pop || sig.printed > 0 || sig.frames > 0, JSON.stringify(sig));
    if (pop) { const t = await pop.locator("body").innerText().catch(() => ""); check("the print view holds the page content", /Comtech Q4 webinar promo/.test(t), t.slice(0, 120)); await pop.close().catch(() => {}); }
    walkVerdicts = verdicts;
    say("ADMIN console errors:", aerr.length, aerr.slice(0, 3).join(" || "));

    // MEMBER (test@test.com) — not shared: Request access, or the org lane opens it
    const mctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const mp = await mctx.newPage();
    await walkSignIn(mp, ORIGIN, { member: true }).catch((e) => say("MEMBER sign-in", e.message.slice(0, 80)));
    await mp.goto(`${ORIGIN}/data/interfaces/${iface}`, { waitUntil: "domcontentloaded", timeout: 300000 });
    await mp.waitForTimeout(15000);
    say("MEMBER sees:", (await mp.locator("main, body").first().innerText()).replace(/\s+/g, " ").slice(0, 160));
    await mp.screenshot({ path: `${SHOTS}/member.png`, fullPage: true });
    await mctx.close();

    // OUTSIDER — only Comtech; no builder controls; one column on a phone
    const host = new URL(ORIGIN).hostname;
    for (const [label, viewport] of [["desktop", { width: 1440, height: 1000 }], ["phone", { width: 390, height: 844 }]]) {
      const octx = await browser.newContext({ viewport, ...(label === "phone" ? { isMobile: true, hasTouch: true } : {}) });
      await octx.addCookies(await fixtureSessionCookies(testTarget(), contact, { host }));
      const op = await octx.newPage();
      const oerr = []; op.on("console", (m) => m.type() === "error" && oerr.push(m.text().slice(0, 160)));
      await op.goto(`${ORIGIN}/data/interfaces/${iface}?page=${pages[3].id}`, { waitUntil: "domcontentloaded", timeout: 300000 });
      await op.waitForSelector("[data-records-page-review]", { timeout: 300000 });
      await op.waitForTimeout(3000);
      const text = await op.locator("[data-records-interface]").innerText();
      say(`OUTSIDER ${label}: Comtech webinar`, /Comtech Q4 webinar promo/.test(text), "| Northwind", /Northwind/.test(text),
        "| agency notes", /Margin is thin|Keith wants/.test(text), "| number", JSON.stringify(await op.locator("[data-records-page-number]").allInnerTexts()),
        "| edit", await op.locator("[data-records-interface-edit]").count());
      if (label === "phone") {
        const widths = await op.locator("[data-records-page-block]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
        say("OUTSIDER phone element widths:", JSON.stringify(widths), "(viewport 390)");
      } else {
        await op.locator("[data-record-stepper] button").last().click().catch(() => {});
        await op.waitForTimeout(1500);
        say("OUTSIDER next -> detail:", (await op.locator("[data-records-page-detail]").first().innerText()).replace(/\n/g, " | ").slice(0, 120));
        for (const p of pages.slice(0, 3)) {
          await op.click(`[data-records-interface-page="${p.id}"]`);
          await op.waitForSelector(`[data-records-interface-page="${p.id}"][aria-current="page"]`, { timeout: 30000 }).catch(() => say("  (page did not switch)"));
          await op.waitForTimeout(5000);
          const t = await op.locator("[data-records-interface]").innerText();
          say(`OUTSIDER ${p.name}: Northwind`, /Northwind/.test(t), "| Comtech", /Comtech/.test(t), "| numbers", JSON.stringify(await op.locator("[data-records-page-number]").allInnerTexts()));
          await op.screenshot({ path: `${SHOTS}/outsider-${p.name.replace(/\s+/g, "-").toLowerCase()}.png`, fullPage: true });
        }
      }
      await op.screenshot({ path: `${SHOTS}/outsider-${label}.png`, fullPage: true });
      say(`OUTSIDER ${label} console errors:`, oerr.length, oerr.slice(0, 3).join(" || "));
      await octx.close();
    }
    result = "PASS";
  });
} catch (e) {
  say("WALK ERROR", e.message.split("\n")[0]);
} finally {
  await browser.close();
  if (!KEEP) {
    if (iface) say("cleanup interface:", JSON.stringify(await client.dashboardDelete({ dashboard_id: iface })).slice(0, 80));
    for (const t of tables) {
      let r;
      for (let i = 0; i < 10; i++) { r = await client.tableArchive({ table_id: t }); if (!r.ok || r.data?.done !== false) break; }
      say("cleanup table:", JSON.stringify(r).slice(0, 80));
    }
  }
}
say("VERDICTS", walkVerdicts.filter(([, ok]) => !ok).length ? "FAILED: " + walkVerdicts.filter(([, ok]) => !ok).map(([l]) => l).join("; ") : "all added checks passed");
say("RESULT", result, "(screenshots in", SHOTS + ")");
