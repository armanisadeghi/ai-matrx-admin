/**
 * ONE GRID ENGINE + ONE WIDGET REGISTRY (custom-experience PLAN §5.6, lane U) — the census for this repo.
 *
 * Every "page made of blocks" is drawn by @ai-matrx/design-system `GridCanvas` (launchpads here; records-ui
 * dashboards, Pages and Interfaces in the package, guarded there by `one-grid-engine.census.test.ts`), and every
 * placeable widget registers ONCE in `features/launchpad/widgets` (Board items and records-ui dashboards and pages
 * are entries there, not registries of their own). This fails when a second grid engine or a second widget
 * registry appears anywhere under app/, features/, components/ or lib/.
 *
 * The Board is NOT a grid: it is a free infinite canvas (PLAN §4), and its item catalog is the source the
 * `board_item` widget reads, so it is named below as the one other catalog, with why.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SCAN = ["app", "features", "components", "lib"];

/** Sortable grids that reorder a COLLECTION (slides, PDF pages, war-room threads) — not pages of widgets. */
const COLLECTION_REORDER = new Set([
  "features/presentations/components/DeckGridView.tsx",
  "features/war-room/components/room/threadDrag.tsx",
  "features/pdf/scanner/components/ReviewList.tsx",
]);

const ENGINE_SIGNATURES: readonly { name: string; re: RegExp }[] = [
  { name: "grid-layout library", re: /from\s+["'](react-grid-layout|gridstack|muuri|react-mosaic-component)["']/ },
  { name: "dnd-kit sortable GRID (rectSortingStrategy)", re: /\brectSortingStrategy\b/ },
];

/** A second registry of placeable widgets/blocks/tiles. */
const REGISTRY_SIGNATURE = /export const [A-Z_]*(WIDGET_CATALOG|WIDGET_REGISTRY|WIDGET_TYPES|BLOCK_REGISTRY|TILE_REGISTRY|TILE_TYPES)\b\s*[:=]/;
const REGISTRY_HOME = "features/launchpad/widgets/";

function* files(dir: string): Generator<string> {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === "node_modules" || name.startsWith(".") || name === "__tests__") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) yield path;
  }
}

function census(): string[] {
  const found: string[] = [];
  for (const top of SCAN) {
    for (const file of files(join(ROOT, top))) {
      const rel = relative(ROOT, file);
      const code = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join("\n");
      if (!COLLECTION_REORDER.has(rel)) for (const sig of ENGINE_SIGNATURES) if (sig.re.test(code)) found.push(`${rel}: ${sig.name}`);
      if (!rel.startsWith(REGISTRY_HOME) && REGISTRY_SIGNATURE.test(code)) found.push(`${rel}: a second widget registry`);
    }
  }
  return found;
}

describe("one grid engine, one widget registry", () => {
  it("no second grid engine and no second widget registry exists", () => {
    expect(census()).toEqual([]);
  });

  it("the collection-reorder exceptions still exist (a stale entry hides nothing)", () => {
    for (const rel of COLLECTION_REORDER) expect(statSync(join(ROOT, rel)).isFile()).toBe(true);
  });
});
