import { createClient } from "@/utils/supabase/client";
import { readAllRows } from "@ai-matrx/data/db";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import {
  projectTransferContexts,
  transferConversationCandidates,
  type TransferContextItem,
} from "./transfer-context";
const EVENT_COLUMNS =
  "id,action,entity_type,entity_id,organization_id,actor_id,occurred_at,metadata";
export async function loadTransferContexts(): Promise<TransferContextItem[]> {
  const client = createClient();
  const { data: admin, error: adminError } = await client
    .rpc("is_platform_admin")
    .abortSignal(AbortSignal.timeout(10000));
  if (adminError || admin !== true)
    throw Error("Open the administrator console to view transfer context.");
  // Intentionally a recent callback window, never a claim to a complete transfer/receipt list.
  const { data: observations, error } = await client
    .schema("platform")
    .from("activity_log")
    .select(EVENT_COLUMNS)
    .eq("action", "voice.call.transfer_result.observed")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20)
    .abortSignal(AbortSignal.timeout(10000));
  if (error || !observations)
    throw Error("Transfer callbacks could not be loaded.");
  const callIds = [
    ...new Set(
      observations.flatMap((row) =>
        row.entity_type === "crm_interaction" &&
        row.entity_id &&
        isUuidShape(row.entity_id)
          ? [row.entity_id]
          : [],
      ),
    ),
  ];
  if (!callIds.length) return [];
  const [calls, sessions] = await Promise.all([
    readAllRows(
      ({ from, to }) =>
        client
          .schema("crm")
          .from("interaction")
          .select(
            "id,organization_id,recording_owner_id,provider,provider_account_id,provider_interaction_id,channel_code,deleted_at",
            { count: "exact" },
          )
          .in("id", callIds)
          .order("id")
          .range(from, to)
          .abortSignal(AbortSignal.timeout(10000)),
      { label: "Transfer parent calls" },
    ),
    readAllRows(
      ({ from, to }) =>
        client
          .schema("platform")
          .from("activity_log")
          .select(EVENT_COLUMNS, { count: "exact" })
          .eq("action", "voice.agent.session_reference.consumed")
          .in("entity_id", callIds)
          .order("id")
          .range(from, to)
          .abortSignal(AbortSignal.timeout(10000)),
      { label: "Transfer conversation bindings" },
    ),
  ]);
  const chatIds = transferConversationCandidates(sessions);
  const conversations = chatIds.length
    ? await readAllRows(
        ({ from, to }) =>
          client
            .schema("chat")
            .from("conversation")
            .select("id,organization_id,created_by,deleted_at", {
              count: "exact",
            })
            .in("id", chatIds)
            .order("id")
            .range(from, to)
            .abortSignal(AbortSignal.timeout(10000)),
        { label: "Transfer saved conversations" },
      )
    : [];
  return projectTransferContexts(observations, calls, sessions, conversations);
}
