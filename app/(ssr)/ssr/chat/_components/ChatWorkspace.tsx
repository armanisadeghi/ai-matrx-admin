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
import {
  selectModelOptions,
  selectAvailableModels,
  fetchAvailableModels,
} from "@/lib/redux/slices/modelRegistrySlice";
import { MessageCircle, List, Layers } from "lucide-react";

// Supabase client for agent config fetch
import { createClient } from "@/utils/supabase/client";

// Active chat state (replaces ChatContext + SsrAgentContext)
import {
  activeChatActions,
  selectActiveChatAgent,
  selectIsAgentPickerOpen,
  type ActiveChatAgent,
} from "@/lib/redux/slices/activeChatSlice";

// Unified conversation system
import { useConversationSession } from "@/features/cx-conversation/hooks/useConversationSession";
import { chatConversationsActions } from "@/features/cx-conversation/redux/slice";
import type { ApiMode } from "@/features/cx-conversation/redux/types";
const ConversationShell = dynamic(
  () =>
    import("@/features/cx-conversation/ConversationShell").then((m) => ({
      default: m.ConversationShell,
    })),
  { ssr: false },
);

// Header controls
import ChatHeaderControls from "./ChatHeaderControls";

// Agent picker sheet (lazy — opened on demand)
const AgentPickerSheet = dynamic(
  () =>
    import("@/features/public-chat/components/AgentPickerSheet").then((m) => ({
      default: m.AgentPickerSheet,
    })),
  { ssr: false },
);

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
  const nextPathname = usePathname();
  const searchParams = useSearchParams();

  // usePathname() may not react to manual pushState — track it manually too
  // Initialize with '' (SSR-safe); sync to window.location.pathname after mount
  const [manualPathname, setManualPathname] = useState("");
  useEffect(() => {
    setManualPathname(window.location.pathname);
    const onPopState = () => setManualPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const pathname = manualPathname || nextPathname;

  // Active chat state from Redux (replaces useChatContext + useSsrAgent)
  const selectedAgent = useAppSelector(selectActiveChatAgent);
  const isAgentPickerOpen = useAppSelector(selectIsAgentPickerOpen);

  // Agent picker sheet — rendered once, available in all branches
  const agentPickerEl = (
    <AgentPickerSheet
      open={isAgentPickerOpen}
      onOpenChange={(open) =>
        !open && dispatch(activeChatActions.closeAgentPicker())
      }
      selectedAgent={selectedAgent}
      onSelect={(agent) => {
        dispatch(activeChatActions.setSelectedAgent(agent as ActiveChatAgent));
      }}
    />
  );

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
  const availableModels = useAppSelector(selectAvailableModels);

  // Fetch models on mount
  useEffect(() => {
    if (availableModels.length === 0) {
      dispatch(fetchAvailableModels());
    }
  }, [availableModels.length, dispatch]);

  // Custom Chat agent — the only agent where users are allowed to change settings freely
  const CUSTOM_CHAT_PROMPT_ID = "3ca61863-43cf-49cd-8da5-7e0a4b192867";
  const isCustomChat = selectedAgent.promptId === CUSTOM_CHAT_PROMPT_ID;

  // ========================================================================
  // URL STATE
  // ========================================================================

  const conversationIdFromUrl = useMemo(() => {
    const match = pathname.match(/\/ssr\/chat\/([^/?]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const agentIdFromUrl = searchParams.get("agent");

  // ========================================================================
  // URL HELPERS — agent param is always kept in sync with Redux
  // ========================================================================

  /** Build a URL that preserves the ?agent= param alongside any path. */
  const buildUrl = useCallback(
    (path: string, agentId?: string): string => {
      const id = agentId ?? selectedAgent.promptId;
      return id ? `${path}?agent=${id}` : path;
    },
    [selectedAgent.promptId],
  );

  // ========================================================================
  // SYNC EFFECTS
  // ========================================================================

  // On mount / URL change: if ?agent= is in the URL and Redux doesn't have it,
  // hydrate the full agent from URL. Check DEFAULT_AGENTS first (free, sync),
  // then let loadAgentConfig fetch from DB. Never use the raw UUID as a name.
  useEffect(() => {
    if (!agentIdFromUrl) return;
    if (agentIdFromUrl === selectedAgent.promptId) return;
    if (isInConversation) return;

    // Fast path: agent is in the built-in list — dispatch immediately with full data
    const builtIn = DEFAULT_AGENTS.find((a) => a.promptId === agentIdFromUrl);
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
      return;
    }

    // Unknown agent — dispatch with empty name so nothing renders until DB fetch
    // completes. loadAgentConfig fires next render cycle because configFetched=false.
    dispatch(
      activeChatActions.setSelectedAgent({
        promptId: agentIdFromUrl,
        name: "",
        configFetched: false,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentIdFromUrl]);

  // Keep ?agent= in the URL whenever the selected agent changes.
  // Runs after mount; updates the URL without triggering a navigation.
  useEffect(() => {
    if (!selectedAgent.promptId) return;
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.get("agent") === selectedAgent.promptId) return;
    const base = window.location.pathname;
    const newUrl = `${base}?agent=${selectedAgent.promptId}`;
    window.history.replaceState(null, "", newUrl);
  }, [selectedAgent.promptId]);

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
      if (isInConversation) {
        setIsInConversation(false);
        setActiveConversationId(null);
        dispatch(activeChatActions.setActiveSessionId(null));
      }
      return;
    }

    // Already loaded?
    if (activeConversationId === conversationIdFromUrl) return;

    // Load the conversation from the database and switch to conversation view
    setIsInConversation(true);
    setActiveConversationId(conversationIdFromUrl);
    dispatch(activeChatActions.setActiveSessionId(conversationIdFromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIdFromUrl]);

  // ========================================================================
  // CONVERSATION ID SYNC — Update URL when unified system creates a conversation
  // ========================================================================

  const handleConversationIdChange = useCallback(
    (newConversationId: string) => {
      if (!newConversationId) return;
      if (conversationIdFromUrl === newConversationId) return;

      // Update URL — preserve agent param
      const url = buildUrl(`/ssr/chat/${newConversationId}`);
      window.history.pushState(null, "", url);

      // Notify sidebar
      window.dispatchEvent(
        new CustomEvent("chat:conversationCreated", {
          detail: { id: newConversationId, title: "New Chat" },
        }),
      );

      setActiveConversationId(newConversationId);
      dispatch(activeChatActions.setActiveSessionId(newConversationId));
    },
    [conversationIdFromUrl, buildUrl, dispatch],
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
  // AGENT CONFIG FETCH — load model/settings from DB when agent changes
  // Messages are explicitly excluded from the select query.
  // ========================================================================

  useEffect(() => {
    if (!selectedAgent.promptId || selectedAgent.configFetched) return;

    // Fast path: agent is in the built-in list — no DB round-trip needed.
    // This handles the case where a sidebar selection sets the agent without
    // all fields (e.g. variableDefaults not populated on user prompt items).
    const builtIn = DEFAULT_AGENTS.find(
      (a) => a.promptId === selectedAgent.promptId,
    );
    if (builtIn && !selectedAgent.name) {
      dispatch(
        activeChatActions.setSelectedAgent({
          promptId: builtIn.promptId,
          name: builtIn.name,
          description: builtIn.description,
          variableDefaults: builtIn.variableDefaults,
          configFetched: true,
        }),
      );
      return;
    }

    let cancelled = false;

    async function loadAgentConfig() {
      try {
        const supabase = createClient();
        // Explicitly select only safe fields — messages column is never fetched
        const { data, error } = await supabase
          .from("prompts")
          .select(
            "id, name, description, variable_defaults, settings, dynamic_model",
          )
          .eq("id", selectedAgent.promptId)
          .single();

        if (cancelled) return;

        if (error) {
          // PGRST116 = no rows found (agent not in prompts table).
          // Fall back to DEFAULT_AGENTS before giving up.
          if (error.code !== "PGRST116") {
            console.warn(
              "[loadAgentConfig] DB error for",
              selectedAgent.promptId,
              error,
            );
          }
          const fallback = DEFAULT_AGENTS.find(
            (a) => a.promptId === selectedAgent.promptId,
          );
          dispatch(
            activeChatActions.setSelectedAgent({
              ...selectedAgent,
              name: fallback?.name || selectedAgent.name || "Unknown Agent",
              description: fallback?.description || selectedAgent.description,
              variableDefaults:
                fallback?.variableDefaults ?? selectedAgent.variableDefaults,
              configFetched: true,
            }),
          );
          return;
        }

        if (data) {
          const settings = (data.settings ?? {}) as Record<string, unknown>;
          const { model_id, ...restSettings } = settings;
          const resolvedModelId =
            typeof model_id === "string" ? model_id : null;
          setModelOverride(resolvedModelId);
          setModelSettings(restSettings as PromptSettings);
          dispatch(
            activeChatActions.setSelectedAgent({
              ...selectedAgent,
              name: data.name || selectedAgent.name || "Unknown Agent",
              description:
                (data.description ?? selectedAgent.description) || undefined,
              variableDefaults:
                data.variable_defaults ??
                selectedAgent.variableDefaults ??
                undefined,
              modelOverride: resolvedModelId,
              modelSettings: restSettings as PromptSettings,
              dynamicModel: data.dynamic_model === true,
              configFetched: true,
            }),
          );
        } else {
          // Null data with no error — treat as not found, fall back to defaults
          const fallback = DEFAULT_AGENTS.find(
            (a) => a.promptId === selectedAgent.promptId,
          );
          dispatch(
            activeChatActions.setSelectedAgent({
              ...selectedAgent,
              name: fallback?.name || selectedAgent.name || "Unknown Agent",
              description: fallback?.description || selectedAgent.description,
              variableDefaults:
                fallback?.variableDefaults ?? selectedAgent.variableDefaults,
              configFetched: true,
            }),
          );
        }
      } catch (err) {
        // Network-level failure — fall back to DEFAULT_AGENTS if possible
        if (!cancelled) {
          console.warn(
            "[loadAgentConfig] Unexpected error for",
            selectedAgent.promptId,
            err,
          );
          const fallback = DEFAULT_AGENTS.find(
            (a) => a.promptId === selectedAgent.promptId,
          );
          dispatch(
            activeChatActions.setSelectedAgent({
              ...selectedAgent,
              name: fallback?.name || selectedAgent.name || "Unknown Agent",
              description: fallback?.description || selectedAgent.description,
              variableDefaults:
                fallback?.variableDefaults ?? selectedAgent.variableDefaults,
              configFetched: true,
            }),
          );
        }
      }
    }

    loadAgentConfig();
    return () => {
      cancelled = true;
    };
  }, [selectedAgent.promptId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleAgentSelect = useCallback(
    (agent: ActiveChatAgent) => {
      dispatch(activeChatActions.setSelectedAgent(agent));
      dispatch(activeChatActions.setActiveSessionId(null));
      setIsInConversation(false);
      setActiveConversationId(null);
      setModelOverride(null);
      setModelSettings({});
      setIsSettingsOpen(false);
      setFocusKey((k) => k + 1);
      // Navigate to fresh chat with new agent param
      const url = buildUrl("/ssr/chat", agent.promptId);
      window.history.pushState(null, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [dispatch, buildUrl],
  );

  const handleModeSelect = useCallback(
    (_modeId: string, agentId: string | null) => {
      if (!agentId) return;
      const match = DEFAULT_AGENTS.find((a) => a.promptId === agentId);
      handleAgentSelect(
        match
          ? {
              promptId: match.promptId,
              name: match.name,
              description: match.description,
              variableDefaults: match.variableDefaults,
            }
          : { promptId: agentId, name: agentId },
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
    dispatch(activeChatActions.setActiveSessionId(null));
    const url = buildUrl("/ssr/chat");
    window.history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [buildUrl, dispatch]);

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
  // Never show a raw UUID as the agent name — show empty string while loading
  // so the UI renders a neutral placeholder until configFetched resolves.
  const isAgentLoading = !selectedAgent.configFetched && !selectedAgent.name;
  const agentName = isAgentLoading ? "" : selectedAgent.name || "Chat";
  const headerLabel = isAgentLoading ? "" : selectedAgent.name || "Chat";

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
          onNewChat={handleNewChat}
          onShare={() => setIsShareOpen(true)}
        />
        {agentPickerEl}
        <div className="h-full flex flex-col items-center justify-center overflow-hidden">
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
          onNewChat={handleNewChat}
          onShare={() => setIsShareOpen(true)}
        />
        {agentPickerEl}
        <div className="h-full flex flex-col overflow-hidden">
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

          {/* Unified Conversation — key forces remount when switching conversations */}
          <ConversationViewWithFirstMessage
            key={activeConversationId ?? "new"}
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

  // Guided mode: pin input to bottom.
  // The content above (agent name) fills available scroll space.
  // Input stays anchored at the visible bottom — safe with keyboard open.
  if (useGuidedVars && hasVariables) {
    return (
      <>
        <ChatHeaderControls
          agentName={agentName}
          headerLabel={headerLabel}
          isConversation={false}
          isAuthenticated={isAuthenticated}
          dbConversationId={null}
          onNewChat={handleNewChat}
          onShare={() => setIsShareOpen(true)}
        />
        {agentPickerEl}
        <div className="h-full flex flex-col overflow-hidden">
          {/* Scrollable header area above the pinned input */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
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

          {/* Pinned bottom input — stays visible when keyboard opens */}
          <div className="flex-shrink-0 px-2 md:px-4 bg-transparent pb-safe">
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
                  availableModels={
                    selectedAgent.dynamicModel && availableModels.length > 0
                      ? availableModels
                      : undefined
                  }
                  selectedModel={modelOverride ?? undefined}
                  onModelChange={(id) => setModelOverride(id || null)}
                  onSettingsClick={
                    isAuthenticated ? () => setIsSettingsOpen(true) : undefined
                  }
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

  // Classic mode (or no variables): centered layout.
  //
  // Mobile layout strategy:
  //   - Outer wrapper fills the panel content area (h-full from defined parent)
  //   - Single overflow-y-auto scroll region so iOS doesn't double-scroll
  //   - Content centered via min-h-full + justify-center — works because
  //     parent now has a real height from --visual-viewport-height
  //   - Input anchors to visible bottom when keyboard opens (parent shrinks)
  //   - pb-safe handles iPhone home indicator / Android nav bar
  return (
    <>
      <ChatHeaderControls
        agentName={agentName}
        headerLabel={headerLabel}
        isConversation={false}
        isAuthenticated={isAuthenticated}
        dbConversationId={null}
        onNewChat={handleNewChat}
        onShare={() => setIsShareOpen(true)}
      />
      {agentPickerEl}
      {/* h-full resolves against .shell-panel-content which has a defined height
          via --visual-viewport-height. overflow-hidden prevents double scrollbars. */}
      <div className="h-full flex flex-col overflow-hidden">
        {/* Single scroll region — no nested scroll containers on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div
            className={`min-h-full flex flex-col items-center px-3 md:px-8 ${
              varCount > 2
                ? "justify-start pt-8 md:pt-16 md:justify-center"
                : "justify-center"
            }`}
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
                  availableModels={
                    selectedAgent.dynamicModel && availableModels.length > 0
                      ? availableModels
                      : undefined
                  }
                  selectedModel={modelOverride ?? undefined}
                  onModelChange={(id) => setModelOverride(id || null)}
                  onSettingsClick={
                    isAuthenticated ? () => setIsSettingsOpen(true) : undefined
                  }
                />
              </div>

              {/* Settings dialog — only shown when user explicitly clicks settings icon */}
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
                  showModelSelector={true}
                  onModelChange={(id) => setModelOverride(id || null)}
                  requireConfirmation={isCustomChat ? false : true}
                />
              )}

              <div className="flex items-center justify-between mt-3 md:mt-6 pb-safe">
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
