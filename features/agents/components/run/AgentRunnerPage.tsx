"use client";

/**
 * AgentRunPage
 *
 * Full execution page for an agent run. Creates an execution instance via
 * useAgentLauncher (managed mode). Conversation history sidebar is now
 * handled by the shell sidebar's Large Route system (AgentRunSidebarMenu).
 *
 * This page only renders the header strip, conversation area, and mobile drawers.
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
import { AgentLauncherSidebarTester } from "../run-controls/AgentLauncherSidebarTester";
import { AgentConversationColumn } from "../shared/AgentConversationColumn";
import { Loader2, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { AgentRunHeader } from "./AgentRunHeader";

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

  // Mobile drawer state
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
      <AgentRunHeader
        agentId={agentId}
        conversationId={conversationId}
        surfaceKey={surfaceKey}
        conversationIdFromUrl={conversationIdFromUrl}
      />

      {/* Mobile toolbar — Test Modes only (History is in shell sidebar) */}
      {isMobile && (
        <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-border bg-background">
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

      {/* Main conversation area */}
      <div className="flex-1 overflow-hidden flex justify-center min-w-0">
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

      {/* Mobile Test Modes drawer */}
      {isMobile && (
        <Drawer
          open={testModesDrawerOpen}
          onOpenChange={setTestModesDrawerOpen}
        >
          <DrawerContent className="max-h-[80dvh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-sm">Test Display Modes</DrawerTitle>
              <DrawerDescription className="text-xs">
                Launch the agent in different display modes
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto min-h-0 pb-safe">
              <AgentLauncherSidebarTester conversationId={conversationId} />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
