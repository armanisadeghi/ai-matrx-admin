// File location: components/socket-io/form-builder/field-components/SocketTaskInput.tsx

import React, { useCallback, useEffect, useState } from "react";
import { FancyInput } from "@/components/ui/input";
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

interface SocketTaskInputProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    fullPath: string;
    initialValue: any;
    propOverrides?: FieldOverrides;
    showPlaceholder?: boolean;
}

const SocketTaskInput: React.FC<SocketTaskInputProps> = ({
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


    const validateField = useCallback((value: any) => isValidField(taskName, fullPath, value), [taskName, fullPath]);

    const labelContent = (
        <div className="flex items-start gap-1">
            <span className="text-slate-700 dark:text-slate-300">{formatLabel(fieldName)}</span>
            {fieldDefinition.REQUIRED && <span className="text-red-500 text-sm leading-none">*</span>}
        </div>
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: e.target.value }));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (e.target.value === "") {
            setHasError(false);
            setNotice("");
        } else {
            const isValid = validateField(e.target.value);
            setHasError(!isValid);
            setNotice(isValid ? "" : "Invalid Entry. Please correct errors.");
        }
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: e.target.value }));
    };

    return (
        <div className="flex flex-col gap-2">
            <FancyInput
                type="text"
                prefix={<Icon className="w-4 h-4" />}
                value={currentValue || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={cn("w-full bg-background", hasError ? "border-red-500" : "", props.className || "")}
                placeholder={placeholder}
                {...Object.fromEntries(Object.entries(props).filter(([key]) => key !== "className"))}
            />
            {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
        </div>
    );
};

export default SocketTaskInput;
