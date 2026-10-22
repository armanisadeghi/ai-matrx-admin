import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { isJsonObject } from "@/types/json";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import { boundTransferConversationId } from "./transfer-conversation-binding";

import {
  projectTransferToolOutcomes,
  type TransferToolOutcomes,
} from "./transfer-tool-outcomes";

export interface TransferWorkSummary {
  requests: number;
  completed: number;
  failed: number;
  unfinished: number;
  toolCalls: number;
  toolOutcomes?: TransferToolOutcomes | null;
}
/** Read persisted work for this exact call, never a person's other calls in the same conversation. */
export async function readTransferWorkSummary(
  client: Pick<SupabaseClient<Database>, "schema">,
  accountSid: string,
  parentCallSid: string,
): Promise<TransferWorkSummary | null> {
  if (
    !/^AC[0-9a-f]{32}$/i.test(accountSid) ||
    !/^CA[0-9a-f]{32}$/i.test(parentCallSid)
  )
    return null;
  const signal = AbortSignal.timeout(3000);
  const { data: call, error: callError } = await client
    .schema("crm")
    .from("interaction")
    .select(
      "id,organization_id,recording_owner_id,provider,provider_account_id,provider_interaction_id,channel_code,deleted_at",
    )
    .eq("provider", "twilio")
    .eq("provider_account_id", accountSid)
    .eq("provider_interaction_id", parentCallSid)
    .eq("channel_code", "call")
    .is("deleted_at", null)
    .abortSignal(signal)
    .maybeSingle();
  if (callError || !call || !call.recording_owner_id) return null;
  const {
    data: sessions,
    error: sessionError,
    count: sessionCount,
  } = await client
    .schema("platform")
    .from("activity_log")
    .select(
      "id,action,entity_type,entity_id,organization_id,actor_id,occurred_at,metadata",
      { count: "exact" },
    )
    .eq("action", "voice.agent.session_reference.consumed")
    .eq("entity_id", call.id)
    .limit(2)
    .abortSignal(signal);
  if (sessionError || !sessions || sessionCount !== 1 || sessions.length !== 1)
    return null;
  const metadata = sessions[0].metadata;
  if (
    !isJsonObject(metadata) ||
    typeof metadata.chat_conversation_id !== "string" ||
    !isUuidShape(metadata.chat_conversation_id) ||
    typeof metadata.session_id !== "string" ||
    !isUuidShape(metadata.session_id)
  )
    return null;
  const { data: conversation, error: conversationError } = await client
    .schema("chat")
    .from("conversation")
    .select("id,organization_id,created_by,deleted_at")
    .eq("id", metadata.chat_conversation_id)
    .abortSignal(signal)
    .maybeSingle();
  if (
    conversationError ||
    !conversation ||
    !boundTransferConversationId(call, sessions, [conversation])
  )
    return null;
  const {
    data: requests,
    error,
    count,
  } = await client
    .schema("chat")
    .from("user_request")
    .select("id,status,total_tool_calls", { count: "exact" })
    .eq("conversation_id", conversation.id)
    .eq("organization_id", call.organization_id)
    .eq("created_by", call.recording_owner_id)
    .eq("source_app", "aidream")
    .eq("source_feature", "voice-agent")
    .contains("metadata", {
      voice_session_id: metadata.session_id,
      voice_interaction_id: call.id,
      voice_provider_call_id: parentCallSid,
    })
    .is("deleted_at", null)
    .order("id")
    .limit(500)
    .abortSignal(signal);
  if (
    error ||
    !requests ||
    count === null ||
    count === 0 ||
    count > 500 ||
    count !== requests.length
  )
    return null;
  const summary: TransferWorkSummary = {
    requests: count,
    completed: 0,
    failed: 0,
    unfinished: 0,
    toolCalls: 0,
  };
  for (const request of requests) {
    if (
      !Number.isSafeInteger(request.total_tool_calls) ||
      request.total_tool_calls < 0 ||
      request.total_tool_calls > 1000000
    )
      return null;
    if (request.status === "completed") summary.completed++;
    else if (request.status === "failed") summary.failed++;
    else if (
      ["pending", "processing", "cancelled", "abandoned", "paused"].includes(
        request.status,
      )
    )
      summary.unfinished++;
    else return null;
    summary.toolCalls += request.total_tool_calls;
  }
  if (!Number.isSafeInteger(summary.toolCalls)) return null;
  // The tool ledger is a separate observation: unavailable evidence must not erase known request facts.
  summary.toolOutcomes = null;
  try {
    const requestIds = requests.map((request) => request.id);
    const allTools: Parameters<typeof projectTransferToolOutcomes>[0] = [];
    let total = 0;
    // Keep PostgREST URLs bounded even for a full 500-request snapshot.
    for (let offset = 0; offset < requestIds.length; offset += 25) {
      const ids = requestIds.slice(offset, offset + 25);
      const {
        data: tools,
        error: toolError,
        count: toolCount,
      } = await client
        .schema("chat")
        .from("tool_call")
        .select("id,user_request_id,status,success,is_error,tool_name", {
          count: "exact",
        })
        .in("user_request_id", ids)
        .eq("conversation_id", conversation.id)
        .eq("organization_id", call.organization_id)
        .eq("created_by", call.recording_owner_id)
        .is("deleted_at", null)
        .order("id")
        .limit(501)
        .abortSignal(signal);
      if (
        toolError ||
        !tools ||
        toolCount === null ||
        toolCount !== tools.length ||
        total + toolCount > 500 ||
        tools.some(
          (tool) =>
            !tool.user_request_id || !ids.includes(tool.user_request_id),
        )
      )
        return summary;
      total += toolCount;
      allTools.push(...tools);
    }
    // Pending tool rows can lead request totals, but fewer rows than reported attempts are incomplete.
    if (total >= summary.toolCalls)
      summary.toolOutcomes = projectTransferToolOutcomes(allTools);
  } catch {
    // The caller is already transferring; keep the existing introduction and bridge usable.
  }
  return summary;
}
