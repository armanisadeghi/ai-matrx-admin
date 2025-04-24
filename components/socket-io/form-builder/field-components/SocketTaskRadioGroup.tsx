// File location: components/socket-io/form-builder/field-components/SocketTaskRadioGroup.tsx
import React, { useCallback, useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaField } from "@/constants/socket-constants";
import { formatLabel, formatPlaceholder } from "@/components/socket/utils/label-util";
import { updateTaskFieldByPath } from "@/lib/redux/socket-io/thunks/taskFieldThunks";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectFieldValue } from "@/lib/redux/socket-io/selectors";
import { FieldOverrides } from "@/components/socket/form-builder/FormField";
import { selectTestMode, selectTaskNameById } from "@/lib/redux/socket-io/selectors";
import { isValidField } from "@/constants/socket-schema";
import { Label } from "@/components/ui/label";

interface SocketTaskRadioGroupProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    fullPath: string;
    initialValue: any;
    propOverrides?: FieldOverrides;
    showPlaceholder?: boolean;
}

const SocketTaskRadioGroup: React.FC<SocketTaskRadioGroupProps> = ({
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

    // Get the current value from Redux store
    const currentValue = useAppSelector((state) => selectFieldValue(taskId, fullPath)(state));
    const testMode = useAppSelector(selectTestMode);
    const taskName = useAppSelector((state) => selectTaskNameById(state, taskId));

    // Initialize the value in Redux on component mount
    useEffect(() => {
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: initialValue }));
    }, []);

    // Handle test mode
    React.useEffect(() => {
        if (testMode && fieldDefinition.TEST_VALUE !== undefined) {
            dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: fieldDefinition.TEST_VALUE }));
        }
    }, [testMode]);

    const validateField = useCallback((value: any) => isValidField(taskName, fullPath, value), [taskName, fullPath]);

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
    const handleValueChange = (value: string) => {
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value }));
        
        // Validate on change since radio buttons don't have a separate blur event
        const isValid = validateField(value);
        setHasError(!isValid);
        setNotice(isValid ? "" : "Invalid Entry. Please correct errors.");
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center">
                <Icon className="w-4 h-4 mr-2 text-slate-500" />
                <Label className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</Label>
            </div>
            <RadioGroup
                value={currentValue || ""}
                onValueChange={handleValueChange}
                className={cn("space-y-1", hasError ? "border-red-500" : "", finalProps.className || "")}
                {...Object.fromEntries(Object.entries(finalProps).filter(([key]) => !["className", "options"].includes(key)))}
            >
                {finalProps.options?.map((option: { label: string; value: string }) => (
                    <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`${fullPath}-${option.value}`} />
                        <Label htmlFor={`${fullPath}-${option.value}`} className="text-sm">
                            {option.label}
                        </Label>
                    </div>
                ))}
            </RadioGroup>
            {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
        </div>
    );
};

export default SocketTaskRadioGroup;