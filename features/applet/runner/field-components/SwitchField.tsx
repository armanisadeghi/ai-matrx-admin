// SwitchField.tsx
import React, { useEffect } from "react";
import { useValueBroker } from "@/hooks/applets/useValueBroker";
import { FieldDisplayProps, FieldProps } from "./types";

// Add to your types.ts file
export interface SwitchFieldConfig extends FieldDisplayProps {
    onLabel?: string;
    offLabel?: string;
    trackClassName?: string;
    trackActiveClassName?: string;
    thumbClassName?: string;
    thumbActiveClassName?: string;
    thumbInactiveClassName?: string;
    labelClassName?: string;
    width?: string;
}


export const SwitchField: React.FC<FieldProps<SwitchFieldConfig>> = ({
    id,
    label,
    placeholder,
    defaultValue,
    onValueChange,
    customConfig = {},
    customContent = null,
    isMobile,
}) => {
    // Extract switch config options with defaults
    const {
        onLabel = "Yes",
        offLabel = "No",
        trackClassName = "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 bg-gray-300 dark:bg-gray-600",
        trackActiveClassName = "bg-blue-500 dark:bg-blue-600",
        thumbClassName = "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
        thumbActiveClassName = "translate-x-6",
        thumbInactiveClassName = "translate-x-1",
        labelClassName = "ml-3 text-sm text-gray-700 dark:text-gray-300",
        width = "w-auto",
    } = customConfig as SwitchFieldConfig;

    // Use value broker for managing the switch value
    const { currentValue, setValue } = useValueBroker(id);

    // Initialize with defaultValue if provided and no currentValue exists
    useEffect(() => {
        if (defaultValue !== undefined && currentValue === null) {
            setValue(defaultValue);
        } else if (currentValue === null) {
            // Default to false if no value is set
            setValue(false);
        }
    }, [defaultValue, currentValue, setValue]);

    // Handle toggle
    const handleToggle = () => {
        const newValue = !(currentValue === true);
        setValue(newValue);
        if (onValueChange) {
            onValueChange(newValue);
        }
    };

    // If custom content is provided, render that instead
    if (customContent) {
        return <>{customContent}</>;
    }

    // Determine if switch is active
    const isActive = currentValue === true;

    return (
        <div className={`flex items-center ${width}`}>
            <button
                type="button"
                className={`${trackClassName} ${isActive ? trackActiveClassName : ""}`}
                onClick={handleToggle}
                role="switch"
                aria-checked={isActive}
                id={`${id}-switch`}
            >
                <span 
                    className={`${thumbClassName} ${isActive ? thumbActiveClassName : thumbInactiveClassName}`} 
                    aria-hidden="true"
                />
            </button>
            <span className={labelClassName}>
                {isActive ? onLabel : offLabel}
            </span>
        </div>
    );
};

export default SwitchField;