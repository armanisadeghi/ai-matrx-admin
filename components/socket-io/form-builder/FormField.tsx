// FormField.tsx
import React from "react";
import { SchemaField } from "@/constants/socket-schema";
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
        // Ensure value is properly initialized as an array
        let arrayValue = value;
        
        // Handle case where value might be nested arrays or improperly structured
        if (!Array.isArray(arrayValue)) {
            arrayValue = [];
        } else {
            // Flatten any accidentally nested arrays (but only one level to avoid data loss)
            arrayValue = arrayValue.map(item => {
                if (Array.isArray(item) && item.length === 1 && typeof item[0] === 'string') {
                    return item[0]; // Flatten single-item string arrays
                }
                return item;
            });
        }
        
        // Apply defaults if array is empty - THIS IS CRITICAL FOR TYPING TO WORK
        if (arrayValue.length === 0) {
            if (fieldDefinition.DEFAULT && Array.isArray(fieldDefinition.DEFAULT) && fieldDefinition.DEFAULT.length > 0) {
                arrayValue = [...fieldDefinition.DEFAULT];
            } else if (fieldDefinition.REFERENCE) {
                // Create a proper default object with all fields from the reference
                const defaultObject = {};
                Object.entries(fieldDefinition.REFERENCE).forEach(([key, fieldDef]) => {
                    const typedFieldDef = fieldDef as SchemaField;
                    defaultObject[key] = typedFieldDef.DEFAULT;
                });
                arrayValue = [defaultObject]; // Start with one properly initialized object
                
                // Also update the parent's state immediately so user can type
                if (onChange) {
                    onChange(fullPath, arrayValue);
                }
            } else {
                arrayValue = [""]; // For simple arrays, start with one empty string
            }
        }

        if (!fieldDefinition.REFERENCE) {
            return (
                <ArrayField
                    taskId={taskId}
                    fieldName={fieldName}
                    fieldDefinition={fieldDefinition}
                    path={path}
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
                value={arrayValue}
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
