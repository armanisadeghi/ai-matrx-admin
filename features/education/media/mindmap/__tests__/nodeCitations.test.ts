import type { GroundedChunk } from "@/features/education/create/groundedMaterial";
import { citeDiagramNodes, nodeCitationOf } from "../nodeCitations";

const chunk = (id: string, page: number | null, text: string): GroundedChunk => ({
  id, page, text,
  source: { fileId: "f1", documentId: "pd1", url: null, title: "Bio.pdf", recordKind: null },
});
const chunks = [
  chunk("pd1:1", 3, "Mitochondria produce ATP through oxidative phosphorylation in the inner membrane."),
  chunk("pd1:2", 7, "Ribosomes assemble proteins by translating messenger RNA codons."),
];

describe("mind map node citations", () => {
  it("stamps each concrete node with the page of its passage; a grouping node stays uncited", () => {
    const spec = {
      __kind: "diagram_spec",
      nodes: [
        { id: "a", label: "Ribosomes", description: "assemble proteins by translating messenger RNA" },
        { id: "b", label: "ATP production", description: "Mitochondria produce ATP via oxidative phosphorylation", metadata: { cardId: "c1" } },
        { id: "c", label: "Cell organelles" },
      ],
      edges: [],
    };
    const { spec: out, citedCount } = citeDiagramNodes(spec, chunks);
    const nodes = out.nodes as { id: string; metadata?: Record<string, unknown> }[];
    expect(citedCount).toBe(2);
    expect(nodeCitationOf(nodes[0])).toMatchObject({ sourceId: "pd1:2", page: 7, fileId: "f1" });
    expect(nodeCitationOf(nodes[1])).toMatchObject({ sourceId: "pd1:1", page: 3 });
    expect(nodes[1]!.metadata).toMatchObject({ cardId: "c1" }); // existing metadata survives
    expect(nodeCitationOf(nodes[2])).toBeNull();
    expect(spec.nodes[0]).not.toHaveProperty("metadata"); // input untouched
  });

  it("with no grounded chunks (a topic alone) nothing is cited", () => {
    expect(citeDiagramNodes({ nodes: [{ id: "a", label: "x y z" }] }, []).citedCount).toBe(0);
  });
});

describe("mind map node text", () => {
  it("never carries a chunk marker, and honors a chunk id the agent cited", () => {
    const spec = {
      __kind: "diagram_spec",
      nodes: [
        { id: "a", label: "Ribosomes ### Chunk pd1:2 (page 7)", description: "### Chunk pd1:2\nassemble proteins", chunk_id: "pd1:1" },
      ],
      edges: [],
    };
    const { spec: out } = citeDiagramNodes(spec, chunks);
    const n = (out.nodes as { label: string; description: string; metadata?: unknown }[])[0]!;
    expect(JSON.stringify(n)).not.toMatch(/### Chunk/);
    expect(n.label).toBe("Ribosomes");
    expect(nodeCitationOf(n)).toMatchObject({ sourceId: "pd1:1" });
  });
});
