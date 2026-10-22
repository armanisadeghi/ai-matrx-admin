import { ALL_MANIFESTS } from "@/features/surfaces/manifests/registry";
import { situationBlankFailures } from "./lib/surface-situation-blanks";
import { readFileSync } from "node:fs";
const names = readFileSync(process.argv[2], "utf8").trim().split(/\s+/);
const BL = /\{\s*([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*(\|[^{}]*)?\}/g;
let n = 0;
const fails: string[] = [];
for (const m of ALL_MANIFESTS as any[]) {
  if (!names.includes(m.surfaceName)) continue;
  if (!m.situation) { console.log("NO SITUATION:", m.surfaceName); continue; }
  n++;
  fails.push(...situationBlankFailures([m]));
  for (const b of m.situation.matchAll(BL)) {
    const root = b[1].split(".")[0];
    const v = m.values.find((x: any) => x.name === root);
    if (!b[2] && root !== "user" && !(v?.alwaysAvailable && !b[1].includes("."))) fails.push(`${m.surfaceName}: ${b[0]} lacks fallback`);
  }
}
console.log("checked", n); console.log(fails.join("\n") || "no failures");
