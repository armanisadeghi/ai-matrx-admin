import { useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { selectInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.selectors";
import { selectResolvedVariables } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import type {
  ResultDisplayMode,
  SourceFeature,
} from "@/features/agents/types/instance.types";
import type { VariableInputStyle } from "@/features/agents/types";

export function useAgentLauncherTester(
  conversationId: string,
  sourceFeature: SourceFeature,
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

    try {
      await launchAgent(instance.agentId, {
        sourceFeature,
        displayMode,
        autoRun,
        allowChat,
        showVariables,
        usePreExecutionInput,
        conversationMode,
        variableInputStyle,
        variables: applyVariables ? currentVariables : undefined,
        userInput: currentInput || undefined,
      });
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
    instance,
    currentVariables,
    currentInput,
    openWithDisplayType,
  };
}
