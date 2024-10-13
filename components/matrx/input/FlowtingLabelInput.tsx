'use client'

import React, {useState} from 'react';
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    variant?: 'filled' | 'outlined' | 'standard';
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = (
    {
        id,
        label,
        type = "text",
        className,
        variant = "standard",
        ...props
    }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        setHasValue(e.target.value !== '');
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setHasValue(e.target.value !== '');

    const baseInputClasses = "w-full text-lg transition-all duration-300 ease-in-out peer bg-transparent text-white";
    const baseLabelClasses = "absolute left-3 text-sm transition-all duration-300 ease-in-out pointer-events-none text-gray-400";

    const variantClasses = {
        filled: {
            wrapper: "relative bg-gray-700 rounded-t-lg",
            input: "rounded-t-lg px-3 pb-2.5 pt-5 border-0 border-b-2 border-gray-600 focus:border-blue-500 focus:ring-0",
            label: "top-4 peer-focus:text-blue-500 peer-focus:-translate-y-3.5 peer-focus:scale-75",
            activeLabel: "-translate-y-4 scale-75"
        },
        outlined: {
            wrapper: "relative",
            input: "px-3 pb-2.5 pt-5 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-0",
            label: "top-4 bg-transparent peer-focus:text-blue-500 peer-focus:-translate-y-7 peer-focus:scale-75",
            activeLabel: "-translate-y-6 scale-85"
        },
        standard: {
            wrapper: "relative",
            input: "px-3 pb-2.5 pt-5 border-0 border-b-2 border-gray-600 focus:border-blue-500 focus:ring-0",
            label: "left-0 top-4 peer-focus:text-blue-500 peer-focus:-translate-y-6 peer-focus:scale-75",
            activeLabel: "-translate-y-6 scale-75"
        }
    };

    return (
        <div className={cn("group", variantClasses[variant].wrapper)}>
            <Input
                id={id}
                type={type}
                className={cn(baseInputClasses, variantClasses[variant].input, className)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={handleChange}
                {...props}
            />
            <label
                htmlFor={id}
                className={cn(
                    baseLabelClasses,
                    variantClasses[variant].label,
                    (isFocused || hasValue) && variantClasses[variant].activeLabel
                )}
            >
                {label}
            </label>
        </div>
    );
};

export default FloatingLabelInput;