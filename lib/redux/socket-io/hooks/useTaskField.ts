// File Location: lib/redux/socket-io/hooks/useTaskField.ts

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { getFieldDefinition } from "@/constants/socket-schema";
import { updateTaskFieldByPath, arrayOperation } from "../thunks/taskFieldThunks";
import { selectFieldValue } from "../selectors";
import { useAppSelector } from "@/lib/redux";
import { selectTaskNameById } from "../selectors";


export const useTaskField = (taskId: string, fieldPath: string) => {
  const dispatch = useDispatch<AppDispatch>();
  const taskName = useAppSelector((state) => selectTaskNameById(state, taskId));

  const fieldDefinition = useMemo(
    () => getFieldDefinition(taskName, fieldPath),
    [taskName, fieldPath]
  );

  const value = useSelector((state: RootState) => selectFieldValue(taskId, fieldPath)(state)) ?? fieldDefinition?.DEFAULT;

  // Select validation errors for this field
  const validationState = useSelector((state: RootState) => {
    const task = state.socketTasks.tasks[taskId];
    if (!task) return { isValid: true, errors: [] };

    const errors = task.validationErrors
      .filter((error) => error.includes(fieldPath))
      .map((error) => error.replace(`Field '${fieldPath}' `, ""));

    return {
      isValid: errors.length === 0,
      errors,
    };
  });

  // Update function for the field
  const setValue = useCallback(
    (newValue: any) => {
      dispatch(updateTaskFieldByPath({ taskId, fieldPath, value: newValue }));
    },
    [dispatch, taskId, fieldPath]
  );

  // Array-specific functions
  const arrayFunctions = useMemo(() => {
    if (fieldDefinition?.DATA_TYPE?.toLowerCase() !== "array") {
      return null;
    }

    return {
      addItem: (item: any) => {
        dispatch(arrayOperation({ taskId, fieldPath, operation: "add", value: item }));
      },
      setItems: (items: any[]) => {
        dispatch(arrayOperation({ taskId, fieldPath, operation: "set", value: items }));
      },
      updateItem: (index: number, item: any) => {
        dispatch(arrayOperation({ taskId, fieldPath, operation: "update", index, value: item }));
      },
      removeItem: (index: number) => {
        dispatch(arrayOperation({ taskId, fieldPath, operation: "remove", index }));
      },
    };
  }, [dispatch, taskId, fieldPath, fieldDefinition]);

  return {
    definition: fieldDefinition,
    value,
    setValue,
    arrayFunctions,
    validationState,
    isRequired: fieldDefinition?.REQUIRED || false,
    description: fieldDefinition?.DESCRIPTION || "",
    iconName: fieldDefinition?.ICON_NAME || "",
    componentType: fieldDefinition?.COMPONENT || "Input",
    componentProps: fieldDefinition?.COMPONENT_PROPS || {},
    dataType: fieldDefinition?.DATA_TYPE || "string",
  };
};