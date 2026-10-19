import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { eagerClientSet } from "./check-shell-eager-graph";
const ROOT = resolve(__dirname, "..");
// usage: _tmp-reach.ts <client module file> ... : static client reach of each, top groups
async function main() {
  for (const ent of process.argv.slice(2)) {
    // a client file as an entry: eagerClientSet treats server walk entry; wrap by treating entry itself
    const g = await eagerClientSet([ent]);
    const by = new Map<string, number>(); let tot = 0;
    for (const f of g.parent.keys()) {
      let s = 0; try { s = readFileSync(f).length; } catch {}
      tot += s;
      const r = relative(ROOT, f);
      const i = r.lastIndexOf("node_modules/");
      let k: string;
      if (i >= 0) { const p = r.slice(i + 13).split("/"); k = p[0]!.startsWith("@") ? `${p[0]}/${p[1]}/${p[2] ?? ""}/${p[3] ?? ""}` : p[0]!; }
      else k = r.split("/").slice(0, 3).join("/");
      by.set(k, (by.get(k) ?? 0) + s);
    }
    console.log(`\n${ent}: ${g.parent.size} modules ${(tot / 1e6).toFixed(2)} MB`);
    for (const [k, v] of [...by].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${(v / 1e3).toFixed(0).padStart(7)} KB ${k}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
