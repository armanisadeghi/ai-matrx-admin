// features/mandates/feature-intelligence/placement-model.ts
//
// WHERE EACH JOB SITS, ARRANGED FROM DATA ONLY. The database decides every
// job's node (`mandate.intelligence_placement`: the surface's registry node,
// else the mandate's own `taxonomy_node_slug`) and the registry decides the
// tree (`platform.taxonomy_node.parent_id`). This module only arranges the rows
// it is given: it holds no slug, no key pattern and no map (guard:
// `pnpm check:intelligence-placement-from-data`). Plan:
// common-docs systems/intelligence/mandates/projects/intelligence-from-data.
//
// A job with no node falls to an honest lane, decided by its own data:
//   code job                    → Unplaced (shrink-only; the node check names them)
//   shortcut offered everywhere → Everywhere (its surface is NULL)
//   any other soft job          → Yours (the viewer made it) / Your organization
//   test fixture                → Test fixtures (metadata.fixture; admins only)

import { storedMandateKey, type AnyMandateKey } from "@ai-matrx/agents/mandates";

/** One registry node, as `platform.taxonomy_node` holds it. */
export interface TaxonomyNode {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  status: string | null;
}

/** One row of `mandate.intelligence_placement`, plus whether it is a shortcut. */
export interface PlacementRow {
  mandateId: string;
  mandateKey: AnyMandateKey;
  /** A live registry slug, or null (the function drops slugs the registry lost). */
  nodeSlug: string | null;
  placedBy: "mandate" | "surface" | "none";
  surfaceName: string | null;
  /** Stored lineage: the roll-up anchor this row is a per-surface version of. */
  rollupAnchorId: string | null;
  origin: string;
  organizationId: string | null;
  createdBy: string | null;
  isFixture: boolean;
  /** The row is a context-menu shortcut (`mandate.vw_shortcut`). */
  isShortcut: boolean;
}

/** The lanes for jobs no registry node holds. Ids are page ids (`/intelligence/<id>`). */
export const LANES = {
  everywhere: "Everywhere",
  yours: "Yours",
  "your-organization": "Your organization",
  unplaced: "Unplaced",
  fixtures: "Test fixtures",
} as const;

export type LaneId = keyof typeof LANES;

/** Directory order of the lanes, after every Domain. */
export const LANE_ORDER: readonly LaneId[] = [
  "everywhere",
  "yours",
  "your-organization",
  "unplaced",
  "fixtures",
];

export function isLane(id: string): id is LaneId {
  return Object.prototype.hasOwnProperty.call(LANES, id);
}

/** The lane a row falls to, or null when a node holds it. */
export function laneOf(row: PlacementRow, viewerId: string | null): LaneId | null {
  if (row.isFixture) return "fixtures";
  if (row.nodeSlug) return null;
  if (row.origin === "code") return "unplaced";
  if (row.isShortcut && row.surfaceName === null) return "everywhere";
  if (viewerId && row.createdBy === viewerId) return "yours";
  return "your-organization";
}

/** Where a row sits: its node slug, or its lane id. */
export function homeOf(row: PlacementRow, viewerId: string | null): string {
  return laneOf(row, viewerId) ?? (row.nodeSlug as string);
}

// ── The tree ────────────────────────────────────────────────────────────────

export interface Tree {
  bySlug: ReadonlyMap<string, TaxonomyNode>;
  byId: ReadonlyMap<string, TaxonomyNode>;
  /** Children by parent slug; roots under `null`. Sorted by name. */
  children: ReadonlyMap<string | null, readonly TaxonomyNode[]>;
}

