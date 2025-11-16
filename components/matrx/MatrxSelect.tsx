// components/matrx/MatrxSelect.tsx

'use client';

import React from "react";
import { motion } from "motion/react";
import {cn} from "@/styles/themes/utils";

interface Option {
    value: string;
    label: string;
}

interface MatrxSelectProps {
    label?: string;
    options: (Option | string)[];
    value: string;
    onChange?: (value: string) => void;
    className?: string;
    disabled?: boolean;
    hideLabel?: boolean;
    required?: boolean;
    placeholder?: string;
}

const MatrxSelect = React.forwardRef<HTMLSelectElement, MatrxSelectProps>(
    (
        {
            label,
            options,
            value,
            onChange,
            className,
            disabled = false,
            hideLabel = false,
            required = false,
            placeholder = "Select an option",
            ...props
        },
        ref
    ) => {
    // Convert string options to Option format
    const normalizedOptions = options.map((option): Option => {
        if (typeof option === 'string') {
            return {value: option, label: option};
        }
        return option;
    });

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            transition={{duration: 0.3}}
            className={cn("mb-4", className)}
            {...props}
        >
            {!hideLabel && label && (
                <label
                    className={cn(
                        "block text-sm font-medium mb-1",
                        disabled ? "text-muted" : "text-foreground"
                    )}
                >
                    {label}
                </label>
            )}
            <motion.select
                ref={ref}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                required={required}
                whileFocus={disabled ? undefined : {scale: 1.02}}
                disabled={disabled}
                className={cn(
                    "w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground",
                    disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                )}
            >
                <option value="">{placeholder}</option>
                {normalizedOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </motion.select>
        </motion.div>
    );
});

MatrxSelect.displayName = "MatrxSelect";

export default MatrxSelect;