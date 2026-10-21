import type { ReactNode } from "react";
import { CanvasToggle } from "@ai-matrx/canvas/react";
import { SurfaceAgentsHeaderButton } from "@ai-matrx/chat/surfaces/components/chrome/SurfaceAgentsHeaderButton";
import { InboxHeaderButton } from "@/features/notifications/components/InboxHeaderButton";
import { MessagesHeaderButton } from "@/features/messaging/components/shell/MessagesHeaderButton";
import { CommandBarHeaderButton } from "@/features/knowledge/command-bar/OpenCommandBarButtons";
import type { HeaderControlId } from "@/features/shell/shell-layout/contract";

/**
 * THE HEADER CONTROL SET's five controls, ONE copy for every host that draws them: AppShell's
 * `Header` (through `HeaderControlSet`) and the new app frame's right group
 * (`features/shell/frame-host/FrameChrome`, which drops `canvas` — the frame owns its own canvas
 * toggle). No directive: a server host keeps them server-rendered, a client host renders the same
 * client components.
 */
export function headerControls(isAuthenticated: boolean): Record<HeaderControlId, ReactNode> {
  return {
    search: <CommandBarHeaderButton isAuthenticated={isAuthenticated} />,
    intelligence: <SurfaceAgentsHeaderButton isAuthenticated={isAuthenticated} />,
    messages: <MessagesHeaderButton isAuthenticated={isAuthenticated} />,
    notifications: <InboxHeaderButton isAuthenticated={isAuthenticated} />,
    canvas: <CanvasToggle variant="transparent" />,
  };
}
