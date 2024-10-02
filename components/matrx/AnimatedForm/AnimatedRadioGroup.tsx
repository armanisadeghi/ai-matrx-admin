'use client';

'use client';
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/styles/themes/utils"; // Import the cn utility
import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import { FormField } from "./types";

const AnimatedRadioGroup: React.FC<{
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean; // Add disabled prop
}> = ({ field, value, onChange, className, disabled = false, ...props }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
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
        <RadixRadioGroup.Root
            className={cn("flex flex-col space-y-2", disabled && "opacity-50 cursor-not-allowed")} // Adjust styles when disabled
            value={value}
            onValueChange={!disabled ? onChange : undefined} // Disable onChange when disabled
            disabled={disabled} // Add disabled prop
            {...props}
        >
            {field.options?.map((option) => (
                <motion.div
                    key={option}
                    className="flex items-center"
                    whileHover={!disabled ? { x: 10 } : undefined} // Disable hover effect when disabled
                >
                    <RadixRadioGroup.Item
                        id={option}
                        value={option}
                        disabled={disabled} // Add disabled prop
                        className={cn(
                            "h-4 w-4 rounded-full border border-input focus:outline-none focus:ring-2 focus:ring-primary",
                            disabled ? "cursor-not-allowed opacity-50" : ""
                        )}
                    >
                        <RadixRadioGroup.Indicator
                            className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-primary"
                        />
                    </RadixRadioGroup.Item>
                    <label
                        htmlFor={option}
                        className={cn("ml-2 text-sm font-medium", disabled ? "text-muted" : "text-foreground")} // Adjust label style when disabled
                    >
                        {option}
                    </label>
                </motion.div>
            ))}
        </RadixRadioGroup.Root>
    </motion.div>
);

export default AnimatedRadioGroup;
