"use client";

/**
 * AgentRunner
 *
 * The universal inner component for agent execution instances.
 * Equivalent of PromptRunner from the old system.
 *
 * Used by ALL display mode shells (modal-full, sidebar, inline, toast, etc.).
 * Each shell provides layout/chrome; AgentRunner provides the core experience.
 *
 * Props: conversationId + optional layout hints (compact, showTitle).
 * ALL behavior config is read from Redux — nothing else is passed as props.
 *
 * Lifecycle:
 *   1. Pre-execution gate: if needsPreExecution → <AgentPreExecutionInput />
 *   2. Auto-run: if autoRun && status is "ready" → dispatch execute
 *   3. Main display: SmartAgentMessageList + SmartAgentInput
 */

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAutoRun,
  selectAllowChat,
  selectNeedsPreExecutionInput,
  selectShouldShowInput,
  selectShowVariablePanel,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectInstanceDisplayTitle } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectInstanceStatus } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.selectors";
import {
  selectIsExecuting,
  selectConversationMode,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectHasUserInput } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
import { executeChatInstance } from "@/features/agents/redux/execution-system/thunks/execute-chat-instance.thunk";
import { SmartAgentInput } from "../inputs/SmartAgentInput";
import { PreExecutionAgentInput } from "../inputs/PreExecutionAgentInput";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";

interface AgentRunnerProps {
  conversationId: string;
  compact?: boolean;
  showTitle?: boolean;
  className?: string;
  /** Optional focus surface for auto-clear + new conversation submit (SmartAgentInput). */
  surfaceKey?: string;
}

export function AgentRunner({
  conversationId,
  compact = false,
  showTitle = false,
  className = "",
  surfaceKey,
}: AgentRunnerProps) {
  const dispatch = useAppDispatch();
  const autoRunFiredRef = useRef(false);

  const autoRun = useAppSelector(selectAutoRun(conversationId));
  const allowChat = useAppSelector(selectAllowChat(conversationId));
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(conversationId),
  );
  const shouldShowInput = useAppSelector(selectShouldShowInput(conversationId));
  const title = useAppSelector(selectInstanceDisplayTitle(conversationId));
  const status = useAppSelector(selectInstanceStatus(conversationId));
  const isExecuting = useAppSelector(selectIsExecuting(conversationId));
  const hasUserInput = useAppSelector(selectHasUserInput(conversationId));
  const conversationMode = useAppSelector(
    selectConversationMode(conversationId),
  );
  const showVariablePanel = useAppSelector(
    selectShowVariablePanel(conversationId),
  );
  // ── Auto-run: fire execution once when conditions are met ──────────────────
  useEffect(() => {
    if (autoRunFiredRef.current) return;
    if (!autoRun) return;
    if (status !== "ready") return;
    if (isExecuting) return;
    if (needsPreExecution) return;

    autoRunFiredRef.current = true;

    if (conversationMode === "chat") {
      dispatch(executeChatInstance({ conversationId: conversationId }));
    } else {
      dispatch(executeInstance({ conversationId }));
    }
  }, [
    autoRun,
    status,
    isExecuting,
    needsPreExecution,
    conversationId,
    conversationMode,
    dispatch,
  ]);

  // ── Pre-execution gate ─────────────────────────────────────────────────────
  if (needsPreExecution) {
    return <PreExecutionAgentInput conversationId={conversationId} />;
  }

  // ── Main display ───────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col h-full max-w-[800px] overflow-hidden bg-background ${className}`}
    >
      {showTitle && title && (
        <div className="px-4 py-2 border-b border-border shrink-0">
          <p className="text-sm font-medium text-foreground truncate">
            {title}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 bg-background pt-2">
        {/* <SmartAgentMessageList conversationId={conversationId} compact={compact} /> */}
        <AgentConversationDisplay
          conversationId={conversationId}
          compact={compact}
        />
      </div>

      {shouldShowInput && (
        <div className="shrink-0 px-3 pb-3 pt-1 bg-background">
          <SmartAgentInput
            conversationId={conversationId}
            surfaceKey={surfaceKey}
            compact={compact}
            showAutoClearToggle={false}
          />
        </div>
      )}
    </div>
  );
}
