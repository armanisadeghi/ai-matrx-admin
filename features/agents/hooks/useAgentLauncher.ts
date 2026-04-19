"use client";

/**
 * useAgentLauncher — Universal hook for agent execution.
 *
 * Two usage modes:
 *
 * 1. **Managed** — pass an agentId + surfaceKey to auto-create and track a conversation:
 *    ```tsx
 *    const { conversationId, launchShortcut, close } = useAgentLauncher(agentId, {
 *      surfaceKey: "agent-builder",
 *      sourceFeature: "agent-builder",
 *      apiEndpointMode: "manual",
 *    });
 *    ```
 *
 * 2. **Imperative** — call with no arguments for on-demand launching:
 *    ```tsx
 *    const { launchAgent, launchShortcut, launchChat, close } = useAgentLauncher();
 *    const result = await launchAgent("agent-uuid", { displayMode: "modal-full" });
 *    ```
 *
 * All paths delegate to the `launchAgentExecution` orchestrator thunk which
 * handles conversation creation, source tracking, display-mode routing, and execution.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { destroyInstanceIfAllowed } from "@/features/agents/redux/execution-system/conversations";
import {
  setFocus,
  selectFocusedConversation,
} from "@/features/agents/redux/execution-system/conversation-focus";
import type { ApplicationScope } from "@/features/agents/utils/scope-mapping";
import type { ManagedAgentOptions } from "../types/instance.types";
import {
  launchAgentExecution,
  LaunchResult,
} from "../redux/execution-system/thunks/launch-agent-execution.thunk";

// =============================================================================
// Return types
// =============================================================================

interface ImperativeMethods {
  launchAgent: (
    agentId: string,
    options?: ManagedAgentOptions,
  ) => Promise<LaunchResult>;

  launchShortcut: (
    shortcutId: string,
    applicationScope: ApplicationScope,
    options?: Partial<ManagedAgentOptions>,
  ) => Promise<LaunchResult>;

  launchChat: (options?: ManagedAgentOptions) => Promise<LaunchResult>;

  close: (conversationId: string) => void;
}

interface ManagedReturn extends ImperativeMethods {
  conversationId: string | null;
}

// =============================================================================
// Overloads
// =============================================================================

export function useAgentLauncher(): ImperativeMethods;
export function useAgentLauncher(
  agentId: string,
  options: ManagedAgentOptions,
): ManagedReturn;

// =============================================================================
// Implementation
// =============================================================================

export function useAgentLauncher(
  agentId?: string,
  options?: ManagedAgentOptions,
): ImperativeMethods | ManagedReturn {
  const dispatch = useAppDispatch();
  const surfaceKey = options?.surfaceKey;
  const conversationId = useAppSelector(selectFocusedConversation(surfaceKey));

  // ── Imperative methods (always created) ──────────────────────────────────

  const launchAgent = useCallback(
    async (id: string, opts?: ManagedAgentOptions): Promise<LaunchResult> => {
      const payload: ManagedAgentOptions = {
        agentId: id,
        surfaceKey: opts?.surfaceKey,
        sourceFeature: opts?.sourceFeature,
        displayMode: opts?.displayMode,
        autoRun: opts?.autoRun,
        allowChat: opts?.allowChat,
        showVariables: opts?.showVariables,
        showVariablePanel: opts?.showVariablePanel,
        showDefinitionMessages: opts?.showDefinitionMessages,
        showDefinitionMessageContent: opts?.showDefinitionMessageContent,
        usePreExecutionInput: opts?.usePreExecutionInput,
        showAutoClearToggle: opts?.showAutoClearToggle,
        autoClearConversation: opts?.autoClearConversation,
        apiEndpointMode: opts?.apiEndpointMode,
        userInput: opts?.userInput,
        variables: opts?.variables,
        overrides: opts?.overrides,
        applicationScope: opts?.applicationScope,
        variableInputStyle: opts?.variableInputStyle,
        hideReasoning: opts?.hideReasoning,
        hideToolResults: opts?.hideToolResults,
        preExecutionMessage: opts?.preExecutionMessage,
        jsonExtraction: opts?.jsonExtraction,
        widgetHandleId: opts?.widgetHandleId,
        originalText: opts?.originalText,
      };
      return dispatch(launchAgentExecution(payload)).unwrap();
    },
    [dispatch],
  );

  const launchShortcut = useCallback(
    async (
      shortcutId: string,
      applicationScope: ApplicationScope,
      opts?: Partial<ManagedAgentOptions>,
    ): Promise<LaunchResult> => {
      const payload: ManagedAgentOptions = {
        shortcutId,
        applicationScope,
        surfaceKey: opts?.surfaceKey,
        sourceFeature: opts?.sourceFeature,
        displayMode: opts?.displayMode,
        autoRun: opts?.autoRun,
        allowChat: opts?.allowChat,
        showVariables: opts?.showVariables,
        showVariablePanel: opts?.showVariablePanel,
        showDefinitionMessages: opts?.showDefinitionMessages,
        showDefinitionMessageContent: opts?.showDefinitionMessageContent,
        usePreExecutionInput: opts?.usePreExecutionInput,
        userInput: opts?.userInput,
        variables: opts?.variables,
        widgetHandleId: opts?.widgetHandleId,
        originalText: opts?.originalText,
      };
      return dispatch(launchAgentExecution(payload)).unwrap();
    },
    [dispatch],
  );

  const launchChat = useCallback(
    async (opts?: ManagedAgentOptions): Promise<LaunchResult> => {
      const apiEndpointMode = opts?.apiEndpointMode ?? "agent";
      const allowChat = opts?.allowChat ?? true;

      const payload: ManagedAgentOptions = {
        manual: {
          label: "Chat",
          baseSettings: opts?.overrides,
        },
        surfaceKey: opts?.surfaceKey,
        sourceFeature: opts?.sourceFeature,
        displayMode: opts?.displayMode,
        autoRun: opts?.autoRun,
        allowChat,
        showVariables: opts?.showVariables,
        showVariablePanel: opts?.showVariablePanel,
        showDefinitionMessages: opts?.showDefinitionMessages,
        showDefinitionMessageContent: opts?.showDefinitionMessageContent,
        usePreExecutionInput: opts?.usePreExecutionInput,
        userInput: opts?.userInput,
        variables: opts?.variables,
        apiEndpointMode,
        widgetHandleId: opts?.widgetHandleId,
        originalText: opts?.originalText,
      };
      return dispatch(launchAgentExecution(payload)).unwrap();
    },
    [dispatch],
  );

  const launch = useCallback(
    async (opts: ManagedAgentOptions): Promise<LaunchResult> => {
      if (opts?.apiEndpointMode === "manual") {
        return await launchChat(opts);
      } else if (opts?.apiEndpointMode === "agent") {
        return await launchAgent(agentId!, opts);
      } else {
        throw new Error("Invalid API Endpoint Mode");
      }
    },
    [launchAgent, launchChat],
  );

  const close = useCallback(
    (id: string) => {
      dispatch(destroyInstanceIfAllowed(id));
    },
    [dispatch],
  );

  // ── Managed lifecycle (only active when agentId + surfaceKey are provided) ──

  const isManaged = agentId != null && surfaceKey != null;
  const {
    ready = true,
    displayMode = "direct",
    autoRun = false,
    allowChat,
    showVariables,
    showVariablePanel,
    showDefinitionMessages,
    showDefinitionMessageContent,
    usePreExecutionInput,
    showAutoClearToggle,
    autoClearConversation,
    apiEndpointMode,
    userInput,
    variables,
    overrides,
    sourceFeature,
    applicationScope,
    variableInputStyle,
    hideReasoning,
    hideToolResults,
    preExecutionMessage,
    jsonExtraction,
    widgetHandleId,
    originalText,
  } = options ?? {};

  useEffect(() => {
    if (!isManaged || !ready || !surfaceKey) return;

    let createdId: string | null = null;

    launchAgent(agentId!, {
      surfaceKey,
      displayMode,
      autoRun,
      allowChat,
      showVariables,
      showVariablePanel,
      showDefinitionMessages,
      showDefinitionMessageContent,
      usePreExecutionInput,
      showAutoClearToggle,
      autoClearConversation,
      apiEndpointMode,
      userInput,
      variables,
      overrides,
      sourceFeature,
      applicationScope,
      variableInputStyle,
      hideReasoning,
      hideToolResults,
      preExecutionMessage,
      jsonExtraction,
      widgetHandleId,
      originalText,
    })
      .then((result) => {
        createdId = result.conversationId;
        dispatch(
          setFocus({ surfaceKey, conversationId: result.conversationId }),
        );
      })
      .catch((err) =>
        console.error("Failed to create agent conversation:", err),
      );

    return () => {
      if (createdId) {
        dispatch(destroyInstanceIfAllowed(createdId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, ready, isManaged, surfaceKey]);

  if (isManaged) {
    return {
      conversationId,
      launchAgent,
      launchShortcut,
      launchChat,
      close,
    };
  }

  return { launchAgent, launchShortcut, launchChat, close };
}

// =============================================================================
// Imperative API (for use outside React components)
// =============================================================================

export async function launchAgentImperative(
  dispatch: ReturnType<typeof useAppDispatch>,
  options: ManagedAgentOptions,
): Promise<LaunchResult> {
  return dispatch(launchAgentExecution(options)).unwrap();
}
