'use client';
import React from "react";
import { motion } from "framer-motion";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import { FormField } from "@/types/AnimatedFormTypes";

type MatrxVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';

const EntityCheckbox: React.FC<{
    field: FormField;
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    disabled?: boolean;
    variant?: MatrxVariant;
}> = ({ field, checked, onChange, className, disabled = false, variant = 'default', ...props }) => {
    const getVariantStyles = (variant: MatrxVariant) => {
        switch (variant) {
            case 'destructive':
                return "border-destructive focus:ring-destructive";
            case 'primary':
                return "border-primary focus:ring-primary";
            case 'secondary':
                return "border-secondary focus:ring-secondary";
            case 'outline':
                return "border-2 focus:ring-primary";
            case 'ghost':
                return "border-transparent hover:border-input focus:ring-primary";
            case 'link':
                return "border-transparent underline-offset-4 hover:underline focus:ring-primary";
            default:
                return "border-input focus:ring-primary";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={cn("mb-4", className)}
            {...props}
        >
            <motion.div className="flex items-center" whileHover={disabled ? undefined : { x: +10 }}>
                <RadixCheckbox.Root
                    id={field.name}
                    checked={checked}
                    onCheckedChange={!disabled ? onChange : undefined}
                    className={cn(
                        "flex h-5 w-5 appearance-none items-center justify-center rounded-md outline-none focus:ring-2",
                        getVariantStyles(variant),
                        disabled ? "cursor-not-allowed opacity-50" : ""
                    )}
                >
                    <RadixCheckbox.Indicator>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Check className={cn("h-4 w-4",
                                variant === 'destructive' ? "text-destructive" :
                                variant === 'primary' ? "text-primary" :
                                "text-primary"
                            )} />
                        </motion.div>
                    </RadixCheckbox.Indicator>
                </RadixCheckbox.Root>
                <label
                    htmlFor={field.name}
                    className={cn(
                        "ml-2 text-sm font-medium cursor-pointer",
                        disabled ? "text-muted" : "text-foreground",
                        variant === 'destructive' ? "text-destructive" : ""
                    )}
                >
                    {field.label}
                </label>
            </motion.div>
        </motion.div>
    );
};

export default EntityCheckbox;
