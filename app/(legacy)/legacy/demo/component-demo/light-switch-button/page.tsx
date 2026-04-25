'use client';

import React, {useState} from 'react';
import {cn} from "@/lib/utils"; // Assuming you have this utility

interface ToggleSwitchProps {
    variant?: 'rounded' | 'geometric';
    defaultValue?: boolean;
    onChange?: (value: boolean) => void;
    size?: 'sm' | 'md' | 'lg';
    labels?: {
        on: string;
        off: string;
    };
    disabled?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'w-32 h-12',
    md: 'w-48 h-16',
    lg: 'w-56 h-20',
} as const;

const ToggleSwitch = (
    {
        variant = 'rounded',
        defaultValue = false,
        onChange,
        size = 'md',
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

    const containerClasses = cn(
        "relative flex bg-muted shadow-inner overflow-hidden",
        sizeClasses[size],
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
                            "relative z-20 font-medium",
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
                            "relative z-20 font-medium",
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

// Updated demo component showing various configurations
const ToggleSwitchDemo = () => {
    return (
        <div className="space-y-12 p-8">
            <div>
                <h2 className="text-center mb-6 text-lg font-medium text-foreground">Rounded Style Variants</h2>
                <div className="space-y-8">
                    <ToggleSwitch
                        variant="rounded"
                        size="sm"
                        labels={{on: 'YES', off: 'NO'}}
                    />
                    <ToggleSwitch
                        variant="rounded"
                        size="md"
                        labels={{on: 'ACTIVE', off: 'INACTIVE'}}
                    />
                    <ToggleSwitch
                        variant="rounded"
                        size="lg"
                        defaultValue={true}
                    />
                </div>
            </div>

            <div>
                <h2 className="text-center mb-6 text-lg font-medium text-foreground">Geometric Style Variants</h2>
                <div className="space-y-8">
                    <ToggleSwitch
                        variant="geometric"
                        size="sm"
                        labels={{on: '1', off: '0'}}
                    />
                    <ToggleSwitch
                        variant="geometric"
                        size="md"
                        disabled
                    />
                    <ToggleSwitch
                        variant="geometric"
                        size="lg"
                        labels={{on: 'ENABLED', off: 'DISABLED'}}
                    />
                </div>
            </div>
        </div>
    );
};

export default ToggleSwitchDemo;
