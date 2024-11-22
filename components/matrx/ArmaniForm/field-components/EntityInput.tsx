'use client';

import React from "react";
import {motion} from "framer-motion";
import {cn} from "@/utils/cn";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {getAnimationVariants, densityConfig, spacingConfig, AnimationPreset} from "@/config/ui/entity-layout-config";
import { MatrxVariant, EntityField  } from './types';

export interface EntityInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    field: EntityField ;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: AnimationPreset;
    variant?: MatrxVariant;
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
        ...props
    }) => {
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

    return (
        <motion.div
            variants={animations}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
                densityStyles.section,
                className
            )}
        >
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
        </motion.div>
    );
};

export default EntityInput;
