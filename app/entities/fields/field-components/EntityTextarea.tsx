import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EntityComponentBaseProps } from "../types";
import ControlledTooltip from "./add-ons/ControlledTooltip";
import {
  FloatingFieldLabel,
  StandardFieldLabel,
} from "./add-ons/FloatingFieldLabel";
import { useFieldStyles } from "./add-ons/useFieldStyles";
import FieldActionButtons from "./add-ons/FieldActionButtons";

type EntityTextareaProps = Omit<EntityComponentBaseProps, "value" | "onChange"> & {
  value: string | null;
  onChange: (value: string) => void;
};

const EntityTextarea = React.forwardRef<HTMLTextAreaElement, EntityTextareaProps>(
  (
    {
      entityKey,
      dynamicFieldInfo,
      value,
      onChange,
      disabled,
      className,
      density,
      animationPreset,
      size,
      textSize,
      variant,
      floatingLabel,
    },
    ref
  ) => {
    const safeValue = value ?? "";
    const [isFocused, setIsFocused] = useState(false);
    const [tooltipText, setTooltipText] = useState("");
    const [showTooltip, setShowTooltip] = useState(false);

    const rows =
      ((dynamicFieldInfo.componentProps as Record<string, unknown>)
        ?.rows as number) ?? 3;

    const { getTextareaStyles } = useFieldStyles({
      variant,
      size,
      density,
      disabled,
      focused: isFocused,
      hasValue: safeValue.length > 0,
      isFloating: floatingLabel,
      customStates: {
        "min-h-[80px]": true,
        "h-auto": true,
        "resize-vertical": true,
        "pr-24": true, // Space for action buttons
      },
    });

    const renderTextarea = () => (
      <div className="relative">
        {showTooltip && (
          <ControlledTooltip
            text={tooltipText}
            show={true}
            onHide={() => setShowTooltip(false)}
          />
        )}

        <Textarea
          ref={ref}
          id={dynamicFieldInfo.name}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          required={dynamicFieldInfo.isRequired}
          disabled={disabled}
          rows={rows}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={getTextareaStyles}
        />

        <div className="absolute right-2 top-2">
          <FieldActionButtons
            value={safeValue}
            onChange={onChange}
            disabled={disabled}
            onShowTooltip={setTooltipText}
            onHideTooltip={() => setShowTooltip(false)}
            allowClear={true}
          />
        </div>
      </div>
    );

    return (
      <div className="relative">
        {floatingLabel ? (
          <div className="relative mt-1">
            {renderTextarea()}
            <FloatingFieldLabel
              htmlFor={dynamicFieldInfo.name}
              disabled={disabled}
              isFocused={isFocused}
              hasValue={safeValue.length > 0}
            >
              {dynamicFieldInfo.displayName}
            </FloatingFieldLabel>
          </div>
        ) : (
          <>
            <StandardFieldLabel
              htmlFor={dynamicFieldInfo.name}
              disabled={disabled}
              required={dynamicFieldInfo.isRequired}
            >
              {dynamicFieldInfo.displayName}
            </StandardFieldLabel>
            {renderTextarea()}
          </>
        )}
      </div>
    );
  }
);

EntityTextarea.displayName = "EntityTextarea";

export default React.memo(EntityTextarea);