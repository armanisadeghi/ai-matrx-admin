"use client";

// app/(ssr)/ssr/chat/_components/ChatWorkspace.tsx
// Main client island for the SSR chat route.
//
// Architecture:
//   - Welcome screen: renders the landing UI with agent picker and variables
//   - Conversation mode: delegates to ConversationShell from the unified conversation system
//   - URL state: pathname for conversationId, searchParams for agent/vars/localhost
//   - Custom DOM events for sidebar sync
//   - SsrAgentContext for shared agent state across header, sidebar, and workspace

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import { selectIsUsingLocalhost } from "@/lib/redux/slices/adminPreferencesSlice";
import {
  selectModelOptions,
  selectAvailableModels,
  fetchAvailableModels,
} from "@/lib/redux/slices/modelRegistrySlice";
import { MessageCircle, List, Layers } from "lucide-react";

// Chat infrastructure (ChatContext still used for welcome screen state + sidebar sync)
import { useChatContext } from "@/features/public-chat/context/ChatContext";
import type { AgentConfig } from "@/features/public-chat/context/ChatContext";

// Unified conversation system
import { useConversationSession } from "@/features/cx-conversation/hooks/useConversationSession";
import { ConversationShell } from "@/features/cx-conversation/ConversationShell";
import { chatConversationsActions } from "@/lib/redux/chatConversations/slice";
import type { ApiMode } from "@/lib/redux/chatConversations/types";

// Shared agent state
import { useSsrAgent } from "./SsrAgentContext";

// Header controls
import ChatHeaderControls from "./ChatHeaderControls";

// Eager imports — always rendered on welcome screen
import { ChatInputWithControls } from "@/features/public-chat/components/ChatInputWithControls";
import {
  ResponseModeButtons,
  BackToStartButton,
  DEFAULT_AGENTS,
} from "@/features/public-chat/components/AgentSelector";

// Lazy imports — conditionally rendered
const ShareModal = dynamic(
  () => import("@/features/sharing").then((m) => ({ default: m.ShareModal })),
  { ssr: false },
);
const PublicVariableInputs = dynamic(
  () =>
    import("@/features/public-chat/components/PublicVariableInputs").then(
      (m) => ({ default: m.PublicVariableInputs }),
    ),
  { ssr: false },
);
const GuidedVariableInputs = dynamic(
  () =>
    import("@/features/public-chat/components/GuidedVariableInputs").then(
      (m) => ({ default: m.GuidedVariableInputs }),
    ),
  { ssr: false },
);
const ModelSettingsDialog = dynamic(
  () =>
    import("@/features/prompts/components/configuration/ModelSettingsDialog").then(
      (m) => ({ default: m.ModelSettingsDialog }),
    ),
  { ssr: false },
);

// Model configuration component from prompts feature
import { ModelConfiguration } from "@/features/prompts/components/configuration/ModelConfiguration";

import type { PublicResource } from "@/features/public-chat/types/content";
import type {
  PromptVariable,
  PromptSettings,
} from "@/features/prompts/types/core";
import { formatText } from "@/utils/text/text-case-converter";

// ============================================================================
// INNER WORKSPACE — wrapped by ChatProvider
// ============================================================================

