/**
 * Variable Input Components
 *
 * Custom input components for prompt variables that all return text values.
 * Each VariableComponentType maps directly to a rendered component — no separate variant.
 */

export { ToggleInput } from "./ToggleInput";
export { RadioGroupInput } from "./RadioGroupInput";
export { CheckboxGroupInput } from "./CheckboxGroupInput";
export { SelectInput } from "./SelectInput";
export { NumberInput } from "./NumberInput";
export { TextareaInput } from "./TextareaInput";
export { PillToggleInput } from "./PillToggleInput";
export { SliderInput } from "./SliderInput";
export { useContainerWidth } from "./useContainerColumns";

import React from "react";
import { ToggleInput } from "./ToggleInput";
import { RadioGroupInput } from "./RadioGroupInput";
import { CheckboxGroupInput } from "./CheckboxGroupInput";
import { SelectInput } from "./SelectInput";
import { NumberInput } from "./NumberInput";
import { TextareaInput } from "./TextareaInput";
import { PillToggleInput } from "./PillToggleInput";
import { SliderInput } from "./SliderInput";
import { VariableCustomComponent } from "@/features/agents/types/agent-definition.types";
import { formatText } from "@/utils/text/text-case-converter";
import { Label } from "@/components/ui/label";
import { useContainerWidth } from "./useContainerColumns";

interface VariableInputComponentProps {
  value: string;
  onChange: (value: string) => void;
  variableName: string;
  customComponent?: VariableCustomComponent;
  onRequestClose?: () => void;
  helpText?: string;
  compact?: boolean;
  hideLabel?: boolean;
  wizardMode?: boolean;
}

export function VariableInputComponent({
  value,
  onChange,
  variableName,
  customComponent,
  onRequestClose,
  helpText,
  compact = false,
  hideLabel = false,
  wizardMode = false,
}: VariableInputComponentProps) {
  const formattedName = formatText(variableName);
  const [containerRef, containerWidth] = useContainerWidth();

  const type = customComponent?.type ?? "textarea";
  const options = customComponent?.options ?? [];
  const hasOptions = options.length > 0;
  const sharedProps = { compact, wizardMode, containerWidth };

  const fallbackTextarea = (
    <TextareaInput
      value={value}
      onChange={onChange}
      variableName={formattedName}
      onRequestClose={onRequestClose}
      {...sharedProps}
    />
  );

  let inputComponent: React.ReactNode;

  switch (type) {
    case "toggle":
    case "light-switch": {
      const [offLabel = "No", onLabel = "Yes"] =
        customComponent?.toggleValues || [];
      inputComponent = (
        <ToggleInput
          value={value}
          onChange={onChange}
          offLabel={offLabel}
          onLabel={onLabel}
          variableName={formattedName}
          threeDMode={type === "light-switch"}
          {...sharedProps}
        />
      );
      break;
    }

    case "radio":
      inputComponent = hasOptions ? (
        <RadioGroupInput
          value={value}
          onChange={onChange}
          options={options}
          variableName={formattedName}
          allowOther={customComponent?.allowOther}
          {...sharedProps}
        />
      ) : (
        fallbackTextarea
      );
      break;

    case "pill-toggle":
      inputComponent = hasOptions ? (
        <PillToggleInput
          value={value}
          onChange={onChange}
          options={options}
          variableName={formattedName}
          {...sharedProps}
        />
      ) : (
        fallbackTextarea
      );
      break;

    case "selection-list":
      inputComponent = hasOptions ? (
        <SelectInput
          value={value}
          onChange={onChange}
          options={options}
          variableName={formattedName}
          allowOther={customComponent?.allowOther}
          expanded
          wrap={false}
          {...sharedProps}
        />
      ) : (
        fallbackTextarea
      );
      break;

    case "buttons":
      inputComponent = hasOptions ? (
        <SelectInput
          value={value}
          onChange={onChange}
          options={options}
          variableName={formattedName}
          allowOther={customComponent?.allowOther}
          expanded
          wrap={true}
          {...sharedProps}
        />
      ) : (
        fallbackTextarea
      );
      break;

    case "checkbox":
      inputComponent = hasOptions ? (
        <CheckboxGroupInput
          value={value}
          onChange={onChange}
          options={options}
          variableName={formattedName}
          allowOther={customComponent?.allowOther}
          {...sharedProps}
        />
      ) : (
        fallbackTextarea
      );
      break;

    case "select":
      inputComponent = hasOptions ? (
        <SelectInput
          value={value}
          onChange={onChange}
          options={options}
          variableName={formattedName}
          allowOther={customComponent?.allowOther}
          {...sharedProps}
        />
      ) : (
        fallbackTextarea
      );
      break;

    case "number":
      inputComponent = (
        <NumberInput
          value={value}
          onChange={onChange}
          min={customComponent?.min}
          max={customComponent?.max}
          step={customComponent?.step}
          variableName={formattedName}
          {...sharedProps}
        />
      );
      break;

    case "slider":
      inputComponent = (
        <SliderInput
          value={value}
          onChange={onChange}
          min={customComponent?.min}
          max={customComponent?.max}
          step={customComponent?.step}
          variableName={formattedName}
          {...sharedProps}
        />
      );
      break;

    case "textarea":
    default:
      inputComponent = fallbackTextarea;
      break;
  }

  return (
    <div ref={containerRef} className={compact ? "space-y-0.5" : "space-y-1.5"}>
      {!hideLabel && !compact && (
        <div>
          <Label className="text-sm font-medium">{formattedName}</Label>
          {helpText && (
            <p className="text-xs text-muted-foreground mt-0.5">{helpText}</p>
          )}
        </div>
      )}

      {!hideLabel && compact && (
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium pb-1">{formattedName}</Label>
          {helpText && (
            <span className="text-[11px] text-muted-foreground">
              · {helpText}
            </span>
          )}
        </div>
      )}

      {inputComponent}
    </div>
  );
}
