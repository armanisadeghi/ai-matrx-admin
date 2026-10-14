// features/ai-test-mode/replay.ts — reading the "saved answer" stamp.
//
// A mandate step the server answered from a saved result (AI test mode, see
// common-docs/policies/ai-test-mode.md) carries `metadata.ai_test_replay` on
// its AiExecutionResult (aidream services/runtime/ai_test_mode.py STAMP_KEY).
// Every surface that shows a step result reads it HERE, so the badge is one
// rule: a stamped result is never shown as new AI output.

export interface AiTestReplay {
  mode: string | null;
  match: "exact" | "stand_in";
  baselineId: string | null;
  label: string | null;
  standIn: boolean;
  savedAt: string | null;
  recordedInRun: string | null;
  originalCostUsd: number | null;
  replayedInRun: string | null;
  note: string | null;
}

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseStamp(value: unknown): AiTestReplay | null {
  const s = rec(value);
  if (!s) return null;
  return {
    mode: str(s.mode),
    match: s.match === "stand_in" ? "stand_in" : "exact",
    baselineId: str(s.baseline_id),
    label: str(s.label),
    standIn: s.stand_in === true,
    savedAt: str(s.saved_at),
    recordedInRun: str(s.recorded_in_run),
    originalCostUsd: typeof s.original_cost_usd === "number" ? s.original_cost_usd : null,
    replayedInRun: str(s.replayed_in_run),
    note: str(s.note),
  };
}

/**
 * The replay stamp on a step output, when it has one. Reads the result itself
 * (`output.metadata.ai_test_replay`) and one wrapper level down (a step that
 * nests its AiExecutionResult under `result` / `output` / `ai_result`).
 */
export function readAiTestReplay(output: unknown): AiTestReplay | null {
  const top = rec(output);
  if (!top) return null;
  const direct = parseStamp(rec(top.metadata)?.ai_test_replay);
  if (direct) return direct;
  for (const key of ["result", "output", "ai_result"]) {
    const nested = parseStamp(rec(rec(top[key])?.metadata)?.ai_test_replay);
    if (nested) return nested;
  }
  return null;
}

/** The badge words: the match kind, never prose. */
export function aiTestReplayLabel(replay: AiTestReplay): string {
  return replay.match === "stand_in" ? "Stand-in" : "Baseline replay";
}
