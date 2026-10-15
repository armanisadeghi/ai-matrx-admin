import {
  transferConversationId,
  type TransferContextEvent,
  type TransferContextCall,
  type TransferContextConversation,
} from "./transfer-context";
const id = "11111111-1111-4111-8111-111111111111",
  org = "22222222-2222-4222-8222-222222222222",
  actor = "33333333-3333-4333-8333-333333333333",
  chatId = "44444444-4444-4444-8444-444444444444";
const call: TransferContextCall = {
  id,
  organization_id: org,
  recording_owner_id: actor,
  provider: "twilio",
  provider_account_id: "AC" + "1".repeat(32),
  provider_interaction_id: "CA" + "2".repeat(32),
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
const event: TransferContextEvent = {
  id: 1,
  action: "voice.call.transfer_result.observed",
  entity_type: "crm_interaction",
  entity_id: id,
  organization_id: org,
  actor_id: null,
  occurred_at: "2026-10-15T16:00:00Z",
  metadata,
};
const session: TransferContextEvent = {
  ...event,
  id: 2,
  action: "voice.agent.session_reference.consumed",
  actor_id: actor,
};
const chat: TransferContextConversation = {
  id: chatId,
  organization_id: org,
  created_by: actor,
  deleted_at: null,
};
test("exact persisted call/session/conversation yields canonical id", () =>
  expect(transferConversationId(event, call, [session], [chat])).toBe(chatId));
test.each([
  { provider_call_id: "CA" + "9".repeat(32) },
  { provider_account_id: "AC" + "9".repeat(32) },
  { interaction_id: chatId },
  { organization_id: chatId },
  { actor_user_id: chatId },
  { chat_conversation_id: "not-an-id" },
])("mismatched session %o cannot expose another conversation", (change) => {
  expect(
    transferConversationId(
      event,
      call,
      [{ ...session, metadata: { ...metadata, ...change } }],
      [chat],
    ),
  ).toBeNull();
});
test.each([
  { organization_id: chatId },
  { recording_owner_id: chatId },
  { provider: "other" },
  { channel_code: "sms" },
  { deleted_at: "2026-10-15" },
])("wrong canonical parent %o refuses", (change) =>
  expect(
    transferConversationId(event, { ...call, ...change }, [session], [chat]),
  ).toBeNull(),
);
test.each([
  { organization_id: chatId },
  { created_by: chatId },
  { deleted_at: "2026-10-15" },
])("wrong or deleted conversation %o refuses", (change) =>
  expect(
    transferConversationId(event, call, [session], [{ ...chat, ...change }]),
  ).toBeNull(),
);
test.each(
  [
    [],
    [session, { ...session, id: 3 }],
    [{ ...session, metadata: null }],
    [{ ...session, actor_id: chatId }],
    [{ ...session, entity_type: "other" }],
  ].map((rows) => ({ rows })),
)("missing ambiguous malformed session refuses", ({ rows }) =>
  expect(transferConversationId(event, call, rows, [chat])).toBeNull(),
);
test("missing canonical records refuse", () => {
  expect(
    transferConversationId(event, undefined, [session], [chat]),
  ).toBeNull();
  expect(transferConversationId(event, call, [session], [])).toBeNull();
});
