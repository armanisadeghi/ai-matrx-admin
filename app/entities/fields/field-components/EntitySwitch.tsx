import React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { FieldComponentProps } from "../types";
import { StandardFieldLabel } from "./add-ons/FloatingFieldLabel";
import { useFieldStyles } from "./add-ons/useFieldStyles";

type EntitySwitchProps = FieldComponentProps<boolean>;

const EntitySwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  EntitySwitchProps
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
    const safeValue = value ?? false;

    const { getInputStyles } = useFieldStyles({
      variant,
      size,
      density,
      disabled,
      hasValue: safeValue,
      customStates: {
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full": true,
        "border border-zinc-200 dark:border-zinc-700": true,
        "bg-zinc-100 dark:bg-zinc-800": true,
        "focus:outline-none focus:ring-0": true,
        "focus:border-zinc-300 dark:focus:border-zinc-600": true,
        "disabled:cursor-not-allowed disabled:opacity-50": true,
        "data-[state=checked]:bg-zinc-200 dark:data-[state=checked]:bg-zinc-700": true,
        "transition-colors duration-200": true,
      },
    });

    // Switch-specific size configurations
    const switchSizes = {
      sm: {
        switch: "h-4 w-7",
        thumb: "h-3 w-3 data-[state=checked]:translate-x-3",
      },
      default: {
        switch: "h-5 w-9",
        thumb: "h-4 w-4 data-[state=checked]:translate-x-4",
      },
      lg: {
        switch: "h-6 w-11",
        thumb: "h-5 w-5 data-[state=checked]:translate-x-5",
      },
    };

    const currentSize = switchSizes[size as keyof typeof switchSizes] || switchSizes.default;

    const handleChange = (checked: boolean) => {
      onChange(checked);
    };

    const renderSwitch = (
      <SwitchPrimitives.Root
        ref={ref}
        id={dynamicFieldInfo.name}
        checked={safeValue}
        onCheckedChange={handleChange}
        disabled={disabled}
        className={cn(getInputStyles, currentSize.switch, className)}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            "pointer-events-none block rounded-full shadow-lg ring-0",
            "transition-transform duration-200",
            "data-[state=unchecked]:bg-zinc-400 dark:data-[state=unchecked]:bg-zinc-400",
            "data-[state=checked]:bg-primary",
            currentSize.thumb
          )}
        />
      </SwitchPrimitives.Root>
    );

    // Get label position from component props safely
    const labelPosition = dynamicFieldInfo.componentProps?.labelPosition as string ?? 'left';

    const wrapperStyles = {
      left: "flex flex-row-reverse items-center justify-end gap-2",
      right: "flex items-center gap-2",
      above: "flex flex-col gap-2",
      below: "flex flex-col-reverse gap-2",
    };

    return (
      <div className={cn(
        wrapperStyles[labelPosition as keyof typeof wrapperStyles] || wrapperStyles.left,
        "w-full"
      )}>
        <StandardFieldLabel
          htmlFor={dynamicFieldInfo.name}
          disabled={disabled}
          required={dynamicFieldInfo.isRequired}
        >
          {dynamicFieldInfo.displayName}
        </StandardFieldLabel>
        {renderSwitch}
      </div>
    );
  }
);

EntitySwitch.displayName = "EntitySwitch";

export default React.memo(EntitySwitch);