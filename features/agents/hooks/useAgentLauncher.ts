"use client";

/**
 * useAgentLauncher — Universal hook for triggering agent execution.
 *
 * Three convenience methods map to the three trigger paths:
 *   - launchAgent(agentId, options?)   → known agent in DB
 *   - launchShortcut(shortcutId, scope) → shortcut → agent
 *   - launchChat(options?)             → manual chat, no agent in DB
 *
 * All three delegate to the single `launchAgentExecution` orchestrator thunk
 * which handles instance creation, source tracking, display-mode routing,
 * and execution.
 *
 * @example
 * ```tsx
 * const { launchAgent, launchShortcut, launchChat, close } = useAgentLauncher();
 *
 * // Run a known agent
 * const result = await launchAgent("agent-uuid", {
 *   userInput: "Translate this",
 *   displayMode: "modal-full",
 * });
 *
 * // Run from a shortcut (context menu)
 * await launchShortcut("shortcut-uuid", {
 *   selection: selectedText,
 *   content: fullDocument,
 * });
 *
 * // Direct chat with no agent
 * await launchChat({ userInput: "Hello" });
 *
 * // Clean up
 * close(result.instanceId);
 * ```
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  launchAgentExecution,
  type LaunchAgentOptions,
  type LaunchResult,
} from "@/features/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import type { ApplicationScope } from "@/features/agents/utils/scope-mapping";
import type {
  ResultDisplayMode,
  SourceFeature,
} from "@/features/agents/types/instance.types";
import type { LLMParams } from "@/features/agents/types/agent-api-types";

// =============================================================================
// Public Types
// =============================================================================

export interface LaunchAgentOverrides {
  displayMode?: ResultDisplayMode;
  autoRun?: boolean;
  allowChat?: boolean;

  /** Coarse visibility toggle — resolves to fine-grained fields in the thunk. */
  showVariables?: boolean;
  /** Fine-grained: override variable panel independently. */
  showVariablePanel?: boolean;
  /** Fine-grained: override definition message visibility independently. */
  showDefinitionMessages?: boolean;
  /** Fine-grained: override definition message content visibility independently. */
  showDefinitionMessageContent?: boolean;

  usePreExecutionInput?: boolean;
  autoClearConversation?: boolean;
  conversationMode?: "agent" | "conversation" | "chat";
  userInput?: string;
  variables?: Record<string, unknown>;
  overrides?: Partial<LLMParams>;
  sourceFeature?: SourceFeature;
  applicationScope?: ApplicationScope;
  useChat?: boolean;
  variableInputStyle?: "inline" | "wizard";
  onComplete?: (result: LaunchResult) => void;
  onTextReplace?: (text: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;
  originalText?: string;
}

export interface UseAgentLauncherReturn {
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

// =============================================================================
// Hook
// =============================================================================

export function useAgentLauncher(): UseAgentLauncherReturn {
  const dispatch = useAppDispatch();

  const launchAgent = useCallback(
    async (
      agentId: string,
      options?: LaunchAgentOverrides,
    ): Promise<LaunchResult> => {
      const payload: LaunchAgentOptions = {
        agentId,
        sourceFeature: options?.sourceFeature ?? "agent-runner",
        displayMode: options?.displayMode,
        autoRun: options?.autoRun,
        allowChat: options?.allowChat,
        showVariables: options?.showVariables,
        showVariablePanel: options?.showVariablePanel,
        showDefinitionMessages: options?.showDefinitionMessages,
        showDefinitionMessageContent: options?.showDefinitionMessageContent,
        usePreExecutionInput: options?.usePreExecutionInput,
        autoClearConversation: options?.autoClearConversation,
        conversationMode: options?.conversationMode,
        userInput: options?.userInput,
        variables: options?.variables,
        overrides: options?.overrides,
        applicationScope: options?.applicationScope,
        useChat: options?.useChat,
        variableInputStyle: options?.variableInputStyle,
        onComplete: options?.onComplete,
        onTextReplace: options?.onTextReplace,
        onTextInsertBefore: options?.onTextInsertBefore,
        onTextInsertAfter: options?.onTextInsertAfter,
        originalText: options?.originalText,
      };
      return dispatch(launchAgentExecution(payload)).unwrap();
    },
    [dispatch],
  );

  const launchShortcut = useCallback(
    async (
      shortcutId: string,
      applicationScope: ApplicationScope,
      options?: Partial<LaunchAgentOverrides>,
    ): Promise<LaunchResult> => {
      const payload: LaunchAgentOptions = {
        shortcutId,
        applicationScope,
        sourceFeature: options?.sourceFeature ?? "context-menu",
        displayMode: options?.displayMode,
        autoRun: options?.autoRun,
        allowChat: options?.allowChat,
        showVariables: options?.showVariables,
        showVariablePanel: options?.showVariablePanel,
        showDefinitionMessages: options?.showDefinitionMessages,
        showDefinitionMessageContent: options?.showDefinitionMessageContent,
        usePreExecutionInput: options?.usePreExecutionInput,
        userInput: options?.userInput,
        variables: options?.variables,
        useChat: options?.useChat,
        onComplete: options?.onComplete,
        onTextReplace: options?.onTextReplace,
        onTextInsertBefore: options?.onTextInsertBefore,
        onTextInsertAfter: options?.onTextInsertAfter,
        originalText: options?.originalText,
      };
      return dispatch(launchAgentExecution(payload)).unwrap();
    },
    [dispatch],
  );

  const launchChat = useCallback(
    async (options?: LaunchAgentOverrides): Promise<LaunchResult> => {
      const payload: LaunchAgentOptions = {
        manual: {
          label: "Chat",
          baseSettings: options?.overrides,
        },
        sourceFeature: options?.sourceFeature ?? "chat",
        displayMode: options?.displayMode,
        autoRun: options?.autoRun,
        allowChat: options?.allowChat ?? true,
        showVariables: options?.showVariables,
        showVariablePanel: options?.showVariablePanel,
        showDefinitionMessages: options?.showDefinitionMessages,
        showDefinitionMessageContent: options?.showDefinitionMessageContent,
        usePreExecutionInput: options?.usePreExecutionInput,
        userInput: options?.userInput,
        variables: options?.variables,
        useChat: true,
        onComplete: options?.onComplete,
        onTextReplace: options?.onTextReplace,
        onTextInsertBefore: options?.onTextInsertBefore,
        onTextInsertAfter: options?.onTextInsertAfter,
        originalText: options?.originalText,
      };
      return dispatch(launchAgentExecution(payload)).unwrap();
    },
    [dispatch],
  );

  const close = useCallback(
    (instanceId: string) => {
      dispatch(destroyInstance(instanceId));
    },
    [dispatch],
  );

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
