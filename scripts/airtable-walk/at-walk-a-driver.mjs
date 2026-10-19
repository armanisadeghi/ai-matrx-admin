// AT-WALK-A driver: ONE signed-in headless browser that stays up; runs cmd-N.mjs files dropped in $D, writing out-N.log.
// Each cmd file exports default async ({ page, ctx, browser, say }) => {}. Stop by creating $D/stop (or stop-member).
import { existsSync, writeFileSync, readdirSync } from "node:fs";
import { boot, D } from "./at-walk-a-lib.mjs";
const member = process.argv[2] === "member";
const s = await boot(member);
writeFileSync(`${D}/driver-${member ? "member" : "admin"}.ready`, String(s.who));
console.log("ready", s.who);
const done = new Set();
// A cmd file that starts a page.waitForEvent(...) (popup, download) and never awaits it leaves a promise that
// rejects AFTER its own try/catch ended: Node's default kills the driver. Report it to the cmd's own log and keep
// the driver up (AT-SLOW 4c).
let current = { n: "driver", say: (...a) => console.error(...a) };
const late = (kind) => (e) => {
  const msg = String(e?.message ?? e).split("\n").slice(0, 3).join(" | ");
  try { current.say(`LATE ${kind} (after the cmd returned; driver continues):`, msg); } catch { console.error(kind, msg); }
};
process.on("unhandledRejection", late("unhandledRejection"));
process.on("uncaughtException", late("uncaughtException"));
const pre = member ? "mcmd-" : "cmd-";
while (!existsSync(`${D}/stop${member ? "-member" : ""}`)) {
  for (const f of readdirSync(D).filter((f) => f.startsWith(pre) && f.endsWith(".mjs") && !done.has(f)).sort()) {
    done.add(f); const n = f.slice(0, -4); let log = "";
    const say = (...a) => { log += a.map((x) => typeof x === "string" ? x : JSON.stringify(x)).join(" ") + "\n"; writeFileSync(`${D}/out-${n}.log`, log); };
    current = { n, say };
    try { const m = await import(`${D}/${f}?t=${Date.now()}`); await m.default({ ...s, say }); say("DONE"); } catch (e) { say("ERROR", e.message.split("\n").slice(0, 3).join(" | ")); await s.page.screenshot({ path: `${D}/err-${n}.png` }).catch(() => {}); }
  }
  await new Promise((r) => setTimeout(r, 1000));
}
await s.browser.close();
