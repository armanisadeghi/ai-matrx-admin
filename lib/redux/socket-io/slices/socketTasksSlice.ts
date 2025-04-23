import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";
import { getTaskSchema } from "@/constants/socket-schema";
import { v4 as uuidv4 } from "uuid";

export interface Task {
  id: string;
  service: string;
  taskName: string;
  taskData: Record<string, any>;
  isValid: boolean;
  validationErrors: string[];
  status: "building" | "ready" | "submitted" | "completed" | "error";
  listenerIds: string[];
  connectionId?: string;
}

interface TasksState {
  tasks: Record<string, Task>;
}

const initialState: TasksState = {
  tasks: {},
};

// Helper function to set nested value
const setNestedValue = (obj: any, path: string, value: any): any => {
  const pathParts = path.split(".");
  if (pathParts.length === 1) {
    return { ...obj, [pathParts[0]]: value };
  }

  const [first, ...rest] = pathParts;
  return {
    ...obj,
    [first]: setNestedValue(obj[first] || {}, rest.join("."), value),
  };
};

// Helper function to update array item
const updateArrayItemHelper = (array: any[], index: number, value: any): any[] => {
  if (index < 0 || index >= array.length) {
    throw new Error(`Index ${index} is out of bounds`);
  }

  return [...array.slice(0, index), value, ...array.slice(index + 1)];
};

