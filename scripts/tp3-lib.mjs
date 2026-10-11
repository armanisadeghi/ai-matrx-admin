// Shared login for table-parity walks: signs in through `pnpm dev-login` (never types a password).
import { chromium } from "playwright";
import { execSync } from "node:child_process";
export async function session(seat, width = 1440, height = 900, browser) {
  const login = execSync(`pnpm -s dev-login ${seat === "member" ? "--member " : ""}'/dashboard'`, { encoding: "utf8" });
  const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
  const origin = new URL(url).origin;
  const boot = await browser.newContext({ viewport: { width, height } });
  const bp = await boot.newPage();
  await bp.goto(url, { timeout: 240_000 });
  if (bp.url().includes("__dev-walk")) {
    await bp.getByRole("button", { name: "Resume this preview" }).click();
    await bp.waitForURL((u) => !u.href.includes("__dev-walk"), { timeout: 180_000 });
  }
  await bp.waitForTimeout(3000);
  const state = await boot.storageState();
  await boot.close();
  return { origin, state };
}
export { chromium };
// The shared preview pauses a host when a 5th live-database walk starts; resume and reload the target.
export async function go(page, href, settle = 9000) {
  const want = new URL(href).pathname;
  for (let i = 0; i < 6; i++) {
    await page.goto(href, { timeout: 240_000 }).catch(() => {});
    if (page.url().includes("__dev-walk") || (await page.getByText("Resume this preview").count()) > 0) {
      await page.getByRole("button", { name: "Resume this preview" }).click({ timeout: 30_000 }).catch(() => {});
      await page.waitForURL((u) => !u.href.includes("__dev-walk"), { timeout: 180_000 }).catch(() => {});
      continue;
    }
    if (new URL(page.url()).pathname.startsWith(want)) { await page.waitForTimeout(settle); return; }
  }
  throw new Error("never reached " + want);
}
export const SHOT = "/private/tmp/claude-501/-Users-armanisadeghi-code/4aca9d01-f3c0-4271-be17-2f948446dfb3/scratchpad/";
