"use client";

// app/(ssr)/ssr/chat/_components/ChatConversationClient.tsx
//
// Client island for active conversations.
//
// Two entry modes:
//   1. isNew=true  → First message is in Redux (activeChatSlice.firstMessage).
//      Skip DB fetch. Instantly send the first message and start streaming.
//   2. isNew=false → Load conversation history from DB, then render.
//
// URL sync: When the backend returns a real conversationId (via X-Conversation-ID
// header), router.replace updates the URL and removes ?new.
//
// Model/settings overrides are read from Redux (activeChatSlice) and synced
// into the session's uiState so the sendMessage thunk picks them up.

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectUserContext } from "@/lib/redux/slices/userSlice";
import {
  activeChatActions,
  selectActiveChatAgent,
  selectIsAgentPickerOpen,
  selectFirstMessage,
  selectModelOverride,
  selectModelSettings,
  selectAgentDefaultSettings,
  type ActiveChatAgent,
} from "@/lib/redux/slices/activeChatSlice";
import { useDebugContext } from "@/hooks/useDebugContext";
import {
  selectActiveServer,
  selectResolvedBaseUrl,
  selectActiveServerHealth,
} from "@/lib/redux/slices/apiConfigSlice";
import { computeSettingsOverrides } from "@/features/cx-chat/utils/settings-diff";
import { useConversationSession } from "@/features/cx-chat/hooks/useConversationSession";
import { chatConversationsActions } from "@/features/cx-conversation/redux/slice";
import { DEFAULT_AGENTS } from "@/features/cx-chat/components/agent/local-agents";
import { ConversationShellSkeleton } from "../ChatConversationSkeleton";

const ConversationShell = dynamic(
  () =>
    import("@/features/cx-chat/components/core/ConversationShell").then(
      (m) => ({
        default: m.ConversationShell,
      }),
    ),
  {
    ssr: false,
    loading: () => <ConversationShellSkeleton />,
  },
);
const AgentPickerSheet = dynamic(
  () =>
    import("@/features/cx-chat/components/agent/AgentPickerSheet").then(
      (m) => ({
        default: m.AgentPickerSheet,
      }),
    ),
  { ssr: false },
);

interface ChatConversationClientProps {
  conversationId: string;
  agentId?: string;
  isNew: boolean;
}

