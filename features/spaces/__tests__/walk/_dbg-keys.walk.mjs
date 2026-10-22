import { open, newPage, trashPage } from "./lib.mjs";
const { browser, page } = await open({ width: 1440, height: 1000 });
await page.addInitScript(() => {
  window.__keylog = [];
  for (const fn of ["preventDefault", "stopPropagation", "stopImmediatePropagation"]) {
    const orig = Event.prototype[fn];
    Event.prototype[fn] = function () {
      if (this.type === "keydown" && (this.key === "Escape" || this.key === "/")) window.__keylog.push(fn + " phase=" + this.eventPhase + " cur=" + (this.currentTarget?.nodeName ?? this.currentTarget) + " " + new Error().stack.split("\n").slice(2, 6).join(" <- "));
      return orig.call(this);
    };
  }
});
await page.reload();
const msgs = []; page.on("console", (m) => { if (/spaces|block menu/i.test(m.text())) msgs.push(m.text().slice(0, 200)); });
const id = await newPage(page); console.log("page", id);
await page.locator(".bn-editor .bn-inline-content").last().click();
await page.keyboard.type("Plan the launch party", { delay: 15 });
await page.keyboard.press("Enter");
await page.keyboard.type("Book the room", { delay: 15 });
await page.waitForTimeout(500);
const lines = page.locator(".bn-editor .bn-block-content[data-content-type=paragraph] .bn-inline-content");
await lines.nth(1).click();
console.log("menus", await page.evaluate(() => [...document.querySelectorAll(".bn-suggestion-menu, [role='menu']")].map((e) => `${e.tagName}.${String(e.className).slice(0,60)} vis=${e.getClientRects().length>0} ${e.getAttribute('aria-label')??''} ${(e.closest('[data-radix-popper-content-wrapper],aside,nav,header')?.tagName)??''} ${e.outerHTML.slice(0,160)}`)));
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
console.log("rubber", await page.evaluate(() => (document.getElementById("spaces-rubber-band")?.textContent ?? "").slice(0, 200)));
await lines.nth(1).click();
await page.evaluate(() => { window.__samples = []; const t0 = performance.now(); const tick = () => { window.__samples.push(Math.round(performance.now()-t0) + ":" + document.querySelectorAll(".bn-menu-dropdown").length + "/" + document.querySelectorAll(".bn-side-menu [draggable=true]").length); if (performance.now()-t0 < 1500) setTimeout(tick, 40); }; tick();
  document.addEventListener("click", (e) => window.__samples.push("click " + (e.target?.outerHTML ?? "").slice(0, 80) + " trusted=" + e.isTrusted), true); });
await page.keyboard.press("ControlOrMeta+/");
await page.waitForTimeout(1700);
console.log("samples", JSON.stringify(await page.evaluate(() => window.__samples)));
console.log("dropdown", await page.locator(".bn-menu-dropdown").count(), await page.locator(".bn-side-menu [draggable=true]").count());
console.log("msgs", msgs);
console.log("keylog", JSON.stringify(await page.evaluate(() => window.__keylog), null, 1));
await page.keyboard.press("Escape");
console.log("trashed", await trashPage(page));
await browser.close();