function ChatWorkspaceInner() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, setUseLocalhost, startNewConversation } = useChatContext();

  // Shared agent state
  const { selectedAgent, onAgentChange } = useSsrAgent();

  // Variables
  const useGuidedVars = searchParams.get("vars") !== "classic";
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [activeVariables, setActiveVariables] = useState<PromptVariable[]>([]);

  // Mode state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const variableInputRef = useRef<HTMLInputElement>(null);

  // Model override + settings (for Custom Chat and all agents)
  const [modelOverride, setModelOverride] = useState<string | null>(null);
  const [modelSettings, setModelSettings] = useState<PromptSettings>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Track whether we've entered conversation mode (first message sent or conversation loaded)
  const [isInConversation, setIsInConversation] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // Redux state
  const user = useAppSelector(selectUser);
  const isAuthenticated = !!user?.id;
  const useLocalhost = useAppSelector(selectIsUsingLocalhost);
  const modelOptions = useAppSelector(selectModelOptions);
  const availableModels = useAppSelector(selectAvailableModels);

  // Fetch models on mount
  useEffect(() => {
    if (availableModels.length === 0) {
      dispatch(fetchAvailableModels());
    }
  }, [availableModels.length, dispatch]);

  const isCustomChat = selectedAgent.promptId === "custom-chat";

  // ========================================================================
  // URL STATE
  // ========================================================================

  const conversationIdFromUrl = useMemo(() => {
    const match = pathname.match(/\/ssr\/chat\/([^/?]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const agentIdFromUrl = searchParams.get("agent");
  const localhostFromUrl = searchParams.get("localhost") === "1";

  // ========================================================================
  // SYNC EFFECTS
  // ========================================================================

  // Sync localhost preference
  useEffect(() => {
    setUseLocalhost(useLocalhost || localhostFromUrl);
  }, [useLocalhost, localhostFromUrl, setUseLocalhost]);

  // Focus on agent URL change
  useEffect(() => {
    if (agentIdFromUrl) {
      setFocusKey((k) => k + 1);
    }
  }, [agentIdFromUrl]);

  // Handle URL conversation loading
  useEffect(() => {
    if (!conversationIdFromUrl) {
      // No conversation in URL — reset to welcome screen
      if (isInConversation || state.dbConversationId) {
        setIsInConversation(false);
        setActiveConversationId(null);
        startNewConversation();
      }
      return;
    }

    // Already loaded?
    if (activeConversationId === conversationIdFromUrl) return;

    // Load the conversation from the database and switch to conversation view
    setIsInConversation(true);
    setActiveConversationId(conversationIdFromUrl);
  }, [conversationIdFromUrl]);

  // ========================================================================
  // CONVERSATION ID SYNC — Update URL when unified system creates a conversation
  // ========================================================================

  const handleConversationIdChange = useCallback(
    (newConversationId: string) => {
      if (!newConversationId) return;
      if (conversationIdFromUrl === newConversationId) return;

      // Update URL
      const url = `/ssr/chat/${newConversationId}`;
      window.history.pushState(null, "", url);

      // Notify sidebar
      window.dispatchEvent(
        new CustomEvent("chat:conversationCreated", {
          detail: { id: newConversationId, title: "New Chat" },
        }),
      );

      setActiveConversationId(newConversationId);
    },
    [conversationIdFromUrl],
  );

  // ========================================================================
  // VARIABLE MANAGEMENT
  // ========================================================================

  const hasMessages = isInConversation;

  useEffect(() => {
    if (hasMessages) {
      setActiveVariables([]);
      setVariableValues({});
      return;
    }

    const varDefs = selectedAgent.variableDefaults;
    if (varDefs && varDefs.length > 0) {
      setActiveVariables(varDefs);
      const initialValues: Record<string, string> = {};
      varDefs.forEach((variable) => {
        if (variable.defaultValue) {
          initialValues[variable.name] = variable.defaultValue;
        }
      });
      setVariableValues(initialValues);
    } else {
      setActiveVariables([]);
      setVariableValues({});
    }
  }, [selectedAgent.promptId, hasMessages]);

  // Focus management
  useEffect(() => {
    if (isLoadingConversation || isInConversation) return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) return;

    const timer = setTimeout(() => {
      if (activeVariables.length > 0 && variableInputRef.current) {
        variableInputRef.current.focus();
      } else if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [
    selectedAgent.promptId,
    focusKey,
    isLoadingConversation,
    activeVariables.length,
    isInConversation,
  ]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleAgentSelect = useCallback(
    (agent: AgentConfig) => {
      onAgentChange(agent);
      setIsInConversation(false);
      setActiveConversationId(null);
      setModelOverride(null);
      setModelSettings({});
      setIsSettingsOpen(false);
      setFocusKey((k) => k + 1);
    },
    [onAgentChange],
  );

  const handleModeSelect = useCallback(
    (_modeId: string, agentId: string | null) => {
      if (!agentId) return;
      const match = DEFAULT_AGENTS.find((a) => a.promptId === agentId);
      handleAgentSelect(
        match || { ...DEFAULT_AGENTS[0], promptId: agentId, id: agentId },
      );
    },
    [handleAgentSelect],
  );

  const handleBackToStart = useCallback(() => {
    handleAgentSelect(DEFAULT_AGENTS[0]);
  }, [handleAgentSelect]);

  const handleVariableChange = useCallback((name: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleNewChat = useCallback(() => {
    setIsInConversation(false);
    setActiveConversationId(null);
    setModelOverride(null);
    setModelSettings({});
    const url = "/ssr/chat";
    window.history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  // Handle first message submit from welcome screen → transition to conversation
  const handleFirstSubmit = useCallback(
    async (content: string, resources?: PublicResource[]): Promise<boolean> => {
      let displayContent = "";

      if (activeVariables.length > 0) {
        const variableLines: string[] = [];
        activeVariables.forEach((varDef) => {
          const value =
            variableValues[varDef.name] || varDef.defaultValue || "";
          if (value) {
            const formattedName = formatText(varDef.name);
            variableLines.push(`${formattedName}: ${value}`);
          }
        });
        if (variableLines.length > 0) {
          displayContent = variableLines.join("\n");
          if (content.trim()) {
            displayContent += "\n\n" + content;
          }
        } else {
          displayContent = content;
        }
      } else {
        displayContent = content;
      }

      // Clear variables (they're only shown on welcome screen)
      setActiveVariables([]);
      setVariableValues({});

      // Now transition to conversation mode — the ConversationView will handle sending
      setIsInConversation(true);

      // Queue the first message to be sent after the session initializes.
      firstMessageRef.current = {
        content: displayContent,
        variables: { ...variableValues },
      };

      return true;
    },
    [activeVariables, variableValues],
  );

  // Ref to pass first message to ConversationView
  const firstMessageRef = useRef<{
    content: string;
    variables: Record<string, unknown>;
  } | null>(null);

  // ========================================================================
  // DERIVED STATE
  // ========================================================================

  const hasVariables = activeVariables.length > 0;
  const agentName = selectedAgent.name || "Chat";
  const headerLabel = selectedAgent.name || "Chat";

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (isLoadingConversation) {
    return (
      <>
        <ChatHeaderControls
          agentName={agentName}
          headerLabel={headerLabel}
          isConversation={true}
          isAuthenticated={isAuthenticated}
          dbConversationId={null}
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
          onNewChat={handleNewChat}
          onShare={() => setIsShareOpen(true)}
        />
        <div className="h-full flex flex-col items-center justify-center">
          <MessageCircle className="h-8 w-8 text-primary animate-pulse mb-3" />
          <p className="text-sm text-muted-foreground">
            Loading conversation...
          </p>
        </div>
      </>
    );
  }

  // ========================================================================
  // CONVERSATION MODE — Unified system handles everything
  // ========================================================================

  if (isInConversation) {
    const shareConversationId = activeConversationId;

    return (
      <>
        <ChatHeaderControls
          agentName={agentName}
          headerLabel={headerLabel}
          isConversation={true}
          isAuthenticated={isAuthenticated}
          dbConversationId={activeConversationId}
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
          onNewChat={handleNewChat}
          onShare={() => setIsShareOpen(true)}
        />
        <div className="h-full flex flex-col">
          {/* Share Modal */}
          {isShareOpen && shareConversationId && (
            <ShareModal
              isOpen={isShareOpen}
              onClose={() => setIsShareOpen(false)}
              resourceType="cx_conversation"
              resourceId={shareConversationId}
              resourceName="Chat"
              isOwner={true}
            />
          )}

          {/* Unified Conversation */}
          <ConversationViewWithFirstMessage
            agentId={selectedAgent.promptId}
            apiMode="agent"
            conversationId={activeConversationId ?? undefined}
            variableDefaults={selectedAgent.variableDefaults}
            modelOverride={modelOverride ?? undefined}
            modelSettings={modelSettings}
            authenticated={isAuthenticated}
            onConversationIdChange={handleConversationIdChange}
            firstMessage={firstMessageRef.current}
            onFirstMessageSent={() => {
              firstMessageRef.current = null;
            }}
          />
        </div>
      </>
    );
  }

  // ========================================================================
  // WELCOME SCREEN
  // ========================================================================

  const varCount = activeVariables.length;
  const agentDescription = hasVariables ? selectedAgent.description : null;
  const showDescription = agentDescription && varCount <= 3;

  const toggleUrl = (() => {
    const params = new URLSearchParams(searchParams.toString());
    if (useGuidedVars) {
      params.set("vars", "classic");
    } else {
      params.delete("vars");
    }
    const qs = params.toString();
    return qs ? `?${qs}` : pathname;
  })();

  // Guided mode: pin input to bottom
  if (useGuidedVars && hasVariables) {
    return (
      <>
        <ChatHeaderControls
          agentName={agentName}
          headerLabel={headerLabel}
          isConversation={false}
          isAuthenticated={isAuthenticated}
          dbConversationId={null}
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
          onNewChat={handleNewChat}
          onShare={() => setIsShareOpen(true)}
        />
        <div className="h-full flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex flex-col items-center justify-end min-h-full px-3 md:px-8 pb-4">
              <div className="w-full max-w-3xl text-center">
                <h1
                  className={`font-semibold text-foreground ${varCount > 2 ? "text-xl md:text-3xl" : "text-2xl md:text-3xl"}`}
                >
                  {agentName || "What can I help with?"}
                </h1>
                {showDescription && (
                  <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    {agentDescription}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex-shrink-0 px-2 md:px-4 bg-transparent"
            style={{
              paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="w-full max-w-3xl mx-auto">
              <GuidedVariableInputs
                variableDefaults={activeVariables}
                values={variableValues}
                onChange={handleVariableChange}
                disabled={false}
                textInputRef={textInputRef}
                submitOnEnter={true}
                onSubmit={handleFirstSubmit}
                seamless
              />
              <div className="rounded-b-2xl bg-card/80 backdrop-blur-sm">
                <ChatInputWithControls
                  onSubmit={handleFirstSubmit}
                  disabled={false}
                  placeholder="Additional instructions (optional)..."
                  conversationId={null}
                  isAuthenticated={isAuthenticated}
                  enableResourcePicker={isAuthenticated}
                  hasVariables={hasVariables}
                  selectedAgent={selectedAgent}
                  textInputRef={textInputRef}
                  seamless
                />
              </div>
              <div className="flex items-center justify-between mt-3 pb-2">
                <BackToStartButton
                  onBack={handleBackToStart}
                  agentName={agentName || undefined}
                />
                <button
                  type="button"
                  onClick={() => {
                    window.history.pushState(null, "", toggleUrl);
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                  title="Switch to classic variable view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Classic mode (or no variables): centered layout
  return (
    <>
      <ChatHeaderControls
        agentName={agentName}
        headerLabel={headerLabel}
        isConversation={false}
        isAuthenticated={isAuthenticated}
        dbConversationId={null}
        selectedAgent={selectedAgent}
        onAgentSelect={handleAgentSelect}
        onNewChat={handleNewChat}
        onShare={() => setIsShareOpen(true)}
      />
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            className={`min-h-full flex flex-col items-center px-3 md:px-8 ${varCount > 2 ? "justify-start pt-8 md:pt-16 md:justify-center" : "justify-center"}`}
          >
            <div className="w-full max-w-3xl">
              <div
                className={`text-center ${varCount > 2 ? "mb-3 md:mb-6" : "mb-6 md:mb-8"}`}
              >
                <h1
                  className={`font-semibold text-foreground ${varCount > 2 ? "text-xl md:text-3xl" : "text-2xl md:text-3xl"}`}
                >
                  {agentName || "What can I help with?"}
                </h1>
                {showDescription ? (
                  <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    {agentDescription}
                  </p>
                ) : !hasVariables ? (
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    AI with Matrx superpowers
                  </p>
                ) : null}
              </div>

              {hasVariables && (
                <div className={varCount > 2 ? "mb-3 md:mb-6" : "mb-6"}>
                  <PublicVariableInputs
                    variableDefaults={activeVariables}
                    values={variableValues}
                    onChange={handleVariableChange}
                    disabled={false}
                    minimal
                    textInputRef={textInputRef}
                    submitOnEnter={true}
                    onSubmit={handleFirstSubmit}
                  />
                </div>
              )}

              <div>
                <ChatInputWithControls
                  onSubmit={handleFirstSubmit}
                  disabled={false}
                  placeholder={
                    hasVariables
                      ? "Additional instructions (optional)..."
                      : "What do you want to know?"
                  }
                  conversationId={null}
                  isAuthenticated={isAuthenticated}
                  enableResourcePicker={isAuthenticated}
                  hasVariables={hasVariables}
                  selectedAgent={selectedAgent}
                  textInputRef={textInputRef}
                />
              </div>

              {/* Model configuration — shown for all agents */}
              {availableModels.length > 0 && (
                <div className="mt-2 px-1">
                  <ModelConfiguration
                    models={availableModels}
                    model={modelOverride ?? ""}
                    onModelChange={(value) => setModelOverride(value || null)}
                    modelConfig={modelSettings}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                    showSettingsDetails={
                      Object.keys(modelSettings).filter((k) => k !== "model_id")
                        .length > 0
                    }
                  />
                </div>
              )}

              {/* Settings dialog */}
              {isSettingsOpen && (
                <ModelSettingsDialog
                  isOpen={isSettingsOpen}
                  onClose={() => setIsSettingsOpen(false)}
                  modelId={modelOverride ?? ""}
                  models={availableModels}
                  settings={{
                    model_id: modelOverride ?? undefined,
                    ...modelSettings,
                  }}
                  onSettingsChange={(newSettings: PromptSettings) => {
                    const { model_id, ...rest } = newSettings;
                    if (model_id) {
                      setModelOverride(model_id);
                    }
                    setModelSettings(rest);
                  }}
                />
              )}

              <div className="flex items-center justify-between mt-3 md:mt-6 pb-4">
                {hasVariables ? (
                  <BackToStartButton
                    onBack={handleBackToStart}
                    agentName={agentName || undefined}
                  />
                ) : (
                  <ResponseModeButtons
                    disabled={false}
                    selectedAgentId={selectedAgent.promptId}
                    onModeSelect={handleModeSelect}
                  />
                )}
                {hasVariables && (
                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState(null, "", toggleUrl);
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                    title="Switch to guided variable view"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// CONVERSATION VIEW WITH FIRST MESSAGE — Sends queued message after init
// ============================================================================

interface ConversationViewWithFirstMessageProps {
  agentId: string;
  apiMode: ApiMode;
  conversationId?: string;
  variableDefaults?: PromptVariable[];
  modelOverride?: string;
  modelSettings?: PromptSettings;
  authenticated: boolean;
  onConversationIdChange: (id: string) => void;
  firstMessage: { content: string; variables: Record<string, unknown> } | null;
  onFirstMessageSent: () => void;
}

function ConversationViewWithFirstMessage({
  firstMessage,
  onFirstMessageSent,
  agentId,
  apiMode,
  conversationId,
  variableDefaults,
  modelOverride,
  modelSettings,
  authenticated,
  onConversationIdChange,
}: ConversationViewWithFirstMessageProps) {
  const dispatch = useAppDispatch();
  const session = useConversationSession({
    agentId,
    apiMode,
    conversationId,
    loadHistory: !!conversationId,
    variableDefaults,
    modelOverride,
  });

  // Sync model settings to Redux uiState when session is ready
  useEffect(() => {
    if (
      session.sessionId &&
      modelSettings &&
      Object.keys(modelSettings).length > 0
    ) {
      dispatch(
        chatConversationsActions.updateUIState({
          sessionId: session.sessionId,
          updates: { modelSettings: modelSettings as Record<string, unknown> },
        }),
      );
    }
  }, [session.sessionId, modelSettings, dispatch]);

  // Send first message after session initializes
  const sentRef = useRef(false);
  useEffect(() => {
    if (firstMessage && session.sessionId && !sentRef.current) {
      sentRef.current = true;
      // Small delay to ensure Redux session is fully initialized
      const timer = setTimeout(() => {
        session.send(firstMessage.content, {
          variables: firstMessage.variables,
        });
        onFirstMessageSent();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [session.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent when conversation ID changes
  useEffect(() => {
    if (session.conversationId) {
      onConversationIdChange(session.conversationId);
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

  // Derive attachment capabilities from model settings
  const derivedCapabilities = modelSettings
    ? {
        supportsImageUrls: modelSettings.image_urls !== false,
        supportsFileUrls: modelSettings.file_urls !== false,
        supportsYoutubeVideos: modelSettings.youtube_videos !== false,
        supportsAudio: true,
      }
    : undefined;

  return (
    <ConversationShell
      sessionId={session.sessionId}
      compact={false}
      inputProps={{
        showVoice: authenticated,
        showResourcePicker: authenticated,
        showSettings: authenticated,
        showModelPicker: false,
        showVariables: false,
        seamless: false,
        attachmentCapabilities: derivedCapabilities,
      }}
    />
  );
}

// ============================================================================
// OUTER WRAPPER
// ============================================================================

export default function ChatWorkspace() {
  return <ChatWorkspaceInner />;
}
