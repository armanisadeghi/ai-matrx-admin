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

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";
import { selectAgentExecutionPayload } from "@/features/agents/redux/agent-definition/selectors";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
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
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const executionPayload = useAppSelector((state) =>
    selectAgentExecutionPayload(state, agentId),
  );

  const [isInitializing, setIsInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const currentRunId = searchParams.get("runId") ?? undefined;
  const conversationIdFromUrl = searchParams.get("conversationId") ?? undefined;

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

  const { instanceId, setInstanceId } = useAgentLauncher(agentId, {
    sourceFeature: "agent-runner",
    ready: !isInitializing,
  });

  if (isInitializing || !instanceId) {
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
            instanceId={instanceId}
            conversationIdFromUrl={conversationIdFromUrl}
            currentRunId={currentRunId}
            onInstanceCreated={setInstanceId}
            onClose={() => setSidebarOpen(false)}
          />
          <div className="shrink-0 border-t border-border">
            <AgentLauncherSidebarTester instanceId={instanceId} />
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
          instanceId={instanceId}
          onNewInstance={setInstanceId}
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
