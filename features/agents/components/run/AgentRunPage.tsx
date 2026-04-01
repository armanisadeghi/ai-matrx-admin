"use client";

/**
 * AgentRunPage
 *
 * The full execution page for an agent run.
 * Creates an execution instance via createManualInstance, which snapshots
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

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";
import { selectAgentExecutionPayload } from "@/features/agents/redux/agent-definition/selectors";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { AgentConversationDisplay } from "./AgentConversationDisplay";
import { AgentRunsSidebar } from "./AgentRunsSidebar";
import { SmartAgentInput } from "../smart";
import { Loader2, Bot, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgentRunPageProps {
  agentId: string;
  agentName: string;
}

export function AgentRunPage({ agentId, agentName }: AgentRunPageProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const executionPayload = useAppSelector((state) =>
    selectAgentExecutionPayload(state, agentId),
  );

  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isInitializing, setIsInitializing] = useState(true);

  const currentRunId = searchParams.get("runId") ?? undefined;

  // Step 1: Ensure execution payload is loaded from the backend
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

  // Step 2: Create the instance once payload is ready
  useEffect(() => {
    if (isInitializing) return;

    let createdId: string | null = null;

    dispatch(createManualInstance({ agentId }))
      .unwrap()
      .then((id) => {
        createdId = id;
        setInstanceId(id);
      })
      .catch((err) => {
        console.error("Failed to create instance:", err);
      });

    return () => {
      if (createdId) {
        dispatch(destroyInstance(createdId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, isInitializing]);

  const handleNewRun = useCallback(() => {
    if (!instanceId) return;

    // Destroy current instance, start fresh
    dispatch(destroyInstance(instanceId));
    setInstanceId(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("runId");
    router.replace(`${pathname}?${params.toString()}`);

    dispatch(createManualInstance({ agentId }))
      .unwrap()
      .then((id) => setInstanceId(id))
      .catch((err) => console.error("Failed to create instance:", err));
  }, [instanceId, agentId, dispatch, pathname, router, searchParams]);

  if (isInitializing || !instanceId) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Loading agent...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      {!isMobile && sidebarOpen && (
        <div className="w-64 shrink-0 border-r border-border overflow-hidden flex flex-col">
          <AgentRunsSidebar
            agentId={agentId}
            agentName={agentName}
            currentRunId={currentRunId}
            onNewRun={handleNewRun}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Hide history" : "Show history"}
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium truncate">{agentName}</span>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <AgentConversationDisplay instanceId={instanceId} />
        </div>

        {/* Input — SmartAgentInput includes variable panel and resource chips */}
        <div className="px-3 pb-3 pt-2 border-t border-border">
          <SmartAgentInput
            instanceId={instanceId}
            sendButtonVariant="blue"
            showSubmitOnEnterToggle
          />
        </div>
      </div>
    </div>
  );
}
