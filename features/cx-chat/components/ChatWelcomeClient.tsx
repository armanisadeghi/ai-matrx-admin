"use client";

// Client island for the welcome screen.
// Bootstraps the Redux session, hydrates agent config, and renders
// ConversationInput — which handles variables, input, and footer in one place.

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectIsAuthenticated } from "@/lib/redux/slices/userSlice";
import {
  activeChatActions,
  selectActiveChatAgent,
  selectIsAgentPickerOpen,
  WELCOME_SESSION_ID,
  type ActiveChatAgent,
} from "@/lib/redux/slices/activeChatSlice";
import { chatConversationsActions } from "@/features/cx-conversation/redux/slice";
import { selectVariableDefaults } from "@/features/cx-conversation/redux/selectors";
import { ConversationInput } from "@/features/cx-chat/components/user-input/ConversationInput";
import { DEFAULT_AGENTS } from "@/features/cx-chat/components/agent/local-agents";
import { DEFAULT_AGENT_ID } from "@/features/cx-chat/components/agent/agents";
import type { WelcomeAgent } from "./ChatWelcomeServer";
import type { Resource } from "@/features/prompts/types/resources";

const AgentPickerSheet = dynamic(
  () =>
    import("@/features/cx-chat/components/agent/AgentPickerSheet").then(
      (m) => ({
        default: m.AgentPickerSheet,
      }),
    ),
  { ssr: false },
);

interface ChatWelcomeClientProps {
  agent: WelcomeAgent;
}

const CUSTOM_CHAT_PROMPT_ID = "3ca61863-43cf-49cd-8da5-7e0a4b192867";

