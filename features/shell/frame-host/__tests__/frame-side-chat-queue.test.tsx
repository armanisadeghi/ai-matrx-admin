/**
 * HISTORY ROWS AND COMMENTS REACH THE SIDE CHAT BEFORE IT HAS LOADED (frame mode).
 * The frame registers stand-in doors: using one opens the side chat and queues the act; once the
 * real session's doors exist, the queue drains through them, in order, exactly once.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  currentInPlaceChatHost,
  registerInPlaceChatHost,
} from "@ai-matrx/chat/agents/components/chat/in-place-chat-host";
import {
  activeRemarkSink,
  registerRemarkSink,
  resetRemarkSinksForTest,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-resources/remark-sink";
import {
  drainSideChatQueue,
  queuedSideChatActs,
  setSideChatMounted,
  useEarlySideChatDoors,
} from "../frameSideChatQueue";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ open, enabled = true }: { open: () => void; enabled?: boolean }) {
  useEarlySideChatDoors({ enabled, open });
  return null;
}

let root: Root;
let el: HTMLElement;
beforeEach(() => {
  el = document.createElement("div");
  document.body.append(el);
  root = createRoot(el);
});
afterEach(() => {
  act(() => root.unmount());
  setSideChatMounted(false);
  drainSideChatQueue();
  resetRemarkSinksForTest();
  el.remove();
});

describe("the stand-in doors", () => {
  it("a history row opens the side chat and waits; the real doors get it on drain", () => {
    const open = jest.fn();
    act(() => root.render(<Probe open={open} />));
    currentInPlaceChatHost()?.openConversation({ conversationId: "c1", agentId: "a1" });
    currentInPlaceChatHost()?.startNewChat();
    expect(open).toHaveBeenCalledTimes(2);
    expect(queuedSideChatActs()).toHaveLength(2);

    const real = {
      activeConversationId: null,
      openConversation: jest.fn(),
      startNewChat: jest.fn(),
      startWithAgent: jest.fn(),
    };
    const release = registerInPlaceChatHost(real);
    drainSideChatQueue();
    release();
    expect(real.openConversation).toHaveBeenCalledWith({ conversationId: "c1", agentId: "a1" });
    expect(real.startNewChat).toHaveBeenCalledTimes(1);
    expect(queuedSideChatActs()).toHaveLength(0);
  });

  it("a comment opens the side chat and is staged into the real sink on drain", () => {
    const open = jest.fn();
    act(() => root.render(<Probe open={open} />));
    const item = { kind: "text", text: "hello" } as never;
    activeRemarkSink()?.stage(item);
    expect(open).toHaveBeenCalledTimes(1);
    const stage = jest.fn();
    const release = registerRemarkSink({ stage });
    drainSideChatQueue();
    release();
    expect(stage).toHaveBeenCalledWith(item);
  });

  it("they are released once the side chat is mounted, and when disabled", () => {
    act(() => root.render(<Probe open={jest.fn()} enabled={false} />));
    expect(currentInPlaceChatHost()).toBeNull();
    act(() => root.render(<Probe open={jest.fn()} />));
    expect(currentInPlaceChatHost()).not.toBeNull();
    act(() => setSideChatMounted(true));
    expect(currentInPlaceChatHost()).toBeNull();
    expect(activeRemarkSink()).toBeNull();
  });
});
