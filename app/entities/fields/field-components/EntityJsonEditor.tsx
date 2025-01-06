"use client";

import React, { useState } from "react";
import { FieldComponentProps } from "../types";
import {
  FloatingFieldLabel,
  StandardFieldLabel,
} from "./add-ons/FloatingFieldLabel";
import { useFieldStyles } from "./add-ons/useFieldStyles";
import FieldActionButtons from "./add-ons/FieldActionButtons";
import ControlledTooltip from "./add-ons/ControlledTooltip";
import JsonEditor from "./add-ons/JsonEditor";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const EntityJsonEditor = React.forwardRef<HTMLTextAreaElement, FieldComponentProps<JsonValue>>(
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
    const [isFocused, setIsFocused] = useState(false);
    const [tooltipText, setTooltipText] = useState("");
    const [showTooltip, setShowTooltip] = useState(false);

    const safeValue = value ?? "";
    const isEmpty = !value || value === "" || (typeof value === "object" && Object.keys(value).length === 0);

    const { getTextareaStyles } = useFieldStyles({
      variant,
      size,
      density,
      disabled,
      focused: isFocused,
      hasValue: !isEmpty,
      isFloating: floatingLabel,
      customStates: {
        "min-h-[80px]": true,
        "h-auto": true,
        "resize-vertical": true,
        "pr-24": true,
      },
    });

    const renderEditor = () => (
      <div className="relative">
        {showTooltip && (
          <ControlledTooltip
            text={tooltipText}
            show={true}
            onHide={() => setShowTooltip(false)}
          />
        )}

        <JsonEditor
          ref={ref}
          id={dynamicFieldInfo.name}
          value={safeValue}
          onChange={onChange}
          required={dynamicFieldInfo.isRequired}
          disabled={disabled}
          rows={3}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={getTextareaStyles}
        />

        <div className="absolute right-2 top-2">
          <FieldActionButtons
            value={typeof safeValue === 'string' ? safeValue : JSON.stringify(safeValue)}
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
            {renderEditor()}
            <FloatingFieldLabel
              htmlFor={dynamicFieldInfo.name}
              disabled={disabled}
              isFocused={isFocused}
              hasValue={!isEmpty}
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
            {renderEditor()}
          </>
        )}
      </div>
    );
  }
);

EntityJsonEditor.displayName = "EntityJsonEditor";

export default React.memo(EntityJsonEditor);


