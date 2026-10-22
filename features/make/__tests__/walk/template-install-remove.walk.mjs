// CD-TPL-01: install a template from its public page into a shared organization, see what it made, Remove it.
//   SLUG=<template slug> ORG=<org slug> SHOTS=<dir> MATRX_PREVIEW_SESSION=<lane> node features/make/__tests__/walk/template-install-remove.walk.mjs
//   MEMBER=1 … signs in as test@test.com (a member of ORG).
// Expected: Install answers with the landing (what it made, each row opens) and a Remove button; Remove, confirmed,
// says everything went to Trash. Prints the install id so the store can be read for tables and views.
import { login, resumeIfPaused, shot, chromium } from "../../../spaces/__tests__/walk/lib.mjs";

const SLUG = process.env.SLUG;
const ORG = process.env.ORG ?? "admin";
const OUT = process.env.SHOTS ?? "/tmp";
const member = !!process.env.MEMBER;
if (!SLUG) throw new Error("SLUG is required");
const r = { slug: SLUG, org: ORG, member };
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 200)));
const next = `/templates/${SLUG}?org=${ORG}`;
await login(page, next, member);
await resumeIfPaused(page);
if (!page.url().includes(`/templates/${SLUG}`)) await page.goto(new URL(next, page.url()).href, { waitUntil: "domcontentloaded", timeout: 240_000 });

const install = page.locator("[data-make-template-install]").first();
const removeBtn = page.locator("[data-make-template-remove]").first();
await Promise.race([install.waitFor({ timeout: 240_000 }), removeBtn.waitFor({ timeout: 240_000 })]);
r.alreadyInstalled = await removeBtn.isVisible().catch(() => false);
r.savesTo = (await page.locator("[data-make-template-preview]").first().innerText().catch(() => "")).split("\n").slice(0, 6).join(" | ");
await shot(page, `${OUT}/01-template-page${member ? "-member" : ""}.png`);
if (!r.alreadyInstalled) {
  await install.click();
  const done = await Promise.race([
    removeBtn.waitFor({ timeout: 600_000 }).then(() => "installed"),
    page.locator("[data-make-template-refused]").first().waitFor({ timeout: 600_000 }).then(() => "refused"),
  ]).catch(() => "timeout");
  r.install = done;
  if (done === "refused") r.refusal = await page.locator("[data-make-template-refused]").first().innerText();
  await page.waitForTimeout(2500);
  r.landing = (await page.locator("[data-make-template-preview]").first().innerText().catch(() => "")).slice(0, 1200);
  await shot(page, `${OUT}/02-installed${member ? "-member" : ""}.png`);
}
if (await removeBtn.isVisible().catch(() => false)) {
  await removeBtn.click();
  const dlg = page.getByRole("alertdialog").or(page.getByRole("dialog")).filter({ hasText: "Remove" }).first();
  await dlg.getByRole("button", { name: /^Remove$/ }).click();
  r.removed = await page.locator("[data-make-template-removed]").first().waitFor({ timeout: 600_000 }).then(() => true, () => false);
  r.removedText = await page.locator("[data-make-template-removed]").first().innerText().catch(() => "");
  await shot(page, `${OUT}/03-removed${member ? "-member" : ""}.png`);
}
console.log(JSON.stringify(r, null, 1));
const ok = r.install !== "refused" && r.install !== "timeout" && r.removed === true;
console.log(ok ? "PASS template-install-remove" : "FAIL template-install-remove");
await browser.close();
process.exit(ok ? 0 : 1);
