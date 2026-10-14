// features/ai-test-mode/run-replays.ts — the steps of ONE workflow run the
// server answered from a saved result. Reads only the stamp
// (`output->metadata->ai_test_replay`), never whole outputs (load law).
// A replayed step made no AI call, so it has no chat.user_request: AI Watch
// shows these beside its runs so a saved answer is never mistaken for a missing one.

import { supabase } from "@/utils/supabase/client";
import { readAiTestReplay, type AiTestReplay } from "./replay";

export interface RunTestReplay {
  outcomeId: string;
  nodeId: string;
  completedAt: string | null;
  replay: AiTestReplay;
}

// Typed as plain string: the JSON-path select is past the generated parser's depth.
const STAMP_COLUMNS: string = "id, node_id, completed_at, stamp:output->metadata->ai_test_replay";

export async function fetchRunTestReplays(runId: string): Promise<RunTestReplay[]> {
  const { data, error } = await supabase
    .schema("workflow")
    .from("node_outcome")
    .select(STAMP_COLUMNS)
    .eq("run_id", runId)
    .not("output->metadata->ai_test_replay", "is", null)
    .order("completed_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(`Saved answers could not be read: ${error.message}`);
  const out: RunTestReplay[] = [];
  for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
    const replay = readAiTestReplay({ metadata: { ai_test_replay: row.stamp } });
    if (!replay) continue;
    out.push({
      outcomeId: String(row.id),
      nodeId: String(row.node_id ?? ""),
      completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
      replay,
    });
  }
  return out;
}
