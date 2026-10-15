import type {
  TransferContextCall,
  TransferContextEvent,
  TransferContextConversation,
} from "../transfer-context";
export function contextFixture(index = 1) {
  const org = "22222222-2222-4222-8222-222222222222",
    actor = "33333333-3333-4333-8333-333333333333";
  const id = `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`,
    chatId = `${String(index).padStart(8, "0")}-4444-4444-8444-444444444444`;
  const call: TransferContextCall = {
    id,
    organization_id: org,
    recording_owner_id: actor,
    provider: "twilio",
    provider_account_id: "AC" + "1".repeat(32),
    provider_interaction_id: "CA" + String(index).repeat(32),
    channel_code: "call",
    deleted_at: null,
  };
  const metadata = {
    provider: "twilio",
    provider_account_id: call.provider_account_id,
    provider_call_id: call.provider_interaction_id,
    interaction_id: id,
    organization_id: org,
    actor_user_id: actor,
    chat_conversation_id: chatId,
  };
  const observation: TransferContextEvent = {
    id: index,
    action: "voice.call.transfer_result.observed",
    entity_type: "crm_interaction",
    entity_id: id,
    organization_id: org,
    actor_id: null,
    occurred_at: "2026-10-15T16:00:00Z",
    metadata,
  };
  const session: TransferContextEvent = {
    ...observation,
    id: index + 100,
    action: "voice.agent.session_reference.consumed",
    actor_id: actor,
  };
  const chat: TransferContextConversation = {
    id: chatId,
    organization_id: org,
    created_by: actor,
    deleted_at: null,
  };
  return { call, observation, session, chat };
}
