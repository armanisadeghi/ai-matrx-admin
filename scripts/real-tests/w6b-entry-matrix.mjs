#!/usr/bin/env node
// W6-B — the surface entry-point matrix (surface declarations, PLAN.md W6; VISION A26, A29 Part B).
//
// ONE scenario, swappable triggers, deterministic oracles. Never the agent's self-report.
//
//   Scenario "notes" (write): a disposable note owned by the signed-in test account holds a unique
//   canary sentence and one misspelled word ("recieve"). The agent is told to fix that one word. Pass =
//     O1 received   the run's stored request carries the canary AND the page situation
//                   (POST /admin/surface-evidence/receives, stored mode; when that endpoint is not live
//                   yet the oracle reads chat.request_snapshot directly and says so)
//     O2 patch      the run's apply_surface_write call on note_content is a str_replace patch, completed
//     O3 db         workbench.notes.content equals the expected body exactly
//     O4 page       a fresh load of /notes/<id> shows the fixed sentence and not the old word
//   Scenario "hr" (read-only): /hr/settings/employer; O1 only — the stored request carries the
//   Human Resources module paragraph and the employer page's HR values (the active organization name).
//
//   Triggers (--triggers, comma list; default all four for notes, chat for hr):
//     chat      the shell Side Chat on the page, agent switched to the test agent
//     binding   the header "Agents for this page" menu → Run <agent> (a person-scope binding of the test
//               agent to matrx-user/notes with value mapping note_canary ← note_bundle; created once, reused)
//     shortcut  right-click in the editor → the context menu's person shortcut (a mandate shortcut on
//               matrx-user/notes held by the test agent, default input = the instruction; made per run)
//     mandate   the same agent-held mandate started from the header Agents menu (in-place mandate window)
//
// Models: Test Data Agent (5f533f4f…, Claude Haiku 5.5, low reasoning) for every write run; Test Reply
// (8a4b7c8e…, plumbing model) for the read-only HR run. Never General Chat. AI test mode is never set.
//
// Records: everything the harness creates is owned by the signed-in test account, in the account's own
// organization; notes and shortcuts are archived at the end (never hard-deleted); the binding is a
// standing person-scope fixture (reused, so nothing is deleted).
//
// Usage (from matrx-frontend):
//   node scripts/real-tests/w6b-entry-matrix.mjs                       # notes × all triggers, as admin
//   node scripts/real-tests/w6b-entry-matrix.mjs --scenario hr --as member
//   node scripts/real-tests/w6b-entry-matrix.mjs --triggers chat,binding --as admin --out DIR
//   --wait <s>   seconds to wait per run for the write (default 150)   --keep  do not archive
// Every run writes result.json + screenshots to --out (default: a new temp directory, printed) and
// stores result.json as a platform work product (common-docs holds plans only, document-types rule 11):
//   aidream scripts/store_platform_artifact.py surface-entry-matrix <file>  → printed /files/f/<id> link
// (--no-store skips the upload). A run is found by its unique tag (the note's canary, or the tag in the
// HR message) inside the stored request, never by account and time alone — two runs as one account
// never pick up each other's conversation.
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { mintSessionCookies, frontendEnv } from "./session-cookies.mjs";
import { markBrowserAgentTraffic, agentTrafficHeaders } from "../lib/agent-traffic.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const BASE = "https://www.aimatrx.com";
const SERVER = "https://server.app.matrxserver.com";
// The write runs' agent: admin-owned, Claude Haiku 5.5, low reasoning, no tools of its own (the page's
// apply_surface_write is the only write path it gets). Test Data Agent (5f533f4f…, system) is the
// first choice but a person can neither pick it in the Side Chat picker nor bind it (assoc_add needs
// editor on the agent), so the matrix runs on this one.
const TEST_DATA_AGENT = { id: "c552587a-433b-4df0-98a6-074841ffe7bc", name: "Tool libraries test agent (cheap)" };
const TEST_REPLY_AGENT = { id: "8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f", name: "Test Reply" };
const NOTES_SURFACE = "matrx-user/notes";
const SHORTCUT_LABEL = "W6B fix spelling";
const AIDREAM = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../aidream");
const ARTIFACT_COLLECTION = "surface-entry-matrix";
// The shortcut's category: the system "My Personal" row (placement ai-action) — the context menu and
// the Agents popover read shortcuts only through a category (mandate.context_menu_view joins
// platform.categories with placement_type in ai-action|content-block|organization-tool|user-tool), and
// the shortcut form refuses a save with none (features/agent-shortcuts/components/ShortcutForm.tsx).
const SHORTCUT_CATEGORY = { name: "My Personal", placement: "ai-action" };

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = { scenario: "notes", as: "admin", triggers: null, wait: 150, keep: false, out: null, store: true };
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i], v = argv[i + 1];
  if (a === "--scenario") (opt.scenario = v), (i += 1);
  else if (a === "--as") (opt.as = v), (i += 1);
  else if (a === "--triggers") (opt.triggers = v.split(",").map((s) => s.trim()).filter(Boolean)), (i += 1);
  else if (a === "--wait") (opt.wait = Number(v)), (i += 1);
  else if (a === "--out") (opt.out = v), (i += 1);
  else if (a === "--keep") opt.keep = true;
  else if (a === "--no-store") opt.store = false;
  else { console.error(`unknown argument ${a}`); process.exit(2); }
}
opt.triggers ??= opt.scenario === "hr" ? ["chat"] : ["chat", "binding", "shortcut", "mandate"];
opt.out ??= fs.mkdtempSync(path.join(os.tmpdir(), "w6b-"));
fs.mkdirSync(opt.out, { recursive: true });

