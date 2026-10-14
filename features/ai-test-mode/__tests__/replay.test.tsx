/**
 * The saved-answer stamp (features/ai-test-mode/replay.ts) read from a stored
 * node output fixture shaped exactly as aidream writes it
 * (services/runtime/ai_test_mode.py: metadata.ai_test_replay, usage zeroed),
 * and the badge it renders. A real output renders nothing.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { AiTestReplayBadge } from "../AiTestReplayBadge";
import { aiTestReplayLabel, readAiTestReplay } from "../replay";

const STAMP = {
  mode: "replay",
  match: "exact",
  baseline_id: "b1",
  label: "Ritual coffee facts",
  stand_in: false,
  saved_at: "2026-10-14T10:00:00Z",
  recorded_in_run: "run-a",
  original_cost_usd: 0.0123,
  original_usage: { input_tokens: 100 },
  replayed_in_run: "run-b",
  note: "saved answer",
};

const replayedOutput = {
  final_text: "Ritual Coffee",
  usage: { input_tokens: 0, output_tokens: 0 },
  metadata: { ai_test_replay: STAMP },
};

describe("readAiTestReplay", () => {
  it("reads the stamp on a stored node output", () => {
    const r = readAiTestReplay(replayedOutput);
    expect(r).toMatchObject({ match: "exact", label: "Ritual coffee facts", baselineId: "b1", originalCostUsd: 0.0123 });
    expect(aiTestReplayLabel(r!)).toBe("Baseline replay");
  });

  it("reads one wrapper level down and stand-in matches", () => {
    const r = readAiTestReplay({ result: { metadata: { ai_test_replay: { ...STAMP, match: "stand_in" } } } });
    expect(r && aiTestReplayLabel(r)).toBe("Stand-in");
  });

  it("a real output has no stamp", () => {
    expect(readAiTestReplay({ final_text: "x", metadata: {} })).toBeNull();
    expect(readAiTestReplay(null)).toBeNull();
    expect(readAiTestReplay("text")).toBeNull();
  });
});

describe("AiTestReplayBadge", () => {
  it("renders the badge with label and saved time on hover", () => {
    const html = renderToStaticMarkup(<AiTestReplayBadge output={replayedOutput} />);
    expect(html).toContain("Baseline replay");
    expect(html).toContain('data-ai-test-replay="exact"');
    expect(html).toMatch(/title="Ritual coffee facts · saved [^"]+"/);
  });

  it("renders nothing for a real output", () => {
    expect(renderToStaticMarkup(<AiTestReplayBadge output={{ final_text: "x" }} />)).toBe("");
  });
});

import { aiTestModeNotice } from "../AiTestModeDock";

describe("aiTestModeNotice (the dock's honesty line)", () => {
  const base = { requested: "replay" as const, available: true, server_reason: "local server", modes: [] };
  it("says nothing when the server does what was asked", () => {
    expect(aiTestModeNotice("replay", { ...base, effective: "replay", reason: "local server" })).toBeNull();
    expect(aiTestModeNotice("real", { ...base, effective: "real", reason: "real calls (default)" })).toBeNull();
  });
  it("says the switch is closed when the server refuses test modes", () => {
    expect(
      aiTestModeNotice("replay", { ...base, available: false, effective: "real", reason: "server refuses test modes: test switch off" }),
    ).toBe("Off: switch closed");
  });
});
