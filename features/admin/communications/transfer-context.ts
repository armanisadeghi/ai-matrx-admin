import type { Tables } from "@/types/database.types";
import { isJsonObject } from "@/types/json";
import { isUuidShape } from "@ai-matrx/kit/uuid";
export type TransferContextEvent = Pick<
  Tables<{ schema: "platform" }, "activity_log">,
  | "id"
  | "action"
  | "entity_type"
  | "entity_id"
  | "organization_id"
  | "actor_id"
  | "occurred_at"
  | "metadata"
>;
export type TransferContextCall = Pick<
  Tables<{ schema: "crm" }, "interaction">,
  | "id"
  | "organization_id"
  | "recording_owner_id"
  | "provider"
  | "provider_account_id"
  | "provider_interaction_id"
  | "channel_code"
  | "deleted_at"
>;
export type TransferContextConversation = Pick<
  Tables<{ schema: "chat" }, "conversation">,
  "id" | "organization_id" | "created_by" | "deleted_at"
>;
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
  const matching = sessions.filter((row) => row.entity_id === call.id);
  if (matching.length !== 1) return null;
  const session = matching[0],
    m = session.metadata;
  if (
    session.action !== "voice.agent.session_reference.consumed" ||
    session.entity_type !== "crm_interaction" ||
    session.organization_id !== call.organization_id ||
    session.actor_id !== call.recording_owner_id ||
    !isJsonObject(m) ||
    m.interaction_id !== call.id ||
    m.organization_id !== call.organization_id ||
    m.actor_user_id !== call.recording_owner_id ||
    m.provider !== "twilio" ||
    m.provider_account_id !== call.provider_account_id ||
    m.provider_call_id !== call.provider_interaction_id ||
    typeof m.chat_conversation_id !== "string" ||
    !isUuidShape(m.chat_conversation_id)
  )
    return null;
  const chats = conversations.filter(
    (row) =>
      row.id === m.chat_conversation_id &&
      row.deleted_at === null &&
      row.organization_id === call.organization_id &&
      row.created_by === call.recording_owner_id,
  );
  return chats.length === 1 ? chats[0].id : null;
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