const env = frontendEnv();
const email = opt.as === "member" ? env.AI_MEMBER_USERNAME : env.AI_ADMIN_USERNAME;
const session = await mintSessionCookies(email);
const userDb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
  auth: { persistSession: false, autoRefreshToken: false },
});
// The referee: read-only reads with the project's secret key (oracles never write).
const refDb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
// The receives endpoint is admin-only: oracles call it as the test admin whichever seat ran.
const adminSession = opt.as === "admin" ? session : await mintSessionCookies(env.AI_ADMIN_USERNAME);

const liveServer = await fetch(`${SERVER}/health/version`).then((r) => r.json()).catch(() => ({}));
const liveSite = await fetch(`${BASE}/api/version`, { headers: agentTrafficHeaders("w6b-entry-matrix") }).then((r) => r.json()).catch(() => ({}));
const harnessSha = (() => { try { return execSync("git log -1 --format=%h -- scripts/real-tests/w6b-entry-matrix.mjs", { encoding: "utf8" }).trim(); } catch { return null; } })();

// ── helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = () => Math.random().toString(36).slice(2, 7).toUpperCase();
async function pointerClick(page, selector, textPrefix) {
  return page.evaluate(([sel, prefix]) => {
    const els = Array.from(document.querySelectorAll(sel)).filter((e) => e.getClientRects().length);
    const el = prefix
      ? els.find((e) => ((e.getAttribute("aria-label") || e.textContent || "").trim()).startsWith(prefix))
      : els[0];
    if (!el) return false;
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const Ctor = type.startsWith("pointer") ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true }));
    }
    return true;
  }, [selector, textPrefix ?? null]);
}
async function shot(page, name) {
  try { await page.screenshot({ path: path.join(opt.out, `${name}.png`), timeout: 15000 }); } catch {}
}
async function approveCards(page) {
  return page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).filter((b) => b.getClientRects().length).find((b) =>
      /^(Allow|Apply|Approve|Accept|Yes, apply|Apply changes|Apply change)$/i.test((b.textContent || "").trim()));
    if (!btn) return null;
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const Ctor = type.startsWith("pointer") ? PointerEvent : MouseEvent;
      btn.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true }));
    }
    return (btn.textContent || "").trim();
  });
}
async function openAgentsMenu(page) {
  for (let i = 0; i < 4; i += 1) {
    await pointerClick(page, '[aria-label="Agents for this page"]');
    await page.waitForTimeout(2500);
    if (await page.locator("[data-radix-popper-content-wrapper]").count()) return true;
    await page.keyboard.press("Escape");
  }
  return false;
}
async function typeAndSend(page, scopeSel, message) {
  const box = page.locator(`${scopeSel} [data-agent-input-shell] textarea`).last();
  await box.waitFor({ state: "visible", timeout: 30000 });
  await box.click();
  await box.fill(message);
  await page.waitForTimeout(400);
  await box.press("Enter");
}

