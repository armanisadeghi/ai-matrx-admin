/**
 * Watch AI data reads — React → Supabase directly (every table carries `std_select` +
 * `platform_admin_read`). Who may open the window is the window's gate (`useCanWatchAi`); these
 * reads add nothing on top (Arman, 2026-10-22: no new gating for raw data).
 */

import { readAllRows } from "@ai-matrx/data/db";
import { supabase } from "@/utils/supabase/client";

/** The `chat.tool_call` columns the Data section needs (the renderer's columns + the capture index). */
export const TOOL_CALL_DATA_COLUMNS =
  "id, call_id, message_id, conversation_id, user_request_id, tool_name, tool_name_as_called, tool_type, status, success, is_error, error_type, error_message, duration_ms, started_at, completed_at, output_chars, output_preview, output_type, iteration, parent_call_id, retry_count, persist_key, file_path, created_at, updated_at, created_by, updated_by, deleted_at, input_tokens, output_tokens, total_tokens, cost_usd, arguments, output, execution_events, metadata, organization_id";

export type ToolCallDataRow = Record<string, unknown> & {
  id: string;
  call_id: string;
  tool_name: string;
  iteration: number | null;
  output: string | null;
  output_chars: number | null;
  metadata: unknown;
  organization_id?: string | null;
};

/** Every tool call one run (`chat.user_request.id`) made, in order. */
export async function fetchRunToolCalls(userRequestId: string): Promise<ToolCallDataRow[]> {
  const rows = await readAllRows(
    ({ from, to }) =>
      supabase
        .schema("chat")
        .from("tool_call")
        .select(TOOL_CALL_DATA_COLUMNS)
        .eq("user_request_id", userRequestId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "chat.tool_call (Watch AI data)" },
  );
  return rows as unknown as ToolCallDataRow[];
}

export interface NodeOutcomeRow {
  id: string;
  run_id: string;
  step: number;
  node_id: string;
  attempt: number;
  output: unknown;
  output_kind: string | null;
  error: unknown;
  duration_ms: number | null;
  completed_at: string | null;
  metadata: unknown;
  organization_id?: string | null;
}

/** Every recorded step of the given workflow runs (AI and non-AI), in run order. */
export async function fetchRunSteps(runIds: readonly string[]): Promise<NodeOutcomeRow[]> {
  if (!runIds.length) return [];
  const rows = await readAllRows(
    ({ from, to }) =>
      supabase
        .schema("workflow")
        .from("node_outcome")
        .select("id, run_id, step, node_id, attempt, output_kind, error, duration_ms, completed_at, metadata, organization_id")
        .in("run_id", [...runIds])
        .is("deleted_at", null)
        .order("step", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "workflow.node_outcome (Watch AI steps)" },
  );
  return (rows as unknown as Omit<NodeOutcomeRow, "output">[]).map((r) => ({ ...r, output: undefined }));
}

/** One step's output as the next step received it (loaded when the step is opened). */
export async function fetchStepOutput(outcomeId: string): Promise<unknown> {
  const { data, error } = await supabase
    .schema("workflow")
    .from("node_outcome")
    .select("output")
    .eq("id", outcomeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { output?: unknown } | null)?.output ?? null;
}

/** A Source's stored original (the page as fetched — `docproc.processed_documents.original_file_id`). */
export async function fetchOriginalFileIds(processedDocumentIds: readonly string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (!processedDocumentIds.length) return found;
  const { data, error } = await supabase
    .schema("docproc")
    .from("processed_documents")
    .select("id, original_file_id")
    .in("id", [...processedDocumentIds]);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as Array<{ id: string; original_file_id: string | null }>) {
    if (row.original_file_id) found.set(row.id, row.original_file_id);
  }
  return found;
}
