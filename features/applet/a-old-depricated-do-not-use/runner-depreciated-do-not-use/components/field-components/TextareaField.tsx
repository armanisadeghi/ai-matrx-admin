// TextareaField.tsx
import React, { useEffect } from "react";
import { useValueBroker } from "@/hooks/applets/useValueBroker";
import { FieldProps, TextareaFieldConfig } from "./types";

const TextareaField: React.FC<FieldProps<TextareaFieldConfig>> = ({
    id,
    label,
    placeholder = "Enter text",
    defaultValue,
    onValueChange,
    customConfig = {},
    customContent = null,
    isMobile,
}) => {
    // Extract textarea config options with defaults
    const {
        rows = 4,
        maxLength,
        resize = "vertical",
        width = "w-full",
        textareaClassName = "w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 placeholder-gray-600 dark:placeholder-gray-400 placeholder-text-xs",
    } = customConfig as TextareaFieldConfig;

    // Use value broker for managing the textarea value
    const { currentValue, setValue } = useValueBroker(id);

    // Initialize with defaultValue if provided and no currentValue exists
    useEffect(() => {
        if (defaultValue !== undefined && currentValue === null) {
            setValue(defaultValue);
        }
    }, [defaultValue, currentValue, setValue]);

    // Handle change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);

        if (onValueChange) {
            onValueChange(newValue);
        }
    };

    // Generate resize style
    const resizeStyle = { resize } as React.CSSProperties;

    if (customContent) {
        return <>{customContent}</>;
    }

    return (
        <div className={`${width}`}>
            <textarea
                id={`${id}-textarea`}
                className={textareaClassName}
                value={currentValue ?? ""}
                onChange={handleChange}
                placeholder={placeholder}
                rows={rows}
                maxLength={maxLength}
                style={resizeStyle}
            />
        </div>
    );
};

export default TextareaField;
