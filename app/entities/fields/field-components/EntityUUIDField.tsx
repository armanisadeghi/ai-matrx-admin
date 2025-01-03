// app/entities/fields/field-components/EntityUUID.tsx

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldComponentProps } from "../types";
import ControlledTooltip from "./add-ons/ControlledTooltip";
import UUIDFieldButtons from "./add-ons/UUIDFieldButtons";
import {
  FloatingFieldLabel,
  StandardFieldLabel,
} from "./add-ons/FloatingFieldLabel";
import { useFieldStyles } from "./add-ons/useFieldStyles";

type EntityUUIDProps = FieldComponentProps<string>;

const EntityUUID = React.forwardRef<HTMLInputElement, EntityUUIDProps>(
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

    const hasValidationError =
      safeValue &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        safeValue
      );

    const { getInputStyles } = useFieldStyles({
      variant,
      size,
      density,
      disabled,
      error: hasValidationError,
      focused: isFocused,
      hasValue: safeValue.length > 0,
      isFloating: floatingLabel,
      customStates: {
        "font-mono": true,
        "pr-32": true, // Extra space for UUID buttons
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
          aria-invalid={hasValidationError}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <UUIDFieldButtons
            value={safeValue}
            onChange={onChange}
            disabled={disabled}
            onShowTooltip={setTooltipText}
            onHideTooltip={() => setShowTooltip(false)}
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
              error={hasValidationError}
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
              error={hasValidationError}
            >
              {dynamicFieldInfo.displayName}
            </StandardFieldLabel>
            {renderInput()}
          </>
        )}

        {hasValidationError && (
          <div className="text-xs text-destructive mt-1">Invalid UUID format</div>
        )}
      </div>
    );
  }
);

EntityUUID.displayName = "EntityUUID";

export default React.memo(EntityUUID);