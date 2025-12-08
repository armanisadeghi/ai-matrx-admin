'use client';

import React, { useMemo } from 'react';
import { colord } from 'colord';
import { HexColorPicker } from 'react-colorful';
import { cn } from "@/lib/utils";
import { EntityComponentBaseProps } from "../types";
import { getArrayProp, getPropValue } from "../utils";

type EntityColorPickerProps = EntityComponentBaseProps & {
    className?: string;
};

const DEFAULT_COLORS = [
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
    value,
    onChange,
    variant = "default",
    disabled = false,
    className,
    floatingLabel = false,
    ...props
}, ref) => {
    const initialColor = useMemo(() => {
        try {
            const colorStr = String(value ?? '#ff0000');
            return colord(colorStr).isValid() ? colorStr : '#ff0000';
        } catch {
            return '#ff0000';
        }
    }, [value]);

    const handleChange = (hex: string) => {
        if (!disabled) {
            onChange(hex);
        }
    };

    // Safely get predefined colors using our utility
    const predefinedColors = getArrayProp<string>(
        dynamicFieldInfo.componentProps,
        'predefinedColors',
        DEFAULT_COLORS
    );

    // Safely get showPredefinedColors flag
    const showPredefinedColors = getPropValue(
        dynamicFieldInfo.componentProps,
        'showPredefinedColors',
        true
    );

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
            {showPredefinedColors && (
                <div className="mt-4 grid grid-cols-8 gap-2">
                    {predefinedColors.map((color, index) => (
                        <button
                            key={`${color}-${index}`}
                            className={cn(
                                "w-6 h-6 rounded-full border-border",
                                "hover:scale-110 transition-transform",
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