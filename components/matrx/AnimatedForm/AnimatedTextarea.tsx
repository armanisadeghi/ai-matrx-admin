// components/matrx/AnimatedForm/AnimatedTextarea.tsx

'use client';
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/styles/themes/utils"; // Import cn utility
import { FormField } from "./types";

const AnimatedTextarea: React.FC<{
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean; // Add disabled prop
}> = ({ field, value, onChange, className, disabled = false, ...props }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={cn("mb-4", className)} // Use cn for class names
        {...props}
    >
        <label
            className={cn(
                "block text-sm font-medium mb-1",
                disabled ? "text-muted" : "text-foreground" // Adjust label style when disabled
            )}
        >
            {field.label}
        </label>
        <motion.textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            whileFocus={disabled ? undefined : { scale: 1.02 }} // Disable focus effect when disabled
            disabled={disabled} // Add disabled prop
            className={cn(
                "w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground",
                disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
            )} // Adjust styles when disabled
        />
    </motion.div>
);

export default AnimatedTextarea;
