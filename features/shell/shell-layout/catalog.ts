// features/shell/shell-layout/catalog.ts — THE ONE PLACEABLE-DESTINATION CATALOG (project
// custom-experience, PLAN.md §5.1). Everything a person can put in their Sidebar, Header or Dock,
// keyed by the permanent nav ids of features/shell/constants/nav-data.ts plus the Tools-grid
// tiles (`tile.*`). Pure data derived from those sources: no React, no IO. The editor, the
// resolver, launchpads and the command bar read this list; nobody keeps a second one.

import {
  adminNavItems,
  dockItems,
  isNavActionChild,
  isNavPanelChild,
  NAV_WINDOW_PANEL_ICON,
  primaryNavItems,
  settingsItem,
  type ShellNavChild,
  type ShellNavItem,
} from "@/features/shell/constants/nav-data";
import { shellIconComponents, type ShellIconName } from "@/features/shell/shellIconMap";
import { TOOLS_GRID_TILES, type ToolsGridTile } from "@/features/window-panels/tools-grid/toolsGridTiles";
import type { HeaderButton, HeaderControlId, ShellNode } from "./contract";

/**
 * The catalog's version. Bump it (and add the new ids to `CATALOG_ADDED_IN` at the new number)
 * whenever destinations are added that a customized layout should be offered in What's new.
 */
export const SHELL_CATALOG_VERSION = 1;

/**
 * The catalog version each destination arrived in, for ids added after version 1. Absent = 1
 * (present at the start). A layout reviewed against an older version is offered the newer ids
 * in What's new; they are never injected into its tree (PLAN.md §5.5).
 */
export const CATALOG_ADDED_IN: Readonly<Record<string, number>> = {};

/** `destination` opens a page; `group` holds a menu (its href is its landing); `action` creates or opens a window. */
export type ShellCatalogEntryKind = "destination" | "group" | "action";

/** Where an entry comes from. */
export type ShellCatalogEntrySource = "primary" | "settings" | "admin" | "tile";

export interface ShellCatalogEntry {
  /** The permanent id (`ShellNode.ref` / `HeaderButton.ref` point here). */
  id: string;
  label: string;
  iconName: ShellIconName;
  /** In-app path or absolute URL. `null` only for a Tools-grid tile (it opens a window). */
  href: string | null;
  /** The entry this one sits under in the default menu; null at the top level. */
  parentId: string | null;
  depth: 1 | 2 | 3;
  /** In the built-in default Sidebar. Admin rows, Settings rows and tiles are placeable but not shown by default. */
  defaultVisible: boolean;
  kind: ShellCatalogEntryKind;
  /** Absolute URL on another origin — renders as a new-tab `<a>`. */
  external: boolean;
  /** Internal destination that opens in a new tab. */
  openInNewTab: boolean;
  description?: string;
  /** Catalog version this entry arrived in (absent = 1). */
  addedIn?: number;
  source: ShellCatalogEntrySource;
  /** Only placeable by platform admins. */
  adminOnly: boolean;
  /** The Tools-grid tile this entry launches (source `tile`). */
  tileId?: string;
}

type NavNode = ShellNavItem | ShellNavChild;

interface CatalogRecord {
  entry: ShellCatalogEntry;
  /** The nav-data node itself (absent for tiles) — the resolver copies it so defaults render byte-identical. */
  node?: NavNode;
  tile?: ToolsGridTile;
}

function navKind(node: NavNode): ShellCatalogEntryKind {
  if ("section" in node) return (node.children?.length ?? 0) > 0 ? "group" : "destination";
  if (isNavActionChild(node) || isNavPanelChild(node)) return "action";
  return (node.children?.length ?? 0) > 0 ? "group" : "destination";
}

function navRecords(
  nodes: readonly NavNode[],
  source: Exclude<ShellCatalogEntrySource, "tile">,
  parentId: string | null,
  depth: 1 | 2 | 3,
  out: CatalogRecord[],
): void {
  for (const node of nodes) {
    const addedIn = CATALOG_ADDED_IN[node.id];
    out.push({
      node,
      entry: {
        id: node.id,
        label: node.label,
        iconName: node.iconName,
        href: node.href,
        parentId,
        depth,
        defaultVisible: source === "primary",
        kind: navKind(node),
        external: node.external === true,
        openInNewTab: node.openInNewTab === true,
        ...(node.description !== undefined ? { description: node.description } : {}),
        ...(addedIn !== undefined ? { addedIn } : {}),
        source,
        adminOnly: source === "admin",
      },
    });
    const children = node.children ?? [];
    if (children.length > 0 && depth < 3) {
      navRecords(children, source, node.id, (depth + 1) as 2 | 3, out);
    }
  }
}

