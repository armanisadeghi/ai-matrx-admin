// lib/redux/socket-io/hooks/useTaskField.ts
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AppDispatch } from '../../store';
import { 
  updateTask, 
  updateNestedTask, 
  addItemToTaskArray, 
  setTaskArray, 
  updateTaskArrayItem 
} from '../socketThunks';
import { getFieldDefinition } from '@/constants/socket-schema';
import { SchemaField } from '@/constants/socket-schema';

// The main hook for connecting a component to a task field
export const useTaskField = (
  taskId: string,
  taskName: string,
  fieldPath: string
) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get the field definition from schema
  const fieldDefinition = useMemo(() => 
    getFieldDefinition(taskName, fieldPath), 
    [taskName, fieldPath]
  );
  
  // Parse field path to determine if it's a nested field
  const pathParts = fieldPath.split('.');
  const isNested = pathParts.length > 1;
  const rootField = pathParts[0];
  const nestedPath = pathParts.slice(1).join('.');
  
  // Selector for the field value
  const value = useSelector((state: RootState) => {
    const taskData = state.socketTasks.tasks[taskId]?.taskData || {};
    
    if (!isNested) {
      return taskData[fieldPath] !== undefined 
        ? taskData[fieldPath] 
        : fieldDefinition?.DEFAULT;
    }
    
    // For nested fields, traverse the path
    let current = taskData[rootField];
    if (current === undefined) {
      return fieldDefinition?.DEFAULT;
    }
    
    for (let i = 1; i < pathParts.length; i++) {
      if (!current || typeof current !== 'object') {
        return fieldDefinition?.DEFAULT;
      }
      current = current[pathParts[i]];
      if (current === undefined) {
        return fieldDefinition?.DEFAULT;
      }
    }
    
    return current;
  });
  
  // Update function for the field
  const setValue = useCallback((newValue: any) => {
    if (!isNested) {
      dispatch(updateTask(taskId, fieldPath, newValue));
    } else {
      dispatch(updateNestedTask(taskId, rootField, nestedPath, newValue));
    }
  }, [dispatch, taskId, fieldPath, isNested, rootField, nestedPath]);
  
  // Special array functions if the field is an array
  const arrayFunctions = useMemo(() => {
    if (fieldDefinition?.DATA_TYPE?.toLowerCase() !== 'array') {
      return null;
    }
    
    return {
      addItem: (item: any) => {
        dispatch(addItemToTaskArray(taskId, fieldPath, item));
      },
      setItems: (items: any[]) => {
        dispatch(setTaskArray(taskId, fieldPath, items));
      },
      updateItem: (index: number, item: any) => {
        dispatch(updateTaskArrayItem(taskId, fieldPath, index, item));
      },
      removeItem: (index: number) => {
        const currentItems = Array.isArray(value) ? [...value] : [];
        const newItems = [
          ...currentItems.slice(0, index),
          ...currentItems.slice(index + 1)
        ];
        if (isNested) {
          dispatch(updateNestedTask(taskId, rootField, nestedPath, newItems));
        } else {
          dispatch(updateTask(taskId, fieldPath, newItems));
        }
      }
    };
  }, [dispatch, taskId, fieldPath, fieldDefinition, value, isNested, rootField, nestedPath]);
  
  // Get validation state for this field
  const validationState = useSelector((state: RootState) => {
    const task = state.socketTasks.tasks[taskId];
    if (!task) return { isValid: true, errors: [] };
    
    // Filter validation errors that apply to this field
    const errors = task.validationErrors
      .filter(error => error.includes(fieldPath))
      .map(error => error.replace(`Field '${fieldPath}' `, ''));
    
    return {
      isValid: errors.length === 0,
      errors
    };
  });
  
  return {
    // The field definition from the schema
    definition: fieldDefinition,
    
    // Current value of the field
    value,
    
    // Update function
    setValue,
    
    // Array-specific functions (if applicable)
    arrayFunctions,
    
    // Validation state
    validationState,
    
    // Helper properties
    isRequired: fieldDefinition?.REQUIRED || false,
    description: fieldDefinition?.DESCRIPTION || '',
    iconName: fieldDefinition?.ICON_NAME || '',
    componentType: fieldDefinition?.COMPONENT || 'Input',
    componentProps: fieldDefinition?.COMPONENT_PROPS || {},
    dataType: fieldDefinition?.DATA_TYPE || 'string'
  };
};