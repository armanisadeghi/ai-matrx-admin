// FormField.tsx
import React from "react";
import { SchemaField } from "@/constants/socket-constants";
import ArrayField from "./ArrayField";
import ArrayFieldSection from "./ArrayFieldSection";
import RelatedObjectSection from "./RelatedObjectSection";
import { FieldRenderer } from "@/components/socket-io/form-builder/field-components";

export type FieldType =
    | "input"
    | "textarea"
    | "switch"
    | "checkbox"
    | "slider"
    | "select"
    | "radiogroup"
    | "fileupload"
    | "multifileupload"
    | "jsoneditor";

export interface FieldOverride {
    type: FieldType;
    props?: Record<string, any>;
}

export type FieldOverrides = Record<string, FieldOverride>;

interface FormFieldProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    path: string;
    value: any;
    errors: { [key: string]: boolean };
    notices: { [key: string]: string };
    formData: any;
    onChange?: (key: string, value: any) => void;
    onBlur?: (key: string, field: SchemaField, value: any) => void;
    onDeleteArrayItem?: (key: string, index: number) => void;
    fieldOverrides?: FieldOverrides;
    testMode?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
    taskId,
    fieldName,
    fieldDefinition,
    path = "",
    value,
    errors,
    notices,
    formData,
    onChange = () => {},
    onBlur = () => {},
    onDeleteArrayItem,
    fieldOverrides = {},
    testMode = false,
}) => {
    const fullPath = path ? `${path}.${fieldName}` : fieldName;
    const hasError = errors[fullPath];

    if (fieldDefinition.DATA_TYPE === "array") {
        if (!Array.isArray(value) || value.length === 0) {
            value =
                fieldDefinition.DEFAULT && Array.isArray(fieldDefinition.DEFAULT) && fieldDefinition.DEFAULT.length > 0
                    ? fieldDefinition.DEFAULT
                    : fieldDefinition.REFERENCE
                    ? [{}]
                    : [];
        }

        if (!fieldDefinition.REFERENCE) {
            return (
                <ArrayField
                    taskId={taskId}
                    fieldName={fieldName}
                    fieldDefinition={fieldDefinition}
                    path={fullPath}
                    hasError={hasError}
                    testMode={testMode}
                />
            );
        }

        return (
            <ArrayFieldSection
                taskId={taskId}
                fieldName={fieldName}
                fieldDefinition={fieldDefinition}
                path={fullPath}
                value={value}
                errors={errors}
                notices={notices}
                formData={formData}
                onChange={onChange}
                onBlur={onBlur}
                onDeleteArrayItem={onDeleteArrayItem}
                fieldOverrides={fieldOverrides}
                testMode={testMode}
            />
        );
    }

    // Use the RelatedObjectSection component for related objects
    if (fieldDefinition.COMPONENT === "relatedObject") {
        return (
            <RelatedObjectSection
                taskId={taskId}
                fieldName={fieldName}
                fieldDefinition={fieldDefinition}
                path={fullPath}
                value={value}
                errors={errors}
                notices={notices}
                formData={formData}
                onChange={onChange}
                onBlur={onBlur}
                onDeleteArrayItem={onDeleteArrayItem}
                fieldOverrides={fieldOverrides}
                testMode={testMode}
            />
        );
    }

    return <FieldRenderer taskId={taskId} fieldName={fieldName} fieldDefinition={fieldDefinition} path={path} value={value} />;
};

export default FormField;
