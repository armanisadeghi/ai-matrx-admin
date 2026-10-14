// features/mandates/feature-intelligence/resolve-destination.ts
//
// SERVER: where an Intelligence link lands, read from data. A job link
// (`?mandate=<key>`) opens the job's home — its registry node, or its lane — or
// the research topic's own page when the link carries `topicId` and the node is
// Research or below it. A page slug opens itself when it is a node or a lane; a
// code feature id (`podcast`) opens the deepest node all its declared jobs share.

import { createClient } from "@/utils/supabase/server";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import { declaredPlacesFor } from "./registry";
import { RESEARCH_NODE, topicIntelligenceHref } from "./hrefs";
import { readPlacement, readTaxonomyNodes } from "./placement-data";
import {
  buildTree,
  commonAncestor,
  homeOf,
  isLane,
  isWithin,
  type Tree,
} from "./placement-model";

export async function readServerTree(): Promise<Tree> {
  return buildTree(await readTaxonomyNodes(await createClient()));
}

function query(params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString();
  return search ? `?${search}` : "";
}

/** The home (node slug or lane id) of one job for this viewer, or null when they cannot see it. */
export async function homeOfKey(
  mandateKey: AnyMandateKey,
  viewerId: string | null,
): Promise<string | null> {
  const [row] = await readPlacement(await createClient(), [mandateKey]);
  return row ? homeOf(row, viewerId) : null;
}

/** Where `/intelligence?mandate=<key>&…` sends the viewer. */
export async function mandateDestination(
  mandateKey: AnyMandateKey,
  context: Record<string, string>,
  viewerId: string | null,
  tree: Tree,
): Promise<string> {
  const home = await homeOfKey(mandateKey, viewerId);
  // A job this viewer cannot see: the directory, searching for it.
  if (!home) return `/intelligence${query({ q: mandateKey })}`;
  const { topicId, ...rest } = context;
  if (topicId && !isLane(home) && isWithin(tree, home, RESEARCH_NODE)) {
    return topicIntelligenceHref(topicId, new URLSearchParams({ mandate: mandateKey, ...rest }));
  }
  return `/intelligence/${encodeURIComponent(home)}${query({ mandate: mandateKey, ...context })}`;
}

export type SlugResolution =
  | { kind: "page" }
  | { kind: "redirect"; slug: string | null }
  | { kind: "unknown" };

/** A `/intelligence/<slug>` segment: a page, a code feature id to forward, or unknown. */
export async function resolveSlug(
  slug: string,
  tree: Tree,
  viewerId: string | null,
): Promise<SlugResolution> {
  if (isLane(slug) || tree.bySlug.has(slug)) return { kind: "page" };
  const declared = declaredPlacesFor(slug);
  if (!declared) return { kind: "unknown" };
  const keys = [...new Set(declared.places.flatMap((place) => place.mandateKeys))];
  if (keys.length === 0) return { kind: "redirect", slug: null };
  const rows = await readPlacement(await createClient(), keys);
  const homes = rows.map((row) => homeOf(row, viewerId)).filter((home) => !isLane(home));
  return { kind: "redirect", slug: commonAncestor(tree, homes) };
}
