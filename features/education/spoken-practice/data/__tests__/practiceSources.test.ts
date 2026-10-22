import type { ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";
import { practiceLineageSources, practiceSourceFromResolved } from "../practiceSources";

function resolved(items: { type: string; id: string; label: string; text: string }[]): ResolvedSourceSet {
  return {
    __kind: "resolved_source_set",
    dropped: [],
    total_chars: 0,
    sources: items.map((i) => ({
      ref: { __kind: "resource_ref", resource_type: i.type, resource_id: i.id },
      label: i.label,
      form_used: "content",
      text: i.text,
      segments: [],
      file_id: null,
      processed_document_id: null,
      state: "ready",
      truncated: false,
      notes: [],
    })),
  } as unknown as ResolvedSourceSet;
}
const chosen = { __kind: "source_set", version: 1, sources: [] } as unknown as SourceSet;

describe("practiceSourceFromResolved", () => {
  it("a single deck becomes a set source recorded on the session", () => {
    const { source, cut } = practiceSourceFromResolved(
      resolved([{ type: "fc_set", id: "d1", label: "Cells", text: "Q: a\nA: b" }]),
      chosen,
      {},
    );
    expect(cut).toBe(false);
    expect(source).toMatchObject({ kind: "set", setId: "d1", title: "Cells deck" });
    expect(source?.material).toContain("Q: a");
    expect(source?.sourceSet).toBe(chosen);
  });

  it("a page or pasted text is a topic source", () => {
    const { source } = practiceSourceFromResolved(
      resolved([{ type: "processed_document", id: "p1", label: "Page", text: "words" }]),
      chosen,
      {},
    );
    expect(source).toMatchObject({ kind: "topic", setId: undefined });
  });

  it("never cuts in the browser: a long source arrives whole", () => {
    const text = "x".repeat(200_000);
    const { source, cut } = practiceSourceFromResolved(
      resolved([{ type: "note", id: "n1", label: "Long", text }]),
      chosen,
      {},
    );
    expect(cut).toBe(false);
    expect(source?.material).toContain(text);
  });

  it("reports a cut the server made to the size the person chose", () => {
    const r = resolved([{ type: "note", id: "n1", label: "Long", text: "some words" }]);
    (r.sources[0] as { truncated: boolean }).truncated = true;
    expect(practiceSourceFromResolved(r, chosen, {}).cut).toBe(true);
  });

  it("nothing readable is no source", () => {
    expect(practiceSourceFromResolved(resolved([{ type: "note", id: "n", label: "E", text: " " }]), chosen, {}).source).toBeNull();
  });
});

describe("practiceLineageSources", () => {
  it("one anchor per distinct readable Source, none for a kind with no registered pair", () => {
    const anchors = practiceLineageSources(
      resolved([
        { type: "fc_set", id: "d1", label: "Cells", text: "Q: a" },
        { type: "note", id: "n1", label: "N", text: "t" },
        { type: "note", id: "n1", label: "N again", text: "t" },
        { type: "pasted_text", id: "x", label: "Pasted", text: "t" },
        { type: "note", id: "empty", label: "E", text: " " },
      ]),
    );
    expect(anchors.map((a) => [a.ref?.entityType, a.ref?.entityId])).toEqual([
      ["fc_set", "d1"],
      ["note", "n1"],
    ]);
  });

  it("rides on the session's source", () => {
    const { source } = practiceSourceFromResolved(
      resolved([{ type: "fc_set", id: "d1", label: "Cells", text: "Q: a" }]),
      chosen,
      {},
    );
    expect(source?.lineageSources).toHaveLength(1);
  });
});
