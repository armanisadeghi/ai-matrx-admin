'use client';

import React, { useState, useMemo } from 'react';
import { colord } from 'colord';
import { HexColorPicker } from 'react-colorful';
import { cn } from "@/lib/utils";
import { EntityComponentBaseProps } from "./types";

interface EntityColorPickerProps extends EntityComponentBaseProps {
    value: string;
    className?: string;
}

const defaultColors = [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF', '#FF00FF',
    '#000000', '#808080', '#FFFFFF', '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
];

const colorPickerVariants = {
    default: "bg-background border-border",
    destructive: "bg-background border-destructive",
    success: "bg-background border-success",
    outline: "bg-transparent border-2",
    secondary: "bg-secondary",
    ghost: "bg-transparent border-transparent",
    link: "bg-background border-border",
    primary: "bg-primary border-primary"
} as const;

const EntityColorPicker = React.forwardRef<HTMLDivElement, EntityColorPickerProps>(({
    entityKey,
    dynamicFieldInfo,
    value = '#ff0000',
    onChange,
    variant = "default",
    disabled = false,
    className,
    ...props
}, ref) => {
    const initialColor = useMemo(() => {
        try {
            return colord(value).isValid() ? value : '#ff0000';
        } catch {
            return '#ff0000';
        }
    }, [value]);

    const handleChange = (hex: string) => {
        if (!disabled && onChange) {
            onChange(hex);
        }
    };

    const predefinedColors = useMemo(() => {
        const customProps = dynamicFieldInfo.componentProps as Record<string, unknown> | undefined;
        const colors = customProps?.predefinedColors;
        
        if (Array.isArray(colors) && colors.every(color => typeof color === 'string')) {
            return colors;
        }
        
        return defaultColors;
    }, [dynamicFieldInfo.componentProps]);

    const showPresetColors = useMemo(() => {
        const customProps = dynamicFieldInfo.componentProps as Record<string, unknown> | undefined;
        return customProps?.showPresetColors ?? true;
    }, [dynamicFieldInfo.componentProps]);

    return (
        <div
            ref={ref}
            className={cn(
                "relative",
                disabled && "opacity-50 cursor-not-allowed",
                colorPickerVariants[variant as keyof typeof colorPickerVariants] || colorPickerVariants.default,
                className
            )}
            {...props}
        >
            <HexColorPicker
                color={initialColor}
                onChange={handleChange}
            />
            {showPresetColors && (
                <div className="mt-4 grid grid-cols-8 gap-2">
                    {predefinedColors.map((color, index) => (
                        <button
                            key={`${color}-${index}`}
                            className={cn(
                                "w-6 h-6 rounded-full border border-border",
                                disabled && "cursor-not-allowed"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => handleChange(color)}
                            disabled={disabled}
                            type="button"
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

EntityColorPicker.displayName = "EntityColorPicker";

export default React.memo(EntityColorPicker);