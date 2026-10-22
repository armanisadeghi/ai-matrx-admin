"use client";

// THE SIDE CHAT'S DOORS BEFORE IT LOADS. The frame loads the side chat on first open, but the
// sidebar's history rows (`in-place-chat-host`) and every page comment (`remark-sink`) look for
// the chat's doors the moment they are used. Until the real session registers them, the frame
// registers stand-ins (`useEarlySideChatDoors`) that OPEN the side chat and queue the act;
// `FrameSideChat` drains the queue through the real doors as soon as it mounts. Only the two
// tiny registry modules are imported here — the chat itself stays behind the dynamic import.
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  currentInPlaceChatHost,
  registerInPlaceChatHost,
  type InPlaceChatHost,
} from "@ai-matrx/chat/agents/components/chat/in-place-chat-host";
import {
  activeRemarkSink,
  registerRemarkSink,
  type RemarkSink,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-resources/remark-sink";

type JobArgs = Parameters<NonNullable<InPlaceChatHost["startJob"]>>;
type RemarkArgs = Parameters<RemarkSink["stage"]>;

type HostAct =
  | { kind: "open"; conversationId: string; agentId?: string | null }
  | { kind: "new" }
  | { kind: "agent"; agentId: string }
  | { kind: "job"; args: JobArgs }
  | { kind: "remark"; args: RemarkArgs };

let queue: HostAct[] = [];
let mounted = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** The acts waiting for the side chat to load (tests). */
export function queuedSideChatActs(): readonly HostAct[] {
  return queue;
}

/** FrameSideChat mounts / unmounts: the real doors exist while it is mounted. */
export function setSideChatMounted(value: boolean) {
  mounted = value;
  emit();
}

function useSideChatMounted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => mounted,
    () => false,
  );
}

/** Deliver every queued act through the real doors (called by FrameSideChat once its session is mounted). */
export function drainSideChatQueue() {
  const acts = queue;
  queue = [];
  const host = currentInPlaceChatHost();
  const sink = activeRemarkSink();
  for (const act of acts) {
    if (act.kind === "remark") sink?.stage(...act.args);
    else if (!host) continue;
    else if (act.kind === "open") host.openConversation({ conversationId: act.conversationId, agentId: act.agentId });
    else if (act.kind === "new") host.startNewChat();
    else if (act.kind === "agent") host.startWithAgent(act.agentId);
    else host.startJob?.(...act.args);
  }
}

/** Register the stand-in doors while the side chat has not loaded; `open` opens the frame's side chat. */
export function useEarlySideChatDoors({ enabled, open }: { enabled: boolean; open: () => void }) {
  const loaded = useSideChatMounted();
  const latestOpen = useRef(open);
  useEffect(() => {
    latestOpen.current = open;
  });
  const active = enabled && !loaded;
  useEffect(() => {
    if (!active) return undefined;
    const act = (next: HostAct) => {
      queue = [...queue, next];
      latestOpen.current();
    };
    const releaseHost = registerInPlaceChatHost({
      activeConversationId: null,
      openConversation: (c) => act({ kind: "open", conversationId: c.conversationId, agentId: c.agentId }),
      startNewChat: () => act({ kind: "new" }),
      startWithAgent: (agentId) => act({ kind: "agent", agentId }),
      startJob: (...args: JobArgs) => act({ kind: "job", args }),
    });
    const releaseSink = registerRemarkSink({ stage: (...args) => act({ kind: "remark", args }) });
    return () => {
      releaseHost();
      releaseSink();
    };
  }, [active]);
}
