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

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";
import { selectAgentExecutionPayload } from "@/features/agents/redux/agent-definition/selectors";
import { recreateManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { selectLatestConversationId } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { AgentConversationDisplay } from "./AgentConversationDisplay";
import { AgentRunsSidebar } from "./AgentRunsSidebar";
import { AgentLauncherSidebarTester } from "../run-controls/AgentLauncherSidebarTester";
import { CreatorRunPanel } from "../run-controls/CreatorRunPanel";
import { SmartAgentInput } from "../inputs/SmartAgentInput";
import { ArrowDown, Loader2, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgentRunPageProps {
  agentId: string;
}

export function AgentRunPage({ agentId }: AgentRunPageProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { launchAgent } = useAgentLauncher();

  const executionPayload = useAppSelector((state) =>
    selectAgentExecutionPayload(state, agentId),
  );

  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isInitializing, setIsInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const currentRunId = searchParams.get("runId") ?? undefined;
  const conversationIdFromUrl = searchParams.get("conversationId") ?? undefined;
  const liveConversationId = useAppSelector((state) =>
    instanceId != null ? selectLatestConversationId(instanceId)(state) : null,
  );

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

    launchAgent(agentId, {
      sourceFeature: "agent-runner",
      autoRun: false,
      displayMode: "direct",
    })
      .then((result) => {
        createdId = result.instanceId;
        setInstanceId(result.instanceId);
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

    const params = new URLSearchParams(searchParams.toString());
    params.delete("runId");
    params.delete("conversationId");
    router.replace(`${pathname}?${params.toString()}`);

    dispatch(recreateManualInstance(instanceId))
      .unwrap()
      .then((id) => setInstanceId(id))
      .catch((err) => console.error("Failed to create instance:", err));
  }, [instanceId, dispatch, pathname, router, searchParams]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distanceFromBottom > 120);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

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
        <div className="w-64 shrink-0 border-r border-border overflow-hidden flex flex-col  ">
          <AgentRunsSidebar
            agentId={agentId}
            instanceId={instanceId}
            conversationIdFromUrl={conversationIdFromUrl}
            currentRunId={currentRunId}
            onNewRun={handleNewRun}
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

        <div className="w-full max-w-3xl h-full flex flex-col overflow-hidden">
          {/* Conversation — scrollable area with fade-out at the bottom */}
          <div className="relative flex-1 min-h-0">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto"
            >
              <AgentConversationDisplay instanceId={instanceId} />
            </div>
            {/* 12px fade gradient at the bottom edge */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-3"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, var(--background))",
              }}
            />
            {/* Scroll-to-bottom pill */}
            {showScrollDown && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full
                  matrx-glass-core shadow-lg
                  text-muted-foreground hover:text-foreground
                  transition-all duration-200 ease-out
                  animate-in fade-in slide-in-from-bottom-2"
                title="Scroll to bottom"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Stats bar — appears after first completion */}
          <CreatorRunPanel
            instanceId={instanceId}
            onNewInstance={setInstanceId}
          />

          {/* Input */}
          <SmartAgentInput
            instanceId={instanceId}
            sendButtonVariant="blue"
            showSubmitOnEnterToggle
            onNewInstance={setInstanceId}
          />
        </div>
      </div>
    </div>
  );
}
