"use client";
import React, { useMemo } from "react";
import { Schema, SchemaField } from "@/constants/socket-constants";
import { getTaskSchema } from "@/constants/socket-schema";
import FormField, { FieldOverrides } from "./FormField";
import { FIELD_OVERRIDES } from "@/constants/socket-constants";
import { useSelector } from "react-redux";
import { selectTaskById, selectTaskDataById, selectTaskValidationState } from "@/lib/redux/socket-io/selectors";
import { arrayOperation, updateTaskFieldByPath } from "@/lib/redux/socket-io/thunks/taskFieldThunks";
import { RootState } from "@/lib/redux/store";
import { useAppDispatch } from "@/lib/redux";
import ActionButtons from "./ActionButtons";
import TaskDataDebug from './TaskDataDebug';

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

interface DynamicFormProps {
    taskId: string;
    onSubmit?: (data: Record<string, any>) => void;
    fieldOverrides?: FieldOverrides;
    minimalSpace?: boolean;
    testMode?: boolean;
    showDebug?: boolean;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
    taskId,
    onSubmit,
    fieldOverrides = {},
    minimalSpace = false,
    testMode = false,
    showDebug = true,
}) => {
    const dispatch = useAppDispatch();
    const task = useSelector((state: RootState) => selectTaskById(state, taskId));
    const formData = useSelector((state: RootState) => selectTaskDataById(state, taskId));
    
    const schema = useMemo(() => getTaskSchema(task?.taskName || "") || {}, [task?.taskName]);
    
    const errors = useMemo(() => ({}), []);
    const notices = useMemo(() => ({}), []);
    
    const handleDeleteArrayItem = React.useCallback(
        (fieldPath: string, index: number) => {
            dispatch(arrayOperation({ taskId, fieldPath, operation: "remove", index }));
        },
        [dispatch, taskId]
    );
    
    return (
        <div className="w-full bg-slate-100 dark:bg-slate-800 p-4 pb-2 rounded">
            {Object.keys(schema).length > 0 ? (
                <FormFieldGroup
                    schema={schema}
                    taskId={taskId}
                    formData={formData}
                    errors={errors}
                    notices={notices}
                    onDeleteArrayItem={handleDeleteArrayItem}
                    fieldOverrides={fieldOverrides}
                    testMode={testMode}
                />
            ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center py-4">No schema available for the selected task</div>
            )}
            <ActionButtons 
                taskId={taskId}
                minimalSpace={minimalSpace}
                onSubmit={onSubmit}
            />
            <TaskDataDebug taskId={taskId} show={showDebug} />
        </div>
    );
};

export default React.memo(DynamicForm);