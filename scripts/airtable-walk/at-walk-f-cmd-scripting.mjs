import { openMenu } from "/Users/armanisadeghi/lane-resume/atwf/lib-f.mjs";
export default async ({ page, say }) => {
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  say("menu", await openMenu(page));
  const au = page.getByRole("menuitem", { name: /^Automations/ });
  if (!(await au.count())) { await page.getByRole("menuitem", { name: /Built on it/ }).hover().catch(() => {}); await page.getByRole("menuitem", { name: /Built on it/ }).click().catch(() => {}); await page.waitForTimeout(1200); }
  say("automations items", await au.count());
  await au.first().click({ timeout: 8000 }); await page.waitForTimeout(4000);
  const ta = page.locator('textarea[aria-label="Table script"]'); say("textarea", await ta.count());
  await ta.fill('output.set("n", input.rows.length); output.set("writes", input.rows.filter(r => r.document.name === "Delta").map(r => ({ id: r.id, values: { tags: "scripted" } }))); console.log("rows", input.rows.length);');
  await page.getByRole("button", { name: "Run script" }).click();
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(3000); const t = await page.evaluate(() => (document.querySelector('[data-testid="spaces-table-scripting"]') || {}).innerText || ""); if (/Ran|error|did not/i.test(t)) { say("RESULT", t.replace(/\s+/g, " ").slice(0, 400)); break; } }
  await page.screenshot({ path: "/Users/armanisadeghi/lane-resume/atwf-shots/sc2.png" });
};
