// app/entities/fields/field-components/EntitySimpleDate.tsx

import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { FieldComponentProps } from "../types";
import {
  FloatingFieldLabel,
  StandardFieldLabel,
} from "./add-ons/FloatingFieldLabel";
import { useFieldStyles } from "./add-ons/useFieldStyles";
import ControlledTooltip from "./add-ons/ControlledTooltip";
import FieldActionButtons from "./add-ons/FieldActionButtons";
import {
  SupabaseDateType,
  formatTimestamptz,
  formatTimestamp,
  formatDate,
  formatTime,
  getInputConfig,
} from "@/utils/schema/dateTimeUtils";

type EntitySimpleDateProps = FieldComponentProps<string>;

const EntitySimpleDate = React.forwardRef<
  HTMLInputElement,
  EntitySimpleDateProps
>(
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

    const dbType = dynamicFieldInfo.componentProps
      ?.subComponent as SupabaseDateType;
    const inputConfig = useMemo(() => getInputConfig(dbType), [dbType]);

    const { getInputStyles } = useFieldStyles({
      variant,
      size,
      density,
      disabled,
      focused: isFocused,
      hasValue: Boolean(safeValue),
      isFloating: floatingLabel,
      customStates: {
        "pr-24": true,
      },
    });

    const displayValue = useMemo(() => {
      if (!safeValue) return "";

      try {
        const dateStr = String(safeValue);
        const date = parseISO(dateStr);
        return format(date, inputConfig.displayFormat);
      } catch {
        return "";
      }
    }, [safeValue, inputConfig.displayFormat]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (!newValue) {
        onChange(null);
        return;
      }

      try {
        const dateObj = new Date(newValue);
        let formattedDate: string;

        switch (dbType) {
          case "timestamptz":
            formattedDate = formatTimestamptz(dateObj);
            break;
          case "timestamp":
            formattedDate = formatTimestamp(dateObj);
            break;
          case "date":
            formattedDate = formatDate(dateObj);
            break;
          case "time":
            formattedDate = formatTime(dateObj);
            break;
          default:
            throw new Error(`Unsupported date type: ${dbType}`);
        }

        onChange(formattedDate);
      } catch {
        onChange(null);
      }
    };

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
          type={inputConfig.inputType}
          value={displayValue}
          onChange={handleChange}
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
            allowClear={true}
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
              hasValue={true}
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

EntitySimpleDate.displayName = "EntitySimpleDate";

export default React.memo(EntitySimpleDate);
