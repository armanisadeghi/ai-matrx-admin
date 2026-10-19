// features/shell/shell-layout/editor/tree.ts — the layout editor's PURE verbs (custom-experience lane C).
//
// Every edit the Sidebar / Dock / Header editors make is one of these functions over the stored shapes of
// contract.ts: tick a catalog entry (it brings its default children), untick it, move any row before/after
// another or into a group (promote = move to the top level), rename, re-icon, add a group / link / record /
// launchpad, remove. No React, no IO; the window only renders and calls these. Tested in
// ../__tests__/editorTree.test.ts. A move or tick that would break the contract (deeper than three levels,
// a submenu in the Dock, a Dock past its limit) returns the input unchanged — the UI never offers it.

import {
  SHELL_LAYOUT_MAX_DEPTH,
  SHELL_LAYOUT_SCHEMA_VERSION,
  type HeaderButton,
  type ShellLayoutBody,
  type ShellNode,
} from "../contract";
import { SHELL_CATALOG_VERSION, type ShellCatalogEntry } from "../catalog";
import { SHELL_DOCK_MAX_ITEMS } from "../validate";
import { resolveRetiredNavId } from "../retired-nav-ids";
import type { ShellIconName } from "@/features/shell/shellIconMap";

/** Which region an editor edits. The Sidebar nests three levels; the Dock is flat and holds at most 8. */
export type TreeRegion = "sidebar" | "dock";

export interface CatalogTreeNode {
  entry: ShellCatalogEntry;
  children: CatalogTreeNode[];
}

/** The catalog as the checkbox tree draws it: the default menu, then "More you can add" in its parts. */
export interface CatalogTree {
  main: CatalogTreeNode[];
  settings: CatalogTreeNode[];
  admin: CatalogTreeNode[];
  tools: CatalogTreeNode[];
  /** Every node by entry id (children lists in catalog order). */
  byId: Map<string, CatalogTreeNode>;
}

export function buildCatalogTree(entries: readonly ShellCatalogEntry[]): CatalogTree {
  const byId = new Map<string, CatalogTreeNode>();
  for (const entry of entries) byId.set(entry.id, { entry, children: [] });
  const roots: CatalogTreeNode[] = [];
  for (const entry of entries) {
    const node = byId.get(entry.id);
    if (!node) continue;
    const parent = entry.parentId ? byId.get(entry.parentId) : undefined;
    if (parent && parent.entry.id !== entry.id) parent.children.push(node);
    else if (!entry.parentId) roots.push(node);
  }
  return {
    main: roots.filter((n) => n.entry.source === "primary"),
    settings: roots.filter((n) => n.entry.source === "settings"),
    admin: roots.filter((n) => n.entry.source === "admin"),
    tools: roots.filter((n) => n.entry.source === "tile"),
    byId,
  };
}

/** Filters a catalog tree by a search phrase: a node stays when it or any descendant matches. */
export function filterCatalogTree(nodes: readonly CatalogTreeNode[], query: string): CatalogTreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...nodes];
  const out: CatalogTreeNode[] = [];
  for (const node of nodes) {
    const children = filterCatalogTree(node.children, q);
    const hit = node.entry.label.toLowerCase().includes(q) || (node.entry.description ?? "").toLowerCase().includes(q);
    if (hit || children.length > 0) out.push({ entry: node.entry, children: hit && children.length === 0 ? node.children : children });
  }
  return out;
}

// ── reading a tree ───────────────────────────────────────────────────────────

/** A nav row's ref as the catalog knows it now (retired ids follow their successor). */
function liveRef(ref: string): string {
  return resolveRetiredNavId(ref).id ?? ref;
}

/** Every catalog id placed anywhere in the tree. */
export function placedRefs(nodes: readonly ShellNode[] | undefined, into: Set<string> = new Set()): Set<string> {
  for (const node of nodes ?? []) {
    if (node.kind === "nav") into.add(liveRef(node.ref));
    if (node.kind === "nav" || node.kind === "group") placedRefs(node.children, into);
  }
  return into;
}

/** Every row id in the tree (all kinds). */
export function allIds(nodes: readonly ShellNode[] | undefined, into: Set<string> = new Set()): Set<string> {
  for (const node of nodes ?? []) {
    into.add(node.id);
    if (node.kind === "nav" || node.kind === "group") allIds(node.children, into);
  }
  return into;
}

