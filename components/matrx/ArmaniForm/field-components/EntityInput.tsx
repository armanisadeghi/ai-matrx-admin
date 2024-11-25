'use client';

import React, { useState } from "react";
import {motion} from "framer-motion";
import {cn} from "@/utils/cn";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {getAnimationVariants, densityConfig, spacingConfig, AnimationPreset} from "@/config/ui/entity-layout-config";
import { MatrxVariant, EntityField  } from './types';

export interface EntityInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    field: EntityField;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: AnimationPreset;
    variant?: MatrxVariant;
    floatingLabel?: boolean;
}

const EntityInput: React.FC<EntityInputProps> = (
    {
        field,
        value,
        onChange,
        className,
        disabled = false,
        density = 'normal',
        animationPreset = 'smooth',
        variant = 'default',
        floatingLabel = true,
        ...props
    }) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const densityStyles = spacingConfig[density];
    const animations = getAnimationVariants(animationPreset);

    const getVariantStyles = (variant: MatrxVariant) => {
        switch (variant) {
            case 'destructive':
                return "border-destructive bg-destructive text-destructive-foreground";
            case 'outline':
                return "border-2";
            case 'secondary':
                return "bg-secondary text-secondary-foreground";
            case 'ghost':
                return "hover:bg-accent hover:text-accent-foreground";
            case 'link':
                return "text-primary underline-offset-4 hover:underline";
            case 'primary':
                return "bg-primary text-primary-foreground";
            default:
                return "";
        }
    };

    // Standard label and input layout
    const standardLayout = (
        <>
            <Label
                htmlFor={field.name}
                className={cn(
                    "block font-medium",
                    densityConfig[density].fontSize,
                    densityStyles.gap,
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}
            >
                {field.label}
            </Label>
            <Input
                id={field.name}
                type={field.type}
                value={value}
                onChange={handleChange}
                placeholder={field.placeholder}
                required={field.required}
                disabled={disabled}
                className={cn(
                    densityConfig[density].fontSize,
                    densityStyles.inputSize,
                    getVariantStyles(variant),
                    disabled ? "bg-muted cursor-not-allowed opacity-50" : ""
                )}
                {...props}
            />
        </>
    );

    // Floating label layout
    const floatingLabelLayout = (
        <div className="relative mt-2">
            <Input
                id={field.name}
                type={field.type}
                value={value}
                onChange={handleChange}
                required={field.required}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={cn(
                    "pt-4 pb-2", // Adjusted padding for floating label
                    densityConfig[density].fontSize,
                    densityStyles.inputSize,
                    getVariantStyles(variant),
                    disabled ? "bg-muted cursor-not-allowed opacity-50" : ""
                )}
                {...props}
            />
            <Label
                htmlFor={field.name}
                className={`absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm ${
                    (isFocused || value)
                    ? `absolute -top-2 text-xs ${
                        disabled
                        ? '[&]:text-gray-400 dark:[&]:text-gray-400'
                        : '[&]:text-blue-500 dark:[&]:text-blue-500'
                    }`
                    : 'top-3 [&]:text-gray-400 dark:[&]:text-gray-400'
                }`}
            >
                <span className="px-1 relative z-20">
                    {field.label}
                </span>
            </Label>
        </div>
    );

    return (
        <motion.div
            variants={animations}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
                densityStyles.section,
                // Add padding to top of container when using floating label
                floatingLabel && "pt-1",
                className
            )}
        >
            {floatingLabel ? floatingLabelLayout : standardLayout}
        </motion.div>
    );
};

export default EntityInput;
