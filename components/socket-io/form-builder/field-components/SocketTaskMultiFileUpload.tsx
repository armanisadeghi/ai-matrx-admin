// File location: components/socket-io/form-builder/field-components/SocketTaskMultiFileUpload.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Trash, Upload } from "lucide-react";

interface SocketTaskMultiFileUploadProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    fullPath: string;
    initialValue: any;
    propOverrides?: FieldOverrides;
    showPlaceholder?: boolean;
}

const SocketTaskMultiFileUpload: React.FC<SocketTaskMultiFileUploadProps> = ({
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
        // Ensure value is an array
        const initialFiles = Array.isArray(initialValue) ? initialValue : (initialValue ? [initialValue] : []);
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: initialFiles }));
    }, []);

    // Handle test mode
    React.useEffect(() => {
        if (testMode && fieldDefinition.TEST_VALUE !== undefined) {
            const testValue = Array.isArray(fieldDefinition.TEST_VALUE) 
                ? fieldDefinition.TEST_VALUE 
                : (fieldDefinition.TEST_VALUE ? [fieldDefinition.TEST_VALUE] : []);
            
            dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: testValue }));
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

    // Handle adding a file
    const handleAddFile = () => {
        // This would typically open a file dialog
        // For now, add a placeholder file as in the original component
        const files = Array.isArray(currentValue) ? [...currentValue] : [];
        const newFiles = [...files, `file-${Date.now()}.txt`];
        
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: newFiles }));
        
        const isValid = validateField(newFiles);
        setHasError(!isValid);
        setNotice(isValid ? "" : "Invalid Entry. Please correct errors.");
    };

    // Handle removing a file
    const handleRemoveFile = (index: number) => {
        if (!Array.isArray(currentValue)) return;
        
        const newFiles = [...currentValue];
        newFiles.splice(index, 1);
        
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: newFiles }));
        
        const isValid = validateField(newFiles);
        setHasError(!isValid);
        setNotice(isValid ? "" : "Invalid Entry. Please correct errors.");
    };

    return (
        <div className="grid grid-cols-12 gap-4 mb-4">
            <Label className="col-span-1 text-sm font-medium">
                <div className="flex items-start gap-1">
                    <span className="text-slate-700 dark:text-slate-300">{formatLabel(fieldName)}</span>
                    {fieldDefinition.REQUIRED && <span className="text-red-500 text-sm leading-none">*</span>}
                </div>
            </Label>
            <div className="col-span-11">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-2 text-slate-500" />
                        <Label className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</Label>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {Array.isArray(currentValue) && currentValue.length > 0 ? (
                            <div className="space-y-2">
                                {currentValue.map((file, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded",
                                            "border border-gray-200 dark:border-gray-700",
                                            hasError ? "border-red-500" : ""
                                        )}
                                    >
                                        <span className="text-sm truncate">
                                            {typeof file === "string" ? file : file.name || `File ${index + 1}`}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveFile(index)}
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 italic">No files uploaded</div>
                        )}
                        <Button
                            variant="outline"
                            className={cn("flex items-center gap-2 mt-2", finalProps.className || "")}
                            onClick={handleAddFile}
                            {...Object.fromEntries(Object.entries(finalProps).filter(([key]) => key !== "className"))}
                        >
                            <Upload className="w-4 h-4" />
                            Upload Files
                        </Button>
                    </div>
                    {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
                </div>
            </div>
        </div>
    );
};

export default SocketTaskMultiFileUpload;