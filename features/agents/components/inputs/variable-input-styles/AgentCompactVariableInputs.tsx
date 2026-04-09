"use client";

/**
 * AgentCompactVariableInputs
 *
 * Adapted from features/prompts/components/smart/CompactPromptInput.tsx — variable block only.
 * Stacked full VariableInputComponent rows (no collapsed single-line + popover).
 */

import { formatText } from "@/utils/text/text-case-converter";
import { VariableInputComponent } from "@/features/prompts/components/variable-inputs";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectInstanceVariableDefinitions,
  selectUserVariableValues,
} from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectShouldShowVariables } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { setUserVariableValue } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { selectShowVariablePanel } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { useCallback } from "react";

interface AgentCompactVariableInputsProps {
  conversationId: string;
}

export function AgentCompactVariableInputs({
  conversationId,
}: AgentCompactVariableInputsProps) {
  const dispatch = useAppDispatch();
  const showVariablePanel = useAppSelector(
    selectShowVariablePanel(conversationId),
  );
  const shouldShowVariables = useAppSelector(
    selectShouldShowVariables(conversationId),
  );
  const variableDefaults = useAppSelector(
    selectInstanceVariableDefinitions(conversationId),
  );
  const variableValues = useAppSelector(
    selectUserVariableValues(conversationId),
  );

  const handleVariableValueChange = useCallback(
    (variableName: string, value: string) => {
      dispatch(
        setUserVariableValue({ conversationId, name: variableName, value }),
      );
    },
    [conversationId, dispatch],
  );

  if (
    !shouldShowVariables ||
    !showVariablePanel ||
    variableDefaults.length === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-0 bg-background border-b border-border">
      {variableDefaults.map((variable, index) => {
        const value =
          (variableValues[variable.name] as string | undefined) ??
          variable.defaultValue ??
          "";
        const strValue =
          typeof value === "string" ? value : String(value ?? "");
        const isLast = index === variableDefaults.length - 1;
        const isFirst = index === 0;

        return (
          <div
            key={variable.name}
            className={!isLast ? "py-1 border-b-2 border-border" : ""}
          >
            <div
              className={`px-3 ${isFirst ? "pt-2.5" : "pt-2"} ${!isLast ? "pb-2" : "pb-2.5"}`}
            >
              <VariableInputComponent
                value={strValue}
                onChange={(newValue) =>
                  handleVariableValueChange(variable.name, newValue)
                }
                variableName={formatText(variable.name)}
                customComponent={variable.customComponent}
                helpText={variable.helpText}
                compact
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
