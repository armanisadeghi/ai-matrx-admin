// AT-WALK-I driver: keeps two signed-in headless browsers (admin, member) alive; runs /tmp/airtable-walk/cmd-<n>.js (async body with page, mpage, ctx, ORIGIN) and writes cmd-<n>.out
import { start, ORIGIN } from "./lib.mjs";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
const D = "/tmp/airtable-walk";
const a = await start(false);
console.log("admin", a.who);
const m = await start(true);
console.log("member", m.who);
writeFileSync(`${D}/ready`, "1");
const AF = Object.getPrototypeOf(async function () {}).constructor;
const done = new Set();
while (true) {
  for (const f of readdirSync(D).filter((x) => /^cmd-\d+\.js$/.test(x))) {
    if (done.has(f) || existsSync(`${D}/${f.replace(".js", ".out")}`)) continue;
    done.add(f);
    let res;
    try { res = await new AF("page", "mpage", "ctx", "mctx", "ORIGIN", "log", readFileSync(`${D}/${f}`, "utf8"))(a.page, m.page, a.ctx, m.ctx, ORIGIN, (...x) => console.log(...x)); }
    catch (e) { res = "ERR " + e.message.slice(0, 800); }
    writeFileSync(`${D}/${f.replace(".js", ".out")}`, typeof res === "string" ? res : JSON.stringify(res, null, 1));
  }
  await new Promise((r) => setTimeout(r, 700));
}