// ── fixtures ────────────────────────────────────────────────────────────────
async function homeOrganization() {
  // The account's own organization for its disposable records: the fenced Safety Net Real Tests org
  // for the admin; for the member, the organization of its newest own note (RLS read as itself).
  if (opt.as === "admin") return "226be635-194d-42dd-87c8-7a9562f70939";
  const { data } = await userDb.schema("workbench").from("notes").select("organization_id")
    .eq("created_by", session.userId).order("created_at", { ascending: false }).limit(1);
  if (!data?.[0]) throw new Error("member has no own note to name its organization");
  return data[0].organization_id;
}
async function createNote(orgId, runTag) {
  const canary = `Harbor ledger canary ${runTag}: pallet 4 of lane Q${runTag.slice(-2)} is checked.`;
  const body = `${canary}\n\nThe crate will recieve a printed label on dock four.`;
  const expected = body.replace("recieve", "receive");
  const { data, error } = await userDb.schema("workbench").from("notes")
    .insert({ label: `W6-B ${runTag}`, content: body, organization_id: orgId }).select("id").single();
  if (error) throw new Error(`note create refused: ${error.message}`);
  return { id: data.id, canary, body, expected };
}
async function archiveNote(id) {
  const { error } = await userDb.schema("workbench").from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  return error ? `archive refused: ${error.message}` : "archived";
}
async function ensureBinding(orgId) {
  // An organization-tier binding (role binding:o:<the account's test org>) of the test agent to the
  // notes surface with ONE value mapping from a page value (note_canary ← note_bundle). Made once and
  // reused; a person binding without a mapping may also exist for this agent (not ours, untouched).
  const role = `binding:o:${orgId}`;
  const { data: surf } = await userDb.schema("ui").from("ui_surface").select("id").eq("name", NOTES_SURFACE).single();
  const { data: rows } = await refDb.schema("platform").from("associations").select("id,role,payload")
    .eq("source_type", "agent").eq("source_id", TEST_DATA_AGENT.id).eq("target_type", "surface").eq("target_id", surf.id);
  const mine = (rows || []).find((r) => r.role === role);
  if (mine) return { id: mine.id, created: false, role, payload: mine.payload, others: (rows || []).filter((r) => r !== mine).map((r) => ({ role: r.role, payload: r.payload })) };
  const value_mappings = { note_canary: { target: "note_bundle", mapType: "surface_value", required: false } };
  const { data, error } = await userDb.rpc("assoc_add", {
    p_source_type: "agent", p_source_id: TEST_DATA_AGENT.id, p_target_type: "surface", p_target_id: surf.id,
    p_org_id: orgId, p_label: null, p_role: role, p_position: null,
    p_metadata: { tier: "org", user_id: null, project_id: null, task_id: null, version: 1, w6b_fixture: true },
    p_payload_kind: "surface_binding", p_payload: { value_mappings },
  });
  if (error) return { id: null, created: false, role, refused: error.message, others: (rows || []).map((r) => ({ role: r.role, payload: r.payload })) };
  return { id: data, created: true, role, payload: { value_mappings } };
}
async function createShortcut(orgId, instruction) {
  const { data: cats } = await userDb.schema("platform").from("categories").select("id")
    .eq("dimension", "shortcut").eq("name", SHORTCUT_CATEGORY.name).eq("placement_type", SHORTCUT_CATEGORY.placement)
    .is("deleted_at", null).limit(1);
  if (!cats?.[0]) throw new Error(`no "${SHORTCUT_CATEGORY.name}" shortcut category readable by this account`);
  const { data: id, error } = await userDb.schema("agent").rpc("agx_create_shortcut_m", {
    p_agent_id: TEST_DATA_AGENT.id, p_label: SHORTCUT_LABEL, p_category_id: cats[0].id, p_user_id: session.userId,
    p_organization_id: orgId, p_project_id: null, p_task_id: null, p_use_latest: true,
  });
  if (error) throw new Error(`shortcut create refused: ${error.message}`);
  const sid = typeof id === "string" ? id : id?.id ?? id?.[0]?.id;
  const { error: e2 } = await userDb.schema("mandate").from("vw_shortcut").update({
    surface_name: NOTES_SURFACE, default_user_input: instruction, auto_run: true, allow_chat: true,
    value_mappings: { note_canary: { target: "note_bundle", mapType: "surface_value", required: false } },
  }).eq("id", sid);
  if (e2) throw new Error(`shortcut update refused: ${e2.message}`);
  const { data: row } = await userDb.schema("mandate").from("vw_shortcut").select("id,mandate_id,mandate_key,category_id,label").eq("id", sid).single();
  return row;
}
async function archiveShortcut(id) {
  const { error } = await userDb.schema("mandate").from("vw_shortcut").update({ is_active: false, deleted_at: new Date().toISOString() }).eq("id", id);
  return error ? `archive refused: ${error.message}` : "archived";
}

