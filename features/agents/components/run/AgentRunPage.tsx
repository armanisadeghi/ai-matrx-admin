"use client";

/**
 * AgentRunPage
 *
 * The full execution page for an agent run.
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │   Sidebar (runs history)  │ Main │
 *   │                           │ conv │
 *   │                           │ area │
 *   └──────────────────────────────────┘
 *
 * State management:
 * - On mount: checks execution payload; fetches if not ready.
 * - Creates a run instance in agentExecution slice.
 * - URL param ?runId= enables direct run loading/sharing.
 * - Sidebar queries Supabase directly (Python manages persistence).
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentExecutionPayload,
} from "@/features/agents/redux/agent-definition/selectors";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";
import {
  createInstance,
  clearInstance,
} from "@/features/agents/redux/agent-execution/slice";
import {
  selectInstanceStatus,
  selectInstanceError,
} from "@/features/agents/redux/agent-execution/selectors";
import { AgentConversationDisplay } from "./AgentConversationDisplay";
import { AgentRunInput } from "./AgentRunInput";
import { AgentVariableInputForm } from "./AgentVariableInputForm";
import { AgentRunsSidebar } from "./AgentRunsSidebar";
import { Loader2, Bot, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { VariableDefinition } from "@/features/agents/redux/agent-definition/types";

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

  const record = useAppSelector((state) => selectAgentById(state, agentId));
  const executionPayload = useAppSelector((state) =>
    selectAgentExecutionPayload(state, agentId),
  );

  const [runId, setRunId] = useState<string>(() => uuidv4());
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isInitializing, setIsInitializing] = useState(true);

  const currentRunId = searchParams.get("runId") ?? undefined;
  const status = useAppSelector((state) => selectInstanceStatus(state, runId));
  const error = useAppSelector((state) => selectInstanceError(state, runId));

  // Initialize: fetch execution payload if not ready, then create instance
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setIsInitializing(true);
      try {
        let payload = executionPayload;
        if (!payload.isReady) {
          await dispatch(fetchAgentExecutionMinimal(agentId)).unwrap();
          // After fetch, re-read from store — selector will update after dispatch
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

  // Create run instance after initialization
  useEffect(() => {
    if (isInitializing) return;
    dispatch(
      createInstance({
        runId,
        agentId,
        isVersion: executionPayload.isVersion ?? false,
        agentName,
        variableDefaults: (executionPayload.variableDefinitions ??
          []) as VariableDefinition[],
        contextSlots: executionPayload.contextSlots ?? [],
      }),
    );
    return () => {
      dispatch(clearInstance({ runId }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, isInitializing]);

  const handleNewRun = useCallback(() => {
    // Clear current instance + URL param, create fresh run
    dispatch(clearInstance({ runId }));
    const newRunId = uuidv4();
    setRunId(newRunId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("runId");
    router.replace(`${pathname}?${params.toString()}`);
    // Instance will be created by the effect above (after runId changes)
    dispatch(
      createInstance({
        runId: newRunId,
        agentId,
        isVersion: executionPayload.isVersion ?? false,
        agentName,
        variableDefaults: (executionPayload.variableDefinitions ??
          []) as VariableDefinition[],
        contextSlots: executionPayload.contextSlots ?? [],
      }),
    );
    setRunId(newRunId);
  }, [
    agentId,
    agentName,
    dispatch,
    executionPayload,
    pathname,
    router,
    runId,
    searchParams,
  ]);

  if (isInitializing) {
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
          {error && (
            <div className="mx-4 mt-4 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <AgentConversationDisplay runId={runId} />
        </div>

        {/* Variable form */}
        <div className="px-4 py-2 border-t border-border">
          <AgentVariableInputForm runId={runId} />
        </div>

        {/* Input */}
        <AgentRunInput runId={runId} />
      </div>

      {/* Mobile sidebar as overlay (bottom sheet-style approach would go here) */}
    </div>
  );
}
