'use client';

import React, {useState} from "react";
import {cn} from "@/utils/cn";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {EntityBaseFieldProps} from "../EntityBaseField";

interface EntityInputProps extends EntityBaseFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'value'> {
}

const EntityInput: React.FC<EntityInputProps> = (
    {
        entityKey,
        dynamicFieldInfo: field,
        value = "",
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        className,
        variant = "default",
        disabled = false,
        floatingLabel = true,
        ...props
    }) => {
    const [isFocused, setIsFocused] = useState(false);
    const customProps = field.componentProps as Record<string, unknown>;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const variantStyles = {
        destructive: "border-destructive text-destructive",
        success: "border-success text-success",
        outline: "border-2",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "border-none bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        primary: "bg-primary text-primary-foreground",
        default: "",
    }[variant];

    const standardLayout = (
        <>
            <Label
                htmlFor={field.name}
                className={cn(
                    "block text-sm font-medium mb-1",
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}
            >
                {field.displayName}
            </Label>
            <Input
                id={field.name}
                value={value}
                onChange={handleChange}
                required={field.isRequired}
                disabled={disabled}
                className={cn(
                    "text-md",
                    variantStyles,
                    disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                )}
                {...props}
            />
        </>
    );

    const floatingLabelLayout = (
        <div className="relative mt-2">
            <Input
                id={field.name}
                value={value}
                onChange={handleChange}
                required={field.isRequired}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={cn(
                    "text-md",
                    "pt-6 pb-2",
                    variantStyles,
                    disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                )}
                {...props}
            />
            <Label
                htmlFor={field.name}
                className={`absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm ${
                    (isFocused || value)
                    ? `absolute -top-2 text-sm ${
                        disabled
                        ? '[&]:text-gray-400 dark:[&]:text-gray-400'
                        : '[&]:text-blue-500 dark:[&]:text-blue-500'
                    }`
                    : 'top-3 [&]:text-gray-400 dark:[&]:text-gray-400'
                }`}
            >
                <span className="px-1 relative z-20">
                    {field.displayName}
                </span>
            </Label>
        </div>
    );

    return floatingLabel ? floatingLabelLayout : standardLayout;
};

export default EntityInput;
