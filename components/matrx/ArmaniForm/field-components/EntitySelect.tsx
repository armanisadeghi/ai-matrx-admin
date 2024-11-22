'use client';

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/styles/themes/utils";
import { FormField } from "@/types/AnimatedFormTypes";
import { MatrxVariant } from './types';

const getVariantStyles = (variant: MatrxVariant) => {
    switch (variant) {
        case 'destructive':
            return "bg-destructive text-destructive-foreground border-destructive focus:ring-destructive";
        case 'outline':
            return "bg-background border-2 border-input";
        case 'secondary':
            return "bg-secondary text-secondary-foreground border-secondary";
        case 'ghost':
            return "bg-transparent hover:bg-accent hover:text-accent-foreground";
        case 'link':
            return "bg-transparent underline-offset-4 hover:underline";
        case 'primary':
            return "bg-primary text-primary-foreground border-primary";
        default:
            return "bg-input text-foreground border-input";
    }
};

const EntitySelect: React.FC<{
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
    hideLabel?: boolean;
    variant?: MatrxVariant;
}> = ({ field, value, onChange, className, disabled = false, hideLabel = false, variant = "default", ...props }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={cn("mb-4", className)}
        {...props}
    >
        {!hideLabel && (
            <label
                className={cn(
                    "block text-sm font-medium mb-1",
                    disabled ? "text-muted" : "text-foreground"
                )}
            >
                {field.label}
            </label>
        )}
        <motion.select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            whileFocus={disabled ? undefined : { scale: 1.02 }}
            disabled={disabled}
            className={cn(
                "w-full p-2 rounded-md focus:ring-2 focus:ring-primary focus:border-primary",
                getVariantStyles(variant),
                disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
            )}
        >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </motion.select>
    </motion.div>
);

export default EntitySelect;
