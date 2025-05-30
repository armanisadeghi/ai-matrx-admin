"use client";

import React, { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { brokerSelectors, brokerActions } from "@/lib/redux/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { cn } from "@/lib/utils";
// Import the shadcn/ui components
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { FieldDefinition } from "@/types/customAppTypes";

// Custom styled Switch component
const Switch = React.forwardRef<
    React.ComponentRef<typeof SwitchPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
    <SwitchPrimitives.Root
        className={cn(
            "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900 dark:data-[state=checked]:bg-blue-700 dark:data-[state=unchecked]:bg-gray-700",
            className
        )}
        {...props}
        ref={ref}
    >
        <SwitchPrimitives.Thumb
            className={cn(
                "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 dark:bg-gray-100"
            )}
        />
    </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

const SwitchField: React.FC<{
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
    source?: string;
    disabled?: boolean;
    className?: string; // Add this new prop
}> = ({ field, appletId, isMobile, source = "applet", disabled = false, className = "" }) => {
    const { id, label, componentProps, defaultValue } = field;

    const { width, customContent, onLabel = "On", offLabel = "Off", direction = "horizontal" } = componentProps;

    const safeWidthClass = ensureValidWidthClass(width);

    const dispatch = useAppDispatch();
    const brokerId = useAppSelector((state) => brokerSelectors.selectBrokerId(state, { source, mappedItemId: id }));
    const stateValue = useAppSelector((state) => brokerSelectors.selectValue(state, brokerId));

    const updateBrokerValue = useCallback(
        (updatedValue: any) => {
            dispatch(
                brokerActions.setValue({
                    brokerId,
                    value: updatedValue,
                })
            );
        },
        [dispatch, brokerId]
    );

    // Initialize state if needed
    useEffect(() => {
        if (stateValue === undefined) {
            // Initialize with default value (default to false/off)
            const initialValue = defaultValue !== undefined ? !!defaultValue : false;

            updateBrokerValue(initialValue);
        }
    }, [stateValue, defaultValue, dispatch, id, source]);

    // Handler for switch toggle
    const handleToggle = (checked: boolean) => {
        updateBrokerValue(checked);
    };

    // Get the current switched state
    const isChecked = !!stateValue;

    // Render custom content if provided
    if (customContent) {
        return <>{customContent}</>;
    }

    return (
        <div className={`${safeWidthClass} ${className}`}>
            <div
                className={cn(
                    "flex items-center",
                    direction === "vertical" ? "flex-col space-y-2 items-start" : "flex-row space-x-3" // Explicitly set flex-row for horizontal layout
                )}
            >
                <Switch
                    checked={isChecked}
                    onCheckedChange={handleToggle}
                    disabled={disabled}
                    id={`${id}-switch`}
                    aria-label={label || id}
                />

                <span
                    className={cn(
                        "text-sm font-medium transition-colors",
                        isChecked ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"
                    )}
                >
                    {isChecked ? onLabel : offLabel}
                </span>
            </div>

            {/* Optional description if provided */}
            {field.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.description}</p>}
        </div>
    );
};

export default SwitchField;
