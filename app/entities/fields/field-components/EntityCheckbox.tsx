// app/entities/fields/EntityCheckbox.tsx

'use client';
import React from "react";
import { motion } from "framer-motion";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityComponentBaseProps } from "../types";

interface EntityCheckboxProps extends EntityComponentBaseProps {
    className?: string;
}

const EntityCheckbox = React.forwardRef<
    React.ElementRef<typeof RadixCheckbox.Root>,
    EntityCheckboxProps
>(({
    entityKey,
    dynamicFieldInfo,
    value = false,
    onChange,
    disabled = false,
    variant = 'default',
    density = 'normal',
    className,
    floatingLabel = false,
    ...props
}, ref) => {
    const handleCheckedChange = (checked: boolean) => {
        onChange(checked);
    };

    const variants = {
        destructive: "border-destructive focus:ring-destructive",
        success: "border-success focus:ring-success",
        primary: "border-primary focus:ring-primary",
        secondary: "border-secondary focus:ring-secondary",
        outline: "border-2 focus:ring-primary",
        ghost: "border-transparent hover:border-input focus:ring-primary",
        link: "border-transparent underline-offset-4 hover:underline focus:ring-primary",
        default: "border-input focus:ring-primary"
    };

    const densityConfig = {
        compact: "text-sm",
        normal: "text-base",
        comfortable: "text-lg"
    };

    const uniqueId = `${entityKey}-${dynamicFieldInfo.name}`;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={cn("mb-4", className)}
        >
            <motion.div 
                className="flex items-center" 
                whileHover={disabled ? undefined : { x: +10 }}
            >
                <RadixCheckbox.Root
                    ref={ref}
                    id={uniqueId}
                    checked={value as boolean}
                    onCheckedChange={handleCheckedChange}
                    disabled={disabled}
                    className={cn(
                        "flex h-5 w-5 appearance-none items-center justify-center rounded-md outline-none focus:ring-2",
                        variants[variant as keyof typeof variants] || variants.default,
                        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                        "transition-colors duration-200"
                    )}
                    {...props}
                >
                    <RadixCheckbox.Indicator>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Check 
                                className={cn(
                                    "h-4 w-4",
                                    variant === 'destructive' ? "text-destructive" :
                                    variant === 'primary' ? "text-primary" :
                                    "text-primary"
                                )} 
                            />
                        </motion.div>
                    </RadixCheckbox.Indicator>
                </RadixCheckbox.Root>
                <label
                    htmlFor={uniqueId}
                    className={cn(
                        "ml-2 font-medium select-none",
                        densityConfig[density as keyof typeof densityConfig] || densityConfig.normal,
                        disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer text-foreground",
                        variant === 'destructive' ? "text-destructive" : ""
                    )}
                >
                    {dynamicFieldInfo.displayName}
                </label>
            </motion.div>
        </motion.div>
    );
});

EntityCheckbox.displayName = "EntityCheckbox";

export default React.memo(EntityCheckbox);