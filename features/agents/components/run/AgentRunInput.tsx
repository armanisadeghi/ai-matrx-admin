"use client";

/**
 * AgentRunInput
 *
 * Message input bar for agent execution.
 * Reads from instanceUserInput, dispatches executeInstance on submit.
 * Automatically routes to /agents (turn 1) or /conversations (turn 2+).
 *
 * Prop: instanceId — the only key needed.
 */

import { useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { selectSubmitOnEnter } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import {
  selectIsExecuting,
  selectHasAnyContent,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { setUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import {
  executeInstance,
  clearAfterSend,
} from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";

interface AgentRunInputProps {
  instanceId: string;
}

export function AgentRunInput({ instanceId }: AgentRunInputProps) {
  const dispatch = useAppDispatch();
  const inputText = useAppSelector(selectUserInputText(instanceId));
  const isExecuting = useAppSelector(selectIsExecuting(instanceId));
  const hasContent = useAppSelector(selectHasAnyContent(instanceId));
  const submitOnEnter = useAppSelector(selectSubmitOnEnter(instanceId));

  const handleSend = useCallback(() => {
    if (!hasContent || isExecuting) return;
    // executeInstance reads from Redux state synchronously at thunk entry —
    // it captures text + resources before clearAfterSend wipes them.
    // We dispatch execute first so the thunk reads the full input,
    // then clear so the UI snaps back immediately (optimistic clear).
    dispatch(executeInstance({ instanceId }));
    dispatch(clearAfterSend(instanceId));
  }, [instanceId, hasContent, isExecuting, dispatch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-background">
      <Textarea
        value={inputText}
        onChange={(e) =>
          dispatch(setUserInputText({ instanceId, text: e.target.value }))
        }
        onKeyDown={handleKeyDown}
        placeholder={
          isExecuting
            ? "Waiting for response..."
            : submitOnEnter
              ? "Type a message... (Enter to send, Shift+Enter for newline)"
              : "Type a message..."
        }
        disabled={isExecuting}
        className="flex-1 min-h-[44px] max-h-[180px] resize-none text-sm"
        style={{ fontSize: "16px" }}
        rows={1}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!hasContent || isExecuting}
        className="shrink-0 h-10 w-10"
      >
        {isExecuting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
