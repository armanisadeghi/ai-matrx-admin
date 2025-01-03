// app/entities/fields/field-components/EntitySelect.tsx

import React, { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldComponentProps } from "../types";
import {
  FloatingFieldLabel,
  StandardFieldLabel,
} from "./add-ons/FloatingFieldLabel";
import { useFieldStyles } from "./add-ons/useFieldStyles";

interface OptionType {
  value: string;
  label: string;
}

type EntitySelectProps = FieldComponentProps<string>;

const EntitySelect = React.forwardRef<HTMLSelectElement, EntitySelectProps>(
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

    const { getInputStyles } = useFieldStyles({
      variant,
      size,
      density,
      disabled,
      hasValue: Boolean(safeValue),
      isFloating: floatingLabel,
    });

    const rawOptions = dynamicFieldInfo.componentProps?.options ?? [];

    const options = useMemo(() => {
      if (!Array.isArray(rawOptions)) return [];
      
      return rawOptions.every((opt: unknown) => typeof opt === 'string')
        ? (rawOptions as string[]).map(opt => ({
            value: opt,
            label: opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase().replace(/_/g, ' ')
          }))
        : rawOptions as OptionType[];
    }, [rawOptions]);

    const handleChange = (newValue: string) => {
      onChange(newValue);
    };

    const renderSelect = () => (
      <Select value={safeValue} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className={getInputStyles} id={dynamicFieldInfo.name}>
          <SelectValue  />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={`${dynamicFieldInfo.name}-${option.value}`}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

    return (
      <div className="relative">
        {floatingLabel ? (
          <div className="relative mt-1">
            {renderSelect()}
            <FloatingFieldLabel
              htmlFor={dynamicFieldInfo.name}
              disabled={disabled}
              isFocused={false}
              hasValue={Boolean(safeValue)}
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
            {renderSelect()}
          </>
        )}
      </div>
    );
  }
);

EntitySelect.displayName = "EntitySelect";

export default React.memo(EntitySelect);