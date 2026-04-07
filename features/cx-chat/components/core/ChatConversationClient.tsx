"use client";

// ChatConversationClient
//
// Renders the active conversation UI. instanceId is passed as a prop from
// ChatInstanceManager — this component never reads ?instance= from the URL.
//
// Layout: messages (AgentConversationDisplay) + input (SmartAgentInput),
// both capped at max-w-[800px] to match the original ConversationShell width.

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserContext } from "@/lib/redux/slices/userSlice";
import { useDebugContext } from "@/hooks/useDebugContext";
import {
  selectActiveServer,
  selectResolvedBaseUrl,
  selectActiveServerHealth,
} from "@/lib/redux/slices/apiConfigSlice";
import {
  selectLatestConversationId,
  selectLatestRequestStatus,
  selectIsExecuting,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectTurnCount } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { AgentConversationDisplay } from "@/features/agents/components/run/AgentConversationDisplay";
import { SmartAgentInput } from "@/features/agents/components/inputs/SmartAgentInput";

const AgentPickerSheet = dynamic(
  () =>
    import("@/features/cx-chat/components/agent/AgentPickerSheet").then(
      (m) => ({ default: m.AgentPickerSheet }),
    ),
  { ssr: false },
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatConversationClientProps {
  instanceId: string;
  conversationId: string;
  agentId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatConversationClient({
  instanceId,
  conversationId,
  agentId,
}: ChatConversationClientProps) {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAppSelector(selectUserContext);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // ── Debug context ──────────────────────────────────────────────────────────
  const { publish: publishDebug, isActive: isDebugActive } =
    useDebugContext("Chat");
  const activeServer = useAppSelector(selectActiveServer);
  const resolvedUrl = useAppSelector(selectResolvedBaseUrl);
  const serverHealth = useAppSelector(selectActiveServerHealth);

  const latestConversationId = useAppSelector(
    selectLatestConversationId(instanceId),
  );
  const requestStatus = useAppSelector(selectLatestRequestStatus(instanceId));
  const isExecuting = useAppSelector(selectIsExecuting(instanceId));
  const turnCount = useAppSelector(selectTurnCount(instanceId));

  useEffect(() => {
    publishDebug({
      Route: "ssr/chat",
      "Instance ID": instanceId,
      "Conversation ID": latestConversationId ?? conversationId,
      "Agent ID": agentId,
      "Request Status": requestStatus ?? "—",
      "Is Executing": isExecuting,
      "Turn Count": turnCount,
      "Is Authenticated": isAuthenticated,
      "Is Admin": isAdmin,
      "Active Server": activeServer,
      "Backend URL": resolvedUrl ?? "not configured",
      "Server Health": serverHealth.status,
      "Server Latency":
        serverHealth.latencyMs != null ? `${serverHealth.latencyMs}ms` : "—",
    });
  }, [
    isDebugActive,
    instanceId,
    latestConversationId,
    requestStatus,
    isExecuting,
    turnCount,
    agentId,
    isAuthenticated,
    isAdmin,
    activeServer,
    resolvedUrl,
    serverHealth.status,
    serverHealth.latencyMs,
  ]);

  // ── URL sync — when backend returns a new conversationId ──────────────────
  const lastSyncedConvId = useRef<string | null>(conversationId ?? null);
  useEffect(() => {
    if (
      latestConversationId &&
      latestConversationId !== lastSyncedConvId.current
    ) {
      lastSyncedConvId.current = latestConversationId;

      const newUrl = `/ssr/chat/c/${latestConversationId}?agent=${agentId}`;
      window.history.replaceState(window.history.state, "", newUrl);

      window.dispatchEvent(
        new CustomEvent("chat:conversationCreated", {
          detail: { id: latestConversationId, title: "New Chat" },
        }),
      );
    }
  }, [latestConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sidebar notification on turn complete ──────────────────────────────────
  useEffect(() => {
    if (requestStatus === "complete" && latestConversationId && turnCount > 0) {
      window.dispatchEvent(
        new CustomEvent("chat:conversationUpdated", {
          detail: { id: latestConversationId },
        }),
      );
    }
  }, [requestStatus, latestConversationId, turnCount]);

  const handleNewChat = useCallback(() => {
    router.push(`/ssr/chat/a/${agentId}`);
  }, [router, agentId]);

  return (
    <>
      <AgentPickerSheet
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        selectedAgent={null}
        onSelect={(agent) => router.push(`/ssr/chat/a/${agent.promptId}`)}
      />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="max-w-[800px] mx-auto w-full">
            <AgentConversationDisplay instanceId={instanceId} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 p-2 pb-safe">
          <div className="max-w-[800px] mx-auto">
            <SmartAgentInput
              instanceId={instanceId}
              showSubmitOnEnterToggle
              enablePasteImages={isAuthenticated}
            />
          </div>
        </div>
      </div>
    </>
  );
}
