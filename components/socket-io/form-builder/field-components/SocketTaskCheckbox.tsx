// File location: components/socket-io/form-builder/field-components/SocketTaskCheckbox.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaField } from "@/constants/socket-schema";
import { formatLabel, formatPlaceholder } from "@/components/socket/utils/label-util";
import { updateTaskFieldByPath } from "@/lib/redux/socket-io/thunks/taskFieldThunks";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { FieldOverrides } from "@/components/socket/form-builder/FormField";
import { selectTestMode, selectTaskNameById, selectFieldValue } from "@/lib/redux/socket-io";
import { isValidField } from "@/constants/socket-schema";
import { Label } from "@/components/ui/label";

interface SocketTaskCheckboxProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    fullPath: string;
    initialValue: any;
    propOverrides?: FieldOverrides;
    showPlaceholder?: boolean;
}

const SocketTaskCheckbox: React.FC<SocketTaskCheckboxProps> = ({
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

    useEffect(() => {
      dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: initialValue }));
    }, []);

    const testMode = useAppSelector(selectTestMode);
    const currentValue = useAppSelector((state) => selectFieldValue(taskId, fullPath)(state));
    const taskName = useAppSelector((state) => selectTaskNameById(state, taskId));

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
    
    const props: Record<string, any> = {};
    const finalProps = { ...fieldDefinition.COMPONENT_PROPS, ...propOverrides };
    
    for (const [key, value] of Object.entries(finalProps)) {
        if (key === "className" && props.className) {
            props.className = cn(props.className, value as string);
        } else {
            props[key] = value;
        }
    }

    const handleChange = (checked: boolean) => {
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: checked }));
    };

    const handleBlur = () => {
        const { isValid, errorMessage } = validateField(currentValue);
        setHasError(!isValid);
        setNotice(isValid ? "" : errorMessage);
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Checkbox
                    checked={!!currentValue}
                    onCheckedChange={handleChange}
                    onBlur={handleBlur}
                    className={cn(hasError ? "border-red-500" : "", props.className || "")}
                    {...Object.fromEntries(Object.entries(props).filter(([key]) => key !== "className"))}
                />
                <Icon className="w-4 h-4 mr-2 text-slate-500" />
                <Label className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</Label>
            </div>
            {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
        </div>
    );
};

export default SocketTaskCheckbox;