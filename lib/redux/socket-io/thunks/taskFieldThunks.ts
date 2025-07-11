import { createAsyncThunk } from "@reduxjs/toolkit";
import { updateTaskField, updateNestedTaskField, addToArrayField, setArrayField, updateArrayItem, removeArrayItem } from "../slices/socketTasksSlice";
import { getFieldDefinitions } from "@/constants/socket-schema";
import { RootState } from "../../store";

export const updateTaskFieldByPath = createAsyncThunk<
  void,
  { taskId: string; fieldPath: string; value: any; index?: number },
  { state: RootState }
>(
  "socketTasks/updateTaskFieldByPath",
  async ({ taskId, fieldPath, value, index }, { dispatch, getState }) => {
    const state = getState();
    const task = state.socketTasks.tasks[taskId];
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Parse path to handle array indices
    const indexMatch = fieldPath.match(/\[(\d+|index)\]/);
    const hasArrayIndex = !!indexMatch;
    let arrayIndex: number | null = null;
    let rootField = fieldPath;
    let nestedPath = "";

    if (hasArrayIndex) {
      const indexValue = indexMatch![1];
      if (indexValue === "index") {
        if (typeof index !== "number") {
          throw new Error("Specific index required for paths with [index]");
        }
        arrayIndex = index;
      } else {
        arrayIndex = parseInt(indexValue, 10);
      }
      const parts = fieldPath.split(/\[.*?\]\.?/);
      rootField = parts[0];
      nestedPath = parts.slice(1).join(".");
    } else {
      const pathParts = fieldPath.split(".");
      rootField = pathParts[0];
      nestedPath = pathParts.slice(1).join(".");
    }

    // Get field definitions
    const fieldDefinitions = getFieldDefinitions(task.taskName);
    const rootFieldDef = fieldDefinitions.find(def => def.path === rootField);
    const isArrayField = rootFieldDef?.dataType.toLowerCase() === "array";

    if (hasArrayIndex && isArrayField && arrayIndex !== null) {
      // Handle array updates
      let currentArray = task.taskData[rootField];
      if (!Array.isArray(currentArray)) {
        currentArray = [];
      }

      // Initialize new element with defaults from reference schema
      const defaultItem = rootFieldDef?.reference
        ? Object.fromEntries(
            Object.entries(rootFieldDef.reference).map(([fieldName, fieldDefinition]) => [
              fieldName,
              fieldDefinition.DEFAULT,
            ])
          )
        : {};

      let newArray = [...currentArray];
      while (newArray.length <= arrayIndex) {
        newArray.push({ ...defaultItem });
      }

      if (nestedPath) {
        const currentItem = newArray[arrayIndex] || { ...defaultItem };
        const updatedItem = { ...currentItem };
        let target = updatedItem;
        const nestedParts = nestedPath.split(".");
        for (let i = 0; i < nestedParts.length - 1; i++) {
          target[nestedParts[i]] = target[nestedParts[i]] || {};
          target = target[nestedParts[i]];
        }
        target[nestedParts[nestedParts.length - 1]] = value;
        newArray[arrayIndex] = updatedItem;
      } else {
        newArray[arrayIndex] = { ...defaultItem, ...value };
      }

      dispatch(
        updateNestedTaskField({
          taskId,
          parentField: rootField,
          path: "",
          value: newArray,
        })
      );
    } else {
      // Handle non-array fields
      const isNested = nestedPath.length > 0;
      if (isNested) {
        dispatch(
          updateNestedTaskField({
            taskId,
            parentField: rootField,
            path: nestedPath,
            value,
          })
        );
      } else {
        dispatch(
          updateTaskField({
            taskId,
            field: fieldPath,
            value,
          })
        );
      }
    }
  }
);

export const arrayOperation = createAsyncThunk<
  void,
  { taskId: string; fieldPath: string; operation: "add" | "set" | "update" | "remove"; value?: any; index?: number },
  { state: RootState }
>(
  "socketTasks/arrayOperation",
  async ({ taskId, fieldPath, operation, value, index }, { dispatch, getState }) => {
    const state = getState();
    const task = state.socketTasks.tasks[taskId];
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const fieldDefinitions = getFieldDefinitions(task.taskName);
    const fieldDefinition = fieldDefinitions.find(def => def.path === fieldPath);
    if (fieldDefinition?.dataType.toLowerCase() !== "array") {
      throw new Error(`Field ${fieldPath} is not an array`);
    }

    const pathParts = fieldPath.split(".");
    const isNested = pathParts.length > 1;
    const rootField = pathParts[0];
    const nestedPath = pathParts.slice(1).join(".");

    if (isNested) {
      let current = task.taskData[rootField];
      for (let i = 1; i < pathParts.length; i++) {
        if (!current || typeof current !== "object") {
          current = [];
          break;
        }
        current = current[pathParts[i]];
      }
      let newArray = Array.isArray(current) ? [...current] : [];

      switch (operation) {
        case "add":
          newArray.push(value);
          break;
        case "set":
          newArray = Array.isArray(value) ? [...value] : [];
          break;
        case "update":
          if (typeof index !== "number") {
            throw new Error("Index required for update operation");
          }
          newArray = updateArrayItemHelper(newArray, index, value);
          break;
        case "remove":
          if (typeof index !== "number") {
            throw new Error("Index required for remove operation");
          }
          newArray = removeArrayItemHelper(newArray, index);
          break;
      }

      dispatch(
        updateNestedTaskField({
          taskId,
          parentField: rootField,
          path: nestedPath,
          value: newArray,
        })
      );
    } else {
      switch (operation) {
        case "add":
          dispatch(
            addToArrayField({
              taskId,
              field: fieldPath,
              item: value,
            })
          );
          break;
        case "set":
          dispatch(
            setArrayField({
              taskId,
              field: fieldPath,
              items: Array.isArray(value) ? value : [],
            })
          );
          break;
        case "update":
          if (typeof index !== "number") {
            throw new Error("Index required for update operation");
          }
          dispatch(
            updateArrayItem({
              taskId,
              field: fieldPath,
              index,
              item: value,
            })
          );
          break;
        case "remove":
          if (typeof index !== "number") {
            throw new Error("Index required for remove operation");
          }
          dispatch(
            removeArrayItem({
              taskId,
              field: fieldPath,
              index,
            })
          );
          break;
      }
    }
  }
);

const updateArrayItemHelper = (array: any[], index: number, value: any): any[] => {
  if (index < 0 || index >= array.length) {
    throw new Error(`Index ${index} is out of bounds`);
  }
  return [...array.slice(0, index), value, ...array.slice(index + 1)];
};

const removeArrayItemHelper = (array: any[], index: number): any[] => {
  if (index < 0 || index >= array.length) {
    throw new Error(`Index ${index} is out of bounds`);
  }
  return [...array.slice(0, index), ...array.slice(index + 1)];
};