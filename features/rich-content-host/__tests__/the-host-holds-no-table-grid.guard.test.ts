/**
 * THE RICH-CONTENT HOST HOLDS NO TABLE GRID. The host loads on the person's first keystroke in a
 * composer (it warms before a reply can render). `@ai-matrx/records-ui` — the table grid, ~2.7 MB
 * unpacked — used to ride in with it through three static edges (the host bindings' table viewer,
 * the canvas table artifact, the Record card), so typing "h" on /chat/new pulled the whole grid
 * with no table anywhere. Those three now go through a front door (LocatedTableViewerDoor, a lazy
 * PlatformRecordBlock) and records-ui loads only when a table or Record is shown. This walks the
 * host's STATIC import graph (never `import()`, never `import type`) and fails on any file in it
 * that imports the records-ui root. Small records-ui subpaths (/helpers, /table-shape, …) are fine.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];
const GRID = /^@ai-matrx\/records-ui$/;

/** Static edges only — the same scan as providers/__tests__/lazy-host.guard.test.ts. */
function staticImports(source: string): string[] {
  const out: string[] = [];
  const re = /(?:^|\n)\s*(?:import\s+(?!type\b)(?:[^"';]*?\s+from\s+)?|export\s+(?!type\b)[^"';]*?\s+from\s+)["']([^"']+)["']/g;
  for (let m = re.exec(source); m; m = re.exec(source)) out.push(m[1]);
  return out;
}

function resolveSpec(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const e of EXTS) {
    const p = base + e;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function chainsToGrid(entry: string): string[][] {
  const start = path.join(ROOT, entry);
  const parent = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  const hits: string[][] = [];
  while (queue.length) {
    const file = queue.shift()!;
    const source = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const spec of staticImports(source)) {
      if (GRID.test(spec)) {
        const chain: string[] = [];
        for (let f: string | null = file; f; f = parent.get(f) ?? null) chain.unshift(path.relative(ROOT, f));
        hits.push(chain);
        continue;
      }
      const next = resolveSpec(spec, file);
      if (next && !parent.has(next)) {
        parent.set(next, file);
        queue.push(next);
      }
    }
  }
  return hits;
}

test("nothing the rich-content host loads statically imports @ai-matrx/records-ui", () => {
  const hits = chainsToGrid("providers/richContentHost.ts").map((c) => c.join(" -> "));
  expect(hits).toEqual([]);
});

test("the door really is a lazy edge to the one table viewer", () => {
  const door = fs.readFileSync(path.join(ROOT, "features/data-tables/components/LocatedTableViewerDoor.tsx"), "utf8");
  expect(door).toMatch(/lazy\(\(\) => import\("\.\/LocatedTableViewer"\)\)/);
  expect(door).toMatch(/<Suspense/);
});
