import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { eagerClientSet } from "./check-shell-eager-graph";
const ROOT = resolve(__dirname, "..");
const NEEDS: Array<[RegExp, string]> = [
  [/node_modules\/react-redux\//, "react-redux"],
  [/lib\/redux\/hooks\.ts$/, "app redux hooks"],
  [/@ai-matrx\/canvas\/dist\/react/, "canvas react"],
  [/providers\/toast-context/, "toast-context"],
  [/@tanstack\/react-query\//, "react-query"],
  [/@ai-matrx\/chat\//, "chat package"],
  [/components\/ui\/tooltip/, "tooltip"],
];
async function main() {
  for (const page of process.argv.slice(2)) {
    const entries: string[] = [];
    let dir = dirname(page);
    while (dir.startsWith("app/(public)/")) {
      const l = join(dir, "layout.tsx");
      if (existsSync(join(ROOT, l))) entries.push(l);
      dir = dirname(dir);
    }
    entries.push(page);
    const g = await eagerClientSet(entries);
    const hits = new Map<string, string[]>();
    for (const f of g.parent.keys()) for (const [re, name] of NEEDS) {
      if (!re.test(f) || hits.has(name)) continue;
      let p: string | null = f; const chain: string[] = [];
      while (p) { chain.push(relative(ROOT, p).replace(/.*node_modules\//, "")); p = g.parent.get(p) ?? null; }
      hits.set(name, chain.reverse());
    }
    console.log(`\n${page}: ${g.parent.size} modules`);
    for (const [n, c] of hits) console.log(`  NEEDS ${n}: ${c.join(" -> ")}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
