// app/entities/fields/EntityRadioGroup.tsx

'use client';

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import { EntityComponentBaseProps } from "../types";

interface EntityRadioGroupProps extends EntityComponentBaseProps {
    layout?: 'horizontal' | 'vertical';
}

const EntityRadioGroup = React.forwardRef<
    HTMLDivElement,
    EntityRadioGroupProps
>(({
    entityKey,
    dynamicFieldInfo,
    value = "",
    onChange,
    disabled = false,
    density = "normal",
    variant = "default",
    className,
    ...props
}, ref) => {
    const customProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
    const layout = (customProps?.layout as ('horizontal' | 'vertical')) ?? 'vertical';

    const options = useMemo(() => {
        if (Array.isArray(customProps.options)) {
            return customProps.options;
        }
        return [];
    }, [customProps.options]);

    const densityConfig = {
        compact: {
            spacing: "space-y-1",
            text: "text-sm",
            radioSize: "h-4 w-4",
            indicatorSize: "after:w-2 after:h-2",
        },
        normal: {
            spacing: "space-y-2",
            text: "text-base",
            radioSize: "h-5 w-5",
            indicatorSize: "after:w-2.5 after:h-2.5",
        },
        comfortable: {
            spacing: "space-y-3",
            text: "text-lg",
            radioSize: "h-6 w-6",
            indicatorSize: "after:w-3 after:h-3",
        },
    };

    const variants = {
        destructive: "border-destructive text-destructive",
        success: "border-success text-success",
        outline: "border-2",
        secondary: "border-secondary text-secondary-foreground",
        ghost: "border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        primary: "border-primary text-primary-foreground",
        default: "",
    };

    const animationProps = layout === 'vertical'
        ? {
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: 20 },
        }
        : {
            initial: { opacity: 0, x: -20 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: 20 },
        };

    const handleChange = (newValue: string) => {
        onChange(newValue);
    };

    return (
        <motion.div
            ref={ref}
            {...animationProps}
            transition={{ duration: 0.3 }}
            className={cn("mb-4", className)}
        >
            <label
                className={cn(
                    "block font-medium mb-2",
                    densityConfig[density as keyof typeof densityConfig]?.text,
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}
            >
                {dynamicFieldInfo.displayName}
            </label>
            <RadixRadioGroup.Root
                className={cn(
                    "flex",
                    layout === 'vertical' 
                        ? cn("flex-col", densityConfig[density as keyof typeof densityConfig]?.spacing) 
                        : "flex-row flex-wrap gap-4",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                value={value as string}
                onValueChange={!disabled ? handleChange : undefined}
                disabled={disabled}
            >
                {options.map((option) => (
                    <motion.div
                        key={option}
                        className={cn(
                            "flex items-center",
                            layout === 'horizontal' && "mr-4 mb-2"
                        )}
                        whileHover={!disabled ? { scale: 1.05 } : undefined}
                    >
                        <RadixRadioGroup.Item
                            id={`${entityKey}-${dynamicFieldInfo.name}-${option}`}
                            value={option}
                            disabled={disabled}
                            className={cn(
                                "rounded-full border border-input focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                variants[variant as keyof typeof variants],
                                densityConfig[density as keyof typeof densityConfig]?.radioSize,
                                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                            )}
                        >
                            <RadixRadioGroup.Indicator
                                className={cn(
                                    "flex items-center justify-center w-full h-full relative after:content-[''] after:block after:rounded-full after:bg-primary",
                                    densityConfig[density as keyof typeof densityConfig]?.indicatorSize
                                )}
                            />
                        </RadixRadioGroup.Item>
                        <label
                            htmlFor={`${entityKey}-${dynamicFieldInfo.name}-${option}`}
                            className={cn(
                                "ml-2 font-medium",
                                densityConfig[density as keyof typeof densityConfig]?.text,
                                disabled ? "text-muted-foreground cursor-not-allowed" : "text-foreground cursor-pointer"
                            )}
                        >
                            {option}
                        </label>
                    </motion.div>
                ))}
            </RadixRadioGroup.Root>
        </motion.div>
    );
});

EntityRadioGroup.displayName = "EntityRadioGroup";

export default React.memo(EntityRadioGroup);