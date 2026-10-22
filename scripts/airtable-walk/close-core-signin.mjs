// CLOSE-CORE: sign admin and the member (test@test.com) in once on this lane's preview host and keep their
// cookies, so each walk step reuses them instead of paying a sign-in on a loaded machine.
// Run: MATRX_PREVIEW_SESSION=close-core ORIGIN=http://close-core.localhost:3001 node scripts/airtable-walk/close-core-signin.mjs [admin|member]...
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { walkSignIn } from "./walk-signin.mjs";
import { ORIGIN } from "./lib.mjs";
export const STATE_DIR = process.env.HOME + "/lane-resume/close-core-state/";
mkdirSync(STATE_DIR, { recursive: true });
const who = process.argv.slice(2).length ? process.argv.slice(2) : ["admin", "member"];
for (const w of who) {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    ctx.setDefaultNavigationTimeout(600000);
    const page = await ctx.newPage();
    const email = await walkSignIn(page, ORIGIN, { member: w === "member" });
    await ctx.storageState({ path: STATE_DIR + w + ".json" });
    console.log(new Date().toISOString().slice(11, 19), w, "signed in as", email);
  } finally { await browser.close(); }
}
