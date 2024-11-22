'use client';

import React from "react";
import {motion} from "framer-motion";
import {cn} from "@/styles/themes/utils";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {FormField} from "@/types/AnimatedFormTypes";
import {MatrxVariant} from './types';

interface EntityTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    variant?: MatrxVariant;
}

const EntityTextarea: React.FC<EntityTextareaProps> = (
    {
        field,
        value,
        onChange,
        className,
        disabled = false,
        variant = "default",
        ...props
    }) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const getVariantStyles = (variant: MatrxVariant) => {
        switch (variant) {
            case "destructive":
                return "border-destructive text-destructive";
            case "success":
                return "border-success text-success";
            case "outline":
                return "border-2";
            case "secondary":
                return "bg-secondary text-secondary-foreground";
            case "ghost":
                return "border-none bg-transparent";
            case "link":
                return "text-primary underline-offset-4 hover:underline";
            case "primary":
                return "bg-primary text-primary-foreground";
            default:
                return "";
        }
    };

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            transition={{duration: 0.3}}
            className={cn("mb-4", className)}
        >
            <Label
                htmlFor={field.name}
                className={cn(
                    "block text-sm font-medium mb-1",
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}
            >
                {field.label}
            </Label>
            <Textarea
                id={field.name}
                value={value}
                onChange={handleChange}
                placeholder={field.placeholder}
                required={field.required}
                disabled={disabled}
                className={cn(
                    "text-md",
                    "min-h-[132px]",
                    getVariantStyles(variant),
                    disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                )}
                {...props}
            />
        </motion.div>
    );
};

export default EntityTextarea;