export default function ChatConversationClient({
  conversationId,
  agentId,
  isNew,
}: ChatConversationClientProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isAdmin } = useAppSelector(selectUserContext);
  const selectedAgent = useAppSelector(selectActiveChatAgent);
  const isAgentPickerOpen = useAppSelector(selectIsAgentPickerOpen);
  const firstMessage = useAppSelector(selectFirstMessage);
  const modelOverride = useAppSelector(selectModelOverride);
  const modelSettings = useAppSelector(selectModelSettings);
  const agentDefaultSettings = useAppSelector(selectAgentDefaultSettings);

  // Latch: once we start as "new", stay new for this component lifetime
  // so that router.replace (which strips ?new) doesn't cause a re-fetch.
  const startedAsNew = useRef(isNew);

  // Hydrate agent from URL param if Redux doesn't have it
  useEffect(() => {
    if (!agentId || agentId === selectedAgent.promptId) return;
    const builtIn = DEFAULT_AGENTS.find((a) => a.promptId === agentId);
    if (builtIn) {
      dispatch(
        activeChatActions.setSelectedAgent({
          promptId: builtIn.promptId,
          name: builtIn.name,
          description: builtIn.description,
          variableDefaults: builtIn.variableDefaults,
          configFetched: true,
        }),
      );
    } else {
      dispatch(
        activeChatActions.setSelectedAgent({
          promptId: agentId,
          name: "",
          configFetched: false,
        }),
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // For new conversations, don't pass a conversationId so the hook creates
  // a fresh session. The ref latch prevents router.replace from flipping this.
  const effectiveConversationId = startedAsNew.current
    ? undefined
    : conversationId;
  const effectiveAgentId = agentId || selectedAgent.promptId;

  const { publish: publishDebug, isActive: isDebugActive } =
    useDebugContext("Chat");
  const activeServer = useAppSelector(selectActiveServer);
  const resolvedUrl = useAppSelector(selectResolvedBaseUrl);
  const serverHealth = useAppSelector(selectActiveServerHealth);

  const settingsOverrides = computeSettingsOverrides(
    agentDefaultSettings,
    modelSettings,
  );

  const session = useConversationSession({
    agentId: effectiveAgentId,
    apiMode: "agent",
    conversationId: effectiveConversationId,
    loadHistory: !!effectiveConversationId,
    variableDefaults: selectedAgent.variableDefaults,
    modelOverride: modelOverride ?? undefined,
  });

  // Sync dirty model settings to session uiState
  useEffect(() => {
    if (!session.sessionId) return;
    const updates: Record<string, unknown> = {};
    if (modelOverride) updates.modelOverride = modelOverride;
    if (settingsOverrides && Object.keys(settingsOverrides).length > 0) {
      updates.modelSettings = settingsOverrides;
    }
    if (Object.keys(updates).length > 0) {
      dispatch(
        chatConversationsActions.updateUIState({
          sessionId: session.sessionId,
          updates,
        }),
      );
    }
  }, [session.sessionId, modelOverride, settingsOverrides, dispatch]);

  // Publish debug context for the admin indicator
  // useDebugContext handles the isAdmin + isDebugMode guard and cleanup on unmount
  useEffect(() => {
    publishDebug({
      Route: "ssr/chat",
      "Conversation ID":
        session.conversationId ?? effectiveConversationId ?? "pending",
      "Session ID": session.sessionId ?? "—",
      "Session Status": session.status ?? "—",
      "Agent ID": effectiveAgentId,
      "Agent Name": selectedAgent.name || "—",
      "Agent Config Fetched": selectedAgent.configFetched ?? false,
      "Is New Conversation": startedAsNew.current,
      "Message Count": session.messages?.length ?? 0,
      "Model Override": modelOverride ?? "none",
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
    session.conversationId,
    session.sessionId,
    session.status,
    session.messages?.length,
    effectiveAgentId,
    selectedAgent.name,
    selectedAgent.configFetched,
    modelOverride,
    activeServer,
    resolvedUrl,
    serverHealth.status,
    serverHealth.latencyMs,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  // Set active session in Redux
  useEffect(() => {
    if (effectiveConversationId) {
      dispatch(activeChatActions.setActiveSessionId(effectiveConversationId));
    }
    return () => {
      dispatch(activeChatActions.clearActiveSession());
    };
  }, [effectiveConversationId, dispatch]);

  // Send first message after session initializes (for new conversations)
  const sentRef = useRef(false);
  useEffect(() => {
    if (
      startedAsNew.current &&
      firstMessage &&
      session.sessionId &&
      !sentRef.current
    ) {
      sentRef.current = true;
      const timer = setTimeout(() => {
        session.send(firstMessage.content, {
          variables: firstMessage.variables,
        });
        dispatch(activeChatActions.clearFirstMessage());
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [firstMessage, session.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL sync: when real conversationId arrives from backend, update URL.
  // Uses window.history.replaceState to avoid a server re-render that would
  // remount this component and wipe the active streaming session.
  const lastSyncedId = useRef<string | null>(effectiveConversationId ?? null);
  useEffect(() => {
    if (
      session.conversationId &&
      session.conversationId !== lastSyncedId.current
    ) {
      lastSyncedId.current = session.conversationId;
      const agentParam = effectiveAgentId ? `?agent=${effectiveAgentId}` : "";
      const newUrl = `/ssr/chat/c/${session.conversationId}${agentParam}`;

      // Shallow URL update — no server round-trip, no component remount
      window.history.replaceState(window.history.state, "", newUrl);

      dispatch(activeChatActions.setActiveSessionId(session.conversationId));

      window.dispatchEvent(
        new CustomEvent("chat:conversationCreated", {
          detail: { id: session.conversationId, title: "New Chat" },
        }),
      );
    }
  }, [session.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sidebar notification on message completion
  useEffect(() => {
    if (
      session.status === "ready" &&
      session.conversationId &&
      session.messages.length > 0
    ) {
      window.dispatchEvent(
        new CustomEvent("chat:conversationUpdated", {
          detail: { id: session.conversationId },
        }),
      );
    }
  }, [session.status, session.conversationId, session.messages.length]);

  const handleNewChat = useCallback(() => {
    dispatch(activeChatActions.setActiveSessionId(null));
    router.push(`/ssr/chat/a/${effectiveAgentId}`);
  }, [dispatch, router, effectiveAgentId]);

  const handleAgentSelect = useCallback(
    (pickedAgent: ActiveChatAgent) => {
      dispatch(activeChatActions.setSelectedAgent(pickedAgent));
      dispatch(activeChatActions.closeAgentPicker());
      dispatch(activeChatActions.setActiveSessionId(null));
      dispatch(activeChatActions.resetModelState());
      router.push(`/ssr/chat/a/${pickedAgent.promptId}`);
    },
    [dispatch, router],
  );

  const derivedCapabilities = modelSettings
    ? {
        supportsImageUrls:
          (modelSettings as Record<string, unknown>).image_urls !== false,
        supportsFileUrls:
          (modelSettings as Record<string, unknown>).file_urls !== false,
        supportsYoutubeVideos:
          (modelSettings as Record<string, unknown>).youtube_videos !== false,
        supportsAudio: true,
      }
    : undefined;

  return (
    <>
      <AgentPickerSheet
        open={isAgentPickerOpen}
        onOpenChange={(open) =>
          !open && dispatch(activeChatActions.closeAgentPicker())
        }
        selectedAgent={selectedAgent}
        onSelect={(agent) => handleAgentSelect(agent as ActiveChatAgent)}
      />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ConversationShell
          sessionId={session.sessionId}
          compact={false}
          inputProps={{
            showVoice: isAuthenticated,
            showResourcePicker: isAuthenticated,
            showSettings: isAuthenticated,
            showModelPicker: false,
            showVariables: false,
            seamless: false,
            attachmentCapabilities: derivedCapabilities,
          }}
        />
      </div>
    </>
  );
}
