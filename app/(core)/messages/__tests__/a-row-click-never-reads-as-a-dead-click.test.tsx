/**
 * A ROW CLICK IN /messages NEVER READS AS A DEAD CLICK.
 *
 * 2026-10-15 user walk: clicking a conversation row lit the row and dropped the
 * unread count, but the URL stayed `/messages` and the pane kept saying "Pick or
 * start a conversation". The thread is a route; the push waited 3–17s on a busy
 * server with nothing on screen saying so.
 *
 * The real layout and page render here; only the list (one row through the real
 * row chrome), the router and the heavy app frames are stand-ins. The router never
 * arrives, which is exactly the slow round trip: the clicked row must say it is
 * opening, the pane must say "Opening conversation…", a second click must not push
 * twice, and the moment the route lands the "opening" state clears.
 *
 * RED without the fix: `MessagesLayoutClient` / `MessagesPageClient` call
 * `router.push` directly, so the pane still says "Pick or start a conversation".
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockPathname = "/messages";
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock("@ai-matrx/canvas/react", () => ({ useOptionalCanvas: () => null }));
jest.mock("@/features/messaging/canvas/messagesKind", () => ({ closeMessagesTab: () => {} }));
jest.mock("@/features/messaging/components/shell/MessagesListHeader", () => ({
  MessagesListHeader: () => null,
}));
jest.mock("@/features/messaging/lib/useMessagesSurfaceScope", () => ({
  useMessagesSurfaceScope: () => () => ({}),
}));
jest.mock("@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext", () => ({
  SurfaceRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/features/messaging/components/ConversationListPane", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MessagingConversationRowChrome } = require("@/features/messaging/components/MessagingChrome");
  return {
    ConversationListPane: ({ onSelect }: { onSelect?: (id: string) => void }) => (
      <MessagingConversationRowChrome conversation={{ conversation: { id: "c-agents-1" } }}>
        <button type="button" data-testid="row" onClick={() => onSelect?.("c-agents-1")}>
          Voice transfer settings
        </button>
      </MessagingConversationRowChrome>
    ),
  };
});

import MessagesLayoutClient from "@/app/(core)/messages/MessagesLayoutClient";
import MessagesPageClient from "@/app/(core)/messages/MessagesPageClient";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  mockPathname = "/messages";
  mockPush.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = () =>
  act(() => {
    root.render(
      <MessagesLayoutClient>
        <MessagesPageClient />
      </MessagesLayoutClient>,
    );
  });

const rows = () => Array.from(container.querySelectorAll<HTMLButtonElement>('[data-testid="row"]'));

it("a clicked row and the pane say the thread is opening until its route lands", () => {
  render();
  expect(container.textContent).toContain("Pick or start a conversation");

  act(() => rows()[0]!.click());

  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith("/messages/c-agents-1");
  expect(container.textContent).toContain("Opening conversation…");
  expect(container.textContent).not.toContain("Pick or start a conversation");
  for (const row of rows()) {
    expect(row.closest("[data-conversation-id]")?.hasAttribute("data-opening")).toBe(true);
  }

  // A second click (the list beside the thread or the phone list) does not push twice.
  act(() => rows()[1]!.click());
  expect(mockPush).toHaveBeenCalledTimes(1);

  // The route lands: nothing is "opening" any more.
  mockPathname = "/messages/c-agents-1";
  render();
  expect(container.textContent).not.toContain("Opening conversation…");
  expect(container.querySelector("[data-opening]")).toBeNull();
});
