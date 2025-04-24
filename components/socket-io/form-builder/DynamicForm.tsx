"use client";
import React, { useMemo } from "react";
import { getTaskSchema } from "@/constants/socket-schema";
import FormField, { FieldOverrides } from "./FormField";
import { useSelector } from "react-redux";
import { selectTaskById, selectTaskDataById } from "@/lib/redux/socket-io/selectors";
import { arrayOperation } from "@/lib/redux/socket-io/thunks/taskFieldThunks";
import { RootState } from "@/lib/redux/store";
import { useAppDispatch } from "@/lib/redux";
import ActionButtons from "./ActionButtons";
import TaskDataDebug from "./TaskDataDebug";
import { updateTaskFieldByPath } from "@/lib/redux/socket-io/thunks/taskFieldThunks";

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
    showDebug = false,
}) => {
    const dispatch = useAppDispatch();
    const task = useSelector((state: RootState) => selectTaskById(state, taskId));
    const formData = useSelector((state: RootState) => selectTaskDataById(state, taskId));
    const errors = useMemo(() => ({}), []);
    const notices = useMemo(() => ({}), []);

    const schema = useMemo(() => getTaskSchema(task?.taskName || "") || {}, [task?.taskName]);
    const schemaFields = React.useMemo(() => Object.entries(schema), [schema]);
        
    const handleChange = React.useCallback(
        (fieldPath: string, value: any) => {
            dispatch(updateTaskFieldByPath({ taskId, fieldPath, value }));
        },
        [dispatch, taskId]
    );


    const handleDeleteArrayItem = React.useCallback(
        (fieldPath: string, index: number) => {
            dispatch(arrayOperation({ taskId, fieldPath, operation: "remove", index }));
        },
        [dispatch, taskId]
    );

    return (
        <div className="w-full bg-slate-100 dark:bg-slate-800 p-4 pb-2 rounded">
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
                        onDeleteArrayItem={handleDeleteArrayItem}
                        fieldOverrides={fieldOverrides}
                        testMode={testMode}
                    />
                ))}
            </div>
            <ActionButtons taskId={taskId} minimalSpace={minimalSpace} onSubmit={onSubmit} />
            <TaskDataDebug taskId={taskId} show={showDebug} />
        </div>
    );
};

export default React.memo(DynamicForm);