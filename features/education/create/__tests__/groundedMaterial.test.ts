import type { ResolvedSource } from "@ai-matrx/agents/sources";
import {
  deckIdsOf,
  focusWithTopic,
  groundedTextOf,
  mediaSourceOf,
  namerFloorOf,
  trustFromResolved,
  withoutChunkHeaders,
} from "../groundedMaterial";
import { generationSourceWrite } from "../generationSourceWrite";

function src(type: string, id: string, label: string, text: string, extra: Partial<ResolvedSource> = {}): ResolvedSource {
  return {
    ref: { resource_type: type, resource_id: id },
    label,
    form_used: "clean",
    text,
    segments: [],
    state: "ready",
    truncated: false,
    notes: [],
    ...extra,
  } as ResolvedSource;
}

describe("grounded material", () => {
  it("takes the server's chunk headers out of the text a generator reads", () => {
    expect(withoutChunkHeaders("### Chunk abc:1 (page 2)\nThe cell.\n\n### Chunk abc:2\nThe wall.")).toBe(
      "The cell.\n\nThe wall.",
    );
  });

  it("tells several Sources apart by heading; one stays plain", () => {
    expect(groundedTextOf([src("note", "n1", "Notes", "### Chunk n1:1\nA")])).toBe("A");
    expect(groundedTextOf([src("note", "n1", "Notes", "A"), src("fc_set", "d1", "Deck", "B")])).toBe(
      "## Notes\nA\n\n## Deck\nB",
    );
  });

  it("cites each Source so it opens its own file, document or page", () => {
    const trust = trustFromResolved([
      src("file", "f1", "Bio.pdf", "x", { file_id: "f1" }),
      src("processed_document", "p1", "A page", "y", { processed_document_id: "p1" }),
      src("fc_set", "d1", "Cells", "z"),
      src("note", "n9", "Empty", "   "),
    ]);
    expect(trust.confidence).toBe("grounded");
    expect(trust.citations).toHaveLength(3);
    expect(trust.citations[0]).toMatchObject({ fileId: "f1", sourceKind: "file" });
    expect(trust.citations[1]).toMatchObject({ documentId: "p1", sourceKind: "document" });
    expect(trust.citations[2]).toMatchObject({ sourceId: "d1", title: "Cells" });
  });

  it("records one deck as a deck, anything else as named material", () => {
    expect(mediaSourceOf([src("fc_set", "d1", "Cells", "z")], "Cells")).toEqual({ kind: "deck", id: "d1", title: "Cells" });
    const mixed = mediaSourceOf([src("fc_set", "d1", "Cells", "z"), src("note", "n1", "Notes", "a")], "Cell biology");
    expect(mixed).toMatchObject({ kind: "topic", id: null, title: "Cell biology" });
    expect(deckIdsOf([src("fc_set", "d1", "Cells", "z"), src("note", "n1", "Notes", "a")])).toEqual(["d1"]);
    // The namer's floor is the first readable Source's own name — never "<first> and N more".
    expect(namerFloorOf([src("note", "n0", "Empty", ""), src("note", "n1", "Notes", "a")])).toBe("Notes");
    expect(namerFloorOf([])).toBe("Study material");
  });

  it("a topic beside Sources only steers them", () => {
    expect(focusWithTopic("mitosis", "skip dates")).toBe("Focus on: mitosis\n\nskip dates");
    expect(focusWithTopic("", " ")).toBe("");
  });
});

describe("generation_source write target", () => {
  const picked: string[] = [];
  const topics: string[] = [];
  const write = (busy = false, decks = [{ id: "d1", name: "Cells" }]) =>
    generationSourceWrite({
      what: "a mind map",
      isBusy: busy,
      decks,
      topicMin: 3,
      topicMax: 20,
      setTopic: (t) => topics.push(t),
      pickDeck: (d) => picked.push(d.id),
    });

  it("stages a topic and a deck through the Source input's own doors", () => {
    write()({ topic: "  The water cycle " });
    write()({ deck_id: "d1" });
    expect(topics).toEqual(["The water cycle"]);
    expect(picked).toEqual(["d1"]);
  });

  it("refuses contradictions and unknown decks before changing anything", () => {
    expect(() => write()({ topic: "abc", deck_id: "d1" })).toThrow(/alternative/);
    expect(() => write()({ deck_id: "nope" })).toThrow(/not one of the learner's decks/);
    expect(() => write(true)({ topic: "abc" })).toThrow(/being generated/);
    expect(() => write()({ topic: "x" })).toThrow(/3-20/);
    expect(topics).toEqual(["The water cycle"]);
  });
});
