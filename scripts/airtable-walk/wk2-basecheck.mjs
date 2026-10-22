import { live, say } from "./ba-lib.mjs";
const { page } = await live(false);
await page.goto("https://www.aimatrx.com/data/bases/dc452837-7385-4c05-9ec7-4b42b80f5a0a", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
say("MAIN", (await page.locator("main").innerText().catch(() => "")).replace(/\n+/g, " | ").slice(0, 400));
process.exit(0);
