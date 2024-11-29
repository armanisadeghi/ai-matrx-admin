'use client';

import React from "react";
import {cn} from "@/utils/cn";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {EntityBaseFieldProps} from "../EntityBaseField";

interface EntitySelectProps extends EntityBaseFieldProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size' | 'value'> {
}

interface OptionType {
    value: string;
    label: string;
}

const EntitySelect: React.FC<EntitySelectProps> = (
    {
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
    }) => {
    const customProps = field.componentProps as Record<string, unknown>;
    const rawOptions = customProps?.options ?? [];

    // Only transform if it's a simple string array
    const options = Array.isArray(rawOptions)
                    ? rawOptions.every((opt: unknown) => typeof opt === 'string')
                      ? (rawOptions as string[]).map(opt => ({
                value: opt,
                label: opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase().replace(/_/g, ' ')
            }))
                      : rawOptions as OptionType[]
                    : [];

    const densityConfig = {
        compact: {
            wrapper: "gap-1",
            label: "text-sm",
            trigger: "h-8 px-2",
            item: "py-1"
        },
        normal: {
            wrapper: "gap-2",
            label: "text-base",
            trigger: "h-10 px-3",
            item: "py-2"
        },
        comfortable: {
            wrapper: "gap-3",
            label: "text-lg",
            trigger: "h-12 px-4",
            item: "py-3"
        }
    };

    const variantStyles = {
        destructive: "border-destructive text-destructive",
        success: "border-success text-success",
        outline: "border-2",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "border-none bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        primary: "bg-primary text-primary-foreground",
        default: "bg-background border-input",
    }[variant];

    const customLabelPosition = (customProps?.labelPosition as string) ?? 'default';
    const resolvedLabelPosition = customLabelPosition === 'default' ? 'above' : customLabelPosition;

    const labelPositionStyles = {
        default: "flex flex-col",
        above: "flex flex-col",
        left: "flex flex-row items-center gap-2",
        right: "flex flex-row-reverse items-center gap-2",
        inline: "flex items-center gap-2"
    };

    return (
        <div className={cn(
            labelPositionStyles[resolvedLabelPosition],
            densityConfig[density].wrapper,
            className
        )}>
            <Label
                htmlFor={`${entityKey}-${field.name}`}
                className={cn(
                    densityConfig[density].label,
                    "font-medium",
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}
            >
                {field.displayName}
            </Label>
            <Select
                value={value?.toString()}
                onValueChange={onChange}
                disabled={disabled}
            >
                <SelectTrigger
                    id={`${entityKey}-${field.name}`}
                    className={cn(
                        "w-full",
                        densityConfig[density].trigger,
                        variantStyles,
                        "hover:bg-accent/50",
                        "focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                    )}
                >
                    <SelectValue placeholder="Select an option"/>
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem
                            key={`${entityKey}-${field.name}-${option.value}`}
                            value={option.value}
                            className={cn(
                                densityConfig[density].item,
                                "cursor-pointer hover:bg-accent/50",
                                disabled ? "cursor-not-allowed opacity-50" : ""
                            )}
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default EntitySelect;
