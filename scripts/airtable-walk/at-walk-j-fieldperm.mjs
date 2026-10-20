import { open, gotoTable, say } from "./at-walk-h-lib.mjs";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const table = process.env.TABLE;
const fields = (await client.fields({ table_id: table })).data;
const qty = fields.find((f) => f.key === "qty");
say("qty sensitivity before", qty.sensitivity);
const r = await client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "confidential" } }); say("set confidential", r.ok ? "ok" : JSON.stringify(r.error).slice(0, 200));
try {
  for (const WHO of ["admin", "member"]) {
    const { browser, page, who, shot } = await open(WHO === "member");
    await gotoTable(page, table); await page.waitForTimeout(6000);
    const txt = await page.evaluate(() => document.body.innerText);
    say(WHO, who, "headers:", txt.match(/NAME[\s\S]{0,80}/)?.[0]?.replace(/\s+/g, " "), "| rows:", txt.match(/^(Alpha|Bravo)[^\n]*\n?[^\n]*/gm)?.slice(0, 2));
    await shot("j10-" + WHO);
    if (WHO === "member") {
      await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(600);
      await page.getByText(/^Export/).first().click(); await page.waitForTimeout(1500);
      const [d] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), page.getByRole("button", { name: "CSV", exact: true }).first().click()]);
      const f = process.env.HOME + "/lane-resume/atwj-dl/member-conf.csv"; await d.saveAs(f); say("member csv", f);
    }
    await browser.close();
  }
} finally {
  const b = await client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: qty.sensitivity ?? "normal" } }); say("restored", b.ok ? "ok" : JSON.stringify(b.error).slice(0, 200));
}
