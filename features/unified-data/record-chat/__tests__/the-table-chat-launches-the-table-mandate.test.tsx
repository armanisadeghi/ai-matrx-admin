/** The table page's side chat opens the `data.table_chat` mandate, never General Chat. */
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const launchMandate = jest.fn(() => new Promise(() => undefined));

jest.mock("@ai-matrx/agents/mandates", () => ({
  MANDATE_KEYS: { data__table_chat: "data.table_chat" },
}));
jest.mock("@ai-matrx/chat/agents/hooks/useAgentLauncher", () => ({ useAgentLauncher: () => ({ launchMandate }) }));
jest.mock("@ai-matrx/chat/agents/components/shared/AgentConversationColumn", () => ({ AgentConversationColumn: () => null }));
jest.mock("@ai-matrx/chat/agents/components/inputs/smart-input/composer/useComposerMode", () => ({
  useComposerMode: () => ({ mode: "chat" }),
}));
jest.mock("@ai-matrx/chat/agents/components/inputs/smart-input/composer/useCompactInputMaxHeight", () => ({
  useCompactInputMaxHeight: () => ({ measureRef: () => undefined, maxInputHeightPx: 200 }),
}));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ schema: () => ({ rpc: async () => ({ error: null }) }) }) }));
jest.mock("@/features/organizations/organizationsIAmIn", () => ({ mayReadAsMember: async () => true }));

import { RecordScopedChat } from "../RecordScopedChat";

it("launches data.table_chat for the table page's chat", async () => {
  const ctx = { surfaceKey: "table-chat-1", recordId: "r1", withheld: [] } as never;
  const root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(<RecordScopedChat ctx={ctx} organizationId="org-1" />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  expect(launchMandate).toHaveBeenCalled();
  expect(launchMandate.mock.calls[0]).toEqual(["data.table_chat", expect.objectContaining({ surfaceKey: "table-chat-1" })]);
});
