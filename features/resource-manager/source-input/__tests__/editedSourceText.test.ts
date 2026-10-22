import { webcrypto } from "node:crypto";
import type { ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";

const landSource = jest.fn();
jest.mock("@/features/sources/api/sourcesApi", () => ({
  landSource: (...args: unknown[]) => landSource(...args),
}));

import { editedFromOf, editedSourceName, landEditedSourceText } from "../editedSourceText";

function resolved(items: { type: string; id: string; label: string; text: string }[]): ResolvedSourceSet {
  return {
    __kind: "resolved_source_set",
    dropped: [],
    sources: items.map((i) => ({
      ref: { __kind: "resource_ref", resource_type: i.type, resource_id: i.id },
      label: i.label,
      text: i.text,
      segments: [],
      truncated: false,
      notes: [],
    })),
  } as unknown as ResolvedSourceSet;
}

const FROM = {
  __kind: "source_set",
  version: 1,
  grounding: "whole",
  target_model_id: "m-1",
  sources: [
    { __kind: "resource_ref", resource_type: "processed_document", resource_id: "pd-1" },
    { __kind: "resource_ref", resource_type: "cld_file", resource_id: "f-1" },
  ],
} as unknown as SourceSet;

const READ = resolved([
  { type: "processed_document", id: "pd-1", label: "Ribosome", text: "raw one" },
  { type: "cld_file", id: "f-1", label: "Biology.pdf", text: "raw two" },
  { type: "note", id: "n-0", label: "Empty", text: "  " },
]);

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  }
});

describe("an edited source text is its own Source", () => {
  beforeEach(() => landSource.mockReset());

  it("lands the edit as pasted text named after the first Source, and the set points only at it", async () => {
    landSource.mockResolvedValue({ processed_document_id: "pd-edit", source_id: "s", reused_existing: false, kept: false });
    const out = await landEditedSourceText({
      text: "My corrected text",
      from: FROM,
      resolved: READ,
      organizationId: "org-1",
      userId: "u-1",
    });
    const body = landSource.mock.calls[0][0];
    expect(body).toMatchObject({
      source_kind: "inline",
      name: "Ribosome (edited)",
      organization_id: "org-1",
      content_already_clean: true,
    });
    expect(body.portions[0].text).toBe("My corrected text");
    // No text in the request: one pointer to the edit; grounding + model budget kept.
    expect(out.sourceSet.sources).toEqual([
      expect.objectContaining({ resource_type: "processed_document", resource_id: "pd-edit", delivery: "direct" }),
    ]);
    expect(out.sourceSet).toMatchObject({ grounding: "whole", target_model_id: "m-1" });
    expect(JSON.stringify(out.sourceSet)).not.toContain("My corrected text");
    // Lineage: every readable original, as registry tokens.
    expect(out.editedFrom).toEqual([
      { resource_type: "processed_document", resource_id: "pd-1", label: "Ribosome" },
      { resource_type: "file", resource_id: "f-1", label: "Biology.pdf" },
    ]);
  });

  it("a refusal from the door reaches the caller", async () => {
    landSource.mockRejectedValue(new Error("refused"));
    await expect(
      landEditedSourceText({ text: "x", from: FROM, resolved: READ, organizationId: "o", userId: "u" }),
    ).rejects.toThrow("refused");
  });

  it("names and lineage stay honest when nothing was readable", () => {
    const none = resolved([{ type: "note", id: "n", label: "N", text: " " }]);
    expect(editedSourceName(none)).toBe("Your sources (edited)");
    expect(editedFromOf(none)).toEqual([]);
  });
});
