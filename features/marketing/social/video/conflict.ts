/**
 * A save the server refused because the video moved on: the person's pending edit is moved onto the new head with the
 * package's own rebase rules (`rebasePatch`). Path-disjoint = kept and saved; any overlap = both versions are shown and
 * the person chooses. Nothing is dropped silently.
 */

import { formatPath, rebasePatch, type AppliedPatch, type Composition, type Patch, type PatchOp, type PatchPath } from "@ai-matrx/media/video";

export type RebaseOutcome =
  | { kind: "clean"; ops: PatchOp[]; head: number }
  | { kind: "overlap"; head: number; paths: PatchPath[] }
  | { kind: "unreadable"; head: number };

/** The `AppliedPatch` list the package rebases over, from the stored version rows (oldest first). */
export function historyFromRows(rows: ReadonlyArray<{ version: number; patch: unknown }>): AppliedPatch[] {
  const out: AppliedPatch[] = [];
  for (const r of rows) {
    const p = r.patch as { baseVersion?: unknown; ops?: unknown } | null;
    if (!p || typeof p.baseVersion !== "number" || !Array.isArray(p.ops)) continue;
    // The package reads `version` (the document version this patch produced) to check the history is contiguous.
    out.push({ version: r.version, baseVersion: p.baseVersion, ops: p.ops as PatchOp[] } as AppliedPatch);
  }
  return out;
}

/** Move `ops` (made on `baseVersion`) onto `head`. `rows` = every stored version after `baseVersion`. */
export function rebasePending(
  ops: PatchOp[],
  baseVersion: number,
  rows: ReadonlyArray<{ version: number; patch: unknown }>,
  head: number,
): RebaseOutcome {
  const history = historyFromRows(rows);
  // A gap (a version with no readable patch) fails inside the package's own contiguity check: never a clean rebase.
  const moved = rebasePatch({ baseVersion, ops } as Patch, history, head);
  if (moved.ok) return { kind: "clean", ops: moved.patch.ops as PatchOp[], head };
  if (moved.kind === "conflict") return { kind: "overlap", head, paths: (moved.overlaps ?? []).map((o) => o.path) };
  return { kind: "unreadable", head };
}

/** What the document holds at a path (ids in the path find array members); null when it is not plain text. */
export function valueAtPath(doc: Composition, path: PatchPath): string | null {
  let cur: unknown = doc;
  for (const seg of path) {
    if (cur == null) return null;
    if (typeof seg === "string") {
      cur = (cur as Record<string, unknown>)[seg];
    } else if (Array.isArray(cur)) {
      cur = cur.find((x) => (x as { id?: unknown })?.id === seg.id);
    } else {
      return null;
    }
  }
  return typeof cur === "string" || typeof cur === "number" ? String(cur) : null;
}

/** One line of what the other writer left at the overlapping place. */
export function describeTheirs(headDoc: Composition, paths: PatchPath[]): string {
  for (const p of paths) {
    const v = valueAtPath(headDoc, p);
    if (v) return `"${v}"`;
  }
  return paths[0] ? formatPath(paths[0]) : "a newer version";
}
