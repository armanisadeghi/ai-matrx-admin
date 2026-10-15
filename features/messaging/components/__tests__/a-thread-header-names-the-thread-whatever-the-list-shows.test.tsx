/**
 * THE THREAD HEADER NAMES THE THREAD, WHATEVER THE LIST BESIDE IT SHOWS (2026-10-15 walk).
 *
 * The header sometimes read "Conversation" instead of the thread's name. It looked the open
 * conversation up in the conversation LIST — which is filtered (People | Agents | All, Unread,
 * archived) and paged. Open an agent room, switch the list to People, and the room leaves that
 * array while its summary stays in the store: the header fell back to its placeholder.
 *
 * Here the store holds the room's summary and the visible list does NOT carry it (People view).
 * RED without the fix: the header prints "Conversation".
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ROOM = "11111111-1111-4111-8111-111111111111";
const ME = "33333333-3333-4333-8333-333333333333";

const roomSummary = {
  conversation: { id: ROOM, type: "group", groupName: "Voice transfer settings", metadata: {} },
  participants: [{ userId: ME, displayName: "Me", isAgent: false }],
  displayName: "Voice transfer settings",
  displayImageUrl: null,
  unreadCount: 0,
};

const snapshot = {
  // The People view: the agent room is not on this page.
  conversations: [],
  conversationSummaries: new Map([[ROOM, roomSummary]]),
};

jest.mock("@ai-matrx/messaging/react", () => ({
  useConversations: () => ({ conversations: snapshot.conversations }),
  useMessagingSnapshot: () => snapshot,
  useMessagingHost: () => ({ identity: { userId: ME } }),
  useOnlineUserIds: () => new Set<string>(),
}));
jest.mock("@ai-matrx/meet/react", () => ({
  useCalls: () => ({ canCall: false, call: async () => undefined }),
  asUserId: (id: string) => id,
}));
jest.mock("@/features/messaging/lib/useMessagePins", () => ({
  useMessagePins: () => ({ pins: [], toggle: async () => undefined, pending: false }),
}));
jest.mock("@/features/messaging/components/NewConversationDialog", () => ({
  NewConversationDialog: () => null,
}));

import { MessagesConversationHeader } from "@/features/messaging/components/MessagesConversationHeader";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("prints the room's real name when the filtered list does not carry the room", async () => {
  await act(async () =>
    root.render(<MessagesConversationHeader conversationId={ROOM} onSelect={() => undefined} />),
  );
  const header = container.querySelector("header");
  expect(header?.textContent).toContain("Voice transfer settings");
  expect(header?.textContent).not.toContain("Conversation");
});
