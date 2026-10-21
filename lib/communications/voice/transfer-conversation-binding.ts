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
/** Canonical call/session/owner/conversation binding, also used before the receiver bridge. */
export function boundTransferConversationId(
  call: TransferContextCall,
  sessions: TransferContextEvent[],
  conversations: TransferContextConversation[],
): string | null {
  if (
    call.deleted_at !== null ||
    call.channel_code !== "call" ||
    call.provider !== "twilio" ||
    !call.recording_owner_id ||
    !call.provider_account_id ||
    !call.provider_interaction_id
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
