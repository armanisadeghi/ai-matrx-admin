import { writeFileSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { eagerClientSet } from "./check-shell-eager-graph";
(async () => {
  const g = await eagerClientSet();
  const rows = [...g.parent.keys()].map((f) => { let s = 0; try { s = readFileSync(f).length; } catch {} return `${s}\t${relative(process.cwd(), f)}`; }).sort();
  writeFileSync(process.argv[2]!, rows.join("\n") + "\n");
  console.log(rows.length, "modules");
})();
