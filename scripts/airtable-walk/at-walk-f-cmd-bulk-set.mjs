export default async ({ page, say }) => {
  const dlg = page.locator("[role=dialog]");
  const sel = dlg.locator("select").first();
  if (await sel.count()) await sel.selectOption({ label: "Tags" }); else { await dlg.getByRole("combobox").first().click(); await page.getByRole("option", { name: "Tags" }).click(); }
  await dlg.locator("input, textarea").last().fill("ATWF-bulk");
  await dlg.getByRole("button", { name: /Set on 2 rows/ }).click(); await page.waitForTimeout(4000);
  say("rows:", await page.evaluate(() => [...document.querySelectorAll("[role=row],tr")].filter((r) => /Open/.test(r.innerText)).map((r) => r.innerText.replace(/\s+/g, " ").slice(0, 70)).join(" || ")));
  await page.screenshot({ path: "/Users/armanisadeghi/lane-resume/atwf-shots/m3.png" });
};
