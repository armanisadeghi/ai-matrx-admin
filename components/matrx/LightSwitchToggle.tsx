'use client';

import React, { useState, forwardRef } from 'react';
import { cn } from "@/lib/utils";
import { noErrors } from '@/utils';

const defaultSizes = {
    width: 'w-48',
    height: 'h-16',
} as const;

interface LightSwitchToggleProps {
    variant?: 'rounded' | 'geometric' | string;
    defaultValue?: boolean;
    value?: boolean;
    onChange?: (value: boolean) => void;
    width?: string;
    height?: string;
    labels?: {
        on: string;
        off: string;
    };
    disabled?: boolean;
    className?: string;
}

const LightSwitchToggle = forwardRef<any, LightSwitchToggleProps>((
    {
        variant,
        defaultValue = false,
        value,
        onChange,
        width,
        height,
        labels = {on: 'ON', off: 'OFF'},
        disabled = false,
        className,
    }: LightSwitchToggleProps,
    ref
) => {
    const [internalState, setInternalState] = useState(defaultValue);
    const validVariant = noErrors(variant, 'rounded', ['rounded', 'geometric']);

    const isOn = value !== undefined ? value : internalState;

    const handleToggle = (newState: boolean) => {
        if (disabled) return;
        if (value === undefined) {
            setInternalState(newState);
        }
        onChange?.(newState);
    };

    const containerClasses = cn(
        "relative flex bg-muted shadow-inner overflow-hidden",
        width || defaultSizes.width,
        height || defaultSizes.height,
        validVariant === 'rounded' && "rounded-full",
        disabled && "opacity-50 cursor-not-allowed",
        className
    );

    const buttonBaseClasses = "relative w-1/2 h-full transition-all duration-300";
    const activeButtonClasses = "bg-primary transform ";
    const inactiveButtonClasses = "bg-background transform -translate-y-1";

    return (
        <div className="flex items-center justify-center">
            <div ref={ref} className={containerClasses}>
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
                            validVariant === 'rounded' && "rounded-l-full",
                            !isOn
                            ? "dark:bg-gradient-to-br dark:from-muted-foreground/30 dark:via-muted-foreground/20 dark:to-muted-foreground/30 bg-gradient-to-br from-muted/50 via-muted/40 to-muted/50"
                            : "bg-gradient-to-br from-background via-background/90 to-background/80"
                        )}
                    />
                    <span
                        className={cn(
                            "relative z-20 font-medium truncate px-1",
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
                            validVariant === 'rounded' && "rounded-r-full",
                            isOn
                            ? "bg-gradient-to-br from-primary/90 via-primary to-primary/90"
                            : "bg-gradient-to-br from-background via-background/90 to-background/80"
                        )}
                    />
                    <span
                        className={cn(
                            "relative z-20 font-medium truncate px-2",
                            isOn ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                    >
                        {labels.on}
                    </span>
                </button>
            </div>
        </div>
    );
});

LightSwitchToggle.displayName = 'LightSwitchToggle';

export default LightSwitchToggle;