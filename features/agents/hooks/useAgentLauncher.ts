"use client";

/**
 * useAgentLauncher — Universal hook for agent execution.
 *
 * Two usage modes:
 *
 * 1. **Managed** — pass an agentId to auto-create, track, and destroy an instance:
 *    ```tsx
 *    const { instanceId, setInstanceId, launchShortcut, close } = useAgentLauncher(agentId, {
 *      sourceFeature: "agent-builder",
 *      useChat: true,
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
 * handles instance creation, source tracking, display-mode routing, and execution.
 */

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  launchAgentExecution,
  type LaunchAgentOptions,
  type LaunchResult,
} from "@/features/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import type { ApplicationScope } from "@/features/agents/utils/scope-mapping";
import type { LaunchAgentOverrides } from "@/features/agents/types/instance.types";
export type { LaunchAgentOverrides } from "@/features/agents/types/instance.types";

// =============================================================================
// Options for managed mode (extends LaunchAgentOverrides)
// =============================================================================

export interface ManagedAgentOptions extends LaunchAgentOverrides {
  /** Delay instance creation until the caller signals readiness. Default: true */
  ready?: boolean;
}

// =============================================================================
// Return types
// =============================================================================

interface ImperativeMethods {
  launchAgent: (
    agentId: string,
    options?: LaunchAgentOverrides,
  ) => Promise<LaunchResult>;

  launchShortcut: (
    shortcutId: string,
    applicationScope: ApplicationScope,
    options?: Partial<LaunchAgentOverrides>,
  ) => Promise<LaunchResult>;

  launchChat: (options?: LaunchAgentOverrides) => Promise<LaunchResult>;

  close: (instanceId: string) => void;
}

interface ManagedReturn extends ImperativeMethods {
  instanceId: string | null;
  setInstanceId: (id: string | null) => void;
}

// =============================================================================
// Overloads
// =============================================================================

export function useAgentLauncher(): ImperativeMethods;
export function useAgentLauncher(
  agentId: string,
  options?: ManagedAgentOptions,
): ManagedReturn;

// =============================================================================
// Implementation
// =============================================================================

export function useAgentLauncher(
  agentId?: string,
  options?: ManagedAgentOptions,
): ImperativeMethods | ManagedReturn {
  const dispatch = useAppDispatch();

  // ── Imperative methods (always created) ──────────────────────────────────

  const launchAgent = useCallback(
    async (id: string, opts?: LaunchAgentOverrides): Promise<LaunchResult> => {
      const payload: LaunchAgentOptions = {
        agentId: id,
        sourceFeature: opts?.sourceFeature ?? "agent-runner",
        displayMode: opts?.displayMode,
        autoRun: opts?.autoRun,
        allowChat: opts?.allowChat,
        showVariables: opts?.showVariables,
        showVariablePanel: opts?.showVariablePanel,
        showDefinitionMessages: opts?.showDefinitionMessages,
        showDefinitionMessageContent: opts?.showDefinitionMessageContent,
        usePreExecutionInput: opts?.usePreExecutionInput,
        autoClearConversation: opts?.autoClearConversation,
        conversationMode: opts?.conversationMode,
        userInput: opts?.userInput,
        variables: opts?.variables,
        overrides: opts?.overrides,
        applicationScope: opts?.applicationScope,
        useChat: opts?.useChat,
        variableInputStyle: opts?.variableInputStyle,
        onComplete: opts?.onComplete,
        onTextReplace: opts?.onTextReplace,
        onTextInsertBefore: opts?.onTextInsertBefore,
        onTextInsertAfter: opts?.onTextInsertAfter,
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
      opts?: Partial<LaunchAgentOverrides>,
    ): Promise<LaunchResult> => {
      const payload: LaunchAgentOptions = {
        shortcutId,
        applicationScope,
        sourceFeature: opts?.sourceFeature ?? "context-menu",
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
        useChat: opts?.useChat,
        onComplete: opts?.onComplete,
        onTextReplace: opts?.onTextReplace,
        onTextInsertBefore: opts?.onTextInsertBefore,
        onTextInsertAfter: opts?.onTextInsertAfter,
        originalText: opts?.originalText,
      };
      return dispatch(launchAgentExecution(payload)).unwrap();
    },
    [dispatch],
  );

  const launchChat = useCallback(
    async (opts?: LaunchAgentOverrides): Promise<LaunchResult> => {
      const payload: LaunchAgentOptions = {
        manual: {
          label: "Chat",
          baseSettings: opts?.overrides,
        },
        sourceFeature: opts?.sourceFeature ?? "chat",
        displayMode: opts?.displayMode,
        autoRun: opts?.autoRun,
        allowChat: opts?.allowChat ?? true,
        showVariables: opts?.showVariables,
        showVariablePanel: opts?.showVariablePanel,
        showDefinitionMessages: opts?.showDefinitionMessages,
        showDefinitionMessageContent: opts?.showDefinitionMessageContent,
        usePreExecutionInput: opts?.usePreExecutionInput,
        userInput: opts?.userInput,
        variables: opts?.variables,
        useChat: true,
        onComplete: opts?.onComplete,
        onTextReplace: opts?.onTextReplace,
        onTextInsertBefore: opts?.onTextInsertBefore,
        onTextInsertAfter: opts?.onTextInsertAfter,
        originalText: opts?.originalText,
      };
      return dispatch(launchAgentExecution(payload)).unwrap();
    },
    [dispatch],
  );

  const close = useCallback(
    (id: string) => {
      dispatch(destroyInstance(id));
    },
    [dispatch],
  );

  // ── Managed lifecycle (only active when agentId is provided) ─────────────

  const isManaged = agentId != null;
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
  } = options ?? {};

  const [instanceId, setInstanceId] = useState<string | null>(null);

  useEffect(() => {
    if (!isManaged || !ready) return;

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
  }, [agentId, ready, isManaged]);

  if (isManaged) {
    return {
      instanceId,
      setInstanceId,
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
  options: LaunchAgentOptions,
): Promise<LaunchResult> {
  return dispatch(launchAgentExecution(options)).unwrap();
}
