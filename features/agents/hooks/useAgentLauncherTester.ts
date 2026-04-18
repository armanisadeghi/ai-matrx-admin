import { useState, useRef } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { selectInstance } from "@/features/agents/redux/execution-system/conversations/conversations.selectors";
import { selectResolvedVariables } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import type {
  ResultDisplayMode,
  SourceFeature,
} from "@/features/agents/types/instance.types";
import type {
  JsonExtractionConfig,
  LLMParams,
  VariableInputStyle,
} from "@/features/agents/types";
import type { ManagedAgentOptions } from "@/features/agents/types/instance.types";
import type { ApplicationScope } from "@/features/agents/utils/scope-mapping";
import { ApiEndpointMode } from "@/features/agents/types/instance.types";

/**
 * Test harness state + launcher.
 *
 * The `sourceFeature` is identified by the host UI (passed in as an arg),
 * not configurable from inside the tester.
 *
 * Every launch gets a unique surfaceKey derived from `surfaceKeyPrefix`
 * so parallel widgets never collide in the focus registry.
 */
export function useAgentLauncherTester(
  conversationId: string,
  sourceFeature: SourceFeature,
  surfaceKeyPrefix: string,
) {
  const { launchAgent } = useAgentLauncher();
  const launchCounterRef = useRef(0);

  // ── Test-modal (direct/background) ────────────────────────────────────────
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testModalType, setTestModalType] = useState<"direct" | "background">(
    "direct",
  );

  // ── Main settings (visible, no heading) ───────────────────────────────────
  const [autoRun, setAutoRun] = useState(true);
  const [showVariablePanel, setShowVariablePanel] = useState(true);
  const [variableInputStyle, setVariableInputStyle] =
    useState<VariableInputStyle>("inline");
  const [usePreExecutionInput, setUsePreExecutionInput] = useState(false);
  const [preExecutionMessage, setPreExecutionMessage] = useState("");
  const [showDefinitionMessages, setShowDefinitionMessages] = useState(true);
  const [showDefinitionMessageContent, setShowDefinitionMessageContent] =
    useState(false);
  const [allowChat, setAllowChat] = useState(true);
  const [hideReasoning, setHideReasoning] = useState(false);
  const [hideToolResults, setHideToolResults] = useState(false);
  const [originalText, setOriginalText] = useState("");

  // ── Quick test features (local borrow toggles) ───────────────────────────
  const [applyVariables, setApplyVariables] = useState(true);
  const [applyUserInput, setApplyUserInput] = useState(true);
  const [applyAppContext, setApplyAppContext] = useState(true);

  // ── Advanced controls ────────────────────────────────────────────────────
  const [apiEndpointMode, setApiEndpointMode] =
    useState<ApiEndpointMode>("agent");
  const [showAutoClearToggle, setShowAutoClearToggle] = useState(false);
  const [autoClearConversation, setAutoClearConversation] = useState(false);
  const [jsonExtractionEnabled, setJsonExtractionEnabled] = useState(false);
  const [jsonExtractionFuzzy, setJsonExtractionFuzzy] = useState(false);
  const [jsonExtractionMaxResults, setJsonExtractionMaxResults] =
    useState<string>("");
  const [overridesJson, setOverridesJson] = useState("");
  const [applicationScopeJson, setApplicationScopeJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // ── Sourced from the active conversation ──────────────────────────────────
  const instance = useAppSelector(selectInstance(conversationId));
  const currentVariables = useAppSelector(
    selectResolvedVariables(conversationId),
  );
  const currentInput = useAppSelector(selectUserInputText(conversationId));

  const openWithDisplayType = async (displayMode: ResultDisplayMode) => {
    if (!instance) {
      console.warn("No active instance — cannot test display type");
      return;
    }

    if (displayMode === "direct" || displayMode === "background") {
      setTestModalType(displayMode);
      setTestModalOpen(true);
      return;
    }

    // Unique surfaceKey per launch so N parallel widgets never collide.
    launchCounterRef.current += 1;
    const uniqueSurfaceKey = `${surfaceKeyPrefix}:${displayMode}:${launchCounterRef.current}:${Date.now()}`;

    setJsonError(null);

    let overrides: Partial<LLMParams> | undefined;
    if (overridesJson.trim()) {
      try {
        const parsed = JSON.parse(overridesJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setJsonError("Overrides must be a JSON object");
          return;
        }
        overrides = parsed;
      } catch (e) {
        setJsonError(
          `Overrides JSON: ${e instanceof Error ? e.message : "invalid"}`,
        );
        return;
      }
    }

    // Manual Advanced > Application Scope JSON wins if present. Otherwise
    // the "Apply Local App Context" toggle constructs one from local state.
    let applicationScope: ApplicationScope | undefined;
    if (applicationScopeJson.trim()) {
      try {
        const parsed = JSON.parse(applicationScopeJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setJsonError("Application scope must be a JSON object");
          return;
        }
        applicationScope = parsed;
      } catch (e) {
        setJsonError(
          `Scope JSON: ${e instanceof Error ? e.message : "invalid"}`,
        );
        return;
      }
    } else if (applyAppContext) {
      const scope: ApplicationScope = {};
      if (originalText) scope.selection = originalText;
      if (currentInput) scope.content = currentInput;
      if (currentVariables && Object.keys(currentVariables).length > 0) {
        scope.context = currentVariables;
      }
      if (Object.keys(scope).length > 0) applicationScope = scope;
    }

    const maxResults = jsonExtractionMaxResults.trim()
      ? Number(jsonExtractionMaxResults)
      : NaN;

    const jsonExtraction: JsonExtractionConfig | undefined =
      jsonExtractionEnabled
        ? {
            enabled: true,
            ...(jsonExtractionFuzzy ? { fuzzyOnFinalize: true } : {}),
            ...(Number.isFinite(maxResults) ? { maxResults } : {}),
          }
        : undefined;

    const options: ManagedAgentOptions = {
      surfaceKey: uniqueSurfaceKey,
      sourceFeature,
      displayMode,
      autoRun,
      allowChat,
      usePreExecutionInput,
      apiEndpointMode,
      variableInputStyle,
      showVariablePanel,
      showDefinitionMessages,
      showDefinitionMessageContent,
      autoClearConversation,
      showAutoClearToggle,
      hideReasoning,
      hideToolResults,
    };

    if (preExecutionMessage) options.preExecutionMessage = preExecutionMessage;
    if (originalText) options.originalText = originalText;
    if (overrides) options.overrides = overrides;
    if (applicationScope) options.applicationScope = applicationScope;
    if (jsonExtraction) options.jsonExtraction = jsonExtraction;

    if (applyVariables) {
      options.variables = currentVariables;
    }
    if (applyUserInput && currentInput) {
      options.userInput = currentInput;
    }

    try {
      await launchAgent(instance.agentId, options);
    } catch (error) {
      console.error("Programmatic agent execution failed:", error);
    }
  };

  return {
    // Modal
    testModalOpen,
    setTestModalOpen,
    testModalType,
    // Main settings
    autoRun,
    setAutoRun,
    showVariablePanel,
    setShowVariablePanel,
    variableInputStyle,
    setVariableInputStyle,
    usePreExecutionInput,
    setUsePreExecutionInput,
    preExecutionMessage,
    setPreExecutionMessage,
    showDefinitionMessages,
    setShowDefinitionMessages,
    showDefinitionMessageContent,
    setShowDefinitionMessageContent,
    allowChat,
    setAllowChat,
    hideReasoning,
    setHideReasoning,
    hideToolResults,
    setHideToolResults,
    originalText,
    setOriginalText,
    // Quick test features
    applyVariables,
    setApplyVariables,
    applyUserInput,
    setApplyUserInput,
    applyAppContext,
    setApplyAppContext,
    // Advanced controls
    apiEndpointMode,
    setApiEndpointMode,
    showAutoClearToggle,
    setShowAutoClearToggle,
    autoClearConversation,
    setAutoClearConversation,
    jsonExtractionEnabled,
    setJsonExtractionEnabled,
    jsonExtractionFuzzy,
    setJsonExtractionFuzzy,
    jsonExtractionMaxResults,
    setJsonExtractionMaxResults,
    overridesJson,
    setOverridesJson,
    applicationScopeJson,
    setApplicationScopeJson,
    jsonError,
    // Data
    instance,
    currentVariables,
    currentInput,
    // Action
    openWithDisplayType,
  };
}
