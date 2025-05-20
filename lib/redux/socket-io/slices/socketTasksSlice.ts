import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initializeTaskDataWithDefaults, validateTaskData } from "@/constants/socket-schema";
import { v4 as uuidv4 } from "uuid";
import { SocketTask } from "../socket.types";

interface TasksState {
  tasks: Record<string, SocketTask>;
  currentTaskId: string | null;
}

const initialState: TasksState = {
  tasks: {},
  currentTaskId: null,
};

const setNestedValue = (obj: any, path: string, value: any): any => {
  const pathParts = path.split(".");
  if (pathParts.length === 1 && pathParts[0]) {
    return { ...obj, [pathParts[0]]: value };
  }

  const [first, ...rest] = pathParts;
  return {
    ...obj,
    [first]: setNestedValue(obj[first] || {}, rest.join("."), value),
  };
};

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

const socketTasksSlice = createSlice({
  name: "socketTasks",
  initialState,
  reducers: {
    initializeTask: (
      state,
      action: PayloadAction<{
        taskId?: string;
        service: string;
        taskName: string;
        connectionId: string;
      }>
    ) => {
      const { taskId = uuidv4(), service, taskName, connectionId } = action.payload;

      if (!state.tasks[taskId]) {
        const taskData = initializeTaskDataWithDefaults(taskName);

        state.tasks[taskId] = {
          taskId,
          service,
          taskName,
          taskData,
          isValid: false,
          validationErrors: [],
          status: "building",
          listenerIds: [],
          connectionId,
          isStreaming: false,
        };
      }
    },

    setTaskFields: (
      state,
      action: PayloadAction<{
        taskId: string;
        fields: Record<string, any>;
      }>
    ) => {
      const { taskId, fields } = action.payload;
      const task = state.tasks[taskId];
      if (task) {
        task.taskData = { ...task.taskData, ...fields };
      }
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
      }
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
        if (!path) {
          task.taskData[parentField] = value;
        } else {
          if (!task.taskData[parentField]) {
            task.taskData[parentField] = {};
          }
          task.taskData[parentField] = setNestedValue(task.taskData[parentField], path, value);
        }
      }
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
        if (!task.taskData[field]) {
          task.taskData[field] = [];
        } else if (!Array.isArray(task.taskData[field])) {
          task.taskData[field] = [task.taskData[field]];
        }
        task.taskData[field].push(item);
      }
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
        task.taskData[field] = [...items];
      }
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
      if (task && task.taskData[field] && Array.isArray(task.taskData[field])) {
        task.taskData[field] = updateArrayItemHelper(task.taskData[field], index, item);
      }
    },

    updateArrayItemById: (
      state,
      action: PayloadAction<{
        taskId: string;
        field: string;
        id: string | number;
        item: any;
      }>
    ) => {
      const { taskId, field, id, item } = action.payload;
      const task = state.tasks[taskId];
      if (task && task.taskData[field] && Array.isArray(task.taskData[field])) {
        const index = task.taskData[field].findIndex((entry: any) => entry?.id === id);
        if (index >= 0) {
          task.taskData[field] = updateArrayItemHelper(task.taskData[field], index, item);
        }
      }
    },

    removeArrayItem: (
      state,
      action: PayloadAction<{
        taskId: string;
        field: string;
        index: number;
      }>
    ) => {
      const { taskId, field, index } = action.payload;
      const task = state.tasks[taskId];
      if (task && task.taskData[field] && Array.isArray(task.taskData[field])) {
        task.taskData[field] = removeArrayItemHelper(task.taskData[field], index);
      }
    },

    validateTask: (
      state,
      action: PayloadAction<{
        taskId: string;
      }>
    ) => {
      const { taskId } = action.payload;
      const task = state.tasks[taskId];
      if (task) {
        const { isValid, errors } = validateTaskData(task.taskName, task.taskData);
        task.isValid = isValid;
        task.validationErrors = errors;
        task.status = isValid ? "ready" : "building";
      }
    },

    setTaskStatus: (
      state,
      action: PayloadAction<{
        taskId: string;
        status: SocketTask["status"];
      }>
    ) => {
      const { taskId, status } = action.payload;
      const task = state.tasks[taskId];
      if (task) {
        task.status = status;
      }
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
        state.currentTaskId = taskId;
      }
    },

    setTaskStreaming: (
      state,
      action: PayloadAction<{
        taskId: string;
        isStreaming: boolean;
      }>
    ) => {
      const { taskId, isStreaming } = action.payload;
      const task = state.tasks[taskId];
      if (task) {
        task.isStreaming = isStreaming;
        if (isStreaming) {
          state.currentTaskId = taskId;
        }
      }
    },

    completeTask: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      const task = state.tasks[taskId];
      if (task) {
        task.status = "completed";
        task.isStreaming = false;
      }
    },

    resetTaskData: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      const task = state.tasks[taskId];
      if (task) {
        task.taskData = initializeTaskDataWithDefaults(task.taskName);
        task.isValid = false;
        task.validationErrors = [];
        task.status = "building";
        task.isStreaming = false;
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
        task.isStreaming = false;
      }
    },

    deleteTask: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      delete state.tasks[taskId];
    },
  },
});

export const {
  initializeTask,
  setTaskFields,
  updateTaskField,
  updateNestedTaskField,
  addToArrayField,
  setArrayField,
  updateArrayItem,
  updateArrayItemById,
  removeArrayItem,
  validateTask,
  setTaskStatus,
  setTaskListenerIds,
  setTaskStreaming,
  completeTask,
  setTaskError,
  deleteTask,
  resetTaskData,
} = socketTasksSlice.actions;

export default socketTasksSlice.reducer;