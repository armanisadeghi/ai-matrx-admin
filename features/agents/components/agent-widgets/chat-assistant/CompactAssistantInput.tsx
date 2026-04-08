"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import { selectUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import {
  selectIsExecuting,
  selectConversationMode,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
import { executeChatInstance } from "@/features/agents/redux/execution-system/thunks/execute-chat-instance.thunk";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowUp, Mic, Paperclip, Settings2 } from "lucide-react";

interface CompactAssistantInputProps {
  instanceId: string;
  onToggleVariables?: () => void;
}

export function CompactAssistantInput({
  instanceId,
  onToggleVariables,
}: CompactAssistantInputProps) {
  const dispatch = useAppDispatch();
  const inputText = useAppSelector(selectUserInputText(instanceId));
  const isExecuting = useAppSelector(selectIsExecuting(instanceId));
  const conversationMode = useAppSelector(selectConversationMode(instanceId));
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isSendDisabled = isExecuting || !inputText.trim();

  const handleSend = () => {
    if (isSendDisabled) return;
    if (conversationMode === "chat") {
      dispatch(executeChatInstance({ instanceId }));
    } else {
      dispatch(executeInstance({ instanceId }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-border bg-card">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-36 p-1.5">
          <div className="space-y-0.5">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground rounded-md hover:bg-muted transition-colors"
              onClick={() => setPopoverOpen(false)}
            >
              <Mic className="w-3.5 h-3.5 text-muted-foreground" />
              Voice
            </button>
            {onToggleVariables && (
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground rounded-md hover:bg-muted transition-colors"
                onClick={() => {
                  onToggleVariables();
                  setPopoverOpen(false);
                }}
              >
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                Variables
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <input
        type="text"
        className="flex-1 h-7 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
        style={{ fontSize: "16px" }}
        placeholder="Ask anything..."
        value={inputText}
        onChange={(e) =>
          dispatch(setUserInputText({ instanceId, text: e.target.value }))
        }
        onKeyDown={handleKeyDown}
      />

      <Button
        size="icon"
        className="w-7 h-7 rounded-full bg-primary text-primary-foreground shrink-0 disabled:opacity-40"
        disabled={isSendDisabled}
        onClick={handleSend}
      >
        {isExecuting ? (
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <ArrowUp className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  );
}