// ── triggers ────────────────────────────────────────────────────────────────
const TRIGGERS = {
  async chat(page, ctx) {
    await pointerClick(page, '[aria-label="Open Side Chat"]');
    await page.waitForTimeout(5000);
    const agentBtn = page.locator('[aria-label^="Agent:"]').first();
    const current = (await agentBtn.getAttribute("aria-label").catch(() => "")) || "";
    if (!current.includes(ctx.agent.name)) {
      await agentBtn.click({ timeout: 10000 });
      await page.waitForTimeout(1500);
      // "Choose your chat agent" lists a few; "Choose any agent" is a submenu with the full searchable picker.
      const any = page.getByText("Choose any agent", { exact: true }).first();
      await any.hover().catch(() => {});
      await page.waitForTimeout(1200);
      await any.click().catch(() => {});
      await page.waitForTimeout(2500);
      const search = page.locator('input[placeholder*="agent" i]:visible, [role=menu] input:visible, [role=dialog] input:visible').last();
      if (await search.count()) await search.fill(ctx.agent.name);
      else await shot(page, "chat-picker");
      // The picker opens on "Mine"; a system test agent is under "All". Every click stays inside the
      // picker panel (a pointer that leaves the submenu closes it).
      const panel = search.locator('xpath=ancestor::div[.//button[starts-with(normalize-space(.),"All")]][1]');
      await search.hover().catch(() => {});
      await page.waitForTimeout(3000);
      let option = panel.getByText(ctx.agent.name).first();
      if (!(await option.count())) {
        await panel.locator("button", { hasText: /^All\s*\d*$/ }).first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(3000);
        option = panel.getByText(ctx.agent.name).first();
      }
      if (!(await option.count())) { await shot(page, "chat-picker"); return `side chat agent picker offered no "${ctx.agent.name}"`; }
      await option.click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: "Select", exact: true }).last().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
    const now = (await page.locator('[aria-label^="Agent:"]').first().getAttribute("aria-label").catch(() => "")) || "";
    if (!now.includes(ctx.agent.name)) return `side chat agent is "${now}", not ${ctx.agent.name}`;
    await typeAndSend(page, "body", ctx.message);
    return null;
  },
  async binding(page, ctx) {
    if (!(await openAgentsMenu(page))) return "Agents menu did not open";
    if (!(await pointerClick(page, `[aria-label="Run ${TEST_DATA_AGENT.name}"]`))) return `Agents menu has no "Run ${TEST_DATA_AGENT.name}" (binding not listed)`;
    await page.waitForTimeout(5000);
    await typeAndSend(page, "[data-window-panel]", ctx.message);
    return null;
  },
  async shortcut(page, ctx) {
    await page.locator(".ProseMirror").first().click({ button: "right" });
    await page.waitForTimeout(1500);
    // Walk the menu: open every submenu trigger until the shortcut's label shows, then click it.
    for (let depth = 0; depth < 4; depth += 1) {
      if (await pointerClick(page, "[role=menu] [role=menuitem]", SHORTCUT_LABEL)) { await page.waitForTimeout(3000); return null; }
      const opened = await page.evaluate((tried) => {
        const triggers = Array.from(document.querySelectorAll("[role=menu] [aria-haspopup=menu]")).filter((e) => e.getClientRects().length);
        const want = ["My Intelligence", "Intelligence", "My Items", "My Personal", "Notes"];
        for (const w of want) {
          const el = triggers.find((e) => (e.textContent || "").trim().startsWith(w) && !tried.includes(w));
          if (el) { el.dispatchEvent(new PointerEvent("pointermove", { bubbles: true })); el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); el.focus(); return w; }
        }
        return null;
      }, ctx.tried ?? (ctx.tried = []));
      if (!opened) break;
      ctx.tried.push(opened);
      await page.locator(`[role=menu] [role=menuitem]:has-text("${opened}")`).first().hover().catch(() => {});
      await page.waitForTimeout(1500);
    }
    await shot(page, `${ctx.trigger}-menu`);
    return `context menu shows no "${SHORTCUT_LABEL}" (opened: ${ctx.tried.join(" > ") || "none"})`;
  },
  async mandate(page) {
    if (!(await openAgentsMenu(page))) return "Agents menu did not open";
    if (await pointerClick(page, "[data-radix-popper-content-wrapper] button", SHORTCUT_LABEL)) { await page.waitForTimeout(4000); return null; }
    if (await pointerClick(page, `[aria-label="Run ${SHORTCUT_LABEL}"]`)) { await page.waitForTimeout(4000); return null; }
    await shot(page, "mandate-menu");
    // The Agents popover gives a Run door only to a page-registered fixed job (manifest agentRoles /
    // useDeclaredSurfaceMandates with runHere: aidream apps/shared/chat/src/surfaces/components/chrome/
    // SurfaceMandatesSection.tsx row.runHere); a person's mandate shortcut is listed under "Also
    // available here" as a plain <li> with no door (same file, the discovered list).
    const listed = await page.evaluate((label) => Array.from(document.querySelectorAll("[data-radix-popper-content-wrapper] li"))
      .some((li) => (li.textContent || "").includes(label)), SHORTCUT_LABEL);
    return listed
      ? `Agents menu lists "${SHORTCUT_LABEL}" under "Also available here" with no Run door (SurfaceMandatesSection.tsx: only runHere page roles get one)`
      : `Agents menu lists no "${SHORTCUT_LABEL}" mandate`;
  },
};

