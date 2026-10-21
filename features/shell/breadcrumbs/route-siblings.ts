// features/shell/breadcrumbs/route-siblings.ts
//
// Siblings of a level from the App Router's directory tree (utils/route-discovery/app-tree.generated.json,
// written at every build). The tree is imported ON DEMAND when a crumb's dropdown first opens, so no
// page pays for it (load law: nothing until engaged).

import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import type { CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";

type Tree = { [name: string]: Tree | 1 };

const isGroup = (k: string) => k.startsWith("(") && k.endsWith(")");
const isDynamic = (k: string) => k.startsWith("[");
const isPrivate = (k: string) => k.startsWith("_") || k.startsWith("@") || k === "api";
const isPage = (k: string, v: Tree | 1) => v === 1 && /^page\./.test(k);

/** Folders at one address, merging route groups `(core)`, `(admin)`… that add no address segment. */
function foldersAt(roots: Tree[]): Tree[] {
  const out: Tree[] = [];
  for (const root of roots) {
    out.push(root);
    for (const [k, v] of Object.entries(root)) if (isGroup(k) && v !== 1) out.push(...foldersAt([v]));
  }
  return out;
}

function descend(roots: Tree[], segment: string): Tree[] {
  const next: Tree[] = [];
  for (const folder of foldersAt(roots)) {
    const exact = folder[segment];
    if (exact && exact !== 1) next.push(exact);
  }
  if (next.length > 0) return next;
  // A record address: the dynamic folder (`[id]`) stands for any one segment.
  for (const folder of foldersAt(roots)) {
    for (const [k, v] of Object.entries(folder)) {
      if (isDynamic(k) && !k.startsWith("[[") && !k.startsWith("[...") && v !== 1) next.push(v);
    }
  }
  return next;
}

/** Page folders directly under `parentHref` (static, with a page of their own). */
export async function routeSiblings(
  parentHref: string,
  activeSegment: string,
): Promise<CrumbOption[]> {
  const { default: generated } = await import("@/utils/route-discovery/app-tree.generated.json");
  let level: Tree[] = [generated as unknown as Tree];
  for (const seg of parentHref.split("/").filter(Boolean)) {
    level = descend(level, seg);
    if (level.length === 0) return [];
  }
  const names = new Map<string, true>();
  for (const folder of foldersAt(level)) {
    for (const [k, v] of Object.entries(folder)) {
      if (v === 1 || isGroup(k) || isDynamic(k) || isPrivate(k)) continue;
      if (Object.entries(v).some(([fk, fv]) => isPage(fk, fv))) names.set(k, true);
    }
  }
  const base = parentHref === "/" ? "" : parentHref;
  return [...names.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      label: humanizeIdentifier(name) || name,
      href: `${base}/${name}`,
      active: name === activeSegment,
    }));
}
