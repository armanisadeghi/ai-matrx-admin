import { useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { useAgentLauncher } from "./useAgentLauncher";
import type { LaunchAgentOverrides } from "@/features/agents/types/instance.types";

interface UseAgentInstanceOptions extends LaunchAgentOverrides {
  /** Delay instance creation until the caller signals readiness. Default: true */
  ready?: boolean;
}

/**
 * Creates and manages a single agent execution instance tied to an agentId.
 * Automatically destroys the instance on unmount or when agentId changes.
 *
 * Returns `instanceId` (null while initializing) and a `setInstanceId` setter
 * for cases where child components recreate the instance (e.g. autoClear, sidebar new-run).
 */
export function useAgentInstance(
  agentId: string,
  options: UseAgentInstanceOptions = {},
) {
  const {
    ready = true,
    displayMode = "modal-full",
    autoRun = false,
    allowChat = true,
    showVariables = true,
    showVariablePanel = true,
    showDefinitionMessages = false,
    showDefinitionMessageContent = false,
    usePreExecutionInput = false,
    autoClearConversation = false,
    conversationMode,
    userInput,
    variables,
    overrides,
    sourceFeature,
    applicationScope,
    useChat,
    variableInputStyle,
    onComplete,
    onTextReplace,
    onTextInsertBefore,
    onTextInsertAfter,
    originalText,
  } = options;

  const dispatch = useAppDispatch();
  const { launchAgent } = useAgentLauncher();
  const [instanceId, setInstanceId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    let createdId: string | null = null;

    launchAgent(agentId, {
      displayMode,
      autoRun,
      allowChat,
      showVariables,
      showVariablePanel,
      showDefinitionMessages,
      showDefinitionMessageContent,
      usePreExecutionInput,
      autoClearConversation,
      conversationMode,
      userInput,
      variables,
      overrides,
      sourceFeature,
      applicationScope,
      useChat,
      variableInputStyle,
      onComplete,
      onTextReplace,
      onTextInsertBefore,
      onTextInsertAfter,
      originalText,
    })
      .then((result) => {
        createdId = result.instanceId;
        setInstanceId(result.instanceId);
      })
      .catch((err) => console.error("Failed to create agent instance:", err));

    return () => {
      if (createdId) {
        dispatch(destroyInstance(createdId));
      }
    };
    // Re-create when agentId changes or readiness flips.
    // All other options are static per call-site — intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, ready]);

  return { instanceId, setInstanceId } as const;
}