export default function ChatWelcomeClient({ agent }: ChatWelcomeClientProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const selectedAgent = useAppSelector(selectActiveChatAgent);
  const isAgentPickerOpen = useAppSelector(selectIsAgentPickerOpen);

  const sessionVariables = useAppSelector((state) =>
    selectVariableDefaults(state, WELCOME_SESSION_ID),
  );

  // Bootstrap a real Redux session so ConversationInput reads/writes the same
  // slice whether we're on the welcome screen or in an active conversation.
  useEffect(() => {
    dispatch(
      chatConversationsActions.startSession({
        sessionId: WELCOME_SESSION_ID,
        agentId: agent.promptId,
        variableDefaults: agent.variableDefaults ?? [],
        apiMode: "agent",
      }),
    );
    return () => {
      dispatch(chatConversationsActions.removeSession(WELCOME_SESSION_ID));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate activeChatSlice with the server-provided agent on first render.
  useEffect(() => {
    if (agent.promptId && agent.promptId !== selectedAgent.promptId) {
      dispatch(
        activeChatActions.setSelectedAgent({
          promptId: agent.promptId,
          name: agent.name,
          description: agent.description,
          variableDefaults: agent.variableDefaults,
          configFetched: false,
        }),
      );
      dispatch(activeChatActions.resetModelState());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When DB config loads, re-bootstrap session with updated variable defaults.
  useEffect(() => {
    if (!selectedAgent.configFetched) return;
    dispatch(
      chatConversationsActions.startSession({
        sessionId: WELCOME_SESSION_ID,
        agentId: selectedAgent.promptId,
        variableDefaults: selectedAgent.variableDefaults ?? [],
        apiMode: "agent",
      }),
    );
  }, [
    selectedAgent.configFetched,
    selectedAgent.promptId,
    selectedAgent.variableDefaults,
    dispatch,
  ]);

  // Submit: package variables + content → queue firstMessage → navigate.
  const handleSubmitOverride = useCallback(
    async (content: string, _resources: Resource[]): Promise<boolean> => {
      const variableValues: Record<string, string> = {};
      const lines: string[] = [];

      sessionVariables.forEach((v) => {
        const val = v.defaultValue ?? "";
        variableValues[v.name] = val;
        if (val) lines.push(`${v.name.replace(/_/g, " ")}: ${val}`);
      });

      const displayContent =
        lines.length > 0
          ? lines.join("\n") + (content.trim() ? "\n\n" + content : "")
          : content;

      if (!displayContent.trim()) return false;

      dispatch(
        activeChatActions.setFirstMessage({
          content: displayContent,
          variables: variableValues,
        }),
      );

      router.push(`/ssr/chat/c/new?agent=${agent.promptId}&new=true`);
      return true;
    },
    [sessionVariables, agent.promptId, router, dispatch],
  );

  const handleAgentSelect = useCallback(
    (pickedAgent: ActiveChatAgent) => {
      dispatch(activeChatActions.setSelectedAgent(pickedAgent));
      dispatch(activeChatActions.closeAgentPicker());
      dispatch(activeChatActions.resetModelState());
      router.push(`/ssr/chat/a/${pickedAgent.promptId}`);
    },
    [dispatch, router],
  );

  const handleModeSelect = useCallback(
    (_modeId: string, agentId: string | null) => {
      if (!agentId) return;
      const match = DEFAULT_AGENTS.find((a) => a.promptId === agentId);
      if (match) {
        dispatch(
          activeChatActions.setSelectedAgent({
            promptId: match.promptId,
            name: match.name,
            description: match.description,
            variableDefaults: match.variableDefaults,
          }),
        );
        dispatch(activeChatActions.resetModelState());
      }
      router.push(`/ssr/chat/a/${agentId}`);
    },
    [dispatch, router],
  );

  const handleBackToStart = useCallback(() => {
    router.push(`/ssr/chat/a/${DEFAULT_AGENT_ID}`);
  }, [router]);

  // Derive display values from what's live in Redux (post-DB-fetch if available).
  const varCount =
    sessionVariables.length > 0
      ? sessionVariables.length
      : (agent.variableDefaults?.length ?? 0);
  const hasVariables = varCount > 0;
  const showDescription = !!agent.description && varCount <= 3;
  const isCustomChat = agent.promptId === CUSTOM_CHAT_PROMPT_ID;
  const showSettings = isAuthenticated && !isCustomChat;

  // Guided layout: variables push content up, input is pinned at bottom.
  // Classic / no-variables layout: everything is centered.
  const sharedInputProps = {
    sessionId: WELCOME_SESSION_ID,
    showVoice: isAuthenticated,
    showResourcePicker: isAuthenticated,
    showModelPicker: selectedAgent.dynamicModel ?? false,
    showSettings,
    onSubmitOverride: handleSubmitOverride,
    showFooter: true,
    agentName: agent.name || undefined,
    onBackToStart: handleBackToStart,
    onAgentModeSelect: handleModeSelect,
  };

  const agentPicker = (
    <AgentPickerSheet
      open={isAgentPickerOpen}
      onOpenChange={(open) =>
        !open && dispatch(activeChatActions.closeAgentPicker())
      }
      selectedAgent={selectedAgent}
      onSelect={(a) => handleAgentSelect(a as ActiveChatAgent)}
    />
  );

  // Guided: variables shown inside ConversationInput (reads from Redux session),
  // input is single-line and pinned below them.
  if (hasVariables) {
    return (
      <>
        {agentPicker}

        {/* Title floats above the pinned bottom panel */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="flex flex-col items-center justify-end min-h-full px-3 md:px-8 pb-4">
            <div className="w-full max-w-3xl text-center">
              <h1
                className={`font-semibold text-foreground ${varCount > 2 ? "text-xl md:text-3xl" : "text-2xl md:text-3xl"}`}
              >
                {agent.name || "What can I help with?"}
              </h1>
              {showDescription && (
                <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  {agent.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pinned input panel */}
        <div
          className="flex-shrink-0 px-2 md:px-4 bg-transparent md:bg-background/95 md:backdrop-blur-sm"
          style={{
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="w-full max-w-3xl mx-auto">
            <ConversationInput
              {...sharedInputProps}
              singleLine
              placeholder="Additional instructions (optional) …"
            />
          </div>
        </div>
      </>
    );
  }

  // No-variables: classic centered layout.
  return (
    <>
      {agentPicker}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="min-h-full flex flex-col items-center justify-center px-3 md:px-8">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                {agent.name || "What can I help with?"}
              </h1>
              {showDescription ? (
                <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  {agent.description}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  AI with Matrx superpowers
                </p>
              )}
            </div>
            <ConversationInput
              {...sharedInputProps}
              placeholder="What do you want to know?"
            />
          </div>
        </div>
      </div>
    </>
  );
}
