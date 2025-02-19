// utils.ts
import { Task, TaskData } from './types';

/**
 * Deep process objects to convert string JSON to real objects
 */
export function processObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result: any = Array.isArray(obj) ? [] : {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (typeof value === 'string') {
      // Try to parse strings that look like JSON objects/arrays
      if ((value.trim().startsWith('{') && value.trim().endsWith('}')) || 
          (value.trim().startsWith('[') && value.trim().endsWith(']'))) {
        try {
          result[key] = processObject(JSON.parse(value));
        } catch (e) {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    } else if (value && typeof value === 'object') {
      result[key] = processObject(value);
    } else {
      result[key] = value;
    }
  });
  
  return result;
}

/**
 * Process tasks to ensure all objects are properly parsed
 */
export function processTasksForSubmission(tasks: Task[]): any[] {
  return tasks.map(task => {
    // Clone the task to avoid mutation
    const processedTask = {
      ...task,
      stream: true,
      index: Number(task.index),
      taskData: processObject(task.taskData)
    };
    
    return processedTask;
  });
}

/**
 * Get object at a specific path within an object
 */
export function getObjectAtPath(obj: any, path: string): any {
  if (!path || path === "") return obj;
  
  const parts = path.split(".");
  let current = {...obj};
  
  for (const part of parts) {
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Get parent path from a path string
 */
export function getParentPath(path: string): string {
  if (!path || path === "" || path === "taskData") return "";
  const parts = path.split(".");
  return parts.slice(0, -1).join(".");
}

/**
 * Try to parse response data into appropriate format
 */
export function parseResponseData(response: any): {data: any, isObject: boolean} {
  let processedResponse = response;
  let isObject = false;
  
  if (typeof response === 'string') {
    if ((response.trim().startsWith('{') && response.trim().endsWith('}')) ||
        (response.trim().startsWith('[') && response.trim().endsWith(']'))) {
      try {
        processedResponse = JSON.parse(response);
        isObject = true;
      } catch {
        // Keep as string if parsing fails
      }
    }
  } else if (typeof response === 'object' && response !== null) {
    processedResponse = response;
    isObject = true;
  }
  
  return { data: processedResponse, isObject };
}


/**
 * Safely converts any value to a displayable string
 * This is the key fix for the [object Object] issue
 */
export function safeStringify(value: any) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    
    // If it's an object, always stringify it
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (err) {
        return `[Error stringifying: ${err.message}]`;
      }
    }
    
    // For primitives, just convert to string
    return String(value);
  }
  