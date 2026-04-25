'use client';

import React, {useState} from 'react';
import {cn} from "@/lib/utils";

interface ToggleSwitchProps {
    variant?: 'rounded' | 'geometric';
    defaultValue?: boolean;
    onChange?: (value: boolean) => void;
    width?: string;  // New prop for custom width
    height?: string; // New prop for custom height
    labels?: {
        on: string;
        off: string;
    };
    disabled?: boolean;
    className?: string;
}

// Default sizes as fallbacks
const defaultSizes = {
    width: 'w-48',  // Default medium width
    height: 'h-16', // Default medium height
} as const;

const ToggleSwitch = (
    {
        variant = 'rounded',
        defaultValue = false,
        onChange,
        width,    // New prop
        height,   // New prop
        labels = {on: 'ON', off: 'OFF'},
        disabled = false,
        className,
    }: ToggleSwitchProps) => {
    const [isOn, setIsOn] = useState(defaultValue);

    const handleToggle = (newState: boolean) => {
        if (disabled) return;
        setIsOn(newState);
        onChange?.(newState);
    };

    // Use custom dimensions if provided, fall back to defaults if not
    const containerClasses = cn(
        "relative flex bg-muted shadow-inner overflow-hidden",
        width || defaultSizes.width,
        height || defaultSizes.height,
        variant === 'rounded' && "rounded-full",
        disabled && "opacity-50 cursor-not-allowed",
        className
    );

    const buttonBaseClasses = "relative w-1/2 h-full transition-all duration-300";
    const activeButtonClasses = "bg-primary transform active:translate-y-1";
    const inactiveButtonClasses = "bg-background transform -translate-y-1";

    return (
        <div className="flex items-center justify-center">
            <div className={containerClasses}>
                {/* Center Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-border transform -translate-x-1/2 z-10"/>

                {/* Off Button */}
                <button
                    type="button"
                    onClick={() => handleToggle(false)}
                    disabled={disabled}
                    className={cn(
                        buttonBaseClasses,
                        !isOn ? activeButtonClasses : inactiveButtonClasses
                    )}
                >
                    <div
                        className={cn(
                            "absolute inset-0 border-r border-border",
                            variant === 'rounded' && "rounded-l-full",
                            !isOn
                            ? "dark:bg-gradient-to-br dark:from-muted-foreground/30 dark:via-muted-foreground/20 dark:to-muted-foreground/30 bg-gradient-to-br from-muted/50 via-muted/40 to-muted/50"
                            : "bg-gradient-to-br from-background via-background/90 to-background/80"
                        )}
                    />
                    <span
                        className={cn(
                            "relative z-20 font-medium truncate px-2",  // Added truncate and padding
                            !isOn ? "dark:text-foreground text-muted-foreground" : "text-muted-foreground"
                        )}
                    >
                        {labels.off}
                    </span>
                </button>

                {/* On Button */}
                <button
                    type="button"
                    onClick={() => handleToggle(true)}
                    disabled={disabled}
                    className={cn(
                        buttonBaseClasses,
                        isOn ? activeButtonClasses : inactiveButtonClasses
                    )}
                >
                    <div
                        className={cn(
                            "absolute inset-0 border-l border-border",
                            variant === 'rounded' && "rounded-r-full",
                            isOn
                            ? "bg-gradient-to-br from-primary/90 via-primary to-primary/90"
                            : "bg-gradient-to-br from-background via-background/90 to-background/80"
                        )}
                    />
                    <span
                        className={cn(
                            "relative z-20 font-medium truncate px-2",  // Added truncate and padding
                            isOn ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                    >
                        {labels.on}
                    </span>
                </button>
            </div>
        </div>
    );
};

// Updated demo component showing custom dimensions
const ToggleSwitchDemo = () => {
    return (
        <div className="space-y-12 p-8">
            <div>
                <h2 className="text-center mb-6 text-lg font-medium text-foreground">Custom Dimensions</h2>
                <div className="space-y-8">
                    {/* Wide but short toggle for longer text */}
                    <ToggleSwitch
                        variant="rounded"
                        width="w-64"
                        height="h-12"
                        labels={{on: 'Multi Select', off: 'Single Select'}}
                    />
                    {/* Extra wide but very short toggle */}
                    <ToggleSwitch
                        variant="geometric"
                        width="w-120"
                        height="h-10"
                        labels={{on: 'Show Advanced Options', off: 'Hide Advanced Options'}}
                    />
                    {/* Narrow but tall toggle */}
                    <ToggleSwitch
                        variant="rounded"
                        width="w-32"
                        height="h-20"
                        labels={{on: 'YES', off: 'NO'}}
                    />
                </div>
            </div>
        </div>
    );
};

export default ToggleSwitchDemo;
