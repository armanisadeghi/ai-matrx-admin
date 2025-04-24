// File Location: lib/redux/socket-io/thunks/taskFieldThunks.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import { updateTaskField, updateNestedTaskField, addToArrayField, setArrayField, updateArrayItem, removeArrayItem } from "../slices/socketTasksSlice";
import { getFieldDefinition } from "@/constants/socket-schema";
import { RootState } from "../../store";

/**
 * Helper function to parse array paths like "brokers[0].name" into segments
 * @param path Path string that may contain array notation
 * @returns Array of path segments with array indices
 */
const parseArrayPath = (path: string): { segments: string[]; indices: number[] } => {
  const segments: string[] = [];
  const indices: number[] = [];
  let currentSegment = '';
  let inBrackets = false;
  
  // Parse the path character by character
  for (let i = 0; i < path.length; i++) {
    const char = path[i];
    
    if (char === '[') {
      // End of segment, start of array index
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = '';
      }
      inBrackets = true;
    } else if (char === ']') {
      // End of array index
      if (inBrackets && currentSegment) {
        indices.push(parseInt(currentSegment, 10));
        currentSegment = '';
      }
      inBrackets = false;
    } else if (char === '.' && !inBrackets) {
      // End of segment
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = '';
      }
    } else {
      // Part of the current segment or index
      currentSegment += char;
    }
  }
  
  // Add the last segment if there is one
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  return { segments, indices };
};

export const updateTaskFieldByPath = createAsyncThunk<
  void,
  { taskId: string; fieldPath: string; value: any },
  { state: RootState }
>(
  "socketTasks/updateTaskFieldByPath",
  async ({ taskId, fieldPath, value }, { dispatch, getState }) => {
    const state = getState();
    const task = state.socketTasks.tasks[taskId];
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Check if we're dealing with an array path like "brokers[0].name"
    if (fieldPath.includes('[') && fieldPath.includes(']')) {
      const { segments, indices } = parseArrayPath(fieldPath);
      
      // Get the root field (e.g., "brokers" from "brokers[0].name")
      const rootField = segments[0];
      
      if (segments.length === 1) {
        // Simple array update like "brokers[0]" = value
        const arrayValue = [...(Array.isArray(task.taskData[rootField]) ? task.taskData[rootField] : [])];
        const index = indices[0];
        
        // Ensure the array has enough items
        while (arrayValue.length <= index) {
          arrayValue.push({});
        }
        
        arrayValue[index] = value;
        
        dispatch(
          updateTaskField({
            taskId,
            field: rootField,
            value: arrayValue,
          })
        );
      } else if (segments.length > 1) {
        // Complex nested array update like "brokers[0].name" = value
        const arrayValue = [...(Array.isArray(task.taskData[rootField]) ? task.taskData[rootField] : [])];
        const index = indices[0];
        
        // Ensure the array has enough items
        while (arrayValue.length <= index) {
          arrayValue.push({});
        }
        
        // Construct the path to the nested property, e.g. "name" from "brokers[0].name"
        const nestedPath = segments.slice(1).join('.');
        
        // Create a new object for this array item if needed
        if (!arrayValue[index] || typeof arrayValue[index] !== 'object') {
          arrayValue[index] = {};
        }
        
        // Set the nested property on the array item
        const updatedItem = { ...arrayValue[index] };
        
        // Handle nested paths with dot notation
        let current = updatedItem;
        const parts = nestedPath.split('.');
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
          }
          current = current[part];
        }
        
        // Set the final value
        current[parts[parts.length - 1]] = value;
        
        arrayValue[index] = updatedItem;
        
        dispatch(
          updateTaskField({
            taskId,
            field: rootField,
            value: arrayValue,
          })
        );
      }
    } else {
      // Handle regular paths without array notation
      const pathParts = fieldPath.split(".");
      const isNested = pathParts.length > 1;
      const rootField = pathParts[0];
      const nestedPath = pathParts.slice(1).join(".");

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

    // Handle array paths like "brokers[0]" by extracting the root field
    let effectiveFieldPath = fieldPath;
    if (fieldPath.includes('[') && fieldPath.includes(']')) {
      const { segments } = parseArrayPath(fieldPath);
      effectiveFieldPath = segments[0]; // Get the root array field
    }

    const fieldDefinition = getFieldDefinition(task.taskName, effectiveFieldPath);
    if (fieldDefinition?.DATA_TYPE?.toLowerCase() !== "array") {
      throw new Error(`Field ${effectiveFieldPath} is not an array`);
    }

    const pathParts = effectiveFieldPath.split(".");
    const isNested = pathParts.length > 1;
    const rootField = pathParts[0];
    const nestedPath = pathParts.slice(1).join(".");

    if (isNested) {
      // For nested arrays, get the current array value
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
              field: effectiveFieldPath,
              item: value,
            })
          );
          break;
        case "set":
          dispatch(
            setArrayField({
              taskId,
              field: effectiveFieldPath,
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
              field: effectiveFieldPath,
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
              field: effectiveFieldPath,
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