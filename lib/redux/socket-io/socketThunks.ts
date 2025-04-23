import { v4 as uuidv4 } from "uuid";
import {
  initializeTask,
  updateTaskField,
  setTaskListenerIds,
  setTaskError,
  completeTask,
  updateNestedTaskField,
  addToArrayField,
  setArrayField,
  updateArrayItem,
} from "./slices/socketTasksSlice";
import {
  addResponse,
  updateTextResponse,
  updateDataResponse,
  updateInfoResponse,
  updateErrorResponse,
  markResponseEnd,
} from "./slices/socketResponseSlice";
import { selectSocket, selectIsConnected, selectTaskById, selectTaskDataById } from "./selectors";
import { getTaskSchema } from "@/constants/socket-schema";

// Create a new task with minimal data
export const createTask =
  (service: string, taskName: string, initialData?: Record<string, any>, connectionId?: string) =>
  (dispatch) => {
    const taskId = uuidv4();

    dispatch(
      initializeTask({
        taskId: taskId,
        service,
        taskName,
        connectionId,
      })
    );

    // If initial data is provided, set it
    if (initialData) {
      Object.entries(initialData).forEach(([field, value]) => {
        dispatch(
          updateTaskField({
            taskId,
            field,
            value,
          })
        );
      });
    }

    return taskId;
  };

// Update a field in a task
export const updateTask =
  (taskId: string, field: string, value: any) =>
  (dispatch) => {
    dispatch(
      updateTaskField({
        taskId,
        field,
        value,
      })
    );
  };

// Update a nested field in a task
export const updateNestedTask =
  (taskId: string, parentField: string, path: string, value: any) =>
  (dispatch) => {
    dispatch(
      updateNestedTaskField({
        taskId,
        parentField,
        path,
        value,
      })
    );
  };

// Add an item to an array field
export const addItemToTaskArray =
  (taskId: string, field: string, item: any) =>
  (dispatch) => {
    dispatch(
      addToArrayField({
        taskId,
        field,
        item,
      })
    );
  };

// Set an entire array field
export const setTaskArray =
  (taskId: string, field: string, items: any[]) =>
  (dispatch) => {
    dispatch(
      setArrayField({
        taskId,
        field,
        items,
      })
    );
  };

// Update an item in an array field
export const updateTaskArrayItem =
  (taskId: string, field: string, index: number, item: any) =>
  (dispatch) => {
    dispatch(
      updateArrayItem({
        taskId,
        field,
        index,
        item,
      })
    );
  };

// Validate task data against schema
const validateTaskData = (taskName: string, taskData: Record<string, any>) => {
  const schema = getTaskSchema(taskName);
  if (!schema) {
    throw new Error(`No schema found for task: ${taskName}`);
  }

  const validatedData = { ...taskData };
  const errors: string[] = [];

  Object.entries(schema).forEach(([field, fieldSpec]) => {
    const providedValue = taskData[field];
    const isProvided = providedValue !== undefined && providedValue !== null;

    // Check required fields
    if (fieldSpec.REQUIRED && !isProvided) {
      errors.push(`Field '${field}' is required but was not provided.`);
      return;
    }

    // Apply default value if not provided
    if (!isProvided && fieldSpec.DEFAULT !== null) {
      validatedData[field] = fieldSpec.DEFAULT;
    }

    // Validate data type if provided
    if (isProvided && fieldSpec.DATA_TYPE) {
      let expectedType = fieldSpec.DATA_TYPE.toLowerCase();
      let actualType = Array.isArray(providedValue) ? "array" : typeof providedValue;

      // Handle special cases
      if (expectedType === "integer" || expectedType === "float") {
        expectedType = "number";
      }
      if (expectedType === "boolean" && (providedValue === "true" || providedValue === "false")) {
        actualType = "boolean";
      }

      if (actualType !== expectedType) {
        errors.push(`Field '${field}' should be of type '${fieldSpec.DATA_TYPE}' but got '${actualType}'.`);
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(" ")}`);
  }

  return validatedData;
};

// Submit a task to the server
export const submitTask =
  (taskId: string, connectionId?: string) =>
  async (dispatch, getState) => {
    const state = getState();
    const socket = selectSocket(state, connectionId);
    const isConnected = selectIsConnected(state, connectionId);

    if (!socket || !isConnected) {
      dispatch(
        setTaskError({
          taskId,
          error: "No socket connection",
        })
      );
      return [];
    }

    const task = selectTaskById(state, taskId);
    if (!task) {
      console.error(`Task with taskId ${taskId} not found`);
      return [];
    }

    try {
      const validatedTaskData = validateTaskData(task.taskName, task.taskData);

      return new Promise((resolve) => {
        socket.emit(
          task.service,
          { taskName: task.taskName, taskData: validatedTaskData },
          (response: { response_listener_events?: string[] }) => {
            const rawEventNames = response?.response_listener_events || [];
            // Prefix event names with connectionId to ensure uniqueness
            const eventNames = rawEventNames.map((name) =>
              connectionId ? `${connectionId}:${name}` : name
            );

            if (!eventNames.length) {
              const errorUuid = `internal-error-${Date.now()}`;
              dispatch(addResponse({ listenerId: errorUuid, taskId }));
              dispatch(
                updateErrorResponse({
                  listenerId: errorUuid,
                  error: {
                    message: "No event names received from server",
                    type: "internal_error",
                    code: "NO_EVENT_NAMES_RECEIVED",
                    details: {},
                  },
                })
              );
              dispatch(markResponseEnd(errorUuid));
              dispatch(
                setTaskError({
                  taskId,
                  error: "No event names received from server",
                })
              );
              resolve([]);
              return;
            }

            // Store the listener IDs with the task
            dispatch(
              setTaskListenerIds({
                taskId,
                listenerIds: eventNames,
              })
            );

            // Set up listeners for each event name
            eventNames.forEach((eventName: string) => {
              dispatch(addResponse({ listenerId: eventName, taskId }));

              const listener = (response: any) => {
                if (typeof response === "string") {
                  dispatch(updateTextResponse({ listenerId: eventName, text: response }));
                } else {
                  if (response?.data !== undefined) {
                    dispatch(updateDataResponse({ listenerId: eventName, data: response.data }));
                  }
                  if (response?.info !== undefined) {
                    dispatch(updateInfoResponse({ listenerId: eventName, info: response.info }));
                  }
                  if (response?.error !== undefined) {
                    dispatch(updateErrorResponse({ listenerId: eventName, error: response.error }));
                  }

                  const isEnd = response?.end === true || response?.end === "true" || response?.end === "True";
                  if (isEnd) {
                    dispatch(markResponseEnd(eventName));
                    socket.off(eventName, listener);

                    // Check if all responses for this task are ended
                    const allResponsesEnded = eventNames.every((taskId) => {
                      const response = state.socketResponse[taskId];
                      return response?.ended === true;
                    });

                    if (allResponsesEnded) {
                      dispatch(completeTask(taskId));
                    }
                  }
                }
              };

              socket.on(eventName, listener);
            });

            resolve(eventNames);
          }
        );
      });
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      dispatch(
        setTaskError({
          taskId,
          error: errorMessage,
        })
      );
      return [];
    }
  };

// Create and submit a task in one step
export const startTask =
  (service: string, taskName: string, taskData: Record<string, any>, connectionId?: string) =>
  async (dispatch) => {
    const taskId = dispatch(createTask(service, taskName, taskData, connectionId));
    return dispatch(submitTask(taskId, connectionId));
  };