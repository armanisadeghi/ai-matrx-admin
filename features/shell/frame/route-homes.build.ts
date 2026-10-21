// THE FRAME'S ROUTE LOOKUP, BUILT (ROLLOUT-PLAN Layer 0). Node-only: reads the product flows
// (flows/*.json), route-homes.tsv and the route manifest, and writes ONE compact table the frame
// host reads in the browser — `route-homes.generated.ts`. The frame chunk never imports the flows,
// the TSV or route-flow.json (400 KB+); it imports only the generated table.
//
//   pnpm frame:route-homes     regenerate (after editing the flows, the TSV or products.ts)
//   __tests__/route-homes-generated.test.ts   fails when the file and its sources disagree
import fs from "node:fs";
import path from "node:path";
import { INTELLIGENCE_PARTS, flowByName, flowForTile } from "./flows";
import type { FlowProduct } from "./flows";
import { PRODUCTS } from "./products";
import { resolveRouteRow } from "./routeHomeLookup";

const ROOT = path.join(__dirname, "../../..");
export const ROUTE_HOMES_GENERATED_PATH = path.join(__dirname, "route-homes.generated.ts");

/** One sidebar row: [section label or "", row label, route pattern, a live href for when the pattern has unknown params]. */
export type BuiltItem = [section: string, label: string, pattern: string, fallbackHref: string];
/** One route: [pattern, product id, item index or -1, page title or ""]. */
export type BuiltRoute = [pattern: string, productId: string, itemIndex: number, title: string];

interface ManifestRoute {
  pattern: string;
  status: string;
}

/** Every route a link may point at: the manifest's live and placeholder pages. */
export function linkableRoutes(): Set<string> {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, "lib/route-manifest/manifest.generated.json"), "utf8"),
  ) as { routes: ManifestRoute[] };
  return new Set(manifest.routes.filter((r) => r.status === "live" || r.status === "placeholder").map((r) => r.pattern));
}

const isConcrete = (route: string | undefined): route is string => Boolean(route) && !route!.includes("[");

function tsvRows(): string[][] {
  return fs
    .readFileSync(path.join(__dirname, "route-homes.tsv"), "utf8")
    .split("\n")
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => l.split("\t"));
}

/** The grid tile a tree node belongs to: the first node segment that names a tile. */
function productForNode(node: string): string | null {
  const byName = new Map(PRODUCTS.map((p) => [p.name.toLowerCase(), p.id]));
  for (const segment of node.split("›").map((s) => s.trim().toLowerCase())) {
    const id = byName.get(segment);
    if (id) return id;
  }
  return null;
}

function flowSections(productId: string, name: string): { section: string; flow: FlowProduct["sections"][number] }[] {
  if (productId === "intelligence") {
    return INTELLIGENCE_PARTS.flatMap((part) => (flowByName(part)?.sections ?? []).map((flow) => ({ section: part, flow })));
  }
  return (flowForTile(name)?.sections ?? []).map((flow) => ({ section: "", flow }));
}

export function buildRouteHomes(): {
  products: Record<string, { entry: string; items: BuiltItem[] }>;
  routes: BuiltRoute[];
} {
  const linkable = linkableRoutes();
  const live = (route: string | undefined): route is string => isConcrete(route) && linkable.has(route);
  const products: Record<string, { entry: string; items: BuiltItem[] }> = {};
  const routeIndex = new Map<string, BuiltRoute>();

  for (const p of PRODUCTS) {
    const sections = flowSections(p.id, p.name);
    const flow = p.id === "intelligence" ? flowByName(INTELLIGENCE_PARTS[0]) : flowForTile(p.name);
    const firstLive = sections.flatMap(({ flow: s }) => [s.route, ...s.pages.map((pg) => pg.route)]).find(live);
    const entry = live(flow?.entry) ? flow.entry : (firstLive ?? (linkable.has(p.homeHref) ? p.homeHref : "/dashboard"));
    const items: BuiltItem[] = [];
    sections.forEach(({ section, flow: s }) => {
      const pattern = s.route ?? s.pages[0]?.route;
      if (!pattern || !linkable.has(pattern)) return;
      const fallback = isConcrete(pattern) ? pattern : (s.pages.map((pg) => pg.route).find(live) ?? entry);
      const index = items.length;
      items.push([section, s.name, pattern, fallback]);
      for (const page of s.pages) {
        if (!routeIndex.has(page.route)) routeIndex.set(page.route, [page.route, p.id, index, page.title]);
      }
      if (!routeIndex.has(pattern)) routeIndex.set(pattern, [pattern, p.id, index, s.name]);
    });
    products[p.id] = { entry, items };
  }

  // Every other page with a home in the tree: its product, no sidebar row, no title of its own.
  for (const [route, node] of tsvRows()) {
    if (routeIndex.has(route)) continue;
    const productId = productForNode(node ?? "");
    if (productId) routeIndex.set(route, [route, productId, -1, ""]);
  }
  // Prune: a row its nearest ancestor already answers (same product, same sidebar row) goes — the
  // browser resolves it through that ancestor. Deepest first, so a chain collapses to its head.
  // A pruned page loses only its own title; the crumb then reads its sidebar row's label.
  const kept = new Map(routeIndex);
  const depth = (r: string) => r.split("/").filter(Boolean).length;
  for (const row of [...routeIndex.values()].sort((a, b) => depth(b[0]) - depth(a[0]))) {
    if (depth(row[0]) === 0) continue;
    kept.delete(row[0]);
    const parent = resolveRouteRow([...kept.values()], row[0]);
    if (!parent || parent[1] !== row[1] || parent[2] !== row[2]) kept.set(row[0], row);
  }
  const routes = [...kept.values()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { products, routes };
}

/** The generated file's text (the test compares it byte for byte). */
export function renderRouteHomes(): string {
  const { products, routes } = buildRouteHomes();
  return [
    "// GENERATED by features/shell/frame/route-homes.build.ts (`pnpm frame:route-homes`) — never edit by hand.",
    "// Sources: flows/*.json, route-homes.tsv, products.ts, lib/route-manifest/manifest.generated.json.",
    "// The frame host's ONLY route data: product sidebars with real links, and every route's product.",
    'import type { FrameRouteHomes } from "./route-homes-types";',
    "",
    `export const FRAME_ROUTE_HOMES: FrameRouteHomes = ${JSON.stringify({ products, routes })};`,
    "",
  ].join("\n");
}
