#!/usr/bin/env node
// Guard: every command pw.mjs answers, pw-cloud.mjs answers too, so a runner sheet written for one works on the other.
// pw-cloud handles a command either in the client (start, stop, chat → goto) or in the box (pw_cloud_box.py).
// Run: node pw-cloud.vocab.test.mjs  (exit 0 = same vocabulary). --self-test plants a command only pw.mjs has and
// must see this guard fail.
import fs from "node:fs";

const read = (f) => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const pwCommands = (src) => new Set([...src.matchAll(/case "([a-z]+)":/g)].map((m) => m[1]).concat(src.includes('cmd === "start"') ? ["start"] : []));
const boxCommands = (src) => new Set([...src.matchAll(/cmd == "([a-z]+)"/g)].map((m) => m[1]));
const clientCommands = (src) => new Set([...src.matchAll(/cmd === "([a-z]+)"/g)].map((m) => m[1]));

function missing(pwSrc, boxSrc, clientSrc) {
  const box = boxCommands(boxSrc), client = clientCommands(clientSrc);
  return [...pwCommands(pwSrc)].filter((c) => !box.has(c) && !client.has(c));
}

const pw = read("./pw.mjs"), box = read("./pw_cloud_box.py"), client = read("./pw-cloud.mjs");
if (process.argv.includes("--self-test")) {
  const planted = missing(pw.replace('case "url":', 'case "zoomto": break;\n  case "url":'), box, client);
  if (!planted.includes("zoomto")) { console.error("self-test FAILED: a command only pw.mjs has went unnoticed"); process.exit(1); }
  console.log("self-test ok: a planted pw.mjs-only command is caught");
}
const gap = missing(pw, box, client);
if (gap.length) { console.error(`pw-cloud.mjs does not answer: ${gap.join(", ")} (add it to pw_cloud_box.py or the client)`); process.exit(1); }
console.log(`pw-cloud vocabulary matches pw.mjs (${pwCommands(pw).size} commands)`);
