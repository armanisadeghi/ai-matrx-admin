import { isDebriefModel, debriefModelIds } from "../debrief-models";
import { describeVersionNote, SYSTEM_NOTE_LABEL } from "../version-notes";

const ok = { contextWindow: 200_000, interaction: "turn", input: ["text", "image"], output: ["text"] };

describe("Debrief offers only text/chat models still served", () => {
  it("keeps a normal text model", () => {
    expect(isDebriefModel({ id: "1", name: "Claude Opus 5.5", ...ok })).toBe(true);
  });
  it("drops mock, speech-to-text, image, deprecated, retired and tiny-window models", () => {
    expect(isDebriefModel({ id: "m", name: "Mock Model (No-Cost Test)", ...ok })).toBe(false);
    expect(isDebriefModel({ id: "s", name: "Deepgram Nova-3 (Streaming STT)", contextWindow: null, interaction: "realtime", input: ["audio"], output: ["text"] })).toBe(false);
    expect(isDebriefModel({ id: "i", name: "Gemini 2.5 Flash Image", contextWindow: 66_000, interaction: "turn", input: ["text"], output: ["text", "image"] })).toBe(false);
    expect(isDebriefModel({ id: "d", name: "Old", isDeprecated: true, ...ok })).toBe(false);
    expect(isDebriefModel({ id: "r", name: "Gone", retiredAt: "2026-01-01", ...ok })).toBe(false);
    expect(isDebriefModel({ id: "a", name: "ALLaM 2 7B", contextWindow: 4_100, interaction: "turn", input: ["text"], output: ["text"] })).toBe(false);
  });
  it("lists ids", () => {
    expect(debriefModelIds([{ id: "1", name: "A", ...ok }, { id: "2", name: "Mock", ...ok }])).toEqual(["1"]);
  });
});

describe("Versions notes are for people", () => {
  const names: Record<string, string> = {
    "5b467c4b-0000-4000-8000-000000000001": "Claude Sonnet 5.5",
    "c5a1f7e3-0000-4000-8000-000000000002": "Claude Haiku 5.5",
  };
  const name = (id: string) => names[id];
  it("says model swaps in names, never ids", () => {
    const t = describeVersionNote(
      "Deprecated model replaced 5b467c4b-0000-4000-8000-000000000001 → c5a1f7e3-0000-4000-8000-000000000002 (deprecated-models audit batch)",
      name,
    );
    expect(t).toBe("Model changed from Claude Sonnet 5.5 to Claude Haiku 5.5");
  });
  it("never shows an ops note raw", () => {
    expect(describeVersionNote("L4b stage C 2026-10-18: required inputs reset to optional (undo: agent.required_flag_change stage C)", name)).toBe(SYSTEM_NOTE_LABEL);
  });
  it("keeps a note a person wrote and hides empty ones", () => {
    expect(describeVersionNote("Warmer tone, shorter replies", name)).toBe("Warmer tone, shorter replies");
    expect(describeVersionNote("  ", name)).toBeUndefined();
    expect(describeVersionNote(null, name)).toBeUndefined();
  });
});

describe("wiring", () => {
  it("StudioControls uses both helpers", () => {
    const c = require("fs").readFileSync(require("path").join(__dirname, "../components/StudioControls.tsx"), "utf8");
    expect(c).toContain("allowedModelIds={debriefIds.length > 0 ? debriefIds : undefined}");
    expect(c).toContain("describeVersionNote(r.change_note");
  });
});
