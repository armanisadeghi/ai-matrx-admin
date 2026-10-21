import { isJsonObject } from "@/types/json";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import {
  boundTransferConversationId,
  type TransferContextEvent,
  type TransferContextCall,
  type TransferContextConversation,
} from "@/lib/communications/voice/transfer-conversation-binding";
/** Never select a first-match session or guess a conversation from a person's phone. */
export function transferConversationId(
  observation: TransferContextEvent,
  call: TransferContextCall | undefined,
  sessions: TransferContextEvent[],
  conversations: TransferContextConversation[],
): string | null {
  const observed = observation.metadata;
  if (
    !call ||
    call.deleted_at !== null ||
    call.channel_code !== "call" ||
    call.provider !== "twilio" ||
    !call.recording_owner_id ||
    !call.provider_account_id ||
    !call.provider_interaction_id ||
    observation.action !== "voice.call.transfer_result.observed" ||
    observation.entity_type !== "crm_interaction" ||
    observation.entity_id !== call.id ||
    observation.organization_id !== call.organization_id ||
    !isJsonObject(observed) ||
    observed.provider !== "twilio" ||
    observed.provider_account_id !== call.provider_account_id ||
    observed.provider_call_id !== call.provider_interaction_id
  )
    return null;
  return boundTransferConversationId(call, sessions, conversations);
}
/** Extract only candidate ids for an RLS read; eligibility is decided by the full correlation above. */
export function transferConversationCandidates(
  sessions: TransferContextEvent[],
): string[] {
  return [
    ...new Set(
      sessions.flatMap((row) =>
        isJsonObject(row.metadata) &&
        typeof row.metadata.chat_conversation_id === "string" &&
        isUuidShape(row.metadata.chat_conversation_id)
          ? [row.metadata.chat_conversation_id]
          : [],
      ),
    ),
  ];
}
export interface TransferContextItem {
  callId: string;
  eventId: number;
  observedAt: string;
  conversationId: string | null;
}
export function projectTransferContexts(
  observations: TransferContextEvent[],
  calls: TransferContextCall[],
  sessions: TransferContextEvent[],
  conversations: TransferContextConversation[],
): TransferContextItem[] {
  const seen = new Set<string>();
  return observations.flatMap((event) => {
    if (
      event.entity_type !== "crm_interaction" ||
      !event.entity_id ||
      !isUuidShape(event.entity_id) ||
      seen.has(event.entity_id)
    )
      return [];
    seen.add(event.entity_id);
    // Every callback in this recent window must correlate, so a conflicting replay cannot choose a link.
    const related = observations.filter(
      (row) => row.entity_id === event.entity_id,
    );
    const parent = calls.find((row) => row.id === event.entity_id);
    const ids = related.map((row) =>
      transferConversationId(row, parent, sessions, conversations),
    );
    return [
      {
        callId: event.entity_id,
        eventId: event.id,
        observedAt: event.occurred_at,
        conversationId: ids.every((id) => id !== null && id === ids[0])
          ? ids[0]
          : null,
      },
    ];
  });
}
