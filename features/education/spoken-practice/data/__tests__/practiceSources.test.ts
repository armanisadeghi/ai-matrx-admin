import type { ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";
import { practiceSourceFromResolved } from "../practiceSources";

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

  it("over budget, every source keeps a share and the cut is reported", () => {
    const { source, cut } = practiceSourceFromResolved(
      resolved([
        { type: "note", id: "n1", label: "Long", text: "x".repeat(1000) },
        { type: "note", id: "n2", label: "Short", text: "y".repeat(10) },
      ]),
      chosen,
      {},
      100,
    );
    expect(cut).toBe(true);
    expect(source?.material).toContain("y".repeat(10));
    expect(source?.material).toContain("x".repeat(90));
    expect(source?.material).not.toContain("x".repeat(91));
  });

  it("nothing readable is no source", () => {
    expect(practiceSourceFromResolved(resolved([{ type: "note", id: "n", label: "E", text: " " }]), chosen, {}).source).toBeNull();
  });
});
