"use client";

/**
 * AgentPreExecutionInput
 *
 * Focused gate component — NOT a chat interface. Shown before the main display
 * when usePreExecutionInput is true and preExecutionSatisfied is false.
 *
 * Uses SmartAgentInput in compact mode with send disabled so the user gets
 * full functionality (variables, resources, audio, paste) in a tight layout.
 * Continue/Skip and Cancel buttons control the gate.
 *
 * Flow:
 *   1. SmartAgentInput writes to Redux in real-time (text, variables, resources)
 *   2. User clicks Continue / Skip → setPreExecutionSatisfied(true)
 *   3. AgentRunner sees gate flip → renders the main display
 *   4. If autoRun, execution fires immediately with everything already in Redux
 */

import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreExecutionSatisfied } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import {
  selectInstanceTitle,
  selectPreExecutionMessage,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectHasUserInput } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
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
  const hasInput = useAppSelector(selectHasUserInput(instanceId));
  const preExecutionMessage = useAppSelector(
    selectPreExecutionMessage(instanceId),
  );

  const handleContinue = () => {
    dispatch(setPreExecutionSatisfied({ instanceId, value: true }));
  };

  const handleCancel = () => {
    dispatch(destroyInstance(instanceId));
  };

  return (
    <div className="flex flex-col">
      {(title || preExecutionMessage) && (
        <div className="px-3 pt-3 pb-1 space-y-0.5">
          {title && (
            <p className="text-sm font-medium text-foreground truncate">
              {title}
            </p>
          )}
          {preExecutionMessage && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {preExecutionMessage}
            </p>
          )}
        </div>
      )}

      <div className="px-3 pt-1 pb-1">
        <SmartAgentInput
          instanceId={instanceId}
          compact
          placeholder="Additional instructions (optional)..."
          showSubmitOnEnterToggle={false}
          showAutoClearToggle={false}
          disableSend
        />
      </div>

      <div className="flex items-center justify-center gap-2 px-3 pb-3 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-muted-foreground h-7 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleContinue} className="h-7 text-xs">
          <ArrowRight className="w-3 h-3 mr-1" />
          {hasInput ? "Continue" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
