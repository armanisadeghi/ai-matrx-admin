"use client";

/**
 * AiWatchWindow — the floating frame around Watch AI. Everything it shows (and the rules for who may see it)
 * lives in `features/ai-watch/useAiWatchPanel.tsx`, shared with the canvas tab (MKT-104). Open it with ONE call:
 * `useWatchAiRun()(…)` (features/overlays/openers/aiWatchWindow.tsx).
 */

import { useEffect } from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { useAppDispatch } from "@/lib/redux/hooks";
import { AI_WATCH_PAGE_INSTANCE, watchAiRunAction } from "@/features/overlays/openers/aiWatchWindow";
import { useAiWatchPanel, type AiWatchWindowProps } from "@/features/ai-watch/useAiWatchPanel";

export type { AiWatchWindowProps };

export default function AiWatchWindow(props: AiWatchWindowProps) {
  const { windowInstanceId, onClose, requestId = null, userRequestId = null, workflowRunId = null, conversationId = null, nodeId = null } = props;
  const dispatch = useAppDispatch();
  const panel = useAiWatchPanel({ ...props, framed: true });

  // ONE window per page: a window restored under an older per-call id folds into it.
  const legacy = windowInstanceId !== AI_WATCH_PAGE_INSTANCE;
  useEffect(() => {
    if (!legacy) return;
    dispatch(watchAiRunAction({ requestId, userRequestId, workflowRunId, conversationId, nodeId }));
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, [legacy]);

  if (panel.state === "legacy") return null;

  if (panel.state === "denied") {
    return (
      <WindowPanel
        id={`ai-watch-window-${windowInstanceId}`}
        title="Watch AI"
        overlayId="aiWatchWindow"
        overlayInstanceId={windowInstanceId}
        width={420}
        height={180}
        onClose={onClose}
      >
        <div className="p-3 text-xs text-muted-foreground">Watch AI is for system admins with debug mode on.</div>
      </WindowPanel>
    );
  }

  return (
    <WindowPanel
      id={`ai-watch-window-${windowInstanceId}`}
      title="Watch AI"
      overlayId="aiWatchWindow"
      overlayInstanceId={windowInstanceId}
      // ONE address entry for the page's one window: ?panels=ai-watch:page
      urlSyncId="page"
      minWidth={520}
      minHeight={320}
      // Docked low on the right: the page's own input (Smart Add's Website field) stays reachable.
      position="bottom-right"
      width={760}
      height="55dvh"
      onClose={onClose}
      onCollectData={() => ({
        windowInstanceId,
        requestId: null,
        userRequestId: panel.serverId,
        workflowRunId: null,
        conversationId: panel.conversationId,
        nodeId: null,
        label: null,
      })}
      bodyClassName="flex min-h-0 flex-1 overflow-hidden p-0"
    >
      {panel.body}
    </WindowPanel>
  );
}
