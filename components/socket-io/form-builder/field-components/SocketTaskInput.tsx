import React from "react";
import { FancyInput } from "@/components/ui/input";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { SchemaField } from "@/constants/socket-constants";
import { formatLabel, formatPlaceholder } from "@/components/socket/utils/label-util";
import { updateTaskFieldByPath } from "@/lib/redux/socket-io/thunks/taskFieldThunks";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectFieldValue } from "@/lib/redux/socket-io/selectors";

interface SocketTaskInputProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    fullPath: string;
    value: any;
    showPlaceholder?: boolean;
}

const SocketTaskInput: React.FC<SocketTaskInputProps> = ({ taskId, fieldName, fieldDefinition, fullPath, value, showPlaceholder = true }) => {
    const dispatch = useAppDispatch();

    console.log("fullPath", fullPath);
    console.log("taskId", taskId);

    const currentValue = useAppSelector((state) => selectFieldValue(taskId, fullPath)(state));

    console.log("currentValue", currentValue);


    const hasError = false; // Get from Redux later
    const notice = ""; // Get from Redux later

    const labelContent = (
        <div className="flex items-start gap-1">
            <span className="text-slate-700 dark:text-slate-300">{formatLabel(fieldName)}</span>
            {fieldDefinition.REQUIRED && <span className="text-red-500 text-sm leading-none">*</span>}
        </div>
    );

    const Icon = (LucideIcons as any)[fieldDefinition.ICON_NAME] || LucideIcons.File;
    const placeholder = showPlaceholder ? fieldDefinition.DESCRIPTION || formatPlaceholder(fieldName) : "";

    const props: Record<string, any> = {};
    for (const [key, value] of Object.entries(fieldDefinition.COMPONENT_PROPS)) {
        if (key === "className" && props.className) {
            props.className = cn(props.className, value as string);
        } else {
            props[key] = value;
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("handleChange", e.target.value);
        dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: e.target.value }));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        console.log("handleBlur", e.target.value);
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
