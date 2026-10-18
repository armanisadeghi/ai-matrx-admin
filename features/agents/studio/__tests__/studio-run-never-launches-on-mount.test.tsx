/**
 * A run starts only on the person's own action. Resizing the window swaps the Studio's three panes for tabs
 * (or back), which REMOUNTS the center run; it used to start another paid run (a6fdb187). A mount that finds
 * its run already launched must reopen that conversation, never launch.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

const launchAgent = jest.fn(async (_id: string, opts: { onConversationCreated?: (id: string) => void }) => {
  opts.onConversationCreated?.(`conv-${launchAgent.mock.calls.length}`);
});
const launchMandate = jest.fn();
const dispatch = jest.fn(() => ({ unwrap: () => Promise.resolve() }));

jest.mock("@ai-matrx/chat/agents/hooks/useAgentLauncher", () => ({ useAgentLauncher: () => ({ launchAgent, launchMandate }) }));
jest.mock("@ai-matrx/chat/agents/components/smart/AgentRunner", () => ({ AgentRunner: () => null }));
jest.mock("@ai-matrx/chat/host", () => ({ registerConversationHooks: () => () => undefined }));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/thunks/load-conversation.thunk", () => ({ loadConversation: (a: unknown) => a }));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors", () => ({ selectOrderedMessageIds: () => () => ["m1"] }));
jest.mock("@ai-matrx/design-system/controls", () => ({ RegionSkeleton: () => null }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => dispatch, useAppStore: () => ({ getState: () => ({}) }) }));
jest.mock("../components/StudioTurnModel", () => ({ StudioTurnModel: () => null }));

import { StudioRun, mountAction } from "../components/StudioRun";

describe("StudioRun mounts", () => {
  beforeEach(() => launchAgent.mockClear());

  it("a remount of the same run reopens it and launches nothing", async () => {
    const props = { agentId: "agent-1", surfaceKey: "k", seed: { userInput: "go" }, runKey: 1 };
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    const first = createRoot(host);
    await act(async () => first.render(<StudioRun {...props} />));
    expect(launchAgent).toHaveBeenCalledTimes(1); // the person's own "Run again"
    await act(async () => first.unmount());
    const second = createRoot(document.createElement("div"));
    await act(async () => second.render(<StudioRun {...props} />)); // the resize remount: no URL run id yet
    expect(launchAgent).toHaveBeenCalledTimes(1);
  });

  it("decides open before launch for any known run", () => {
    expect(mountAction("a:0", "c1", 0, new Map())).toEqual({ kind: "open", conversationId: "c1" });
    expect(mountAction("a:2", null, 2, new Map([["a:2", "c9"]]))).toEqual({ kind: "open", conversationId: "c9" });
    expect(mountAction("a:3", "old", 3, new Map())).toEqual({ kind: "launch" });
  });
});
