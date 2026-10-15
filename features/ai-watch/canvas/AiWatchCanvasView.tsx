"use client";

/** The body of the Watch AI canvas tab: the page's one Watch AI, without a window frame (rail above the call). */

import { AI_WATCH_PAGE_INSTANCE } from "@/features/overlays/openers/aiWatchWindow";
import { useAiWatchPanel } from "../useAiWatchPanel";

export default function AiWatchCanvasView() {
  const panel = useAiWatchPanel({ windowInstanceId: AI_WATCH_PAGE_INSTANCE, onClose: () => undefined, framed: false });
  if (panel.state === "denied") {
    return <div className="p-3 text-xs text-muted-foreground">Watch AI is for system admins with debug mode on.</div>;
  }
  return panel.state === "ready" ? <div className="flex h-full min-h-0 flex-col overflow-hidden">{panel.body}</div> : null;
}
