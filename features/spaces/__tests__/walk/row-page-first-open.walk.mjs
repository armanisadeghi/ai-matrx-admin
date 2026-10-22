// CD-TPL-07: a row's page, opened for the FIRST time from its record page, starts from the table's default
// template body and its views show only that row's records. Uses the tables `row-page-live-proof.ts --keep` left.
//   TABLE=<clients id> ROW=<a client without a page yet> EXPECT="October retainer,Shared workshop" NOT="September retainer,Menu photo shoot"
//   SHOTS=<dir> MATRX_PREVIEW_SESSION=<lane> [MEMBER=1] node features/spaces/__tests__/walk/row-page-first-open.walk.mjs
import { open, shot } from "./lib.mjs";

const { TABLE, ROW } = process.env;
const EXPECT = (process.env.EXPECT ?? "").split(",").filter(Boolean);
const NOT = (process.env.NOT ?? "").split(",").filter(Boolean);
const OUT = process.env.SHOTS ?? "/tmp";
const member = !!process.env.MEMBER;
if (!TABLE || !ROW) throw new Error("TABLE and ROW are required");
const r = { member, table: TABLE, row: ROW };
const { browser, page } = await open({ next: `/data/${TABLE}/r/${ROW}`, member, width: 1440, height: 1100 });
if (!page.url().includes(`/r/${ROW}`)) await page.goto(`${new URL(page.url()).origin}/data/${TABLE}/r/${ROW}`, { waitUntil: "domcontentloaded" });
await page.locator(".spaces-editor .bn-editor").first().waitFor({ timeout: 240_000 });
// The four views of the template load their rows.
await page.waitForFunction(() => document.querySelectorAll(".spaces-editor .spaces-db-frame").length >= 4, null, { timeout: 120_000 }).catch(() => {});
await page.waitForTimeout(8000);
r.views = await page.locator(".spaces-editor .spaces-db-frame").count();
const text = await page.locator(".spaces-editor").first().innerText();
r.expectedSeen = EXPECT.filter((w) => text.includes(w));
r.othersSeen = NOT.filter((w) => text.includes(w));
await shot(page, `${OUT}/07-row-page-first-open${member ? "-member" : ""}.png`);
await page.mouse.wheel(0, 900);
await page.waitForTimeout(1500);
await shot(page, `${OUT}/07-row-page-first-open-2${member ? "-member" : ""}.png`);
console.log(JSON.stringify(r, null, 1));
const ok = r.views >= 4 && r.expectedSeen.length === EXPECT.length && r.othersSeen.length === 0;
console.log(ok ? "PASS row-page-first-open" : "FAIL row-page-first-open");
await browser.close();
process.exit(ok ? 0 : 1);
