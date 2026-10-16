/** A record's Ask panel: composer alone when empty, one settled definite height once a message exists (no clipped transcript, no blank). */
import { recordContextEntries, recordChatFrameClass, RECORD_CHAT_ACTIVE_FRAME, RECORD_CHAT_EMPTY_FRAME } from "../RecordScopedChat";

jest.mock("@ai-matrx/agents/mandates", () => ({ MANDATE_KEYS: { data__table_chat: "data.table_chat" } }));
jest.mock("@ai-matrx/chat/agents/hooks/useAgentLauncher", () => ({ useAgentLauncher: () => ({ launchMandate: jest.fn() }) }));
jest.mock("@ai-matrx/chat/agents/components/shared/AgentConversationColumn", () => ({ AgentConversationColumn: () => null }));
jest.mock("@ai-matrx/chat/agents/components/inputs/smart-input/composer/useComposerMode", () => ({ useComposerMode: () => ({ mode: "chat" }) }));
jest.mock("@ai-matrx/chat/agents/components/inputs/smart-input/composer/useCompactInputMaxHeight", () => ({ useCompactInputMaxHeight: () => ({ measureRef: () => undefined, maxInputHeightPx: 200 }) }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/features/organizations/organizationsIAmIn", () => ({ mayReadAsMember: async () => true }));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors", () => ({ selectMessageCount: () => () => 0 }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (f: () => number) => f(), useAppDispatch: () => jest.fn() }));

it("is content-sized while empty and definite-height once it has messages", () => {
  expect(recordChatFrameClass(false)).toBe(RECORD_CHAT_EMPTY_FRAME);
  expect(recordChatFrameClass(true)).toBe(RECORD_CHAT_ACTIVE_FRAME);
  expect(RECORD_CHAT_EMPTY_FRAME).not.toMatch(/(^|\s)h-/);
  expect(RECORD_CHAT_ACTIVE_FRAME).toMatch(/(^|\s)h-\[/);
});

it("hands the record's own facts to the first turn as context, labelled", () => {
  const e = recordContextEntries({ title: "1A", tableName: "Rentals", entries: [{ key: "rent", label: "Rent", value: 1800, type: "text" }, { key: "tenant", label: "Tenant", value: "Rivera", type: "text" }] });
  expect(e.map((x) => x.key)).toEqual(["record_about", "record_fact_rent", "record_fact_tenant"]);
  expect(e[1].value).toEqual({ content: "1800", type: "text", label: "Rent" });
});
