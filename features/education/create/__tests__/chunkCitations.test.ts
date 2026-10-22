import type { ResolvedSource } from "@ai-matrx/agents/sources";
import { chunksOfSources, chunksOfText, groundedTextWithChunks, groundedTextOf } from "../groundedMaterial";
import { bestChunkFor, citationForChunk, citationForItem } from "../chunkCitations";

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