export function childrenOf(node: ShellNode): ShellNode[] | undefined {
  return node.kind === "nav" || node.kind === "group" ? node.children : undefined;
}

/** How many levels a row occupies counting itself (1 = no children). */
export function heightOf(node: ShellNode): number {
  const children = childrenOf(node) ?? [];
  return 1 + children.reduce((max, child) => Math.max(max, heightOf(child)), 0);
}

export interface Located {
  node: ShellNode;
  /** The parent's id, `null` at the top level. */
  parentId: string | null;
  index: number;
  /** 1 = top level. */
  depth: number;
}

export function locate(nodes: readonly ShellNode[], id: string, parentId: string | null = null, depth = 1): Located | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (node.id === id) return { node, parentId, index, depth };
    const children = childrenOf(node);
    if (children) {
      const found = locate(children, id, node.id, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** True when a row can hold other rows (a group, or a menu row that already has a submenu). */
export function isContainer(node: ShellNode): boolean {
  return node.kind === "group" || (node.kind === "nav" && node.children !== undefined);
}

/** The groups/menu rows a row could be moved into (for the keyboard "Move into…" menu). */
export function containersFor(nodes: readonly ShellNode[], movingId: string, region: TreeRegion): Array<{ id: string; label: string; depth: number }> {
  if (region === "dock") return [];
  const moving = locate(nodes, movingId);
  if (!moving) return [];
  const height = heightOf(moving.node);
  const out: Array<{ id: string; label: string; depth: number }> = [];
  const walk = (list: readonly ShellNode[], depth: number, insideMoving: boolean) => {
    for (const node of list) {
      const inside = insideMoving || node.id === movingId;
      if (!inside && isContainer(node) && depth + height <= SHELL_LAYOUT_MAX_DEPTH && node.id !== moving.parentId) {
        out.push({ id: node.id, label: nodeLabel(node), depth });
      }
      const children = childrenOf(node);
      if (children) walk(children, depth + 1, inside);
    }
  };
  walk(nodes, 1, false);
  return out;
}

/** The label a row shows (its own override, else the catalog's). */
export function nodeLabel(node: ShellNode | HeaderButton, catalogLabel?: (ref: string) => string | undefined): string {
  if (node.kind === "nav") return node.label ?? catalogLabel?.(liveRef(node.ref)) ?? node.ref;
  if (node.kind === "control") return node.control;
  return node.label;
}

// ── writing a tree (every verb returns a new array; the input is never mutated) ──

function mapTree(nodes: readonly ShellNode[], fn: (node: ShellNode) => ShellNode | null): ShellNode[] {
  const out: ShellNode[] = [];
  for (const node of nodes) {
    const next = fn(node);
    if (!next) continue;
    if (next.kind === "group") out.push({ ...next, children: mapTree(next.children, fn) });
    else if (next.kind === "nav" && next.children) {
      const children = mapTree(next.children, fn);
      const { children: _drop, ...rest } = next;
      out.push(children.length > 0 ? { ...rest, children } : rest);
    } else out.push(next);
  }
  return out;
}

/** A row id not yet used in the region. */
export function freshId(taken: Set<string>, base: string): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}~${n}`)) n += 1;
  return `${base}~${n}`;
}

/** A catalog entry as a row, carrying its default children down to the depth limit. */
export function rowForEntry(
  tree: CatalogTree,
  entryId: string,
  depth: number,
  taken: Set<string>,
  region: TreeRegion,
  idPrefix = "",
): ShellNode {
  const node = tree.byId.get(entryId);
  const id = freshId(taken, `${idPrefix}${entryId}`);
  taken.add(id);
  const kids = region === "sidebar" && depth < SHELL_LAYOUT_MAX_DEPTH ? (node?.children ?? []) : [];
  if (kids.length === 0) return { kind: "nav", id, ref: entryId };
  return {
    kind: "nav",
    id,
    ref: entryId,
    children: kids.map((child) => rowForEntry(tree, child.entry.id, depth + 1, taken, region, idPrefix)),
  };
}

/**
 * Tick a catalog entry: it is placed (with its default children) under its nearest placed ancestor, in
 * catalog order among its placed siblings; with no placed ancestor it goes to the top level. Already
 * placed → unchanged. The Dock takes it flat at the end, refused past the Dock limit.
 */
export function tickEntry(nodes: readonly ShellNode[], tree: CatalogTree, entryId: string, region: TreeRegion): ShellNode[] {
  if (placedRefs(nodes).has(entryId)) return [...nodes];
  const taken = allIds(nodes);
  if (region === "dock") {
    if (nodes.length >= SHELL_DOCK_MAX_ITEMS) return [...nodes];
    return [...nodes, rowForEntry(tree, entryId, 1, taken, "dock", "dock.")];
  }
  // The nearest ancestor that is placed and can still take a child at its depth.
  let parentRef = tree.byId.get(entryId)?.entry.parentId ?? null;
  let host: Located | null = null;
  while (parentRef) {
    const found = findByRef(nodes, parentRef);
    if (found && found.depth < SHELL_LAYOUT_MAX_DEPTH) {
      host = found;
      break;
    }
    parentRef = tree.byId.get(parentRef)?.entry.parentId ?? null;
  }
  const depth = host ? host.depth + 1 : 1;
  const row = rowForEntry(tree, entryId, depth, taken, region);
  const siblingOrder = (host ? tree.byId.get(liveRef((host.node as { ref: string }).ref))?.children : tree.main) ?? [];
  const order = new Map(siblingOrder.map((n, i) => [n.entry.id, i]));
  const insert = (list: readonly ShellNode[]): ShellNode[] => {
    const mine = order.get(entryId);
    if (mine === undefined) return [...list, row];
    const at = list.findIndex((n) => n.kind === "nav" && (order.get(liveRef(n.ref)) ?? -1) > mine);
    return at === -1 ? [...list, row] : [...list.slice(0, at), row, ...list.slice(at)];
  };
  if (!host) return insert(nodes);
  const hostId = host.node.id;
  return mapTree(nodes, (node) => {
    if (node.id !== hostId) return node;
    if (node.kind === "group") return { ...node, children: insert(node.children) };
    if (node.kind === "nav") return { ...node, children: insert(node.children ?? []) };
    return node;
  });
}

/** The first nav row placing `ref`. */
export function findByRef(nodes: readonly ShellNode[], ref: string, parentId: string | null = null, depth = 1): Located | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (node.kind === "nav" && liveRef(node.ref) === ref) return { node, parentId, index, depth };
    const children = childrenOf(node);
    if (children) {
      const found = findByRef(children, ref, node.id, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Untick: every row placing `ref` leaves, with whatever it held. */
export function untickEntry(nodes: readonly ShellNode[], ref: string): ShellNode[] {
  return mapTree(nodes, (node) => (node.kind === "nav" && liveRef(node.ref) === ref ? null : node));
}

/** The checkbox state of a catalog entry: placed, not placed but some descendant is, or neither. */
export type TickState = "on" | "partial" | "off";

export function tickState(tree: CatalogTree, placed: Set<string>, entryId: string): TickState {
  if (placed.has(entryId)) return "on";
  const node = tree.byId.get(entryId);
  const anyBelow = (n: CatalogTreeNode | undefined): boolean => (n?.children ?? []).some((c) => placed.has(c.entry.id) || anyBelow(c));
  return anyBelow(node) ? "partial" : "off";
}

export function removeNode(nodes: readonly ShellNode[], id: string): ShellNode[] {
  return mapTree(nodes, (node) => (node.id === id ? null : node));
}

/** Update one row's own fields (label / icon / href…); `label: ""` clears a nav row's override. */
export function updateNode(nodes: readonly ShellNode[], id: string, patch: { label?: string; icon?: ShellIconName; href?: string }): ShellNode[] {
  return mapTree(nodes, (node) => {
    if (node.id !== id) return node;
    const next = { ...node } as ShellNode & { label?: string; icon?: ShellIconName; href?: string };
    if (patch.label !== undefined) {
      const label = patch.label.trim();
      if (node.kind === "nav") {
        if (label) next.label = label;
        else delete next.label;
      } else if (label) next.label = label;
    }
    if (patch.icon !== undefined) next.icon = patch.icon;
    if (patch.href !== undefined && (node.kind === "link" || node.kind === "record")) {
      const href = patch.href.trim();
      if (href) next.href = href;
    }
    return next as ShellNode;
  });
}

/** Where a dragged row lands. `inside` appends to a container; `top` appends at the top level. */
export type DropTarget = { kind: "before" | "after" | "inside"; id: string } | { kind: "top" };

/** True when `moveNode` would accept the move (the drag preview and the keyboard menu both ask). */
export function canMove(nodes: readonly ShellNode[], id: string, target: DropTarget, region: TreeRegion): boolean {
  return moveNode(nodes, id, target, region) !== null;
}

/**
 * Move a row (with everything under it). Refused (null) when the target is the row itself or inside it,
 * when the result would be deeper than three levels, or when the Dock would gain a submenu.
 */
export function moveNode(nodes: readonly ShellNode[], id: string, target: DropTarget, region: TreeRegion): ShellNode[] | null {
  const moving = locate(nodes, id);
  if (!moving) return null;
  if (target.kind !== "top") {
    if (target.id === id) return null;
    if (allIds(childrenOf(moving.node)).has(target.id)) return null;
  }
  let depth = 1;
  if (target.kind === "inside") {
    if (region === "dock") return null;
    const host = locate(nodes, target.id);
    if (!host || !(host.node.kind === "group" || host.node.kind === "nav")) return null;
    depth = host.depth + 1;
  } else if (target.kind !== "top") {
    const anchor = locate(nodes, target.id);
    if (!anchor) return null;
    depth = anchor.depth;
  }
  if (depth + heightOf(moving.node) - 1 > SHELL_LAYOUT_MAX_DEPTH) return null;
  const without = removeNode(nodes, id);
  const row = moving.node;
  if (target.kind === "top") return [...without, row];
  const place = (list: readonly ShellNode[]): ShellNode[] => {
    const out: ShellNode[] = [];
    for (const node of list) {
      if (target.kind === "before" && node.id === target.id) out.push(row);
      if (target.kind === "inside" && node.id === target.id) {
        if (node.kind === "group") out.push({ ...node, children: [...node.children, row] });
        else if (node.kind === "nav") out.push({ ...node, children: [...(node.children ?? []), row] });
        else out.push(node);
      } else if (node.kind === "group") out.push({ ...node, children: place(node.children) });
      else if (node.kind === "nav" && node.children) out.push({ ...node, children: place(node.children) });
      else out.push(node);
      if (target.kind === "after" && node.id === target.id) out.push(row);
    }
    return out;
  };
  return place(without);
}

/** Move a row one place up or down among its siblings (the keyboard twin of a drag). */
export function nudgeNode(nodes: readonly ShellNode[], id: string, step: -1 | 1, region: TreeRegion): ShellNode[] {
  const at = locate(nodes, id);
  if (!at) return [...nodes];
  const siblings = at.parentId ? (childrenOf(locate(nodes, at.parentId)!.node) ?? []) : nodes;
  const neighbor = siblings[at.index + step];
  if (!neighbor) return [...nodes];
  return moveNode(nodes, id, { kind: step < 0 ? "before" : "after", id: neighbor.id }, region) ?? [...nodes];
}

// ── adding your own rows ─────────────────────────────────────────────────────

let counter = 0;
/** A new id for a person-made row (time + counter; unique within the region by `freshId`). */
export function newRowId(kind: string, taken: Set<string>): string {
  counter += 1;
  return freshId(taken, `${kind}.${Date.now().toString(36)}${counter.toString(36)}`);
}

export type NewRow =
  | { kind: "group"; label: string; icon?: ShellIconName }
  | { kind: "link"; label: string; href: string; icon?: ShellIconName; newTab?: boolean }
  | { kind: "record"; label: string; token: string; recordId: string; href: string; icon?: ShellIconName }
  | { kind: "launchpad"; key: string; label: string; icon?: ShellIconName };

export function makeRow(input: NewRow, taken: Set<string>): ShellNode {
  const id = newRowId(input.kind, taken);
  switch (input.kind) {
    case "group":
      return { kind: "group", id, label: input.label, icon: input.icon ?? "Folder", children: [] };
    case "link":
      return { kind: "link", id, label: input.label, icon: input.icon ?? "Link2", href: input.href, ...(input.newTab ? { newTab: true } : {}) };
    case "record":
      return { kind: "record", id, label: input.label, token: input.token, recordId: input.recordId, href: input.href, ...(input.icon ? { icon: input.icon } : {}) };
    case "launchpad":
      return { kind: "launchpad", id, key: input.key, label: input.label, ...(input.icon ? { icon: input.icon } : {}) };
  }
}

/** Add a row at the top level (end) or inside a container. Dock: flat and capped; groups refused. */
export function addRow(nodes: readonly ShellNode[], input: NewRow, region: TreeRegion, intoId: string | null = null): ShellNode[] {
  if (region === "dock" && (input.kind === "group" || nodes.length >= SHELL_DOCK_MAX_ITEMS)) return [...nodes];
  const row = makeRow(input, allIds(nodes));
  if (!intoId || region === "dock") return [...nodes, row];
  return moveNode([...nodes, row], row.id, { kind: "inside", id: intoId }, region) ?? [...nodes, row];
}

/** Adds a whole catalog entry somewhere in particular (Add to my menu → "into a group"). */
export function addEntryInto(nodes: readonly ShellNode[], tree: CatalogTree, entryId: string, region: TreeRegion, intoId: string | null): ShellNode[] {
  if (region === "dock") return tickEntry(nodes, tree, entryId, "dock");
  const taken = allIds(nodes);
  const host = intoId ? locate(nodes, intoId) : null;
  const row = rowForEntry(tree, entryId, host ? host.depth + 1 : 1, taken, region);
  if (!host) return [...nodes, row];
  return moveNode([...nodes, row], row.id, { kind: "inside", id: host.node.id }, region) ?? [...nodes, row];
}

// ── header ───────────────────────────────────────────────────────────────────

export type NewHeaderButton =
  | { kind: "nav"; ref: string }
  | { kind: "link"; label: string; href: string; icon?: ShellIconName; newTab?: boolean }
  | { kind: "launchpad"; key: string; label: string; icon?: ShellIconName }
  | { kind: "mandate"; label: string; mandateKey: string; icon?: ShellIconName };

export function addHeaderButton(buttons: readonly HeaderButton[], input: NewHeaderButton): HeaderButton[] {
  const taken = new Set(buttons.map((b) => b.id));
  switch (input.kind) {
    case "nav":
      if (buttons.some((b) => b.kind === "nav" && b.ref === input.ref)) return [...buttons];
      return [...buttons, { kind: "nav", id: freshId(taken, `header.${input.ref}`), ref: input.ref }];
    case "link":
      return [...buttons, { kind: "link", id: newRowId("header.link", taken), label: input.label, icon: input.icon ?? "Link2", href: input.href, ...(input.newTab ? { newTab: true } : {}) }];
    case "launchpad":
      return [...buttons, { kind: "launchpad", id: newRowId("header.launchpad", taken), key: input.key, label: input.label, ...(input.icon ? { icon: input.icon } : {}) }];
    case "mandate":
      return [...buttons, { kind: "mandate", id: newRowId("header.mandate", taken), label: input.label, icon: input.icon ?? "Zap", mandateKey: input.mandateKey }];
  }
}

/** Header controls that can never be removed (Search, Notifications). */
export function isLockedHeaderButton(button: HeaderButton, reserved: readonly string[]): boolean {
  return button.kind === "control" && reserved.includes(button.control);
}

export function moveInList<T extends { id: string }>(list: readonly T[], id: string, toIndex: number): T[] {
  const from = list.findIndex((item) => item.id === id);
  if (from === -1) return [...list];
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(toIndex, out.length)), 0, item!);
  return out;
}

// ── the body ─────────────────────────────────────────────────────────────────

/** A fresh body reviewed against today's catalog (the editor's starting point when nothing is saved). */
export function emptyBody(): ShellLayoutBody {
  return { schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: SHELL_CATALOG_VERSION };
}

/** Whether two bodies say the same thing (the Save button is quiet when nothing changed). */
export function sameBody(a: ShellLayoutBody | null, b: ShellLayoutBody | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
