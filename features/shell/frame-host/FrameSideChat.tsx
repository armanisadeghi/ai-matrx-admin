"use client";

// THE SIDE CHAT IN THE NEW APP FRAME — the frame's `loadCompanion` module. Loaded ONLY when the
// person first opens the side chat (FrameHostImpl's `import("./FrameSideChat")`, the one split
// point; it then stays mounted, inert while closed). The session is the same one the classic
// dock renders (`SideChatSession`); the frame owns the geometry, so this is the plain panel.
//
// Two hand-offs arrive from outside the chat: the page's ask bar (`companionSeed`: its words go
// into the composer, nothing is sent) and whatever the sidebar's history rows and page comments
// queued while the chat was still loading (`frameSideChatQueue`).
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { SideChatPanel, SideChatSession, type SideChatSessionView } from "@ai-matrx/chat/canvas/workspace/SideChatSession";
import { appendToComposerDraft } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/append-to-composer-draft.thunk";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { CompanionProps, CompanionSeed } from "@/features/shell/frame/types";
import { useFrameSideChatHost } from "./frameSideChatHost";
import { drainSideChatQueue, setSideChatMounted } from "./frameSideChatQueue";

/** Put each ask-bar send in the composer of the conversation on screen, once per send. */
function SeedDelivery({ view, seed }: { view: SideChatSessionView; seed?: CompanionSeed }) {
  const dispatch = useAppDispatch();
  const delivered = useRef(0);
  const conversationId = view.conversationId;
  useEffect(() => {
    if (!seed || !conversationId || delivered.current === seed.id) return;
    delivered.current = seed.id;
    dispatch(appendToComposerDraft(conversationId, seed.text));
  }, [seed, conversationId, dispatch]);
  return null;
}

export default function FrameSideChat({ onClose, companionSeed }: CompanionProps) {
  const host = useFrameSideChatHost();
  // The session registered its doors in its own effect (a child's runs first): hand over the queue.
  useEffect(() => {
    setSideChatMounted(true);
    drainSideChatQueue();
    return () => setSideChatMounted(false);
  }, []);
  return (
    <SideChatSession
      signedIn={host.signedIn}
      initialPathname={host.initialPathname}
      initialMode={host.initialMode}
      control={{ open: host.open, onOpenChange: host.onOpenChange }}
      // The frame shows the panel itself on every form (a covering panel on a phone).
      viewportCompact={false}
    >
      {(view) => (
        <>
          <SeedDelivery view={view} seed={companionSeed} />
          <SideChatPanel
            view={view}
            actions={<Button variant="quiet" icon={<X />} aria-label="Close side chat" title="Close side chat" onClick={onClose} className="shrink-0" />}
          />
        </>
      )}
    </SideChatSession>
  );
}
