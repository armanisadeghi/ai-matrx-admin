import type { ResolvedSource } from "@ai-matrx/agents/sources";
import { chunksOfSources, chunksOfText, groundedTextWithChunks, groundedTextOf } from "../groundedMaterial";
import { bestChunkFor, citationForChunk, citationForItem, stripChunkMarkers, stripChunkMarkersDeep } from "../chunkCitations";

function src(label: string, text: string, extra: Partial<ResolvedSource> = {}): ResolvedSource {
  return {
    ref: { resource_type: "file", resource_id: "f1" },
    label,
    form_used: "clean",
    text,
    segments: [],
    state: "ready",
    truncated: false,
    notes: [],
    file_id: "f1",
    processed_document_id: "pd1",
    ...extra,
  } as ResolvedSource;
}

const TEXT =
  "### Chunk pd1:1 (page 3)\nMitochondria produce ATP through oxidative phosphorylation in the inner membrane.\n\n" +
  "### Chunk pd1:2 (page 7)\nRibosomes assemble proteins by translating messenger RNA codons.\n\n" +
  "### Chunk pd1:3\nThe Golgi apparatus packages and ships proteins.";

describe("chunk citations", () => {
  it("keeps chunk markers for the generator and strips them for what is read aloud", () => {
    const s = [src("Bio.pdf", TEXT)];
    expect(groundedTextWithChunks(s)).toContain("### Chunk pd1:2 (page 7)");
    expect(groundedTextOf(s)).not.toContain("### Chunk");
  });

  it("splits a Source's text into chunks with ids, pages and the Source that holds them", () => {
    expect(chunksOfText(TEXT).map((c) => [c.id, c.page])).toEqual([["pd1:1", 3], ["pd1:2", 7], ["pd1:3", null]]);
    const chunks = chunksOfSources([src("Bio.pdf", TEXT)]);
    expect(chunks[1]).toMatchObject({ id: "pd1:2", page: 7, source: { fileId: "f1", documentId: "pd1", title: "Bio.pdf" } });
  });

  it("an item cites the passage it came from, opening that page of its file", () => {
    const chunks = chunksOfSources([src("Bio.pdf", TEXT)]);
    const c = citationForItem({}, "Ribosomes translate messenger RNA codons into proteins", chunks)!;
    expect(c).toMatchObject({ sourceId: "pd1:2", sourceKind: "chunk", page: 7, locator: "p. 7", fileId: "f1", documentId: "pd1", title: "Bio.pdf" });
    expect(c.excerpt).toContain("Ribosomes assemble proteins");
  });

  it("an abstract item that matches no passage stays uncited", () => {
    const chunks = chunksOfSources([src("Bio.pdf", TEXT)]);
    expect(bestChunkFor("Cell Biology Overview", chunks)).toBeNull();
    expect(citationForItem({}, "Quantum chromodynamics", chunks)).toBeNull();
  });

  it("a chunk the generator named wins over the overlap guess; an unknown id is ignored", () => {
    const chunks = chunksOfSources([src("Bio.pdf", TEXT)]);
    expect(citationForItem({ metadata: { source_chunk_ids: ["pd1:3"] } }, "Ribosomes translate messenger RNA", chunks)).toMatchObject({ sourceId: "pd1:3" });
    expect(citationForItem({ chunk_id: "nope" }, "Ribosomes translate messenger RNA codons", chunks)).toMatchObject({ sourceId: "pd1:2" });
  });

  it("each chunk is cited against ITS OWN Source when several are chosen", () => {
    const chunks = chunksOfSources([
      src("A.pdf", "### Chunk a:1 (page 1)\nAlpha beta gamma delta.", { file_id: "fa", processed_document_id: "pa" }),
      src("B.pdf", "### Chunk b:1 (page 9)\nEpsilon zeta eta theta.", { file_id: "fb", processed_document_id: "pb" }),
    ]);
    expect(citationForChunk(chunks[1]!)).toMatchObject({ fileId: "fb", documentId: "pb", page: 9 });
  });
});

describe("chunk citations: choosing the right passage", () => {
  const mk = (id: string, page: number, text: string) => ({
    id, page, text,
    source: { fileId: "f1", documentId: "pd1", url: null, title: "Bio.pdf", recordKind: null },
  }) as import("../groundedMaterial").GroundedChunk;

  const intro = mk("pd1:1", 2, "The Krebs cycle is a famous pathway. Students often meet the cycle early in a biology course.");
  const detail = mk("pd1:9", 14, "Overview of respiration in cells. The Krebs cycle runs in the mitochondrial matrix and oxidizes acetyl-CoA to carbon dioxide, producing NADH and FADH2. Glycolysis happens earlier in the cytoplasm.");

  it("a short label that fits two passages stays uncited", () => {
    expect(bestChunkFor("Krebs cycle", [intro, detail])).toBeNull();
  });

  it("picks the true match even when it is the second passage", () => {
    const m = mk("pd1:1", 3, "Cells divide through mitosis. The cell cycle has several phases and checkpoints.");
    const c = citationForItem({}, "Krebs cycle oxidizes acetyl-CoA producing NADH in the mitochondrial matrix", [m, intro, detail])!;
    expect(c.sourceId).toBe("pd1:9");
    expect(c.page).toBe(14);
  });

  it("the excerpt is the matching sentence, not the passage start", () => {
    const c = citationForItem({}, "Krebs cycle oxidizes acetyl-CoA producing NADH in the mitochondrial matrix", [intro, detail])!;
    expect(c.excerpt).toContain("oxidizes acetyl-CoA");
    expect(c.excerpt).not.toContain("Overview of respiration");
  });

  it("a longer item that two passages hold equally stays uncited", () => {
    const a = mk("a", 1, "Photosynthesis converts light energy into chemical energy in chloroplasts.");
    const b = mk("b", 2, "Photosynthesis converts light energy into chemical energy within chloroplasts too.");
    expect(bestChunkFor("Photosynthesis converts light energy in chloroplasts", [a, b])).toBeNull();
  });
});

describe("grounding markers never leak into generated text", () => {
  it("strips marker text from strings, deeply", () => {
    expect(stripChunkMarkers("Golgi ### Chunk pd1:3 (page 4) packages proteins")).toBe("Golgi packages proteins");
    expect(stripChunkMarkersDeep({ a: ["### Chunk x:1\nHi"], b: { c: "ok" } })).toEqual({ a: ["Hi"], b: { c: "ok" } });
  });
});
