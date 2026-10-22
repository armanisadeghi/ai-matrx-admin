// features/education/media/mindmap/nodeCitations.ts
//
// Give every mind-map node the citation of the passage it came from, in the
// node's own `metadata.citation` (the generic bag the diagram block preserves,
// like `linkDiagramToCards`' card link). A node click then opens that page /
// place through the existing citation machinery, not just the whole Source.
// Nodes that match no passage stay uncited. Never throws.

import type { SourceCitation } from "@/features/education/trust/types";
import { citationForItem, stripChunkMarkersDeep } from "@/features/education/create/chunkCitations";
import type { GroundedChunk } from "@/features/education/create/groundedMaterial";

interface SpecNode {
  label?: unknown;
  description?: unknown;
  details?: unknown;
  metadata?: Record<string, unknown> | null;
  [k: string]: unknown;
}

function nodeText(node: SpecNode): string {
  return [node.label, node.description, node.details]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ");
}

export function citeDiagramNodes<T extends { nodes?: unknown[] } | Record<string, unknown>>(
  spec: T,
  chunks: readonly GroundedChunk[],
): { spec: T; citedCount: number } {
  const nodes = (spec as { nodes?: unknown[] }).nodes;
  if (!Array.isArray(nodes)) return { spec, citedCount: 0 };
  let citedCount = 0;
  const cited = nodes.map((raw) => {
    // The generator reads `### Chunk` markers; none of that text belongs in a node.
    const node = stripChunkMarkersDeep({ ...(raw as SpecNode) });
    const citation = chunks.length === 0 ? null : citationForItem(node, nodeText(node), chunks);
    if (!citation) return node;
    citedCount += 1;
    node.metadata = { ...(node.metadata ?? {}), citation };
    return node;
  });
  return { spec: { ...(spec as object), nodes: cited } as T, citedCount };
}

/** The citation a node carries (stamped above), or null. */
export function nodeCitationOf(node: { metadata?: unknown } | null | undefined): SourceCitation | null {
  const c = (node?.metadata as { citation?: unknown } | null | undefined)?.citation;
  return c && typeof c === "object" && typeof (c as SourceCitation).sourceId === "string" ? (c as SourceCitation) : null;
}
