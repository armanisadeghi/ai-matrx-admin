'use client';

import React from "react";
import { motion } from "motion/react";
import {cn} from "@/styles/themes/utils";
import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import { FormField } from "@/types/AnimatedFormTypes";

interface AnimatedRadioGroupProps {
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
    layout?: 'horizontal' | 'vertical';
}

const AnimatedRadioGroup: React.FC<AnimatedRadioGroupProps> = (
    {
        field,
        value,
        onChange,
        className,
        disabled = false,
        layout = 'vertical',
        ...props
    }) => {
    const animationProps = layout === 'vertical'
        ? {
            initial: {opacity: 0, y: -20},
            animate: {opacity: 1, y: 0},
            exit: {opacity: 0, y: 20},
        }
        : {
            initial: {opacity: 0, x: -20},
            animate: {opacity: 1, x: 0},
            exit: {opacity: 0, x: 20},
        };

    return (
        <motion.div
            {...animationProps}
            transition={{duration: 0.3}}
            className={cn("mb-4", className)}
            {...props}
        >
            <label
                className={cn(
                    "block text-sm font-medium mb-2",
                    disabled ? "text-muted" : "text-foreground"
                )}
            >
                {field.label}
            </label>
            <RadixRadioGroup.Root
                className={cn(
                    "flex",
                    layout === 'vertical' ? "flex-col space-y-2" : "flex-row flex-wrap gap-4",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                value={value}
                onValueChange={!disabled ? onChange : undefined}
                disabled={disabled}
            >
                {field.options?.map((option) => (
                    <motion.div
                        key={option}
                        className={cn(
                            "flex items-center",
                            layout === 'horizontal' && "mr-4 mb-2"
                        )}
                        whileHover={!disabled ? {scale: 1.05} : undefined}
                    >
                        <RadixRadioGroup.Item
                            id={option}
                            value={option}
                            disabled={disabled}
                            className={cn(
                                "h-5 w-5 rounded-full border border-input focus:outline-none focus:ring-2 focus:ring-primary",
                                disabled ? "cursor-not-allowed opacity-50" : ""
                            )}
                        >
                            <RadixRadioGroup.Indicator
                                className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2.5 after:h-2.5 after:rounded-full after:bg-primary"
                            />
                        </RadixRadioGroup.Item>
                        <label
                            htmlFor={option}
                            className={cn(
                                "ml-2 text-sm font-medium",
                                disabled ? "text-muted" : "text-foreground"
                            )}
                        >
                            {option}
                        </label>
                    </motion.div>
                ))}
            </RadixRadioGroup.Root>
        </motion.div>
    );
};

export default AnimatedRadioGroup;
