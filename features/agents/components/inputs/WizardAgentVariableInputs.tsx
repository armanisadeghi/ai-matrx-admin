"use client";

/**
 * WizardAgentVariableInputs
 *
 * One-variable-at-a-time wizard UI for agent variable inputs.
 * Shows a counter, the variable label + help text, and the input component.
 * Maintains a fixed outer height; input area scrolls internally when needed.
 * Footer has Back, Skip, and Skip All buttons.
 *
 * Prop: instanceId only.
 */

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronsRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectInstanceVariableDefinitions,
  selectUserVariableValues,
} from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectShouldShowVariables } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { setUserVariableValue } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { selectShowVariablePanel } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { VariableInputComponent } from "@/features/prompts/components/variable-inputs";
import { formatText } from "@/utils/text/text-case-converter";

interface WizardAgentVariableInputsProps {
  instanceId: string;
  /** Called when all variables are answered (or skipped) */
  onComplete?: () => void;
  /** Called when submit is triggered from the last variable */
  onSubmit?: () => void;
}

export function WizardAgentVariableInputs({
  instanceId,
  onComplete,
  onSubmit,
}: WizardAgentVariableInputsProps) {
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);

  const showVariablePanel = useAppSelector(selectShowVariablePanel(instanceId));
  const shouldShowVariables = useAppSelector(
    selectShouldShowVariables(instanceId),
  );
  const definitions = useAppSelector(
    selectInstanceVariableDefinitions(instanceId),
  );
  const userValues = useAppSelector(selectUserVariableValues(instanceId));

  const handleValueChange = useCallback(
    (name: string, value: string) => {
      dispatch(setUserVariableValue({ instanceId, name, value }));
    },
    [instanceId, dispatch],
  );

  const goNext = useCallback(() => {
    if (currentIndex < definitions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onSubmit?.();
      onComplete?.();
    }
  }, [currentIndex, definitions.length, onSubmit, onComplete]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const skipAll = useCallback(() => {
    onSubmit?.();
    onComplete?.();
  }, [onSubmit, onComplete]);

  if (!shouldShowVariables || !showVariablePanel || definitions.length === 0) {
    return null;
  }

  const variable = definitions[currentIndex];
  if (!variable) return null;

  const rawValue =
    (userValues[variable.name] as string | undefined) ??
    variable.defaultValue ??
    "";
  const value =
    typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === definitions.length - 1;
  const total = definitions.length;
  const current = currentIndex + 1;

  return (
    <div
      className="border-b border-border flex flex-col"
      style={{ height: 220 }}
    >
      {/* Header — counter */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {formatText(variable.name)}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {current} / {total}
        </span>
      </div>

      {/* Help text */}
      {variable.helpText && (
        <p className="px-3 text-[11px] text-muted-foreground/80 leading-snug shrink-0 pb-1">
          {variable.helpText}
        </p>
      )}

      {/* Input area — scrollable, takes remaining height */}
      <div className="flex-1 overflow-y-auto px-3 py-1 min-h-0">
        <VariableInputComponent
          value={value}
          onChange={(v) => handleValueChange(variable.name, v)}
          variableName={variable.name}
          customComponent={variable.customComponent}
          helpText={undefined}
          compact={false}
        />
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0 border-t border-border/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goBack}
          disabled={isFirst}
          className="h-7 px-2 text-xs gap-1 text-muted-foreground"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goNext}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
          >
            Skip
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>

          {!isLast && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={skipAll}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            >
              Skip All
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          )}

          {isLast && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={goNext}
              className="h-7 px-3 text-xs gap-1"
            >
              Done
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
