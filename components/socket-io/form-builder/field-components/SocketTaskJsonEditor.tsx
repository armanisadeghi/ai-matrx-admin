// File location: components/socket-io/form-builder/field-components/SocketTaskJsonEditor.tsx
import React, { useCallback, useEffect, useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaField } from "@/constants/socket-schema";
import { formatLabel, formatPlaceholder } from "@/components/socket/utils/label-util";
import { updateTaskFieldByPath } from "@/lib/redux/socket-io/thunks/taskFieldThunks";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectFieldValue, selectConnectionTestMode, selectTaskNameById } from "@/lib/redux/socket-io";
import { FieldOverrides } from "@/components/socket/form-builder/FormField";
import { isValidField } from "@/constants/socket-schema";
import { Label } from "@/components/ui/label";

interface SocketTaskJsonEditorProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    fullPath: string;
    initialValue: any;
    propOverrides?: FieldOverrides;
    showPlaceholder?: boolean;
}

interface FormattedJsonResult {
    formattedValue: string;
    hasError: boolean;
}

const SocketTaskJsonEditor: React.FC<SocketTaskJsonEditorProps> = ({
    taskId,
    fieldName,
    fieldDefinition,
    fullPath,
    initialValue,
    showPlaceholder = true,
    propOverrides = {},
}) => {
    const dispatch = useAppDispatch();
    const [hasError, setHasError] = useState(false);
    const [notice, setNotice] = useState("");
    const [jsonError, setJsonError] = useState(false);
    const [localJsonValue, setLocalJsonValue] = useState<string>("");

    // Get the current value from Redux store
    const currentValue = useAppSelector((state) => selectFieldValue(taskId, fullPath)(state));
    const testMode = useAppSelector(selectConnectionTestMode);
    const taskName = useAppSelector((state) => selectTaskNameById(state, taskId));

    // Format JSON once for display
    const formatJsonValue = useCallback((value: any): FormattedJsonResult => {
        let formattedValue = "";
        let hasError = false;
        
        if (typeof value === "string" && value.trim()) {
            try {
                const parsedJson = JSON.parse(value);
                formattedValue = JSON.stringify(parsedJson, null, 2);
            } catch (e) {
                hasError = true;
                formattedValue = value as string;
            }
        } else if (typeof value === "object" && value !== null) {
            formattedValue = JSON.stringify(value, null, 2);
        } else if (!value) {
            formattedValue = "{}";
        } else {
            // For any other type, convert to string
            formattedValue = String(value);
        }
        
        return { formattedValue, hasError };
    }, []);

    // Initialize the value in Redux on component mount
    useEffect(() => {
        // Format and initialize JSON value
        const result = formatJsonValue(initialValue);
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: result.formattedValue }));
    }, []);

    // Set local JSON value whenever currentValue changes
    useEffect(() => {
        if (currentValue !== undefined) {
            const result = formatJsonValue(currentValue);
            setLocalJsonValue(result.formattedValue);
            setJsonError(result.hasError);
        }
    }, [currentValue, formatJsonValue]);

    // Handle test mode
    useEffect(() => {
        if (testMode && fieldDefinition.TEST_VALUE !== undefined) {
            const result = formatJsonValue(fieldDefinition.TEST_VALUE);
            dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: result.formattedValue }));
        }
    }, [testMode, fieldDefinition.TEST_VALUE, formatJsonValue]);

    const validateField = useCallback(
        (value: any) => isValidField(taskName, fullPath, value),
        [taskName, fullPath]
      );

    const Icon = (LucideIcons as any)[fieldDefinition.ICON_NAME] || LucideIcons.File;
    const placeholder = showPlaceholder ? fieldDefinition.DESCRIPTION || formatPlaceholder(fieldName) : "";
    
    // Process component props
    const props: Record<string, any> = {};
    const finalProps = { ...fieldDefinition.COMPONENT_PROPS, ...propOverrides };
    
    for (const [key, value] of Object.entries(finalProps)) {
        if (key === "className" && props.className) {
            props.className = cn(props.className, value as string);
        } else {
            props[key] = value;
        }
    }

    // Handle value change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalJsonValue(newValue);
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: newValue }));
    };

    // Handle blur event
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        // Try to format JSON on blur
        try {
            let formattedJson = e.target.value;
            if (e.target.value.trim()) {
                const parsedJson = JSON.parse(e.target.value);
                formattedJson = JSON.stringify(parsedJson, null, 2);
                
                if (formattedJson !== e.target.value) {
                    setLocalJsonValue(formattedJson);
                    dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: formattedJson }));
                }
                
                setJsonError(false);
            }
            
            const { isValid, errorMessage } = validateField(formattedJson);
            setHasError(!isValid);
            setNotice(isValid ? "" : errorMessage);
        } catch (err) {
            // Not valid JSON
            setJsonError(true);
            setNotice("Invalid JSON format");
            
            const { isValid, errorMessage } = validateField(e.target.value);
            setHasError(!isValid);
            setNotice(isValid ? "" : errorMessage);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center">
                <Icon className="w-4 h-4 mr-2 text-slate-500" />
                <Label className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</Label>
            </div>
            <textarea
                value={localJsonValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className={cn(
                    "w-full font-mono text-sm bg-background min-h-[200px] p-2 border rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                    hasError || jsonError ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                    finalProps.className || ""
                )}
                placeholder={placeholder || "Enter JSON here..."}
                spellCheck="false"
                {...Object.fromEntries(Object.entries(finalProps).filter(([key]) => key !== "className"))}
            />
            {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
            {jsonError && <span className="text-red-500 text-sm">Invalid JSON format</span>}
        </div>
    );
};

export default SocketTaskJsonEditor;