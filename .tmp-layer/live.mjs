import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { testTarget, createOrgAdminFixture, deleteOrgAdminFixture, fixtureSessionCookies } from "../scripts/lib/persona.mjs";
const t = testTarget(); const HOST = "s912554e3.localhost"; const KIND = "site_intake_apply_result";
const pk = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = createClient(t.url, t.secretKey, { auth: { persistSession: false } });
const fx = await createOrgAdminFixture(t, { suite: "content-ir/shape-layers", purpose: "fixit round 2 live" });
const user = fx.owner; const made = []; let browser;
const src = (p) => `export default function V(){return <div>${p}</div>}`;
try {
  const cookies = await fixtureSessionCookies(t, user, { host: HOST });
  const raw = cookies.map((c) => c.value).join("").replace(/^base64-/, "");
  const session = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  const me = createClient(t.url, pk, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${session.access_token}` } } });
  const base = { kind: KIND, platform: "web", role: "output", component_key: "db_kind_component", source: "db", organization_id: fx.organizationId };
  for (const [extra, probe] of [[{ audience_user_id: user.id }, "MYVIEW_PROBE"], [{ audience_organization_id: fx.organizationId }, "ORGVIEW_PROBE"]]) {
    const r = await me.schema("content_ir").from("kind_component_layer").insert({ ...base, ...extra, component_source: src(probe) }).select("id").single();
    if (r.error) throw new Error(probe + ": " + r.error.message); made.push(r.data.id);
  }
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 1400 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  await page.goto(`http://${HOST}:3001/shapes/${KIND}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  const state = async (label) => {
    let frames = ""; for (const f of page.frames()) { try { frames += await f.evaluate(() => document.body.innerText); } catch {} }
    const text = await page.evaluate(() => document.body.innerText);
    const marks = text.split("\n").map(l=>l.trim()).filter((l) => /^(My view|My organization|Your view|Turn on|Undo|Make my view|For my organization|Edit|Remove|Your .*rendered|The reader gets)/.test(l));
    console.log(`--- ${label}: card=[${["MYVIEW_PROBE","ORGVIEW_PROBE"].filter((p)=>frames.includes(p)).join(",")}]\n  ` + marks.join(" | "));
  };
  await page.waitForFunction(() => document.body.innerText.includes("Shared view:"), null, { timeout: 120000 }).catch(() => console.log("no strip")); await page.waitForTimeout(8000); await page.screenshot({ path: ".tmp-layer/a.png" }); await state("first paint");
  await page.getByRole("button", { name: "Remove", exact: true }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Switch off", exact: true }).first().click({ timeout: 8000 });
  await page.waitForTimeout(5000); await state("after Remove");
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForFunction(() => document.body.innerText.includes("Shared view:"), null, { timeout: 120000 }).catch(() => console.log("no strip")); await page.waitForTimeout(8000); await state("after reload");
  await page.getByRole("button", { name: "Turn on", exact: true }).first().click({ timeout: 8000 });
  await page.waitForTimeout(5000); await state("after Turn on");
} finally {
  if (browser) await browser.close();
  if (made.length) { const r = await service.schema("content_ir").from("kind_component_layer").delete().in("id", made); console.log("cleanup:", r.error?.message ?? "ok"); }
  const left = await service.schema("content_ir").from("kind_component_layer").select("id").eq("organization_id", fx.organizationId);
  console.log("rows left:", left.data?.length);
  await deleteOrgAdminFixture(t, fx);
}
