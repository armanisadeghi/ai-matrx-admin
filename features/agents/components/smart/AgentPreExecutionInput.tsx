"use client";

/**
 * AgentPreExecutionInput
 *
 * Gate component shown before the main display when usePreExecutionInput is true
 * and preExecutionSatisfied is false.
 *
 * Uses the full SmartAgentInput so users get resources, voice, paste, etc.
 * The key difference: instead of executing on submit, it marks
 * preExecutionSatisfied = true and lets AgentRunner take over.
 *
 * Flow:
 *   1. User types/speaks/pastes into SmartAgentInput (writes to Redux in real-time)
 *   2. User clicks "Continue" (or "Skip")
 *   3. We dispatch setPreExecutionSatisfied(true)
 *   4. AgentRunner sees needsPreExecution flip to false → shows main display
 *   5. If autoRun is true, AgentRunner's auto-run effect fires with the input already in Redux
 */

import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreExecutionSatisfied } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { selectInstanceTitle } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { SmartAgentInput } from "./SmartAgentInput";

interface AgentPreExecutionInputProps {
  instanceId: string;
}

export function AgentPreExecutionInput({
  instanceId,
}: AgentPreExecutionInputProps) {
  const dispatch = useAppDispatch();
  const title = useAppSelector(selectInstanceTitle(instanceId));
  const inputText = useAppSelector(selectUserInputText(instanceId));

  const handleContinue = () => {
    dispatch(setPreExecutionSatisfied({ instanceId, value: true }));
  };

  const handleCancel = () => {
    dispatch(destroyInstance(instanceId));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md space-y-3">
          {title && (
            <p className="text-sm font-medium text-center text-foreground">
              {title}
            </p>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Add an optional message before running
          </p>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2">
        <SmartAgentInput
          instanceId={instanceId}
          compact
          placeholder="Type instructions, add files, record audio... (optional)"
          showSubmitOnEnterToggle={false}
          showAutoClearToggle={false}
          sendButtonVariant="default"
          disableSend
        />
      </div>

      <div className="shrink-0 flex items-center justify-center gap-2 px-3 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-muted-foreground"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleContinue}>
          <ArrowRight className="w-3.5 h-3.5 mr-1" />
          {inputText?.trim() ? "Continue" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