export function buildTree(nodes: readonly TaxonomyNode[]): Tree {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const bySlug = new Map(nodes.map((node) => [node.slug, node]));
  const children = new Map<string | null, TaxonomyNode[]>();
  for (const node of nodes) {
    const parent = node.parent_id ? (byId.get(node.parent_id)?.slug ?? null) : null;
    const list = children.get(parent) ?? [];
    list.push(node);
    children.set(parent, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return { bySlug, byId, children };
}

export function childrenOf(tree: Tree, slug: string | null): readonly TaxonomyNode[] {
  return tree.children.get(slug) ?? [];
}

/** Root → node, inclusive. Empty for a slug the registry does not hold. */
export function pathOf(tree: Tree, slug: string): TaxonomyNode[] {
  const out: TaxonomyNode[] = [];
  const seen = new Set<string>();
  let node = tree.bySlug.get(slug);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    out.unshift(node);
    node = node.parent_id ? tree.byId.get(node.parent_id) : undefined;
  }
  return out;
}

/** Is `slug` the node `ancestor` or below it? */
export function isWithin(tree: Tree, slug: string, ancestor: string): boolean {
  return pathOf(tree, slug).some((node) => node.slug === ancestor);
}

/** The deepest node every slug sits at or below, or null when they share no root. */
export function commonAncestor(tree: Tree, slugs: readonly string[]): string | null {
  const paths = slugs.map((slug) => pathOf(tree, slug)).filter((path) => path.length > 0);
  if (paths.length === 0) return null;
  let common: string | null = null;
  for (let depth = 0; ; depth++) {
    const at = paths[0][depth]?.slug;
    if (!at || paths.some((path) => path[depth]?.slug !== at)) return common;
    common = at;
  }
}

/** The registry's own status, shown only when a node is not settled (proposed, legacy). */
export function unsettledStatus(status: string | null): string | null {
  return status && status !== "canonical" && status !== "active" ? status : null;
}

/** A page's name: a node's own name, or a lane's. */
export function homeLabel(tree: Tree, home: string): string {
  if (isLane(home)) return LANES[home];
  return tree.bySlug.get(home)?.name ?? home;
}

// ── Arranging rows ──────────────────────────────────────────────────────────

/** One thing shown at a home: a job, or a roll-up of one job's per-surface versions. */
export type PlacedEntry =
  | { kind: "job"; row: PlacementRow }
  | {
      kind: "rollup";
      anchorId: string;
      /** Null when this viewer cannot see the anchor itself. */
      anchor: PlacementRow | null;
      versions: PlacementRow[];
    };

export function entryKeys(entry: PlacedEntry): AnyMandateKey[] {
  if (entry.kind === "job") return [entry.row.mandateKey];
  return [
    ...(entry.anchor ? [entry.anchor.mandateKey] : []),
    ...entry.versions.map((row) => row.mandateKey),
  ];
}

/** The key a roll-up is known by: its anchor's, else its first version's. */
export function entryKey(entry: PlacedEntry): AnyMandateKey {
  if (entry.kind === "job") return entry.row.mandateKey;
  return entry.anchor?.mandateKey ?? entry.versions[0].mandateKey;
}

/**
 * Every visible row, arranged by home. A per-surface version sits inside its
 * roll-up (stored lineage, never computed from what the viewer sees); a version
 * whose own surface carries a node is also shown there as a normal job.
 * The roll-up sits at its anchor's home, or — when the viewer cannot see the
 * anchor — at its first version's (every version carries the group's node).
 */
export function arrange(
  rows: readonly PlacementRow[],
  viewerId: string | null,
): Map<string, PlacedEntry[]> {
  const byId = new Map(rows.map((row) => [row.mandateId, row]));
  const groups = new Map<string, PlacementRow[]>();
  for (const row of rows) {
    if (!row.rollupAnchorId) continue;
    const list = groups.get(row.rollupAnchorId) ?? [];
    list.push(row);
    groups.set(row.rollupAnchorId, list);
  }
  const out = new Map<string, PlacedEntry[]>();
  const put = (home: string, entry: PlacedEntry) => {
    const list = out.get(home) ?? [];
    list.push(entry);
    out.set(home, list);
  };
  for (const row of rows) {
    if (row.rollupAnchorId) {
      if (row.placedBy === "surface") put(homeOf(row, viewerId), { kind: "job", row });
      continue;
    }
    const versions = groups.get(row.mandateId);
    if (versions) {
      put(homeOf(row, viewerId), {
        kind: "rollup",
        anchorId: row.mandateId,
        anchor: row,
        versions: sortVersions(versions),
      });
    } else {
      put(homeOf(row, viewerId), { kind: "job", row });
    }
  }
  // Roll-ups whose anchor this viewer cannot see.
  for (const [anchorId, versions] of groups) {
    if (byId.has(anchorId)) continue;
    const sorted = sortVersions(versions);
    put(homeOf(sorted[0], viewerId), { kind: "rollup", anchorId, anchor: null, versions: sorted });
  }
  return out;
}

function sortVersions(rows: readonly PlacementRow[]): PlacementRow[] {
  return [...rows].sort(
    (a, b) =>
      (a.surfaceName ?? "￿").localeCompare(b.surfaceName ?? "￿") ||
      a.mandateKey.localeCompare(b.mandateKey),
  );
}

/** Every slug at or below `slug`, the node itself included. */
export function subtreeSlugs(tree: Tree, slug: string): string[] {
  const out: string[] = [];
  const walk = (at: string) => {
    out.push(at);
    for (const child of childrenOf(tree, at)) walk(child.slug);
  };
  walk(slug);
  return out;
}

/** The entries a page holds: a lane's own, or everything at or below a node. */
export function entriesWithin(
  tree: Tree,
  arranged: ReadonlyMap<string, readonly PlacedEntry[]>,
  page: string,
): PlacedEntry[] {
  if (isLane(page)) return [...(arranged.get(page) ?? [])];
  return subtreeSlugs(tree, page).flatMap((slug) => arranged.get(slug) ?? []);
}

/** A node as a page draws it: its own entries, then each child that holds any. */
export interface NodeGroup {
  slug: string;
  name: string;
  status: string | null;
  own: PlacedEntry[];
  children: NodeGroup[];
  /** Entries at or below this node (a roll-up counts once). */
  count: number;
}

export function groupOf(
  tree: Tree,
  arranged: ReadonlyMap<string, readonly PlacedEntry[]>,
  slug: string,
  keep: (entry: PlacedEntry) => boolean = () => true,
): NodeGroup {
  const node = tree.bySlug.get(slug);
  const own = (arranged.get(slug) ?? []).filter(keep);
  const children = childrenOf(tree, slug)
    .map((child) => groupOf(tree, arranged, child.slug, keep))
    .filter((child) => child.count > 0);
  return {
    slug,
    name: node?.name ?? homeLabel(tree, slug),
    status: node?.status ?? null,
    own,
    children,
    count: own.length + children.reduce((sum, child) => sum + child.count, 0),
  };
}

// ── The wire ────────────────────────────────────────────────────────────────

/** The raw `mandate.intelligence_placement` row. */
export interface PlacementWireRow {
  mandate_id: string;
  mandate_key: string;
  node_slug: string | null;
  placed_by: string;
  surface_name: string | null;
  rollup_anchor_id: string | null;
  origin: string;
  organization_id: string | null;
  created_by: string | null;
  is_fixture: boolean | null;
}

/** The page boundary: a wire row (runtime-checked) becomes a typed row. */
export function placementFromWire(
  raw: unknown,
  shortcutIds: ReadonlySet<string>,
): PlacementRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<PlacementWireRow>;
  if (typeof row.mandate_id !== "string" || typeof row.mandate_key !== "string") return null;
  const placedBy =
    row.placed_by === "mandate" || row.placed_by === "surface" ? row.placed_by : "none";
  return {
    mandateId: row.mandate_id,
    mandateKey: storedMandateKey(row.mandate_key),
    nodeSlug: placedBy === "none" ? null : (row.node_slug ?? null),
    placedBy,
    surfaceName: row.surface_name ?? null,
    rollupAnchorId: row.rollup_anchor_id ?? null,
    origin: row.origin ?? "",
    organizationId: row.organization_id ?? null,
    createdBy: row.created_by ?? null,
    isFixture: row.is_fixture === true,
    isShortcut: shortcutIds.has(row.mandate_id),
  };
}
