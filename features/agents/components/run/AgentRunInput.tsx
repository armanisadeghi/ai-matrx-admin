"use client";

/**
 * AgentRunInput
 *
 * The message input bar for agent execution.
 * Reads input from currentInputs map (high-frequency, isolated).
 * Dispatches executeAgentMessage on submit.
 */

import { useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectCurrentInput,
  selectIsExecuting,
} from "@/features/agents/redux/agent-execution/selectors";
import {
  setCurrentInput,
  clearCurrentInput,
} from "@/features/agents/redux/agent-execution/slice";
import { executeAgentMessage } from "@/features/agents/redux/agent-execution/thunks/executeAgentThunk";

interface AgentRunInputProps {
  runId: string;
}

export function AgentRunInput({ runId }: AgentRunInputProps) {
  const dispatch = useAppDispatch();
  const input = useAppSelector((state) => selectCurrentInput(state, runId));
  const isExecuting = useAppSelector((state) =>
    selectIsExecuting(state, runId),
  );

  const handleSend = useCallback(() => {
    if (!input.trim() || isExecuting) return;
    dispatch(clearCurrentInput({ runId }));
    dispatch(executeAgentMessage({ runId, userInput: input }));
  }, [runId, input, isExecuting, dispatch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-background">
      <Textarea
        value={input}
        onChange={(e) =>
          dispatch(setCurrentInput({ runId, input: e.target.value }))
        }
        onKeyDown={handleKeyDown}
        placeholder={
          isExecuting
            ? "Waiting for response..."
            : "Type a message... (Enter to send, Shift+Enter for newline)"
        }
        disabled={isExecuting}
        className="flex-1 min-h-[44px] max-h-[180px] resize-none text-sm"
        style={{ fontSize: "16px" }}
        rows={1}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!input.trim() || isExecuting}
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
