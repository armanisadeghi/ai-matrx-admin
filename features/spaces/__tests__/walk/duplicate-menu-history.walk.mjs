// CD-TPL-06 (••• Duplicate keeps every sub-page) and CD-TPL-08 (the ••• menu's Notion entries; Page history names
// who saved each version) on a new page, then both pages go to Trash.
//   SHOTS=<dir> MATRX_PREVIEW_SESSION=<lane> [MEMBER=1] node features/spaces/__tests__/walk/duplicate-menu-history.walk.mjs
import { open, newPage, act, slash, trashPage, shot } from "./lib.mjs";

const OUT = process.env.SHOTS ?? "/tmp";
const member = !!process.env.MEMBER;
const r = { member };
const { browser, page: A } = await open({ member, width: 1440, height: 1000 });
const parent = await newPage(A);
r.parent = parent;
const crumbs = () => A.evaluate(() => [...document.querySelectorAll(".spaces-breadcrumb-item")].map((e) => e.textContent.trim()));

await act(A, async () => {
  await A.locator(".spaces-title").click();
  await A.keyboard.type("Launch plan");
  await A.locator(".bn-editor .bn-inline-content").last().click();
  await A.keyboard.type("Venue shortlist below", { delay: 10 });
  await A.keyboard.press("Enter");
  await slash(A, "page", "Page");
});
await A.waitForURL((u) => /\/spaces\/[0-9a-f-]{36}/.test(u.href) && !u.href.includes(parent), { timeout: 30_000 });
r.child = A.url().match(/\/spaces\/([0-9a-f-]{36})/)[1];
await A.locator(".bn-editor").first().waitFor({ timeout: 60_000 });
await A.waitForTimeout(800);
await act(A, async () => {
  await A.keyboard.type("Venues");
  await A.locator(".bn-editor .bn-inline-content").last().click();
  await A.keyboard.type("Harbor Hall, Pier 9", { delay: 10 });
});
await A.waitForTimeout(2500);
// Back to the parent by its address (the crumbs' first item may be the workspace, not the parent page).
await A.goto(`${new URL(A.url()).origin}/spaces/${parent}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
await A.locator(".bn-editor").first().waitFor();
await A.waitForTimeout(2500);

// CD-TPL-08: the ••• menu.
await A.getByRole("button", { name: "Page options", exact: true }).first().click();
const pop = A.locator("[data-radix-popper-content-wrapper]").last();
await pop.getByText("Duplicate", { exact: true }).waitFor({ timeout: 10_000 });
const want = ["Copy link", "Duplicate", "Move to", "Move to Trash", "Undo", "Page history", "Save as template", "Import", "Export", "Connections", "Lock page", "Full width", "Small text"];
const menuText = await pop.innerText();
r.menuMissing = want.filter((w) => !menuText.split("\n").map((s) => s.trim()).includes(w));
await shot(A, `${OUT}/08-page-menu${member ? "-member" : ""}.png`);
await pop.getByText("Connections", { exact: true }).click();
await A.waitForTimeout(1200);
r.connections = (await pop.innerText()).split("\n").slice(0, 8).join(" | ");
await shot(A, `${OUT}/08-connections${member ? "-member" : ""}.png`);
await A.keyboard.press("Escape");
await A.waitForTimeout(400);
await A.getByRole("button", { name: "Page options", exact: true }).first().click();
await A.locator("[data-radix-popper-content-wrapper]").last().getByText("Import", { exact: true }).click();
await A.waitForTimeout(600);
r.importChoices = (await A.locator("[data-radix-popper-content-wrapper]").last().innerText()).split("\n").slice(0, 10).join(" | ");
await shot(A, `${OUT}/08-import${member ? "-member" : ""}.png`);
await A.keyboard.press("Escape");
await A.waitForTimeout(400);
await A.getByRole("button", { name: "Page options", exact: true }).first().click();
await A.locator("[data-radix-popper-content-wrapper]").last().getByText("Page history", { exact: true }).click();
const hist = A.locator(".spaces-history-rows");
await hist.waitFor({ timeout: 30_000 });
await A.waitForTimeout(2500);
r.historyRows = (await hist.innerText()).split("\n").filter(Boolean).slice(0, 8);
r.historyNamesSaver = r.historyRows.some((l) => l === "You") && !r.historyRows.includes("A collaborator");
await shot(A, `${OUT}/08-page-history${member ? "-member" : ""}.png`);
await A.getByRole("button", { name: "Close", exact: true }).last().click();
await A.waitForTimeout(500);

// CD-TPL-06: Duplicate.
await A.getByRole("button", { name: "Page options", exact: true }).first().click();
await A.locator("[data-radix-popper-content-wrapper]").last().getByText("Duplicate", { exact: true }).click();
await A.waitForURL((u) => /\/spaces\/[0-9a-f-]{36}/.test(u.href) && !u.href.includes(parent), { timeout: 60_000 });
r.copy = A.url().match(/\/spaces\/([0-9a-f-]{36})/)[1];
await A.locator(".bn-editor").first().waitFor({ timeout: 60_000 });
await A.waitForTimeout(3000);
r.copyTitle = (await A.locator(".spaces-title").textContent())?.trim();
r.copyText = (await A.locator(".bn-editor").first().innerText()).slice(0, 300);
const sub = A.locator('.bn-editor [data-content-type="page"]').first();
r.copyHasSubpage = await sub.isVisible().catch(() => false);
await shot(A, `${OUT}/06-duplicate${member ? "-member" : ""}.png`);
if (r.copyHasSubpage) {
  // The link's own words open it (a click on the block's middle can land on empty space beside them).
  await sub.getByText("Venues", { exact: true }).first().click();
  await A.waitForURL((u) => !u.href.includes(r.copy), { timeout: 90_000 });
  r.copyChild = A.url().match(/\/spaces\/([0-9a-f-]{36})/)?.[1];
  await A.locator(".bn-editor").first().waitFor({ timeout: 60_000 });
  await A.waitForTimeout(2500);
  r.copyChildText = (await A.locator(".bn-editor").first().innerText()).slice(0, 200);
  r.copyChildIsNew = r.copyChild !== r.child;
  r.copyChildCrumbs = await crumbs();
  await shot(A, `${OUT}/06-duplicate-subpage${member ? "-member" : ""}.png`);
  await A.goto(`${new URL(A.url()).origin}/spaces/${r.copy}`, { waitUntil: "domcontentloaded" });
  await A.locator(".bn-editor").first().waitFor({ timeout: 60_000 });
}
r.trashedCopy = await trashPage(A);
await A.goto(`${new URL(A.url()).origin}/spaces/${parent}`, { waitUntil: "domcontentloaded" });
await A.locator(".bn-editor").first().waitFor({ timeout: 60_000 });
r.trashedParent = await trashPage(A);
console.log(JSON.stringify(r, null, 1));
const ok = r.menuMissing.length === 0 && r.historyNamesSaver && r.copyHasSubpage && r.copyChildIsNew && /Harbor Hall/.test(r.copyChildText ?? "");
console.log(ok ? "PASS duplicate-menu-history" : "FAIL duplicate-menu-history");
await browser.close();
process.exit(ok ? 0 : 1);