const socketTasksSlice = createSlice({
  name: "socketTasks",
  initialState,
  reducers: {
    initializeTask: (
      state,
      action: PayloadAction<{
        id?: string;
        service: string;
        taskName: string;
        connectionId?: string;
      }>
    ) => {
      const { id = uuidv4(), service, taskName, connectionId } = action.payload;

      // Only create if doesn't exist
      if (!state.tasks[id]) {
        state.tasks[id] = {
          id,
          service,
          taskName,
          taskData: {},
          isValid: false,
          validationErrors: [],
          status: "building",
          listenerIds: [],
          connectionId,
        };
      }

      return state;
    },

    updateTaskField: (
      state,
      action: PayloadAction<{
        taskId: string;
        field: string;
        value: any;
      }>
    ) => {
      const { taskId, field, value } = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        task.taskData[field] = value;

        // Validate task after update
        const schema = getTaskSchema(task.taskName);
        if (schema) {
          const errors: string[] = [];

          // Check required fields
          Object.entries(schema).forEach(([fieldName, fieldSpec]) => {
            const providedValue = task.taskData[fieldName];
            const isProvided = providedValue !== undefined && providedValue !== null;

            if (fieldSpec.REQUIRED && !isProvided) {
              errors.push(`Field '${fieldName}' is required but was not provided.`);
            }
          });

          task.validationErrors = errors;
          task.isValid = errors.length === 0;

          // Update status based on validation
          if (!task.isValid && task.status === "ready") {
            task.status = "building";
          } else if (task.isValid && task.status === "building") {
            task.status = "ready";
          }
        }
      }

      return state;
    },

    updateNestedTaskField: (
      state,
      action: PayloadAction<{
        taskId: string;
        parentField: string;
        path: string;
        value: any;
      }>
    ) => {
      const { taskId, parentField, path, value } = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        // Initialize parent field if it doesn't exist
        if (!task.taskData[parentField]) {
          task.taskData[parentField] = {};
        }

        // Update the nested field
        task.taskData[parentField] = setNestedValue(task.taskData[parentField], path, value);

        // Validate task after update (same as in updateTaskField)
        const schema = getTaskSchema(task.taskName);
        if (schema) {
          const errors: string[] = [];

          Object.entries(schema).forEach(([fieldName, fieldSpec]) => {
            const providedValue = task.taskData[fieldName];
            const isProvided = providedValue !== undefined && providedValue !== null;

            if (fieldSpec.REQUIRED && !isProvided) {
              errors.push(`Field '${fieldName}' is required but was not provided.`);
            }
          });

          task.validationErrors = errors;
          task.isValid = errors.length === 0;

          if (!task.isValid && task.status === "ready") {
            task.status = "building";
          } else if (task.isValid && task.status === "building") {
            task.status = "ready";
          }
        }
      }

      return state;
    },

    addToArrayField: (
      state,
      action: PayloadAction<{
        taskId: string;
        field: string;
        item: any;
      }>
    ) => {
      const { taskId, field, item } = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        // Initialize array if it doesn't exist
        if (!task.taskData[field]) {
          task.taskData[field] = [];
        } else if (!Array.isArray(task.taskData[field])) {
          task.taskData[field] = [task.taskData[field]];
        }

        // Add item to array
        task.taskData[field].push(item);

        // Validate task after update (same validation logic)
        const schema = getTaskSchema(task.taskName);
        if (schema) {
          const errors: string[] = [];

          Object.entries(schema).forEach(([fieldName, fieldSpec]) => {
            const providedValue = task.taskData[fieldName];
            const isProvided = providedValue !== undefined && providedValue !== null;

            if (fieldSpec.REQUIRED && !isProvided) {
              errors.push(`Field '${fieldName}' is required but was not provided.`);
            }
          });

          task.validationErrors = errors;
          task.isValid = errors.length === 0;

          if (!task.isValid && task.status === "ready") {
            task.status = "building";
          } else if (task.isValid && task.status === "building") {
            task.status = "ready";
          }
        }
      }

      return state;
    },

    setArrayField: (
      state,
      action: PayloadAction<{
        taskId: string;
        field: string;
        items: any[];
      }>
    ) => {
      const { taskId, field, items } = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        // Set the array
        task.taskData[field] = [...items];

        // Validate task after update (same validation logic)
        const schema = getTaskSchema(task.taskName);
        if (schema) {
          const errors: string[] = [];

          Object.entries(schema).forEach(([fieldName, fieldSpec]) => {
            const providedValue = task.taskData[fieldName];
            const isProvided = providedValue !== undefined && providedValue !== null;

            if (fieldSpec.REQUIRED && !isProvided) {
              errors.push(`Field '${fieldName}' is required but was not provided.`);
            }
          });

          task.validationErrors = errors;
          task.isValid = errors.length === 0;

          if (!task.isValid && task.status === "ready") {
            task.status = "building";
          } else if (task.isValid && task.status === "building") {
            task.status = "ready";
          }
        }
      }

      return state;
    },

    updateArrayItem: (
      state,
      action: PayloadAction<{
        taskId: string;
        field: string;
        index: number;
        item: any;
      }>
    ) => {
      const { taskId, field, index, item } = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        if (!task.taskData[field] || !Array.isArray(task.taskData[field])) {
          throw new Error(`Field ${field} is not an array`);
        }

        // Update array item
        task.taskData[field] = updateArrayItemHelper(task.taskData[field], index, item);

        // Validate task after update (same validation logic)
        const schema = getTaskSchema(task.taskName);
        if (schema) {
          const errors: string[] = [];

          Object.entries(schema).forEach(([fieldName, fieldSpec]) => {
            const providedValue = task.taskData[fieldName];
            const isProvided = providedValue !== undefined && providedValue !== null;

            if (fieldSpec.REQUIRED && !isProvided) {
              errors.push(`Field '${fieldName}' is required but was not provided.`);
            }
          });

          task.validationErrors = errors;
          task.isValid = errors.length === 0;

          if (!task.isValid && task.status === "ready") {
            task.status = "building";
          } else if (task.isValid && task.status === "building") {
            task.status = "ready";
          }
        }
      }

      return state;
    },

    setTaskStatus: (
      state,
      action: PayloadAction<{
        taskId: string;
        status: Task["status"];
      }>
    ) => {
      const { taskId, status } = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        task.status = status;
      }

      return state;
    },

    setTaskListenerIds: (
      state,
      action: PayloadAction<{
        taskId: string;
        listenerIds: string[];
      }>
    ) => {
      const { taskId, listenerIds } = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        task.listenerIds = listenerIds;
        task.status = "submitted";
      }

      return state;
    },

    completeTask: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        task.status = "completed";
      }

      return state;
    },

    resetTaskData: (
      state,
      action: PayloadAction<string | null>
    ) => {
      const taskId = action.payload;
      if (taskId && state.tasks[taskId]) {
        state.tasks[taskId].taskData = {};
        state.tasks[taskId].isValid = false;
        state.tasks[taskId].validationErrors = [];
        state.tasks[taskId].status = "building";
      }
    },


    setTaskError: (
      state,
      action: PayloadAction<{
        taskId: string;
        error: string;
      }>
    ) => {
      const { taskId, error } = action.payload;
      const task = state.tasks[taskId];

      if (task) {
        task.status = "error";
        task.validationErrors = [error];
      }

      return state;
    },

    deleteTask: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      delete state.tasks[taskId];
      return state;
    },
  },
});

export const {
  initializeTask,
  updateTaskField,
  updateNestedTaskField,
  addToArrayField,
  setArrayField,
  updateArrayItem,
  setTaskStatus,
  setTaskListenerIds,
  completeTask,
  setTaskError,
  deleteTask,
  resetTaskData,
} = socketTasksSlice.actions;


export default socketTasksSlice.reducer;