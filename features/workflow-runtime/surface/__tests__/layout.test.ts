/**
 * THE TIER-0 GENERATOR
 * (autoLayoutSurface — summarize, never mirror the graph).
 */

import { autoLayoutSurface } from "../layout";
import { SURFACE_SCHEMA_VERSION, validateSurfaceConfig } from "../config";
import type { WorkflowDefinitionLike } from "../../trigger-points";

// ── autoLayoutSurface ───────────────────────────────────────────────────────

function node(
  id: string,
  data?: { spec_type?: string; label?: string; output_kind?: string },
): WorkflowDefinitionLike["nodes"][number] {
  return { id, data };
}

function chainEdges(ids: string[]): WorkflowDefinitionLike["edges"] {
  return ids.slice(0, -1).map((source, i) => ({
    id: `e${i}`,
    source,
    target: ids[i + 1],
  }));
}

describe("autoLayoutSurface", () => {
  it("3-node linear workflow: rail (h=4) + every node promoted full-width, deliverable inferred", () => {
    const def: WorkflowDefinitionLike = {
      nodes: [node("n1"), node("n2"), node("n3")],
      edges: chainEdges(["n1", "n2", "n3"]),
    };
    const config = autoLayoutSurface(def);

    expect(config.schemaVersion).toBe(SURFACE_SCHEMA_VERSION);
    expect(config.pages).toEqual([]);
    expect(config.deliverableNodeId).toBe("n3"); // exactly one terminal

    const [rail, ...promoted] = config.readouts;
    expect(rail.id).toBe("auto:rail");
    expect(rail.source).toEqual({ kind: "progressRail" });
    expect(rail.pos).toEqual({ x: 0, y: 0, w: 24, h: 4 }); // small → h=4

    // Every node promoted, full width, stacked below the rail in graph order.
    expect(promoted.map((r) => r.id)).toEqual(["auto:n1", "auto:n2", "auto:n3"]);
    expect(promoted.map((r) => r.pos)).toEqual([
      { x: 0, y: 4, w: 24, h: 8 },
      { x: 0, y: 12, w: 24, h: 8 },
      { x: 0, y: 20, w: 24, h: 8 },
    ]);
    for (const r of promoted) expect(r.source.kind).toBe("node");

    expect(validateSurfaceConfig(config)).toEqual([]);
  });

  it("20-node graph: rail + bounded promotion (terminals, ai.*, subgraph.call as childRun), no deliverable with 2 terminals", () => {
    const chain = Array.from({ length: 18 }, (_, i) => `n${i + 1}`);
    const nodes = [
      ...chain.map((id) =>
        id === "n5" || id === "n6" || id === "n7"
          ? node(id, { spec_type: "ai.chat" })
          : id === "n10"
            ? node(id, { spec_type: "subgraph.call" })
            : node(id, { spec_type: "code.run" }),
      ),
      node("n19"),
      node("n20"),
    ];
    const edges = [
      ...chainEdges(chain),
      { id: "t1", source: "n18", target: "n19" },
      { id: "t2", source: "n18", target: "n20" },
    ];
    const config = autoLayoutSurface({ nodes, edges });

    // Two terminals → no inferred deliverable.
    expect(config.deliverableNodeId).toBeUndefined();

    const rail = config.readouts[0];
    expect(rail.id).toBe("auto:rail");
    expect(rail.pos).toEqual({ x: 0, y: 0, w: 24, h: 8 });

    const promoted = config.readouts.slice(1);
    expect(promoted.map((r) => r.id).sort()).toEqual(
      ["auto:n10", "auto:n19", "auto:n20", "auto:n5", "auto:n6", "auto:n7"].sort(),
    );

    // Graph-order tiling, 2 per row at w=12/h=8 (promoted > 3).
    expect(promoted.map((r) => r.id)).toEqual([
      "auto:n5",
      "auto:n6",
      "auto:n7",
      "auto:n10",
      "auto:n19",
      "auto:n20",
    ]);
    expect(promoted[0].pos).toEqual({ x: 0, y: 8, w: 12, h: 8 });
    expect(promoted[1].pos).toEqual({ x: 12, y: 8, w: 12, h: 8 });
    expect(promoted[2].pos).toEqual({ x: 0, y: 16, w: 12, h: 8 });

    // subgraph.call → childRun source; everything else → node source.
    const subgraph = promoted.find((r) => r.id === "auto:n10");
    expect(subgraph?.source).toEqual({ kind: "childRun", nodeId: "n10" });
    const ai = promoted.find((r) => r.id === "auto:n5");
    expect(ai?.source).toEqual({ kind: "node", nodeId: "n5" });

    expect(validateSurfaceConfig(config)).toEqual([]);
  });

  it("respects the deliverableNodeId option and options.promote", () => {
    const ids = Array.from({ length: 6 }, (_, i) => `n${i + 1}`);
    const def: WorkflowDefinitionLike = {
      nodes: ids.map((id) => node(id, { spec_type: "code.run" })),
      edges: chainEdges(ids),
    };
    const config = autoLayoutSurface(def, {
      deliverableNodeId: "n4",
      promote: ["n2", "not-a-node"],
    });
    expect(config.deliverableNodeId).toBe("n4");
    const ids2 = config.readouts.map((r) => r.id);
    expect(ids2).toContain("auto:n2"); // explicit promotion
    expect(ids2).toContain("auto:n4"); // deliverable
    expect(ids2).toContain("auto:n6"); // terminal
    expect(ids2).not.toContain("auto:not-a-node");
  });

  it("caps promotion at 12, preferring terminal + deliverable over output_kind order", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `n${i + 1}`);
    const def: WorkflowDefinitionLike = {
      nodes: ids.map((id) => node(id, { output_kind: "text" })),
      edges: chainEdges(ids), // n20 is the sole terminal (→ deliverable)
    };
    const config = autoLayoutSurface(def);

    const promoted = config.readouts.slice(1);
    expect(promoted).toHaveLength(12);
    expect(config.deliverableNodeId).toBe("n20");

    const promotedIds = promoted.map((r) => r.id);
    // Terminal/deliverable is protected by the cap; output_kind fills the
    // rest in graph order (n1..n11), so late middles fall off.
    expect(promotedIds).toContain("auto:n20");
    expect(promotedIds).toContain("auto:n1");
    expect(promotedIds).toContain("auto:n11");
    expect(promotedIds).not.toContain("auto:n12");
    expect(promotedIds).not.toContain("auto:n19");

    // Tiling is still graph order even though n20 outranked n12+.
    expect(promotedIds[promotedIds.length - 1]).toBe("auto:n20");
    expect(validateSurfaceConfig(config)).toEqual([]);
  });

  it("ignores an empty-string output_kind", () => {
    const def: WorkflowDefinitionLike = {
      nodes: [
        node("a", { output_kind: "" }),
        node("b", { output_kind: "seo.brief" }),
        node("c"),
        node("d"),
      ],
      edges: chainEdges(["a", "b", "c", "d"]),
    };
    const ids = autoLayoutSurface(def).readouts.map((r) => r.id);
    expect(ids).toContain("auto:b");
    expect(ids).not.toContain("auto:a");
  });

  it("emits stable auto: ids across regenerations", () => {
    const def: WorkflowDefinitionLike = {
      nodes: [node("alpha", { spec_type: "ai.chat" }), node("beta"), node("gamma")],
      edges: chainEdges(["alpha", "beta", "gamma"]),
    };
    const first = autoLayoutSurface(def);
    const second = autoLayoutSurface(def);
    expect(first.readouts.map((r) => r.id)).toEqual(second.readouts.map((r) => r.id));
    expect(first.readouts.map((r) => r.id)).toEqual([
      "auto:rail",
      "auto:alpha",
      "auto:beta",
      "auto:gamma",
    ]);
    expect(first).toEqual(second);
  });

  it("degrades gracefully on an empty definition: just the rail", () => {
    const config = autoLayoutSurface({ nodes: [], edges: [] });
    expect(config.readouts.map((r) => r.id)).toEqual(["auto:rail"]);
    expect(config.deliverableNodeId).toBeUndefined();
    expect(validateSurfaceConfig(config)).toEqual([]);
  });
});
