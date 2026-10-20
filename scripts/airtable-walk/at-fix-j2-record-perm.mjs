// AT-FIX-J2 item 4b: record-level permissions. Admin opens Bravo, narrows "Shown to Everyone", shares to test@test.com; member reads.
import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
const who = process.env.WHO ?? "admin";
const { browser, page, who: email, shot } = await open(who === "member");
say("who", email);
await gotoTable(page, process.env.TABLE);
const step = process.env.STEP ?? "explore";
await page.getByText("Bravo", { exact: true }).first().dblclick().catch(() => {});
await page.waitForTimeout(2500);
if (step === "explore") {
  await page.getByText(/Shown to/).first().click(); await page.waitForTimeout(1500); await shot("rp1-shownto");
  say("menu", await page.evaluate(() => [...document.querySelectorAll("[role=menuitem],[role=option],[role=menuitemradio]")].map((e) => e.innerText.replace(/\n/g, " | ")).slice(0, 20)));
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Share", exact: true }).last().click(); await page.waitForTimeout(2500); await shot("rp2-share");
  say("share dialog", (await page.evaluate(() => document.querySelector("[role=dialog]")?.innerText ?? "(none)")).slice(0, 900));
}
if (step === "levels") {
  await page.getByRole("button", { name: "Share", exact: true }).last().click(); await page.waitForTimeout(2500);
  await page.getByRole("combobox").filter({ hasText: /View/ }).first().click(); await page.waitForTimeout(800);
  say("levels", await page.evaluate(() => [...document.querySelectorAll("[role=option]")].map((e) => e.innerText.replace(/\n/g, " | "))));
  await shot("rp3-levels");
}
if (step === "grant") {
  await page.getByRole("button", { name: "Share", exact: true }).last().click(); await page.waitForTimeout(2500);
  await page.getByText("test@test.com").first().click(); await page.waitForTimeout(500);
  await page.getByRole("combobox").filter({ hasText: /View/ }).first().click(); await page.waitForTimeout(500);
  await page.getByRole("option", { name: /Full access/ }).first().click(); await page.waitForTimeout(500);
  await shot("rp4-before-share");
  await page.getByRole("button", { name: /Share with User/ }).last().click(); await page.waitForTimeout(4000);
  await shot("rp5-granted");
  say("dialog after", (await page.evaluate(() => document.querySelector("[role=dialog]")?.innerText ?? "(none)")).slice(0, 700));
}
if (step === "probe") {
  for (const name of ["Bravo", "Charlie"]) {
    await page.keyboard.press("Escape");
    await page.getByText(name, { exact: true }).first().dblclick(); await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const panel = [...document.querySelectorAll("*")].find((e) => /Shown to|Comments/.test(e.innerText || "") && e.getBoundingClientRect().x > 1100 && e.getBoundingClientRect().width < 450);
      const btns = [...document.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().x > 1150).map((b) => `${(b.innerText || b.title || b.getAttribute("aria-label") || "").trim()}${b.disabled ? "(disabled)" : ""}`).filter(Boolean);
      return btns.slice(0, 30);
    });
    say(name, "panel buttons", info);
    await shot("rp6-" + name);
  }
}
await browser.close();
