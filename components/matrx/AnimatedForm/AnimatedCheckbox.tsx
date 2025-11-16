// components/matrx/AnimatedForm/AnimatedCheckbox.tsx

'use client';
import React from "react";
import { motion } from "motion/react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/styles/themes/utils"; // Import cn utility
import { FormField } from "@/types/AnimatedFormTypes";

const AnimatedCheckbox: React.FC<{
    field: FormField;
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    disabled?: boolean; // Add disabled prop
}> = ({ field, checked, onChange, className, disabled = false, ...props }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className={cn("mb-4", className)} // Use cn for class names
        {...props}
    >
        <motion.div className="flex items-center" whileHover={disabled ? undefined : { x: +10 }}>
            <RadixCheckbox.Root
                id={field.name}
                checked={checked}
                onCheckedChange={!disabled ? onChange : undefined} // Disable onChange when disabled
                className={cn(
                    "flex h-5 w-5 appearance-none items-center justify-center rounded-md border border-input outline-none focus:ring-2 focus:ring-primary",
                    disabled ? "cursor-not-allowed opacity-50" : "" // Adjust styles when disabled
                )}
            >
                <RadixCheckbox.Indicator>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <Check className="h-4 w-4 text-primary" />
                    </motion.div>
                </RadixCheckbox.Indicator>
            </RadixCheckbox.Root>
            <label
                htmlFor={field.name}
                className={cn("ml-2 text-sm font-medium", disabled ? "text-muted" : "text-foreground", "cursor-pointer")} // Adjust label style when disabled
            >
                {field.label}
            </label>
        </motion.div>
    </motion.div>
);

export default AnimatedCheckbox;
