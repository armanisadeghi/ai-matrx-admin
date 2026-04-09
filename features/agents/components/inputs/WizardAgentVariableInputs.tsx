"use client";

/**
 * WizardAgentVariableInputs
 *
 * One-variable-at-a-time wizard UI for agent variable inputs.
 * Shows a counter, the variable label + help text, and the input component.
 * Maintains a fixed outer height; input area scrolls internally when needed.
 * Footer has Back, Skip, and Skip All buttons.
 *
 * Prop: conversationId only.
 */

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronsRight, ChevronRight } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectInstanceVariableDefinitions,
  selectUserVariableValues,
} from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectShouldShowVariables } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { setUserVariableValue } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import {
  selectShowVariablePanel,
  selectVariableInputStyle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { VariableInputComponent } from "@/features/prompts/components/variable-inputs";
import { formatText } from "@/utils/text/text-case-converter";

interface WizardAgentVariableInputsProps {
  conversationId: string;
  /** Called when all variables are answered (or skipped) */
  onComplete?: () => void;
  /** Called when submit is triggered from the last variable */
  onSubmit?: () => void;
}

export function WizardAgentVariableInputs({
  conversationId,
  onComplete,
  onSubmit,
}: WizardAgentVariableInputsProps) {
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);

  const showVariablePanel = useAppSelector(selectShowVariablePanel(conversationId));
  const variableInputStyle = useAppSelector(
    selectVariableInputStyle(conversationId),
  );
  const shouldShowVariables = useAppSelector(
    selectShouldShowVariables(conversationId),
  );
  const definitions = useAppSelector(
    selectInstanceVariableDefinitions(conversationId),
  );
  const userValues = useAppSelector(selectUserVariableValues(conversationId));

  const handleValueChange = useCallback(
    (name: string, value: string) => {
      dispatch(setUserVariableValue({ conversationId, name, value }));
    },
    [conversationId, dispatch],
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

  if (
    !shouldShowVariables ||
    !showVariablePanel ||
    definitions.length === 0 ||
    variableInputStyle !== "wizard"
  ) {
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
      style={{ height: 200 }}
    >
      {/* Header — variable name + counter */}
      <div className="flex items-center justify-between px-3 pt-2 pb-0.5 shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {formatText(variable.name)}
        </span>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
          {current} / {total}
        </span>
      </div>

      {/* Help text */}
      {variable.helpText && (
        <p className="px-3 text-[11px] text-muted-foreground/70 leading-snug shrink-0 pb-1">
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
          compact={true}
          hideLabel={true}
        />
      </div>

      {/* Footer — delicate inline nav */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0 border-t border-border/40">
        <button
          type="button"
          onClick={goBack}
          disabled={isFirst}
          className="flex items-center gap-0.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-0.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Skip
            <ChevronRight className="w-3 h-3" />
          </button>

          {!isLast && (
            <button
              type="button"
              onClick={skipAll}
              className="flex items-center gap-0.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Skip All
              <ChevronsRight className="w-3 h-3" />
            </button>
          )}

          {isLast && (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-0.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Done
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
