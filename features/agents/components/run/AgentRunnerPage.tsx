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
 *   Desktop:
 *   ┌────────────────────────────────────┐
 *   │  Sidebar (runs history) │   Main   │
 *   │                         │   conv   │
 *   │                         │   area   │
 *   └────────────────────────────────────┘
 *
 *   Mobile:
 *   ┌────────────────────────────────────┐
 *   │  [History] [Test Modes]  toolbar   │
 *   │         Main conv area             │
 *   └────────────────────────────────────┘
 *   History & Test Modes open as drawers (bottom sheets).
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
import { Loader2, PanelLeft, History, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface AgentRunnerPageProps {
  agentId: string;
}

export function AgentRunnerPage({ agentId }: AgentRunnerPageProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const executionPayload = useAppSelector((state) =>
    selectAgentExecutionPayload(state, agentId),
  );

  const [isInitializing, setIsInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Mobile drawer state
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [testModesDrawerOpen, setTestModesDrawerOpen] = useState(false);

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

  const sourceFeature = "agent-runner";
  const surfaceKey = `${sourceFeature}:${agentId}`;
  const conversationMode = "agent";

  const { conversationId } = useAgentLauncher(agentId, {
    surfaceKey,
    sourceFeature,
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
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* ── Mobile toolbar ──────────────────────────────────────────────────── */}
      {isMobile && (
        <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-border bg-background">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5"
            onClick={() => setHistoryDrawerOpen(true)}
          >
            <History className="w-3.5 h-3.5" />
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5"
            onClick={() => setTestModesDrawerOpen(true)}
          >
            <TestTube2 className="w-3.5 h-3.5" />
            Test Modes
          </Button>
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && sidebarOpen && (
          <div className="w-64 shrink-0 border-r border-border overflow-hidden flex flex-col">
            <AgentRunsSidebar
              agentId={agentId}
              conversationId={conversationId}
              surfaceKey={surfaceKey}
              conversationIdFromUrl={conversationIdFromUrl}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main conversation area */}
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
              showAutoClearToggle: true,
            }}
          />
        </div>
      </div>

      {/* ── Mobile drawers ──────────────────────────────────────────────────── */}
      {isMobile && (
        <>
          {/* History drawer */}
          <Drawer open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
            <DrawerContent className="max-h-[80dvh]">
              <DrawerHeader className="pb-2">
                <DrawerTitle className="text-sm">
                  Conversation History
                </DrawerTitle>
                <DrawerDescription className="text-xs">
                  Past conversations and runs for this agent
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto min-h-0 pb-safe">
                <AgentRunsSidebar
                  agentId={agentId}
                  conversationId={conversationId}
                  surfaceKey={surfaceKey}
                  conversationIdFromUrl={conversationIdFromUrl}
                  onClose={() => setHistoryDrawerOpen(false)}
                />
              </div>
            </DrawerContent>
          </Drawer>

          {/* Test Modes drawer */}
          <Drawer
            open={testModesDrawerOpen}
            onOpenChange={setTestModesDrawerOpen}
          >
            <DrawerContent className="max-h-[80dvh]">
              <DrawerHeader className="pb-2">
                <DrawerTitle className="text-sm">
                  Test Display Modes
                </DrawerTitle>
                <DrawerDescription className="text-xs">
                  Launch the agent in different display modes
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto min-h-0 pb-safe">
                <AgentLauncherSidebarTester conversationId={conversationId} />
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
}
