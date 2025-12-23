"use client";

import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface SettingControlProps {
    label: string;
    isOptional?: boolean;
    isEnabled?: boolean;
    onToggle?: (enabled: boolean) => void;
    children: ReactNode;
    className?: string;
}

/**
 * Wrapper component for individual settings controls
 * Handles optional checkbox for null-default controls
 * Provides consistent styling and disabled states
 */
export function SettingControl({
    label,
    isOptional = false,
    isEnabled = true,
    onToggle,
    children,
    className = "",
}: SettingControlProps) {
    const labelClasses = isEnabled
        ? "text-gray-700 dark:text-gray-300"
        : "text-gray-400 dark:text-gray-600";

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex items-center gap-3">
                {isOptional && (
                    <Checkbox
                        checked={isEnabled}
                        onCheckedChange={(checked) => onToggle?.(checked as boolean)}
                        className="flex-shrink-0"
                    />
                )}
                <Label className={`text-xs flex-shrink-0 w-36 ${labelClasses}`}>
                    {label}
                    {!isEnabled && isOptional && (
                        <span className="text-[10px] ml-1 opacity-60">(disabled)</span>
                    )}
                    {!isOptional && !isEnabled && (
                        <span className="text-[10px] ml-1 opacity-60">(N/A)</span>
                    )}
                </Label>
                <div className={`flex-1 ${!isEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

