import type { SourceSet } from "@ai-matrx/agents/sources";
import { audioSourceSetOf, buildAudioRequest } from "../audioBrief";

const SET = {
  __kind: "source_set",
  version: 1,
  sources: [{ __kind: "resource_ref", resource_type: "fc_set", resource_id: "d1" }],
} as unknown as SourceSet;

describe("an audio study asks the podcast server to read its Sources", () => {
  it("Sources go as a SourceSet, never as text", () => {
    const req = buildAudioRequest({ format: "overview", material: { kind: "sources", sourceSet: SET } });
    expect(req.source_set).toBe(SET);
    expect(req.input_data).toBe("");
    expect(req.input_data_type).toBe("full_content");
  });

  it("a topic alone is what the person typed", () => {
    const req = buildAudioRequest({ format: "debate", material: { kind: "topic", topic: "Photosynthesis" } });
    expect(req).toMatchObject({ input_data_type: "topic", input_data: "Photosynthesis", format: "debate" });
    expect(req.source_set).toBeUndefined();
  });

  it("a converted material names the Sources it was read from", () => {
    const kit = audioSourceSetOf({
      text: "joined text",
      ref: {
        kind: "file",
        kitId: "k",
        kitSources: [
          { type: "file", id: "f1", title: "A.pdf" },
          { type: "note", id: "n1", title: "N" },
        ],
      },
    });
    expect(kit?.sources.map((s) => [s.resource_type, s.resource_id])).toEqual([
      ["file", "f1"],
      ["note", "n1"],
    ]);
    expect(audioSourceSetOf({ text: "t", ref: { kind: "deck", entityType: "fc_set", entityId: "d1" } })?.sources[0]).toMatchObject({
      resource_type: "fc_set",
      resource_id: "d1",
    });
    expect(audioSourceSetOf({ text: "typed words" })).toBeNull();
  });
});
