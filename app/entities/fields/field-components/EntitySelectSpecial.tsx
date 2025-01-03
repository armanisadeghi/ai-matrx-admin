// app/entities/fields/field-components/EntitySelectSpecial.tsx

import React, { useMemo } from "react";
import { FieldComponentProps } from "../types";
import { useFieldStyles } from "./add-ons/useFieldStyles";
import MatrxSelectFloatinglabel from "@/components/matrx/MatrxSelectFloatingLabel";

interface OptionType {
  value: string;
  label: string;
}

type EntitySelectSpecialProps = FieldComponentProps<string>;

const EntitySelectSpecial = React.forwardRef<HTMLSelectElement, EntitySelectSpecialProps>(
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

    return (
      <MatrxSelectFloatinglabel
        ref={ref}
        id={dynamicFieldInfo.name}
        value={safeValue}
        onChange={onChange}
        options={options}
        label={dynamicFieldInfo.displayName}
        disabled={disabled}
        className="relative border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 hover:bg-accent/50"
        required={dynamicFieldInfo.isRequired}
        floatingLabel={floatingLabel}
      />
    );
  }
);

EntitySelectSpecial.displayName = "EntitySelectSpecial";

export default React.memo(EntitySelectSpecial);