import { useState } from "react";
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

export function useAgentLauncherTester(
  conversationId: string,
  sourceFeature: SourceFeature,
  surfaceKey: string,
) {
  const { launchAgent } = useAgentLauncher();
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testModalType, setTestModalType] = useState<"direct" | "background">(
    "direct",
  );

  const [autoRun, setAutoRun] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [showVariables, setShowVariables] = useState(false);
  const [applyVariables, setApplyVariables] = useState(true);
  const [usePreExecutionInput, setUsePreExecutionInput] = useState(false);
  const [conversationMode, setConversationMode] = useState<"agent" | "chat">(
    "agent",
  );
  const [variableInputStyle, setVariableInputStyle] =
    useState<VariableInputStyle>("inline");
  const [showVariablePanel, setShowVariablePanel] = useState(true);
  const [showDefinitionMessages, setShowDefinitionMessages] = useState(true);
  const [showDefinitionMessageContent, setShowDefinitionMessageContent] =
    useState(false);
  const [showAutoClearToggle, setShowAutoClearToggle] = useState(false);
  const [overrides, setOverrides] = useState<Partial<LLMParams>>({});
  const [hideReasoning, setHideReasoning] = useState(false);
  const [hideToolResults, setHideToolResults] = useState(false);
  const [preExecutionMessage, setPreExecutionMessage] = useState<string | null>(
    null,
  );
  const [jsonExtraction, setJsonExtraction] = useState<JsonExtractionConfig>({
    enabled: false,
  });
  const [originalText, setOriginalText] = useState<string | null>(null);

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

    const options: ManagedAgentOptions = {
      surfaceKey,
      sourceFeature,
      displayMode,
      autoRun,
      showVariablePanel,
      showDefinitionMessages,
      showDefinitionMessageContent,
      allowChat,
      showVariables,
      usePreExecutionInput,
      conversationMode,
      variableInputStyle,
      showAutoClearToggle,
      overrides,
      hideReasoning,
      hideToolResults,
      preExecutionMessage,
      jsonExtraction,
      originalText,
    };

    if (applyVariables) {
      options.variables = currentVariables;
    }
    if (currentInput) {
      options.userInput = currentInput;
    }

    try {
      await launchAgent(instance.agentId, options);
    } catch (error) {
      console.error("Programmatic agent execution failed:", error);
    }
  };

  return {
    testModalOpen,
    setTestModalOpen,
    testModalType,
    autoRun,
    setAutoRun,
    allowChat,
    setAllowChat,
    showVariables,
    setShowVariables,
    applyVariables,
    setApplyVariables,
    usePreExecutionInput,
    setUsePreExecutionInput,
    conversationMode,
    setConversationMode,
    variableInputStyle,
    setVariableInputStyle,
    showVariablePanel,
    setShowVariablePanel,
    showDefinitionMessages,
    setShowDefinitionMessages,
    showDefinitionMessageContent,
    setShowDefinitionMessageContent,
    showAutoClearToggle,
    setShowAutoClearToggle,
    overrides,
    setOverrides,
    hideReasoning,
    setHideReasoning,
    hideToolResults,
    setHideToolResults,
    preExecutionMessage,
    setPreExecutionMessage,
    jsonExtraction,
    setJsonExtraction,
    originalText,
    setOriginalText,
    instance,
    currentVariables,
    currentInput,
    openWithDisplayType,
  };
}
