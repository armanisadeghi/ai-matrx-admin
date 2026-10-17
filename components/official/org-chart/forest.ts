// components/official/org-chart/forest.ts
//
// Build an <OrgChart> forest from flat "who is my parent" rows. Pure — no React,
// no DOM — so its two guarantees are unit-tested on their own:
//
//  1. 🚨 A CYCLE NEVER LOOPS THE BUILD, AND NOBODY IS DROPPED. A→B→A is possible
//     in real data (HR: concurrent secondary assignments). The walk carries an
//     explicit on-path set and refuses to descend into a row already on the
//     current path; the refused link is reported in `cycleLinks` so the caller
//     can badge it. A pure loop with no way in is entered at its first row (in
//     sort order), so every row appears in the forest exactly once.
//
//  2. 🚨 ORDER IS A FUNCTION OF THE ROWS, NOT OF THE FETCH. With `sortKey`,
//     siblings (and roots) sort by it, then by id — so a row under the same
//     parent in two loads lands in the same relative slot in both, whatever
//     order the rows arrived in. That is what keeps people in place when an HR
//     chart's as-of date changes. Remembering last render's positions instead
//     was rejected: two people opening the same URL would see different charts.
//     Without `sortKey` the input order is kept (callers that rank roots).

import type { OrgChartTreeNode } from "./layout";

export interface ParentForestOptions<R> {
  /** Stable, unique per row. */
  id: (row: R) => string;
  /** The parent row's id. A parent not in `rows`, or the row itself, makes it a root. */
  parentId: (row: R) => string | null;
  /** Siblings and roots sort by this (then by id). Omit to keep input order. */
  sortKey?: (row: R) => string;
  /** Kind of the link from a parent (roots get null). */
  edgeKind?: string;
}

export interface ParentForest<R> {
  roots: OrgChartTreeNode<R>[];
  /** Parent links the build refused to follow because they close a loop. */
  cycleLinks: { parentId: string; childId: string }[];
}

export function buildParentForest<R>(rows: readonly R[], o: ParentForestOptions<R>): ParentForest<R> {
  const byId = new Map<string, R>();
  for (const row of rows) byId.set(o.id(row), row);

  const childrenOf = new Map<string, string[]>();
  const rootIds: string[] = [];
  for (const [id, row] of byId) {
    const parent = o.parentId(row);
    if (parent && parent !== id && byId.has(parent)) {
      const list = childrenOf.get(parent);
      if (list) list.push(id);
      else childrenOf.set(parent, [id]);
    } else {
      rootIds.push(id);
    }
  }

  const sortKey = o.sortKey;
  const order = (ids: string[]): string[] => {
    if (!sortKey) return ids;
    const key = new Map(ids.map((id) => [id, sortKey(byId.get(id) as R)]));
    return [...ids].sort((a, b) => {
      const byKey = (key.get(a) ?? "").localeCompare(key.get(b) ?? "");
      return byKey !== 0 ? byKey : a < b ? -1 : a > b ? 1 : 0;
    });
  };

  const placed = new Set<string>();
  const cycleLinks: ParentForest<R>["cycleLinks"] = [];

  const walk = (id: string, isRoot: boolean, onPath: Set<string>): OrgChartTreeNode<R> => {
    placed.add(id);
    onPath.add(id);
    const children: OrgChartTreeNode<R>[] = [];
    for (const childId of order(childrenOf.get(id) ?? [])) {
      // THE CYCLE GUARD: never descend into a row already on this path.
      if (onPath.has(childId) || placed.has(childId)) {
        cycleLinks.push({ parentId: id, childId });
        continue;
      }
      children.push(walk(childId, false, onPath));
    }
    onPath.delete(id);
    return {
      key: id,
      edgeKind: isRoot ? null : (o.edgeKind ?? null),
      data: byId.get(id) as R,
      children,
    };
  };

  const roots = order(rootIds).map((id) => walk(id, true, new Set()));

  // Rows the walk never reached sit in a loop with no way in. Enter each loop
  // at its first row so nobody is silently dropped.
  for (const id of order([...byId.keys()])) {
    if (placed.has(id)) continue;
    roots.push(walk(id, true, new Set()));
  }

  return { roots, cycleLinks };
}
