// File location: components/socket-io/form-builder/field-components/SocketTaskSelect.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaField } from "@/constants/socket-schema";
import { formatPlaceholder } from "@/components/socket/utils/label-util";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectFieldValue, selectTestMode, selectTaskNameById, updateTaskFieldByPath } from "@/lib/redux/socket-io";
import { FieldOverrides } from "@/components/socket/form-builder/FormField";
import { isValidField } from "@/constants/socket-schema";
import { Label } from "@/components/ui/label";

interface SocketTaskSelectProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    fullPath: string;
    initialValue: any;
    propOverrides?: FieldOverrides;
    showPlaceholder?: boolean;
}

const SocketTaskSelect: React.FC<SocketTaskSelectProps> = ({
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
    const handleValueChange = (value: string) => {
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value }));
    };

    // Handle open change (blur)
    const handleOpenChange = (open: boolean) => {
        if (!open && currentValue) {
            const { isValid, errorMessage } = validateField(currentValue);
            setHasError(!isValid);
            setNotice(isValid ? "" : errorMessage);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Select
                value={currentValue || ""}
                onValueChange={handleValueChange}
                onOpenChange={handleOpenChange}
            >
                <SelectTrigger className={cn("w-full", hasError ? "border-red-500" : "", finalProps.className || "")}>
                    {!currentValue && (
                        <div className="flex items-center">
                            <Icon className="w-4 h-4 mr-2 text-slate-500" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</span>
                        </div>
                    )}
                    {currentValue && <SelectValue />}
                </SelectTrigger>
                <SelectContent>
                    {finalProps.options?.map((option: { label: string; value: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
        </div>
    );
};

export default SocketTaskSelect;