"use client";

/**
 * AgentRunPage
 *
 * The full execution page for an agent run.
 * Creates an execution instance via useAgentLauncher (managed mode), which snapshots
 * the agent's variableDefinitions and settings ONCE at creation time.
 * After that, the instance is fully self-contained — agentId is not
 * referenced again by any component or selector.
 *
 * Layout:
 *   ┌────────────────────────────────────┐
 *   │  Sidebar (runs history) │   Main   │
 *   │                         │   conv   │
 *   │                         │   area   │
 *   └────────────────────────────────────┘
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";
import { selectAgentExecutionPayload } from "@/features/agents/redux/agent-definition/selectors";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { fetchConversationHistory } from "@/features/cx-chat/redux/thunks";
import { setFocus } from "@/features/agents/redux/execution-system/conversation-focus/conversation-focus.slice";
import { AgentRunsSidebar } from "./AgentRunsSidebar";
import { AgentLauncherSidebarTester } from "../run-controls/AgentLauncherSidebarTester";
import { AgentConversationColumn } from "../shared/AgentConversationColumn";
import { Loader2, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgentRunPageProps {
  agentId: string;
}

export function AgentRunPage({ agentId }: AgentRunPageProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const executionPayload = useAppSelector((state) =>
    selectAgentExecutionPayload(state, agentId),
  );

  const [isInitializing, setIsInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const currentRunId = searchParams.get("runId") ?? undefined;
  const conversationIdFromUrl = searchParams.get("conversationId") ?? undefined;

  console.log("[AgentRunPage] conversationIdFromUrl", conversationIdFromUrl);
  console.log("[AgentRunPage] currentRunId", currentRunId);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setIsInitializing(true);
      try {
        if (!executionPayload.isReady) {
          await dispatch(fetchAgentExecutionMinimal(agentId)).unwrap();
        }
      } catch (err) {
        console.error("Failed to load agent execution payload:", err);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const surfaceKey = `agent-runner:${agentId}`;
  const { conversationId } = useAgentLauncher(agentId, {
    surfaceKey,
    sourceFeature: "agent-runner",
    ready: !isInitializing,
  });

  // Sync ?conversationId= URL param → focus registry + load history.
  // When the user clicks a past conversation in the sidebar, the URL updates
  // and this effect creates/reuses an instance keyed by that server UUID,
  // loads the full message history, and switches focus.
  const lastSyncedUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!conversationIdFromUrl || isInitializing) return;
    if (conversationIdFromUrl === lastSyncedUrl.current) return;
    if (conversationIdFromUrl === conversationId) return;
    lastSyncedUrl.current = conversationIdFromUrl;

    (async () => {
      const exists =
        !!store.getState().executionInstances?.byConversationId[
          conversationIdFromUrl
        ];

      if (!exists) {
        await dispatch(
          createManualInstance({
            agentId,
            conversationId: conversationIdFromUrl,
            mode: "conversation",
          }),
        );
      }

      dispatch(
        fetchConversationHistory({ conversationId: conversationIdFromUrl }),
      );
      dispatch(setFocus({ surfaceKey, conversationId: conversationIdFromUrl }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIdFromUrl, isInitializing, conversationId]);

  if (isInitializing || !conversationId) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Loading agent...</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      {!isMobile && sidebarOpen && (
        <div className="w-64 shrink-0 border-r border-border overflow-hidden flex flex-col">
          <AgentRunsSidebar
            agentId={agentId}
            conversationId={conversationId}
            surfaceKey={surfaceKey}
            conversationIdFromUrl={conversationIdFromUrl}
            currentRunId={currentRunId}
            onClose={() => setSidebarOpen(false)}
          />
          <div className="shrink-0 border-t border-border">
            <AgentLauncherSidebarTester conversationId={conversationId} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex justify-center min-w-0">
        {!isMobile && !sidebarOpen && (
          <div
            className="absolute left-1 z-10"
            style={{ top: "var(--shell-header-h)" }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSidebarOpen(true)}
              title="Show history"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        <AgentConversationColumn
          conversationId={conversationId}
          surfaceKey={surfaceKey}
          constrainWidth
          smartInputProps={{
            sendButtonVariant: "blue",
            showSubmitOnEnterToggle: true,
          }}
        />
      </div>
    </div>
  );
}
