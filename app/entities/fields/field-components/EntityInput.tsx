// app/entities/fields/field-components/EntityInput.tsx

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldComponentProps } from "../types";
import ControlledTooltip from "./add-ons/ControlledTooltip";
import {
  FloatingFieldLabel,
  StandardFieldLabel,
} from "./add-ons/FloatingFieldLabel";
import { useFieldStyles } from "./add-ons/useFieldStyles";
import FieldActionButtons from "./add-ons/FieldActionButtons";

type EntityInputProps = FieldComponentProps<string>;

const EntityInput = React.forwardRef<HTMLInputElement, EntityInputProps>(
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

    const { getInputStyles } = useFieldStyles({
      variant,
      size,
      density,
      disabled,
      focused: isFocused,
      hasValue: safeValue.length > 0,
      isFloating: floatingLabel,
      customStates: {
        "pr-24": true, // Space for action buttons (less than UUID since no generate button)
      },
    });

    const renderInput = () => (
      <div className="relative">
        {showTooltip && (
          <ControlledTooltip
            text={tooltipText}
            show={true}
            onHide={() => setShowTooltip(false)}
          />
        )}

        <Input
          ref={ref}
          id={dynamicFieldInfo.name}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          required={dynamicFieldInfo.isRequired}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={getInputStyles}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <FieldActionButtons
            value={safeValue}
            onChange={onChange}
            disabled={disabled}
            onShowTooltip={setTooltipText}
            onHideTooltip={() => setShowTooltip(false)}
            allowClear={true} // Enable clear functionality
          />
        </div>
      </div>
    );

    return (
      <div className="relative">
        {floatingLabel ? (
          <div className="relative mt-1">
            {renderInput()}
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
            {renderInput()}
          </>
        )}
      </div>
    );
  }
);

EntityInput.displayName = "EntityInput";

export default React.memo(EntityInput);