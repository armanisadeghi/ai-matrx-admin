/**
 * THE TIER-0 GENERATOR for the Run Surface.
 *
 * Its old 24-column compaction engine (compactLayout / applyPlacement /
 * findFreeSlot / mobileOrderOf) was deleted in lane W (2026-10-22): the run
 * page flows on THE ONE GRID ENGINE, design-system GridCanvas line mode
 * (`./grid.ts`), and the builder derives positions through it.
 *
 * Home to THE TIER-0 GENERATOR (`autoLayoutSurface`, PLAN §4.2-1):
 * a workflow definition in, the default RunSurfaceConfig out — SUMMARIZE,
 * NEVER MIRROR THE GRAPH.
 *
 * No React, no Redux, no side effects.
 */

import {
  GRID_COLUMNS,
  SURFACE_SCHEMA_VERSION,
  type Readout,
  type ReadoutSource,
  type RunSurfaceConfig,
} from "./config";
import type { WorkflowDefinitionLike } from "../trigger-points";

// ── THE TIER-0 GENERATOR (PLAN §4.2-1 — summarize, never mirror the graph) ──

export interface AutoLayoutOptions {
  /** Node ids that must get their own readout regardless of heuristics. */
  promote?: string[];
  /** deliverable node id when known (gets prominence). */
  deliverableNodeId?: string;
}

/** The lane budget: never more than this many promoted readouts. */
const PROMOTION_CAP = 12;

type DefinitionNode = WorkflowDefinitionLike["nodes"][number];

function specTypeOf(node: DefinitionNode): string {
  const specType = node.data?.spec_type;
  return typeof specType === "string" ? specType : "";
}

function hasOutputKind(node: DefinitionNode): boolean {
  const outputKind = node.data?.output_kind;
  return typeof outputKind === "string" && outputKind.length > 0;
}

function isAiOrChild(node: DefinitionNode): boolean {
  const specType = specTypeOf(node);
  return specType.startsWith("ai.") || specType === "subgraph.call";
}

/**
 * THE TIER-0 GENERATOR. From a workflow definition, produce the default
 * RunSurfaceConfig: one full-width progressRail on top (auto-layout is the
 * one sanctioned rail-at-top: nothing is above it), promoted readouts for
 * the nodes users actually watch (terminal / deliverable, authored
 * output_kind, ai.* and child workflows, plus explicit promotions), capped
 * at the 12-lane budget, tiled 2-up when more than 3. Deterministic and
 * silent; readout ids are stable (`auto:<nodeId>` / `auto:rail`) so builder
 * edits can diff against regenerations.
 */
export function autoLayoutSurface(
  definition: WorkflowDefinitionLike,
  options?: AutoLayoutOptions,
): RunSurfaceConfig {
  const nodes = definition.nodes;
  const nodeIds = new Set(nodes.map((n) => n.id));

  const hasOutgoing = new Set(definition.edges.map((e) => e.source));
  const terminalIds = new Set(
    nodes.filter((n) => !hasOutgoing.has(n.id)).map((n) => n.id),
  );

  const deliverableNodeId =
    options?.deliverableNodeId !== undefined && nodeIds.has(options.deliverableNodeId)
      ? options.deliverableNodeId
      : terminalIds.size === 1
        ? [...terminalIds][0]
        : undefined;

  const explicitPromote = new Set(
    (options?.promote ?? []).filter((id) => nodeIds.has(id)),
  );

  const small = nodes.length > 0 && nodes.length <= 3;

  // Rank each candidate for the cap: terminal + deliverable first, then
  // explicit promotions, then authored output_kind, then ai.*/child runs.
  // Within a rank, definition (graph) order — deterministic, no logging.
  const rankOf = (node: DefinitionNode): number | null => {
    if (node.id === deliverableNodeId || terminalIds.has(node.id)) return 0;
    if (explicitPromote.has(node.id)) return 1;
    if (hasOutputKind(node)) return 2;
    if (isAiOrChild(node)) return 3;
    if (small) return 4;
    return null;
  };

  const candidates = nodes
    .map((node, index) => ({ node, index, rank: rankOf(node) }))
    .filter((c): c is { node: DefinitionNode; index: number; rank: number } => c.rank !== null);
  candidates.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.index - b.index));
  const promoted = candidates
    .slice(0, PROMOTION_CAP)
    // Tile in graph order regardless of promotion rank.
    .sort((a, b) => a.index - b.index)
    .map((c) => c.node);

  const railHeight = small ? 4 : 8;
  const rail: Readout = {
    id: "auto:rail",
    source: { kind: "progressRail" },
    pos: { x: 0, y: 0, w: GRID_COLUMNS, h: railHeight },
  };

  const twoUp = promoted.length > 3;
  const boxWidth = twoUp ? GRID_COLUMNS / 2 : GRID_COLUMNS;
  const boxHeight = 8;
  const readouts: Readout[] = [rail];
  promoted.forEach((node, i) => {
    const col = twoUp ? i % 2 : 0;
    const row = twoUp ? Math.floor(i / 2) : i;
    const source: ReadoutSource =
      specTypeOf(node) === "subgraph.call"
        ? { kind: "childRun", nodeId: node.id }
        : { kind: "node", nodeId: node.id };
    readouts.push({
      id: `auto:${node.id}`,
      source,
      pos: {
        x: col * boxWidth,
        y: railHeight + row * boxHeight,
        w: boxWidth,
        h: boxHeight,
      },
    });
  });

  return {
    schemaVersion: SURFACE_SCHEMA_VERSION,
    ...(deliverableNodeId !== undefined ? { deliverableNodeId } : {}),
    pages: [],
    readouts,
  };
}
