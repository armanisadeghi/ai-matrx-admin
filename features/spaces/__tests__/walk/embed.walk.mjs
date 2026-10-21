// Walk: Embed a published Space on another website (J3). Admin opens Share > Publish and copies the
// embed code; the code is pasted into a page served from a DIFFERENT origin (a throwaway local server),
// and a SIGNED-OUT browser opens that foreign page: the Space must draw inside the iframe, read-only.
// Read-only for the store: it copies a code and reads; it publishes nothing new.
//
//   S=<shots dir> node features/spaces/__tests__/walk/embed.walk.mjs <published-page-id> "<words in its body>"
import { createServer } from "node:http";
import { chromium } from "playwright";
import { act, open, originOf, resumeIfPaused } from "./lib.mjs";

const [pageId, bodyWords] = process.argv.slice(2);
if (!pageId) throw new Error("usage: embed.walk.mjs <published-page-id> [words in its body]");
const shots = process.env.S ?? "/tmp";
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const { browser, page } = await open({ next: `/spaces/${pageId}`, width: 1440, height: 900 });
const origin = originOf(page);
await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin });
await page.locator(".bn-editor").first().waitFor({ timeout: 240_000 });
await resumeIfPaused(page);
await act(page, () => page.getByRole("button", { name: /^Share$/ }).first().click());
await act(page, () => page.getByRole("tab", { name: "Publish" }).or(page.getByRole("radio", { name: "Publish" })).first().click());
await page.getByTestId("publish-embed-copy").waitFor({ timeout: 60_000 });
await page.screenshot({ path: `${shots}/embed-1-share-publish.png` });
await act(page, () => page.getByTestId("publish-embed-copy").click());
await page.waitForTimeout(800);
const code = await page.evaluate(() => navigator.clipboard.readText());
check("Copy code puts an iframe of the page in embed mode on the clipboard", /^<iframe [^>]*src="[^"]*\/site\/[^"]+\?embed=1"/.test(code), code.slice(0, 160));
await browser.close();

// A foreign website: another origin, the snippet pasted in as-is.
const html = `<!doctype html><html><head><title>Acme Physio</title></head><body style="font-family:system-ui;margin:24px"><h1>Acme Physio — our home program</h1>${code}<p>Footer of the foreign site</p></body></html>`;
const server = createServer((_q, r) => { r.writeHead(200, { "content-type": "text/html" }); r.end(html); });
await new Promise((res) => server.listen(0, "127.0.0.1", res));
const foreign = `http://127.0.0.1:${server.address().port}/`;

const anonBrowser = await chromium.launch({ headless: true });
const anon = await (await anonBrowser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
await anon.goto(foreign, { waitUntil: "domcontentloaded" });
const frame = anon.frameLocator("iframe");
const drew = await frame.getByTestId("public-title").waitFor({ timeout: 240_000 }).then(() => true, () => false);
check("the Space draws inside the foreign page's iframe", drew, foreign);
if (drew) {
  await frame.locator(".bn-editor").first().waitFor({ timeout: 120_000 }).catch(() => {});
  const title = await frame.getByTestId("public-title").innerText();
  check("its title reads", title.trim().length > 0, title);
  if (bodyWords) check("its body reads", (await frame.locator(".bn-editor").first().innerText()).includes(bodyWords));
  check("drawn in embed mode", (await frame.locator("[data-public-embed]").count()) === 1);
  check("read-only inside the frame", (await frame.locator('[contenteditable="true"]').count()) === 0);
}
await anon.waitForTimeout(1500);
await anon.screenshot({ path: `${shots}/embed-2-foreign-site.png`, fullPage: true });
await anonBrowser.close();
server.close();
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
