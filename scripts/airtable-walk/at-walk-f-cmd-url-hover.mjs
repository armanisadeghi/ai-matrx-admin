export default async ({ page, say }) => {
  const resp = []; page.on("response", async (r) => { if (/link-preview/i.test(r.url())) resp.push(r.status() + " " + (await r.text().catch(() => "")).slice(0, 300)); });
  await page.getByText("Alpha", { exact: true }).first().click(); await page.waitForTimeout(500);
  await page.locator("[data-records-open-record]").first().click({ force: true }).catch(() => {}); await page.waitForTimeout(4000);
  say("url", page.url());
  const link = page.locator('[data-records-peek] a[href^="https://example.com"], aside a[href^="https://example.com"], a[href^="https://example.com"]').last();
  const b = await link.boundingBox(); say("link box", JSON.stringify(b));
  await page.mouse.move(5, 500); await page.waitForTimeout(400); await page.mouse.move(b.x + 15, b.y + b.height / 2, { steps: 6 });
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(1500); const c = await page.evaluate(() => (document.querySelector("[data-records-link-preview]") || {}).innerText || ""); if (c) { say("CARD", c.replace(/\s+/g, " ")); break; } }
  say("responses", resp);
  await page.screenshot({ path: "/Users/armanisadeghi/lane-resume/atwf-shots/u4.png" });
};
