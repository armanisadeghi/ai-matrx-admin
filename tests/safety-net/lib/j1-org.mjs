// Helpers for J1: read what a person sees in the organization picker, never cookies or URLs.
import { sleep, until } from "./harness.mjs";
import { openOrganizationGroup } from "../../../scripts/lib/seat-browser.mjs";

export const openOrgGroup = openOrganizationGroup;

/** The active organization, as the shell's organization switcher names it ("Organization: <name>. Change organization"). */
export async function activeOrgName(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 120000 });
  const read = () => page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll("[data-shell-org-switcher]"))) {
      const m = /^Organization: (.+?)\. (?:Change organization|This page lives in|Your organizations could not)/.exec(el.getAttribute("aria-label") ?? "");
      if (m && m[1] !== "unknown") return m[1].trim();
    }
    return null;
  });
  const { v } = await until("the switcher names the active organization", read, 30000);
  return v;
}

/** Names of the organizations listed in the picker (visible group only; test orgs sit behind a disclosure). */
export async function listedOrgNames(page) {
  const read = () => page.evaluate(() =>
    Array.from(new Set(Array.from(document.querySelectorAll('[data-slot="organization-picker"] [role="option"]'))
      .map((o) => (o.querySelector(".truncate")?.textContent ?? o.textContent ?? "").trim()).filter(Boolean))));
  // A loaded-but-slow app draws the rows late: ask again (reopening the switcher) before saying "none".
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await openOrganizationGroup(page);
    const { v } = await until("picker rows", async () => { const n = await read(); return n.length ? n : null; }, 20000);
    if (v) return v;
  }
  return [];
}

/** Walk the real sign-out page, including the two by-name super-admin confirmations. */
export async function signOutThroughUi(page, origin, openFn) {
  await openFn("/sign-out");
  const main = page.getByRole("button", { name: /sign out/i }).first();
  await main.waitFor({ timeout: 120000 });
  // A press before hydration does nothing: press again until the first confirmation is drawn.
  const first = page.getByRole("button", { name: /i understand, continue/i });
  for (let tries = 0; tries < 6 && !(await first.isVisible().catch(() => false)); tries += 1) {
    await main.click({ timeout: 5000 }).catch(() => undefined);
    await first.waitFor({ timeout: 8000 }).catch(() => undefined);
  }
  for (const label of [/i understand, continue/i, /sign me out/i]) {
    const b = page.getByRole("button", { name: label });
    await b.waitFor({ timeout: 90000 }).catch((e) => { throw new Error(`sign-out step ${label} never appeared: ${String(e.message).split("\n")[0]}`); });
    await b.click();
    await sleep(500);
  }
  const { v } = await until("landed signed out", async () => /\/login|\/sign-in|\/auth/.test(new URL(page.url()).pathname), 90000);
  return !!v;
}
