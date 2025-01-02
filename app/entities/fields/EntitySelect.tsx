// app\entities\fields\EntitySelect.tsx

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityComponentBaseProps } from "./types";

interface OptionType {
    value: string;
    label: string;
}

interface EntitySelectProps extends EntityComponentBaseProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size' | 'value'> {
    value: string | number;
    labelPosition?: 'default' | 'above' | 'left' | 'right' | 'inline';
}

const EntitySelect = React.forwardRef<HTMLSelectElement, EntitySelectProps>(
    ({
        entityKey,
        dynamicFieldInfo,
        value = '',
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        className,
        variant = 'default',
        disabled = false,
        labelPosition = 'default',
        ...props
    }, ref) => {
        const customProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
        const rawOptions = customProps?.options ?? [];

        const options = useMemo(() => {
            if (!Array.isArray(rawOptions)) return [];
            
            return rawOptions.every((opt: unknown) => typeof opt === 'string')
                ? (rawOptions as string[]).map(opt => ({
                    value: opt,
                    label: opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase().replace(/_/g, ' ')
                }))
                : rawOptions as OptionType[];
        }, [rawOptions]);

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

        const variants = {
            destructive: "border-destructive text-destructive",
            success: "border-success text-success",
            outline: "border-2",
            secondary: "bg-secondary text-secondary-foreground",
            ghost: "border-none bg-transparent",
            link: "text-primary underline-offset-4 hover:underline",
            primary: "bg-primary text-primary-foreground",
            default: "bg-background border-input",
        };

        const customLabelPosition = (customProps?.labelPosition as string) ?? 'default';
        const resolvedLabelPosition = customLabelPosition === 'default' ? 'above' : customLabelPosition;

        const labelPositionStyles = {
            default: "flex flex-col",
            above: "flex flex-col",
            left: "flex flex-row items-center gap-2",
            right: "flex flex-row-reverse items-center gap-2",
            inline: "flex items-center gap-2"
        };

        const handleChange = (newValue: string) => {
            onChange(newValue);
        };

        const uniqueId = `${entityKey}-${dynamicFieldInfo.name}`;

        return (
            <div className={cn(
                labelPositionStyles[resolvedLabelPosition as keyof typeof labelPositionStyles],
                densityConfig[density as keyof typeof densityConfig]?.wrapper,
                className
            )}>
                <Label
                    htmlFor={uniqueId}
                    className={cn(
                        densityConfig[density as keyof typeof densityConfig]?.label,
                        "font-medium",
                        disabled ? "text-muted-foreground" : "text-foreground"
                    )}
                >
                    {dynamicFieldInfo.displayName}
                </Label>
                <Select
                    value={value?.toString()}
                    onValueChange={handleChange}
                    disabled={disabled}
                >
                    <SelectTrigger
                        id={uniqueId}
                        className={cn(
                            "w-full",
                            densityConfig[density as keyof typeof densityConfig]?.trigger,
                            variants[variant as keyof typeof variants] || variants.default,
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
                                key={`${uniqueId}-${option.value}`}
                                value={option.value}
                                className={cn(
                                    densityConfig[density as keyof typeof densityConfig]?.item,
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
    }
);

EntitySelect.displayName = "EntitySelect";

export default React.memo(EntitySelect);