'use client';

import React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import {cn} from "@/utils/cn";
import {Label} from "@/components/ui/label";
import {EntityBaseFieldProps} from "../EntityBaseField";

interface EntitySwitchProps extends EntityBaseFieldProps,
    Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>, 'onChange' | 'size' | 'value'> {
    value: boolean;
}

const EntitySwitch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitives.Root>,
    EntitySwitchProps
>(({
       entityKey,
       dynamicFieldInfo: field,
       value = field.defaultValue,
       onChange,
       density = 'normal',
       animationPreset = 'subtle',
       size = 'default',
       className,
       variant = 'default',
       disabled = false,
       floatingLabel = true,
       labelPosition = 'default',
       ...props
   }, ref) => {
    const customProps = field.componentProps as Record<string, unknown>;
    const customLabelPosition = customProps?.labelPosition as ('default' | 'inline' | 'above' | 'left' | 'right') ?? 'default';
    const resolvedLabelPosition = customLabelPosition === 'default' ? 'left' : customLabelPosition;

    const variants = {
        destructive: "data-[state=checked]:bg-destructive data-[state=unchecked]:bg-destructive/30",
        success: "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-green-500/30",
        outline: "border-2 data-[state=checked]:bg-background data-[state=unchecked]:bg-background",
        secondary: "data-[state=checked]:bg-secondary data-[state=unchecked]:bg-secondary/30",
        ghost: "data-[state=checked]:bg-background/50 data-[state=unchecked]:bg-background/20",
        link: "data-[state=checked]:bg-primary/50 data-[state=unchecked]:bg-primary/20",
        primary: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary/30",
        default: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
    };

    const sizes = {
        xs: "h-3 w-6",
        sm: "h-4 w-7",
        default: "h-5 w-9",
        md: "h-5 w-9",
        lg: "h-6 w-11",
        xl: "h-7 w-12",
        "2xl": "h-8 w-14",
        "3xl": "h-9 w-16",
    };

    const thumbSizes = {
        xs: "h-2 w-2 data-[state=checked]:translate-x-3",
        sm: "h-3 w-3 data-[state=checked]:translate-x-3",
        default: "h-4 w-4 data-[state=checked]:translate-x-4",
        md: "h-4 w-4 data-[state=checked]:translate-x-4",
        lg: "h-5 w-5 data-[state=checked]:translate-x-5",
        xl: "h-6 w-6 data-[state=checked]:translate-x-5",
        "2xl": "h-7 w-7 data-[state=checked]:translate-x-6",
        "3xl": "h-8 w-8 data-[state=checked]:translate-x-7",
    };

    const densityConfig = {
        compact: {
            wrapper: "gap-1 py-0.5",
            label: "text-sm",
        },
        normal: {
            wrapper: "gap-2 py-1",
            label: "text-base",
        },
        comfortable: {
            wrapper: "gap-3 py-1.5",
            label: "text-lg",
        },
    };

    const labelPositionStyles = {
        default: "flex items-center gap-2",
        inline: "flex items-center gap-2",
        above: "flex flex-col gap-1",
        left: "flex flex-row-reverse items-center justify-end gap-2",
        right: "flex items-center gap-2",
    };

    const uniqueId = `${entityKey}-${field.name}`;

    const renderSwitch = (
        <SwitchPrimitives.Root
            key={`switch-${uniqueId}`}
            ref={ref}
            id={uniqueId}
            checked={value}
            onCheckedChange={onChange}
            disabled={disabled}
            className={cn(
                "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "hover:ring-2 hover:ring-primary/50",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            <SwitchPrimitives.Thumb
                className={cn(
                    "pointer-events-none block rounded-full bg-background shadow-lg ring-0",
                    "data-[state=unchecked]:translate-x-0",
                    thumbSizes[size]
                )}
            />
        </SwitchPrimitives.Root>
    );

    const renderLabel = field.displayName && (
        <Label
            key={`label-${uniqueId}`}
            htmlFor={uniqueId}
            className={cn(
                densityConfig[density].label,
                disabled ? "text-muted-foreground cursor-not-allowed" : "text-foreground",
                "select-none"
            )}
        >
            {field.displayName}
        </Label>
    );

    return (
        <div
            key={`wrapper-${uniqueId}`}
            className={cn(
                labelPositionStyles[resolvedLabelPosition],
                densityConfig[density].wrapper,
                "w-full"
            )}
        >
            {renderLabel}
            {renderSwitch}
        </div>
    );
});

EntitySwitch.displayName = "EntitySwitch";

export default EntitySwitch;
