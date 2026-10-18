const events: unknown[] = [];
jest.mock("@/lib/python-client", () => ({
  getJson: jest.fn(),
  postNdjson: async function* () {
    for (const e of events) yield e;
  },
}));

import { parseEmojiLines, parseLines, runFormatVideo } from "../formats";

const brief = { presenter: { mode: "voiceover" as const }, script: { mode: "rewrite" as const }, captions: { mode: "match" as const } };

describe("format input lines", () => {
  it("a leading emoji is the picture, the rest the label; a line with no emoji is a label", () => {
    expect(parseEmojiLines("🌿 Hemp\nOrganic cotton\n♻️ Recycled polyester\n\n  ")).toEqual([
      { emoji: "🌿", label: "Hemp" },
      { label: "Organic cotton" },
      { emoji: "♻️", label: "Recycled polyester" },
    ]);
    expect(parseEmojiLines("🧑‍🌾 Farmer")).toEqual([{ emoji: "🧑‍🌾", label: "Farmer" }]);
    expect(parseLines(" a \n\n b ")).toEqual(["a", "b"]);
  });
});

describe("runFormatVideo reads the same typed stream as the clone plan", () => {
  it("returns the one result and reports every stage", async () => {
    events.length = 0;
    events.push(
      { event: "data", data: { type: "clone_plan_stage", stage: "project", label: "Making the project" } },
      { event: "data", data: { type: "clone_plan_stage", stage: "plan", label: "Planning the video" } },
      { event: "data", data: { type: "clone_plan_result", result: { project_id: "p1", version: 1, format_id: "ranking-listicle", analysis_id: null, post_id: null } } },
    );
    const stages: string[] = [];
    const out = await runFormatVideo({ format_id: "ranking-listicle", brief }, { organizationId: "o1" }, (s) => stages.push(s.label));
    expect(out.project_id).toBe("p1");
    expect(stages).toEqual(["Making the project", "Planning the video"]);
  });

  it("a refusal inside the stream is thrown with its code and plain words; no result is an error", async () => {
    events.length = 0;
    events.push({ event: "error", data: { code: "invalid_brief", user_message: "A ranking needs between 3 and 8 things to rank." } });
    await expect(runFormatVideo({ format_id: "ranking-listicle", brief }, { organizationId: "o1" })).rejects.toMatchObject({ code: "invalid_brief", message: expect.stringContaining("3 and 8") });
    events.length = 0;
    await expect(runFormatVideo({ format_id: "ranking-listicle", brief }, { organizationId: "o1" })).rejects.toMatchObject({ code: "no_result" });
  });
});
