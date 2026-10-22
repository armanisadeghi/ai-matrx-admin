import type { MemoryAidPayload } from "@/features/content-ir/kinds/memory-aid";
import type { GroundedChunk } from "@/features/education/create/groundedMaterial";
import { citeMemoryAid, itemCitationsOf, memoryItemKey } from "../itemCitations";

const chunk = (id: string, page: number | null, text: string): GroundedChunk => ({
  id, page, text,
  source: { fileId: "f1", documentId: "pd1", url: null, title: "Bio.pdf", recordKind: null },
});
const chunks = [
  chunk("pd1:1", 3, "Mitochondria produce ATP through oxidative phosphorylation in the inner membrane."),
  chunk("pd1:2", 7, "Ribosomes assemble proteins by translating messenger RNA codons."),
];
const aid = {
  __kind: "memory_aid", title: "t",
  mnemonics: [{ __kind: "mnemonic", technique: "sentence", target: "Ribosomes translate messenger RNA codons", device: "Rita builds proteins", explanation: "" }],
  analogies: [{ __kind: "analogy", concept: "Overall idea", analogy: "a busy city", mapping: "" }],
  memory_palace: { __kind: "memory_palace", applicable: true, theme: "house", loci: [{ __kind: "locus", place: "Kitchen", item: "Mitochondria produce ATP", image: "a power plant making ATP in the inner membrane" }] },
} as unknown as MemoryAidPayload;

describe("memory aid item citations", () => {
  it("cites each aid at the page of the passage it came from, and leaves an abstract one uncited", () => {
    const map = citeMemoryAid(aid, chunks);
    expect(map[memoryItemKey("mnemonic", aid.mnemonics[0])]).toMatchObject({ sourceId: "pd1:2", page: 7, fileId: "f1" });
    expect(map[memoryItemKey("locus", aid.memory_palace.loci[0])]).toMatchObject({ sourceId: "pd1:1", page: 3 });
    expect(map[memoryItemKey("analogy", aid.analogies[0])]).toBeUndefined();
  });

  it("is keyed by what the item says, so deleting an item never moves a citation onto another", () => {
    const map = citeMemoryAid(aid, chunks);
    const edited = { ...aid.mnemonics[0]!, device: "Something the person rewrote" };
    expect(map[memoryItemKey("mnemonic", edited)]).toBeUndefined();
    expect(map[memoryItemKey("mnemonic", { ...aid.mnemonics[0] })]).toBeDefined();
  });

  it("reads the stored citations tolerantly", () => {
    expect(itemCitationsOf(null)).toEqual({});
    expect(itemCitationsOf({ itemCitations: { a: { sourceId: "x", sourceKind: "chunk" }, b: 3 } })).toEqual({ a: { sourceId: "x", sourceKind: "chunk" } });
  });
});
