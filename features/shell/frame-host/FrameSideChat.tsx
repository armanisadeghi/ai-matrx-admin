"use client";

// THE SIDE CHAT IN THE NEW APP FRAME — the frame's `loadCompanion` module. Loaded ONLY when the
// person first opens the side chat (FrameHostImpl's `import("./FrameSideChat")`, the one split
// point; it then stays mounted, inert while closed). The session is the same one the classic
// dock renders (`SideChatSession`); the frame owns the geometry, so this is the plain panel.
import { X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { SideChatPanel, SideChatSession } from "@ai-matrx/chat/canvas/workspace/SideChatSession";
import type { CompanionProps } from "@/features/shell/frame/types";
import { useFrameSideChatHost } from "./frameSideChatHost";

export default function FrameSideChat({ onClose }: CompanionProps) {
  const host = useFrameSideChatHost();
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
        <SideChatPanel
          view={view}
          actions={<Button variant="quiet" icon={<X />} aria-label="Close side chat" title="Close side chat" onClick={onClose} className="shrink-0" />}
        />
      )}
    </SideChatSession>
  );
}
