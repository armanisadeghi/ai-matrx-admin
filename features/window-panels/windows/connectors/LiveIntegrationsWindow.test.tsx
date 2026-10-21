/**
 * THE BROWSE WINDOW, OPENED FROM A CHAT (defects H and B, round 2; Arman, 2026-10-20: "anything done in
 * the Browse window carries back to the chat they came from").
 *
 *   H  opening it lands on its LIST (or the typed search / the named provider) — every open, even over
 *      a window an earlier visit left on some connector's detail: a new `openedAt` restarts the list.
 *   B  while it is up it is a connect flow for the chat that opened it, and when it goes the chat is
 *      told, so the chat reads Google once more and adopts what was connected here.
 *
 * Mutation: drop `key={openedAt}` and the restart case goes RED; drop the begin/end effect and the flow
 * cases go RED.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { connectFlowState, resetConnectIntents } from "@ai-matrx/chat/agents/connectors/connect-intent-store";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockMounts = { count: 0, lastProps: null as null | Record<string, unknown> };
jest.mock("@/features/connectors/LiveIntegrationsList", () => ({
  LiveIntegrationsList: (props: Record<string, unknown>) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      mockMounts.count += 1;
    }, []);
    mockMounts.lastProps = props;
    return <div data-testid="list" />;
  },
}));
jest.mock("@ai-matrx/summon/window", () => ({
  WindowPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@ai-matrx/context-menu/react", () => ({
  NonEditableContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn() }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock("@ai-matrx/chat/agents/redux/mcp/mcp.slice", () => ({ fetchCatalog: jest.fn(() => ({ type: "noop" })) }));
jest.mock("@/features/marketing/google/hooks", () => ({ googleConnectionKeys: { inventory: ["google"] } }));

import LiveIntegrationsWindow from "./LiveIntegrationsWindow";

let root: Root;
beforeEach(() => {
  resetConnectIntents();
  mockMounts.count = 0;
  mockMounts.lastProps = null;
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
});

const render = (props: Partial<React.ComponentProps<typeof LiveIntegrationsWindow>>) =>
  act(async () => root.render(<LiveIntegrationsWindow isOpen onClose={jest.fn()} {...props} />));

describe("the window lands where it was asked to, every open (H)", () => {
  it("on its list when asked for nothing", async () => {
    await render({ openedAt: 1 });
    expect(mockMounts.lastProps).toMatchObject({ provider: null, search: "" });
  });

  it("on what the person searched in the chat's menu", async () => {
    await render({ openedAt: 1, search: "outlook" });
    expect(mockMounts.lastProps).toMatchObject({ provider: null, search: "outlook" });
  });

  it("on the named provider's card", async () => {
    await render({ openedAt: 1, provider: "supabase" });
    expect(mockMounts.lastProps).toMatchObject({ provider: "supabase" });
  });

  it("a second open restarts the list, so a detail an earlier visit left open is not where it lands", async () => {
    await render({ openedAt: 1 });
    expect(mockMounts.count).toBe(1);
    await render({ openedAt: 2 });
    expect(mockMounts.count).toBe(2);
    // The same open rendering again does not restart it (a re-render is not a new visit).
    await render({ openedAt: 2 });
    expect(mockMounts.count).toBe(2);
  });
});

describe("opened from a chat it is a connect flow for that chat (B)", () => {
  it("carries the chat to the list, which offers 'In this chat' for it", async () => {
    await render({ openedAt: 1, conversationId: "chat-1" });
    expect(mockMounts.lastProps).toMatchObject({ conversationId: "chat-1" });
  });

  it("is open while the window is up and the chat is told when it closes", async () => {
    await render({ openedAt: 1, conversationId: "chat-1" });
    expect(connectFlowState("chat-1")).toBe("open");
    await act(async () => root.unmount());
    expect(connectFlowState("chat-1")).toBe("settling");
    root = createRoot(document.createElement("div"));
  });

  it("a window opened from no chat starts no flow", async () => {
    await render({ openedAt: 1 });
    expect(connectFlowState("chat-1")).toBe("idle");
  });
});
