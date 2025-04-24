// File Location: lib/redux/socket-io/thunks/submitTaskThunk.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import { addResponse, updateErrorResponse, markResponseEnd, updateTextResponse, updateDataResponse, updateInfoResponse } from "../slices/socketResponseSlice";
import { completeTask, setTaskError, setTaskListenerIds, initializeTask, validateTask } from "../slices/socketTasksSlice";
import { selectPrimaryConnection } from "../selectors";
import { RootState } from "@/lib/redux";
import { v4 as uuidv4 } from "uuid";


export const submitTask = createAsyncThunk<string[], { taskId: string }, { state: RootState }>(
    "socketTasks/submitTask",
    async ({ taskId }, { dispatch, getState }) => {
      const state = getState();
      const task = state.socketTasks.tasks[taskId];
  
      if (!task) {
        dispatch(setTaskError({ taskId, error: `Task with ID ${taskId} not found` }));
        return [];
      }
  
      // Validate the task and update its state
      dispatch(validateTask({ taskId }));
      const updatedState = getState();
      const validatedTask = updatedState.socketTasks.tasks[taskId];
  
      if (!validatedTask.isValid) {
        dispatch(setTaskError({ taskId, error: validatedTask.validationErrors.join("; ") }));
        return [];
      }
  
      const connection = state.socketConnections.connections[task.connectionId];
  
      if (!connection || !connection.socket || connection.connectionStatus !== "connected") {
        dispatch(setTaskError({ taskId, error: "No active socket connection for task" }));
        return [];
      }
  
      return new Promise((resolve) => {
        connection.socket.emit(
          task.service,
          { taskName: task.taskName, taskData: task.taskData },
          (response: { response_listener_events?: string[] }) => {
            const rawEventNames = response?.response_listener_events || [];
            const eventNames = rawEventNames.map((name) => `${task.connectionId}:${name}`);
  
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
              dispatch(setTaskError({ taskId, error: "No event names received from server" }));
              resolve([]);
              return;
            }
  
            dispatch(setTaskListenerIds({ taskId, listenerIds: eventNames }));
  
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
                    connection.socket.off(eventName, listener);
  
                    const state = getState();
                    const allResponsesEnded = eventNames.every((listenerId) =>
                      state.socketResponse[listenerId]?.ended
                    );
  
                    if (allResponsesEnded) {
                      dispatch(completeTask(taskId));
                    }
                  }
                }
              };
  
              connection.socket.on(eventName, listener);
            });
  
            resolve(eventNames);
          }
        );
      });
    }
  );
  
  export const createAndSubmitTask = createAsyncThunk<
    string[],
    { service: string; taskName: string; taskData: Record<string, any>; connectionId?: string },
    { state: RootState }
  >(
    "socketTasks/createAndSubmitTask",
    async ({ service, taskName, taskData, connectionId }, { dispatch, getState }) => {
      const state = getState();
      const resolvedConnectionId =
        connectionId || selectPrimaryConnection(state)?.connectionId;
  
      if (!resolvedConnectionId) {
        throw new Error("No primary connection available and no connectionId provided");
      }
  
      const taskId = uuidv4();
      dispatch(
        initializeTask({
          taskId,
          service,
          taskName,
          connectionId: resolvedConnectionId,
        })
      );
  
      return dispatch(submitTask({ taskId })).unwrap();
    }
  );