/** A tile's Lucide component, named back to the closed shell icon set (unregistered → the window icon). */
function tileIconName(tile: ToolsGridTile): ShellIconName {
  for (const [name, component] of Object.entries(shellIconComponents)) {
    if (component === tile.icon) return name as ShellIconName;
  }
  return NAV_WINDOW_PANEL_ICON;
}

function tileRecords(out: CatalogRecord[]): void {
  for (const tile of TOOLS_GRID_TILES) {
    const addedIn = CATALOG_ADDED_IN[tile.id];
    out.push({
      tile,
      entry: {
        id: tile.id,
        label: tile.label,
        iconName: tileIconName(tile),
        href: null,
        parentId: null,
        depth: 1,
        defaultVisible: false,
        kind: "action",
        external: false,
        openInNewTab: false,
        ...(addedIn !== undefined ? { addedIn } : {}),
        source: "tile",
        adminOnly: tile.gate === "admin",
        tileId: tile.id,
      },
    });
  }
}

let allRecords: CatalogRecord[] | null = null;
let recordsById: Map<string, CatalogRecord> | null = null;

/** Every record, admin rows included, in menu order (built once; the sources are static). */
function records(): CatalogRecord[] {
  if (allRecords) return allRecords;
  const out: CatalogRecord[] = [];
  navRecords(primaryNavItems, "primary", null, 1, out);
  navRecords([settingsItem], "settings", null, 1, out);
  navRecords(adminNavItems, "admin", null, 1, out);
  tileRecords(out);
  allRecords = out;
  return out;
}

function recordIndex(): Map<string, CatalogRecord> {
  if (recordsById) return recordsById;
  const map = new Map<string, CatalogRecord>();
  for (const record of records()) {
    // First wins: duplicates are a nav-ids.test.ts failure, never a silent overwrite here.
    if (!map.has(record.entry.id)) map.set(record.entry.id, record);
  }
  recordsById = map;
  return map;
}

/**
 * The flat catalog for one viewer: the whole primary menu (all three levels), Settings, the
 * Tools-grid tiles, and — only when `isAdmin` — the admin rows and admin-gated tiles.
 */
export function buildShellCatalog({ isAdmin }: { isAdmin: boolean }): ShellCatalogEntry[] {
  return records()
    .filter((record) => isAdmin || !record.entry.adminOnly)
    .map((record) => record.entry);
}

/** One entry by its permanent id. Admin-only entries are returned only when `isAdmin`. */
export function getCatalogEntry(
  id: string,
  { isAdmin = false }: { isAdmin?: boolean } = {},
): ShellCatalogEntry | undefined {
  const record = recordIndex().get(id);
  if (!record) return undefined;
  if (record.entry.adminOnly && !isAdmin) return undefined;
  return record.entry;
}

/** The nav-data node behind a catalog id (undefined for tiles and unknown ids). Resolver-internal. */
export function getCatalogNavNode(id: string): NavNode | undefined {
  return recordIndex().get(id)?.node;
}

/** True when the id names any catalog entry (admin rows included). */
export function isKnownCatalogId(id: string): boolean {
  return recordIndex().has(id);
}

function navTree(node: NavNode, depth: number): ShellNode {
  const children = node.children ?? [];
  if (children.length === 0 || depth >= 3) return { kind: "nav", id: node.id, ref: node.id };
  return {
    kind: "nav",
    id: node.id,
    ref: node.id,
    children: children.map((child) => navTree(child, depth + 1)),
  };
}

/** Today's default Sidebar as a stored-shape tree: every node, its default children, in order. */
export function defaultSidebarTree(): ShellNode[] {
  return primaryNavItems.map((item) => navTree(item, 1));
}

/** Today's default phone Dock as a stored-shape list (each dock row names the menu node it mirrors). */
export function defaultDockTree(): ShellNode[] {
  return dockItems.map((item): ShellNode => ({ kind: "nav", id: `dock.${item.id}`, ref: item.id }));
}

/** The five header controls, left to right (owner, 2026-09-30). */
export const DEFAULT_HEADER_CONTROLS: readonly HeaderControlId[] = [
  "search",
  "intelligence",
  "messages",
  "notifications",
  "canvas",
];

/** Today's default Header as a stored-shape list. */
export function defaultHeaderButtons(): HeaderButton[] {
  return DEFAULT_HEADER_CONTROLS.map((control): HeaderButton => ({
    kind: "control",
    id: `control.${control}`,
    control,
  }));
}
