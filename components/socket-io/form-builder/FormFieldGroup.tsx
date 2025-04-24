"use client";
import React from "react";
import { Schema, FIELD_OVERRIDES } from "@/constants/socket-schema";
import FormField, { FieldOverrides } from "./FormField";
import { updateTaskFieldByPath } from "@/lib/redux/socket-io/thunks/taskFieldThunks";
import { useAppDispatch } from "@/lib/redux";


interface FormFieldGroupProps {
    schema: Schema;
    taskId: string;
    formData: Record<string, any>;
    errors: Record<string, boolean>;
    notices: Record<string, string>;
    onDeleteArrayItem?: (key: string, index: number) => void;
    fieldOverrides?: FieldOverrides;
    testMode?: boolean;
}

export const FormFieldGroup = React.memo(
    ({
        schema,
        taskId,
        formData,
        errors,
        notices,
        onDeleteArrayItem,
        fieldOverrides = FIELD_OVERRIDES,
        testMode = false,
    }: FormFieldGroupProps) => {
        const dispatch = useAppDispatch();
        const schemaFields = React.useMemo(() => Object.entries(schema), [schema]);
        
        const handleChange = React.useCallback(
            (fieldPath: string, value: any) => {
                dispatch(updateTaskFieldByPath({ taskId, fieldPath, value }));
            },
            [dispatch, taskId]
        );
        
        return (
            <div className="w-full space-y-4">
                {schemaFields.map(([fieldName, fieldDefinition], index) => (
                    <FormField
                        key={`${taskId}-${fieldName}-${index}`}
                        taskId={taskId}
                        fieldName={fieldName}
                        fieldDefinition={fieldDefinition}
                        path=""
                        value={formData[fieldName] ?? fieldDefinition.DEFAULT}
                        errors={errors}
                        notices={notices}
                        formData={formData}
                        onChange={handleChange}
                        onDeleteArrayItem={onDeleteArrayItem}
                        fieldOverrides={fieldOverrides}
                        testMode={testMode}
                    />
                ))}
            </div>
        );
    }
);

FormFieldGroup.displayName = "FormFields";

export default FormFieldGroup;