// ── oracles ─────────────────────────────────────────────────────────────────
async function findRun(t0) {
  const { data } = await refDb.schema("chat").from("user_request")
    .select("id,conversation_id,agent_id,source_feature,mandate_key,door,binding_id,status,created_at")
    .eq("created_by", session.userId).gte("created_at", t0).order("created_at", { ascending: true }).limit(20);
  return data || [];
}
/** The runs since t0 whose stored first request carries `tag` (unique per run) — never another run's. */
async function runsCarrying(t0, tag) {
  const out = [];
  for (const r of await findRun(t0)) {
    const { data } = await refDb.schema("chat").from("request_snapshot").select("request_payload,unified_payload")
      .eq("conversation_id", r.conversation_id).eq("iteration", 1);
    if ((data || []).some((d) => `${JSON.stringify(d.request_payload ?? "")}${JSON.stringify(d.unified_payload ?? "")}`.includes(tag))) out.push(r);
  }
  return out;
}
async function receivedOracle(conversationId, want, situationWants = []) {
  const r = await fetch(`${SERVER}/admin/surface-evidence/receives`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${adminSession.accessToken}`, ...agentTrafficHeaders("w6b-entry-matrix") },
    body: JSON.stringify({ conversation_id: conversationId }),
  });
  let source, text, situation = null, checks = null;
  if (r.ok) {
    const body = await r.json();
    source = "receives";
    text = (body.blocks || []).map((b) => b.text || "").join("\n");
    situation = body.situation;
    checks = body.checks;
  } else {
    // W6-A not released yet (404) or refused: read the stored request itself — the rows receives reads.
    // The first iteration's snapshots; request_payload may be empty ({}) with the text in unified_payload.
    source = `request_snapshot (receives answered ${r.status})`;
    const { data } = await refDb.schema("chat").from("request_snapshot").select("iteration,request_payload,unified_payload")
      .eq("conversation_id", conversationId).eq("iteration", 1).order("created_at", { ascending: true });
    text = (data || []).map((d) => `${JSON.stringify(d.request_payload ?? "")}\n${JSON.stringify(d.unified_payload ?? "")}`).join("\n")
      .replace(/\\+n/g, "\n").replace(/\\+"/g, '"');
    const m = text.match(/<situation>([\s\S]*?)<\/situation>/);
    situation = m ? m[1] : null;
  }
  const missing = want.filter((w) => !text.includes(w));
  const situationMissing = situationWants.filter((w) => !(situation || "").includes(w));
  const situationOk = Boolean(situation && situation.trim()) && situationMissing.length === 0;
  return { pass: missing.length === 0 && situationOk, source, missing, situation_missing: situationMissing, situation: situation?.slice(0, 600) ?? null, checks, chars: text.length };
}
async function patchOracle(conversationId) {
  const { data } = await refDb.schema("chat").from("tool_call").select("id,status,arguments,error_message,created_at")
    .eq("conversation_id", conversationId).eq("tool_name", "apply_surface_write").order("created_at", { ascending: true });
  const calls = (data || []).filter((c) => (c.arguments?.target) === "note_content");
  const parsed = calls.map((c) => {
    let v = c.arguments?.value;
    if (typeof v === "string") { try { v = JSON.parse(v); } catch {} }
    return { id: c.id, status: c.status, command: v?.command ?? (typeof v === "string" ? "full_replace" : null), error: c.error_message };
  });
  const ok = parsed.find((c) => c.command === "str_replace" && c.status === "completed");
  const fullReplace = parsed.some((c) => c.command === "full_replace");
  return { pass: Boolean(ok) && !fullReplace, calls: parsed };
}
async function dbOracle(note) {
  const { data } = await refDb.schema("workbench").from("notes").select("content,updated_at").eq("id", note.id).single();
  return { pass: data?.content === note.expected, content: data?.content ?? null };
}
async function pageOracle(browserCtx, note) {
  const p = await browserCtx.newPage();
  try {
    await p.goto(`${BASE}/notes/${note.id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForSelector(".ProseMirror", { timeout: 45000 });
    await p.waitForTimeout(4000);
    const text = await p.locator(".ProseMirror").first().innerText();
    await p.screenshot({ path: path.join(opt.out, `page-${note.id.slice(0, 8)}.png`) }).catch(() => {});
    return { pass: text.includes("will receive a printed label") && !text.includes("recieve"), shown: text.slice(0, 300) };
  } finally { await p.close(); }
}

// ── one trigger run ─────────────────────────────────────────────────────────
async function runNotes(trigger, orgId, browser) {
  const runTag = `W6B${rand()}`;
  const note = await createNote(orgId, runTag);
  const instruction = "In the note open on this page, one word is misspelled: \"recieve\". Fix only that word so it reads \"receive\" by editing the note. Change nothing else.";
  const res = { trigger, scenario: "notes", as: opt.as, note_id: note.id, canary: note.canary, agent: TEST_DATA_AGENT.id, oracles: {}, blocked: null, setup: {} };
  let shortcut = null;
  try {
    if (trigger === "binding") res.setup.binding = await ensureBinding(orgId);
    if (trigger === "shortcut" || trigger === "mandate") { shortcut = await createShortcut(orgId, instruction); res.setup.shortcut = shortcut; }
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, serviceWorkers: "block" });
    await markBrowserAgentTraffic(ctx, "w6b-entry-matrix", BASE);
    await ctx.addCookies(session.cookies);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/notes/${note.id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".ProseMirror", { timeout: 60000 });
    await page.waitForTimeout(6000);
    const t0 = new Date(Date.now() - 2000).toISOString();
    const why = await TRIGGERS[trigger](page, { trigger, message: instruction, agent: TEST_DATA_AGENT });
    await shot(page, `${trigger}-started`);
    if (why) { res.blocked = why; await ctx.close(); return res; }
    const approvals = [];
    const deadline = Date.now() + opt.wait * 1000;
    while (Date.now() < deadline) {
      const pressed = await approveCards(page);
      if (pressed) approvals.push(pressed);
      const { data } = await refDb.schema("workbench").from("notes").select("content").eq("id", note.id).single();
      if (data?.content === note.expected) break;
      await sleep(3000);
    }
    res.approvals = approvals;
    await sleep(4000);
    await shot(page, `${trigger}-after`);
    const runs = await runsCarrying(t0, note.canary);
    res.runs = runs.map((r) => ({ id: r.id, conversation_id: r.conversation_id, agent_id: r.agent_id, source_feature: r.source_feature, mandate_key: r.mandate_key, door: r.door, binding_id: r.binding_id, status: r.status }));
    const run = runs.find((r) => r.agent_id === TEST_DATA_AGENT.id) ?? runs[0];
    if (!run) { res.blocked = "no run (chat.user_request) whose stored request carries this run's canary"; await ctx.close(); return res; }
    res.conversation_id = run.conversation_id;
    // The page situation: the module paragraph (AI Matrx › …) and the Notes page paragraph naming this note.
    res.oracles.received = await receivedOracle(run.conversation_id, [note.canary], ["AI Matrx ›", '"Notes" screen', `W6-B ${runTag}`]);
    res.oracles.patch = await patchOracle(run.conversation_id);
    res.oracles.db = await dbOracle(note);
    res.oracles.page = await pageOracle(ctx, note);
    await ctx.close();
    return res;
  } finally {
    if (!opt.keep) {
      res.cleanup = { note: await archiveNote(note.id) };
      if (shortcut) res.cleanup.shortcut = await archiveShortcut(shortcut.id);
    }
  }
}
async function runHr(trigger, browser) {
  const res = { trigger, scenario: "hr", as: opt.as, agent: TEST_REPLY_AGENT.id, oracles: {}, blocked: null };
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, serviceWorkers: "block" });
  await markBrowserAgentTraffic(ctx, "w6b-entry-matrix", BASE);
  await ctx.addCookies(session.cookies);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/hr/settings/employer`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // With no employer chosen the page is the "Open one employer below" picker and the Employer surface
  // is not mounted (W6-B's Canvas situation). Open one as a person does: Harbor Staffing Co (the
  // last_check probe employer) when listed, else the first. Then wait for the Employer form itself.
  const identity = page.locator("[data-hr-section=identity]");
  await Promise.race([identity.waitFor({ timeout: 30000 }), page.getByText("Open one employer below", { exact: false }).first().waitFor({ timeout: 30000 })]).catch(() => {});
  if (!(await identity.count())) {
    // Each picker row reads "<avatar letter><employer name> … Open". Open one as a person does (a real
    // pointer click on its name); an employer this seat does not run HR for answers "You can't open
    // this here", so try the next. Harbor Staffing Co (the last_check probe employer) first.
    const names = await page.evaluate(() => Array.from(document.querySelectorAll("button, [role=button], [role=option], li, a"))
      .filter((e) => e.getClientRects().length && /Open$/.test((e.textContent || "").trim()))
      .map((e) => (e.textContent || "").replace(/Open$/, "").trim().replace(/^([a-z])(?=\1)/i, "")));
    const order = [...new Set(names)].sort((x, y) => Number(y.includes("Harbor Staffing Co")) - Number(x.includes("Harbor Staffing Co")));
    res.employer_tried = [];
    for (const name of order) {
      res.employer_tried.push(name);
      if (res.employer_tried.length > 1) {
        await page.goto(`${BASE}/hr/settings/employer`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.getByText(name, { exact: true }).first().waitFor({ timeout: 30000 }).catch(() => {});
      }
      await page.getByText(name, { exact: true }).first().click({ timeout: 10000 }).catch(() => {});
      if (await identity.waitFor({ timeout: 25000 }).then(() => true).catch(() => false)) { res.employer_pick = name; break; }
    }
  }
  if (!(await identity.waitFor({ timeout: 45000 }).then(() => true).catch(() => false))) {
    await shot(page, `hr-${opt.as}-page`);
    res.blocked = "the Employer form never rendered (no employer could be opened)"; await ctx.close(); return res;
  }
  await page.waitForTimeout(4000);
  await shot(page, `hr-${opt.as}-page`);
  const orgName = await page.evaluate(() => (document.querySelector('[aria-label^="Employer:"]')?.getAttribute("aria-label") || "").replace(/^Employer:\s*/, "").replace(/\. Change employer$/, ""));
  res.page_org = orgName;
  const t0 = new Date(Date.now() - 2000).toISOString();
  if (trigger !== "chat") { res.blocked = "hr scenario runs the chat trigger only (read-only)"; await ctx.close(); return res; }
  const tag = `W6C${rand()}`;
  res.tag = tag;
  const why = await TRIGGERS.chat(page, { message: `ok ${tag}`, agent: TEST_REPLY_AGENT });
  if (why) { res.blocked = why; await ctx.close(); return res; }
  await sleep(25000);
  await shot(page, `hr-${opt.as}-after`);
  const runs = (await runsCarrying(t0, tag)).filter((r) => r.agent_id === TEST_REPLY_AGENT.id);
  const run = runs[0];
  if (!run) { res.blocked = `no Test Reply run whose stored request carries ${tag}`; await ctx.close(); return res; }
  res.conversation_id = run.conversation_id;
  res.runs = runs.map((r) => ({ id: r.id, conversation_id: r.conversation_id, agent_id: r.agent_id, source_feature: r.source_feature }));
  res.oracles.received = await receivedOracle(run.conversation_id, [], ["Human Resources", ...(orgName ? [orgName] : [])]);
  await ctx.close();
  return res;
}

// ── main ────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const orgId = opt.scenario === "notes" ? await homeOrganization() : null;
  for (const trigger of opt.triggers) {
    if (!TRIGGERS[trigger]) { console.error(`unknown trigger ${trigger}`); continue; }
    let r;
    try { r = opt.scenario === "hr" ? await runHr(trigger, browser) : await runNotes(trigger, orgId, browser); }
    catch (e) { r = { trigger, scenario: opt.scenario, as: opt.as, blocked: `harness error: ${e.message}`, oracles: {} }; }
    r.at = new Date().toISOString();
    r.live = { server_sha: liveServer.git_sha ?? null, site: liveSite.version ?? liveSite.sha ?? liveSite.commit ?? null, harness: harnessSha };
    results.push(r);
    const verdict = Object.fromEntries(Object.entries(r.oracles).map(([k, v]) => [k, v.pass ? "PASS" : "FAIL"]));
    console.log(`${r.scenario}/${r.trigger} as ${r.as}: ${r.blocked ? `BLOCKED (${r.blocked})` : JSON.stringify(verdict)}${r.conversation_id ? ` conv ${r.conversation_id}` : ""}`);
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(opt.out, "result.json"), JSON.stringify(results, null, 2));
  console.log(`result: ${path.join(opt.out, "result.json")}`);
  if (opt.store && results.length) {
    // One work-product file per invocation, named so the collection reads as a ledger.
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const named = path.join(opt.out, `run-${stamp}-${opt.scenario}-${opt.as}.json`);
    fs.copyFileSync(path.join(opt.out, "result.json"), named);
    try {
      const out = execSync(`uv run python scripts/store_platform_artifact.py ${ARTIFACT_COLLECTION} ${JSON.stringify(named)}`, { cwd: AIDREAM, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      console.log(`stored: ${out.trim().split("\n").pop()}`);
    } catch (e) { console.error(`store refused (result kept at ${named}): ${String(e.stderr || e.message).trim().split("\n").pop()}`); }
  }
}
