// FieldRenderer.tsx
import React from "react";
import { Label } from "@/components/ui/label";
import { formatLabel } from "@/components/socket/utils/label-util";
import { SchemaField } from "@/constants/socket-schema";
import {
    SocketTaskInput,
    SocketTaskJsonEditor,
    SocketTaskSelect,
    SocketTaskSlider,
    SocketTaskSwitch,
    SocketTaskTextarea,
    SocketTaskCheckbox,
    SocketTaskRadioGroup,
    SocketTaskMultiFileUpload,
} from "./index";

// Common props interface for all field components
interface FieldComponentProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    fullPath: string;
    initialValue: any;
    showPlaceholder: boolean;
}

// Component map to easily match component type to React component
const FIELD_COMPONENTS: Record<string, React.FC<FieldComponentProps>> = {
    multifileupload: SocketTaskMultiFileUpload,
    radiogroup: SocketTaskRadioGroup,
    slider: SocketTaskSlider,
    select: SocketTaskSelect,
    switch: SocketTaskSwitch,
    checkbox: SocketTaskCheckbox,
    jsoneditor: SocketTaskJsonEditor,
    textarea: SocketTaskTextarea,
    input: SocketTaskInput,
    default: SocketTaskInput
};

interface FieldRendererProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    path: string;
    value: any;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({
    taskId,
    fieldName,
    fieldDefinition,
    path,
    value,
}) => {
    const fullPath = path ? `${path}.${fieldName}` : fieldName;
    const showPlaceholder = false;
    
    const labelContent = (
        <div className="flex items-start gap-1">
            <span className="text-slate-700 dark:text-slate-300">{formatLabel(fieldName)}</span>
            {fieldDefinition.REQUIRED && <span className="text-red-500 text-sm leading-none">*</span>}
        </div>
    );

    // Get component type from fieldDefinition or use default
    const componentType = fieldDefinition.COMPONENT?.toLowerCase() || "input";
    
    // Get the component from the map or default to input
    const FieldComponent = FIELD_COMPONENTS[componentType] || FIELD_COMPONENTS.default;

    return (
        <div className="grid grid-cols-12 gap-4 mb-4">
            <Label className="col-span-1 text-sm font-medium">{labelContent}</Label>
            <div className="col-span-11">
                <FieldComponent
                    taskId={taskId}
                    fieldName={fieldName}
                    fieldDefinition={fieldDefinition}
                    fullPath={fullPath}
                    initialValue={value}
                    showPlaceholder={showPlaceholder}
                />
            </div>
        </div>
    );
};

export default FieldRenderer;