// features/shell/shell-layout/editor/regions.ts — a body's regions as the editors see them, and
// "Add to my menu" (custom-experience lane C). Pure.
//
// A body that does not carry a region shows that region's built-in default (resolve.ts rule), so an editor
// starts every region from what the person actually sees, and writes the region only once it is edited.

import {
  SHELL_LAYOUT_SCHEMA_VERSION,
  type HeaderButton,
  type ShellLayoutBody,
  type ShellNode,
} from "../contract";
import { buildShellCatalog, defaultDockTree, defaultHeaderButtons, defaultSidebarTree, SHELL_CATALOG_VERSION, type ShellCatalogEntry } from "../catalog";
import { SHELL_DOCK_MAX_ITEMS } from "../validate";
import {
  addEntryInto,
  addHeaderButton,
  addRow,
  buildCatalogTree,
  placedRefs,
  type CatalogTree,
} from "./tree";

export type EditorRegion = "sidebar" | "header" | "dock";

export function sidebarOf(body: ShellLayoutBody | null): ShellNode[] {
  return body?.sidebar ?? defaultSidebarTree();
}
export function dockOf(body: ShellLayoutBody | null): ShellNode[] {
  return body?.dock ?? defaultDockTree();
}
export function headerOf(body: ShellLayoutBody | null): HeaderButton[] {
  return body?.header ?? defaultHeaderButtons();
}

/** The body an editor starts from: the target's own, else (a person) the organization's copy, else a fresh one. */
export function startingBody(own: ShellLayoutBody | null, organization: ShellLayoutBody | null, target: "person" | "organization"): ShellLayoutBody {
  if (own) return own;
  if (target === "person" && organization) {
    const { dismissedNew: _d, landing: _l, ...regions } = organization;
    return { ...regions, schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION };
  }
  return { schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: SHELL_CATALOG_VERSION };
}

/** The catalog entry a path opens, when one does exactly (a page already in our menus). */
export function catalogEntryForPath(entries: readonly ShellCatalogEntry[], pathname: string): ShellCatalogEntry | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  return entries.find((e) => e.href !== null && !e.external && e.href.replace(/\/+$/, "") === path);
}

/** What "Add to my menu" adds: this page, or the record it shows. */
export interface MenuPageItem {
  /** Path + query of the page (in-app). */
  href: string;
  label: string;
  record: { token: string; id: string } | null;
}

export type AddPlace = { region: "sidebar"; intoId: string | null } | { region: "dock" } | { region: "header" };

export interface AddToMenuResult {
  body: ShellLayoutBody;
  /** False when nothing could be added (already there, or the Dock is full). */
  added: boolean;
  reason?: "already" | "dock-full";
}

/**
 * Adds a page or record to a body: a page our catalog knows becomes its catalog row (with its defaults),
 * a record becomes a `record` row, anything else a `link`. The region is written in full from what the
 * person sees now.
 */
export function addPageToBody(
  body: ShellLayoutBody,
  item: MenuPageItem,
  place: AddPlace,
  opts: { isAdmin: boolean; tree?: CatalogTree },
): AddToMenuResult {
  const entries = buildShellCatalog({ isAdmin: opts.isAdmin });
  const tree = opts.tree ?? buildCatalogTree(entries);
  const entry = item.record ? undefined : catalogEntryForPath(entries, item.href.split("?")[0] ?? item.href);
  if (place.region === "header") {
    const before = headerOf(body);
    const next = entry
      ? addHeaderButton(before, { kind: "nav", ref: entry.id })
      : addHeaderButton(before, { kind: "link", label: item.label, href: item.href, icon: item.record ? "FileText" : "Link2" });
    if (next.length === before.length) return { body, added: false, reason: "already" };
    return { body: { ...body, header: next }, added: true };
  }
  const region = place.region;
  const before = region === "sidebar" ? sidebarOf(body) : dockOf(body);
  if (region === "dock" && before.length >= SHELL_DOCK_MAX_ITEMS) return { body, added: false, reason: "dock-full" };
  if (entry && placedRefs(before).has(entry.id)) return { body, added: false, reason: "already" };
  const intoId = place.region === "sidebar" ? place.intoId : null;
  const next = entry
    ? addEntryInto(before, tree, entry.id, region, intoId)
    : item.record
      ? addRow(before, { kind: "record", label: item.label, token: item.record.token, recordId: item.record.id, href: item.href }, region, intoId)
      : addRow(before, { kind: "link", label: item.label, href: item.href }, region, intoId);
  if (next.length === before.length && JSON.stringify(next) === JSON.stringify(before)) return { body, added: false, reason: "already" };
  return { body: region === "sidebar" ? { ...body, sidebar: next } : { ...body, dock: next }, added: true };
}

/** The groups of a Sidebar a page can be added into (top two levels; a row goes at most three deep). */
export function sidebarGroups(nodes: readonly ShellNode[], label: (node: ShellNode) => string, depth = 1): Array<{ id: string; label: string; depth: number }> {
  const out: Array<{ id: string; label: string; depth: number }> = [];
  for (const node of nodes) {
    const isGroup = node.kind === "group" || (node.kind === "nav" && node.children !== undefined);
    if (isGroup && depth < 3) out.push({ id: node.id, label: label(node), depth });
    if ((node.kind === "group" || node.kind === "nav") && node.children && depth < 2) out.push(...sidebarGroups(node.children, label, depth + 1));
  }
  return out;
}

// ── What's new ───────────────────────────────────────────────────────────────

/** Dismiss one What's new offer (never offered again). */
export function dismissNew(body: ShellLayoutBody, id: string): ShellLayoutBody {
  const dismissed = new Set(body.dismissedNew ?? []);
  dismissed.add(id);
  return { ...body, dismissedNew: [...dismissed] };
}

/** Add a What's new entry to the top of the Sidebar. Once nothing newer is left unreviewed, the body moves to today's catalog. */
export function acceptNew(body: ShellLayoutBody, entryId: string, remainingNew: readonly string[], opts: { isAdmin: boolean }): ShellLayoutBody {
  const tree = buildCatalogTree(buildShellCatalog({ isAdmin: opts.isAdmin }));
  const sidebar = addEntryInto(sidebarOf(body), tree, entryId, "sidebar", null);
  const rest = remainingNew.filter((id) => id !== entryId);
  return { ...body, sidebar, ...(rest.length === 0 ? { basedOnCatalogVersion: SHELL_CATALOG_VERSION } : {}) };
}
