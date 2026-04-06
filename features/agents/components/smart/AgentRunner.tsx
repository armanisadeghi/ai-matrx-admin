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
 * Props: instanceId + optional layout hints (compact, showTitle).
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
  selectInstanceTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectInstanceStatus } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.selectors";
import {
  selectIsExecuting,
  selectConversationMode,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectHasUserInput } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
import { executeChatInstance } from "@/features/agents/redux/execution-system/thunks/execute-chat-instance.thunk";
// import { SmartAgentMessageList } from "./SmartAgentMessageList";
import { SmartAgentInput } from "./SmartAgentInput";
import { AgentPreExecutionInput } from "./AgentPreExecutionInput";
import { Messages } from "../messages/Messages";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";

interface AgentRunnerProps {
  instanceId: string;
  compact?: boolean;
  showTitle?: boolean;
  className?: string;
  /** Called when autoClearConversation creates a new instance */
  onNewInstance?: (newInstanceId: string) => void;
}

export function AgentRunner({
  instanceId,
  compact = false,
  showTitle = false,
  className = "",
  onNewInstance,
}: AgentRunnerProps) {
  const dispatch = useAppDispatch();
  const autoRunFiredRef = useRef(false);

  const autoRun = useAppSelector(selectAutoRun(instanceId));
  const allowChat = useAppSelector(selectAllowChat(instanceId));
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(instanceId),
  );
  const shouldShowInput = useAppSelector(selectShouldShowInput(instanceId));
  const title = useAppSelector(selectInstanceTitle(instanceId));
  const status = useAppSelector(selectInstanceStatus(instanceId));
  const isExecuting = useAppSelector(selectIsExecuting(instanceId));
  const hasUserInput = useAppSelector(selectHasUserInput(instanceId));
  const conversationMode = useAppSelector(selectConversationMode(instanceId));

  // ── Auto-run: fire execution once when conditions are met ──────────────────
  useEffect(() => {
    if (autoRunFiredRef.current) return;
    if (!autoRun) return;
    if (status !== "ready") return;
    if (isExecuting) return;
    if (needsPreExecution) return;

    autoRunFiredRef.current = true;

    if (conversationMode === "chat") {
      dispatch(executeChatInstance({ instanceId }));
    } else {
      dispatch(executeInstance({ instanceId }));
    }
  }, [
    autoRun,
    status,
    isExecuting,
    needsPreExecution,
    instanceId,
    conversationMode,
    dispatch,
  ]);

  // ── Pre-execution gate ─────────────────────────────────────────────────────
  if (needsPreExecution) {
    return <AgentPreExecutionInput instanceId={instanceId} />;
  }

  // ── Main display ───────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col h-full overflow-hidden bg-background ${className}`}
    >
      {showTitle && title && (
        <div className="px-4 py-2 border-b border-border shrink-0">
          <p className="text-sm font-medium text-foreground truncate">
            {title}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 bg-background">
        {/* <SmartAgentMessageList instanceId={instanceId} compact={compact} /> */}
        <AgentConversationDisplay instanceId={instanceId} compact={compact} />
      </div>

      {shouldShowInput && (
        <div className="shrink-0 px-3 pb-3 pt-1 bg-background">
          <SmartAgentInput
            instanceId={instanceId}
            compact={compact}
            onNewInstance={onNewInstance}
            showAutoClearToggle={false}
          />
        </div>
      )}
    </div>
  );
}
