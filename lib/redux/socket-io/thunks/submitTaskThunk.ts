import { createAsyncThunk } from "@reduxjs/toolkit";
import { addResponse, updateErrorResponse, markResponseEnd, updateTextResponse, appendTextChunk, updateDataResponse, updateInfoResponse } from "../slices/socketResponseSlice";
import { completeTask, setTaskError, setTaskListenerIds, initializeTask, validateTask, setTaskStreaming, setTaskFields } from "../slices/socketTasksSlice";
import { selectPrimaryConnection } from "../selectors";
import { RootState } from "@/lib/redux";
import { v4 as uuidv4 } from "uuid";
import { SocketConnectionManager } from "../connection/socketConnectionManager";
import { setConnection } from "../slices/socketConnectionsSlice";
import { brokerActions } from "@/lib/redux/brokerSlice/slice";
import { SocketBrokerObject } from "../socket.types";

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

    let connection = state.socketConnections.connections[task.connectionId];

    // Check if we need to reconnect
    if (!connection || !connection.socket || connection.connectionStatus !== "connected") {
      // Attempt to reconnect using the SocketConnectionManager
      const socketManager = SocketConnectionManager.getInstance();
      
      try {
        // First try to reconnect with existing connection ID
        const socket = await socketManager.reconnect(task.connectionId);
        
        if (socket) {
          // Update Redux state with the new connection
          dispatch(
            setConnection({
              connectionId: task.connectionId,
              socket,
              url: socketManager.getUrl(task.connectionId),
              namespace: socketManager.getNamespace(task.connectionId),
              connectionStatus: 'connected',
              isAuthenticated: true,
            })
          );
          
          // Re-fetch the connection from state
          const newState = getState();
          connection = newState.socketConnections.connections[task.connectionId];
        } else {
          // If reconnect failed, create a brand new connection
          const newConnectionId = await socketManager.initializePrimaryConnection();
          const newSocket = await socketManager.getSocket(
            newConnectionId,
            socketManager.getUrl(newConnectionId),
            socketManager.getNamespace(newConnectionId)
          );
          
          if (newSocket) {
            dispatch(
              setConnection({
                connectionId: newConnectionId,
                socket: newSocket,
                url: socketManager.getUrl(newConnectionId),
                namespace: socketManager.getNamespace(newConnectionId),
                connectionStatus: 'connected',
                isAuthenticated: true,
              })
            );
            
            // Update the task to use the new connection ID
            dispatch(setTaskFields({ taskId, fields: { connectionId: newConnectionId } }));
            
            // Re-fetch the connection from state
            const newState = getState();
            connection = newState.socketConnections.connections[newConnectionId];
          }
        }
      } catch (error) {
        dispatch(setTaskError({ taskId, error: "Failed to establish connection" }));
        return [];
      }
      
      // Final check after reconnection attempt
      if (!connection || !connection.socket || connection.connectionStatus !== "connected") {
        dispatch(setTaskError({ taskId, error: "Unable to establish socket connection" }));
        return [];
      }
    }

    return new Promise((resolve) => {
      connection.socket.emit(
        task.service,
        { taskName: task.taskName, taskData: task.taskData },
        (response: { response_listener_events?: string[] }) => {
          // ... rest of the implementation remains the same
          const eventNames = response?.response_listener_events || [];

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

            let isFirstResponse = true;

            const listener = (response: any) => {
              // Set isStreaming to true on the first response of any kind
              if (isFirstResponse) {
                dispatch(setTaskStreaming({ taskId, isStreaming: true }));
                isFirstResponse = false;
              }

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
                if (response?.broker !== undefined) {
                  const brokerResponse: SocketBrokerObject | SocketBrokerObject[] = response.broker;
                  
                  const brokers = Array.isArray(brokerResponse) ? brokerResponse : [brokerResponse];
                  
                  brokers.forEach((broker: SocketBrokerObject) => {
                    if (broker?.broker_id && broker?.value !== undefined) {
                      const brokerId = broker.broker_id;
                      const value = broker.value; // Preserve original data type
                      const source = broker.source || "socket-response";
                      const sourceId = broker.source_id || eventName;
                      
                      const mapEntry = {
                        brokerId,
                        mappedItemId: brokerId, // Use brokerId as mappedItemId for socket responses  ======= TEMP SOLUTION =======
                        source,
                        sourceId,
                      };
                      
                      dispatch(brokerActions.addOrUpdateRegisterEntry(mapEntry));
                      
                      const valuePayload = {
                        brokerId,
                        value,
                      };
                      
                      dispatch(brokerActions.setValue(valuePayload));
                    } else {
                      console.warn("[SUBMIT TASK THUNK] Invalid broker response - missing broker_id or value:", broker);
                    }
                  });
                }

                const isEnd = response?.end === true || response?.end === "true" || response?.end === "True";
                if (isEnd) {
                  dispatch(setTaskStreaming({ taskId, isStreaming: false }));
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
  { taskId: string; submitResult: string[] }, // Return taskId and submitTask result
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

    dispatch(setTaskFields({ taskId, fields: taskData }));

    const submitResult = await dispatch(submitTask({ taskId })).unwrap();
    
    return { taskId, submitResult };
  }
);

// =====================================================================
// NEW: PERFORMANCE OPTIMIZED VERSION
// Uses chunk-based text accumulation to eliminate O(n²) string concatenation
// =====================================================================

export const submitTaskNew = createAsyncThunk<string[], { taskId: string }, { state: RootState }>(
  "socketTasks/submitTaskNew",
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

    let connection = state.socketConnections.connections[task.connectionId];

    // Check if we need to reconnect (same logic as original)
    if (!connection || !connection.socket || connection.connectionStatus !== "connected") {
      const socketManager = SocketConnectionManager.getInstance();
      
      try {
        const socket = await socketManager.reconnect(task.connectionId);
        
        if (socket) {
          dispatch(
            setConnection({
              connectionId: task.connectionId,
              socket,
              url: socketManager.getUrl(task.connectionId),
              namespace: socketManager.getNamespace(task.connectionId),
              connectionStatus: 'connected',
              isAuthenticated: true,
            })
          );
          
          const newState = getState();
          connection = newState.socketConnections.connections[task.connectionId];
        } else {
          const newConnectionId = await socketManager.initializePrimaryConnection();
          const newSocket = await socketManager.getSocket(
            newConnectionId,
            socketManager.getUrl(newConnectionId),
            socketManager.getNamespace(newConnectionId)
          );
          
          if (newSocket) {
            dispatch(
              setConnection({
                connectionId: newConnectionId,
                socket: newSocket,
                url: socketManager.getUrl(newConnectionId),
                namespace: socketManager.getNamespace(newConnectionId),
                connectionStatus: 'connected',
                isAuthenticated: true,
              })
            );
            
            dispatch(setTaskFields({ taskId, fields: { connectionId: newConnectionId } }));
            
            const newState = getState();
            connection = newState.socketConnections.connections[newConnectionId];
          }
        }
      } catch (error) {
        dispatch(setTaskError({ taskId, error: "Failed to establish connection" }));
        return [];
      }
      
      if (!connection || !connection.socket || connection.connectionStatus !== "connected") {
        dispatch(setTaskError({ taskId, error: "Unable to establish socket connection" }));
        return [];
      }
    }

    return new Promise((resolve) => {
      connection.socket.emit(
        task.service,
        { taskName: task.taskName, taskData: task.taskData },
        (response: { response_listener_events?: string[] }) => {
          const eventNames = response?.response_listener_events || [];

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

            let isFirstResponse = true;

            const listener = (response: any) => {
              // Set isStreaming to true on the first response of any kind
              if (isFirstResponse) {
                dispatch(setTaskStreaming({ taskId, isStreaming: true }));
                isFirstResponse = false;
              }

              // ===== PERFORMANCE IMPROVEMENT: Use appendTextChunk instead of updateTextResponse =====
              if (typeof response === "string") {
                dispatch(appendTextChunk({ listenerId: eventName, text: response }));
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
                if (response?.broker !== undefined) {
                  const brokerResponse: SocketBrokerObject | SocketBrokerObject[] = response.broker;
                  
                  const brokers = Array.isArray(brokerResponse) ? brokerResponse : [brokerResponse];
                  
                  brokers.forEach((broker: SocketBrokerObject) => {
                    if (broker?.broker_id && broker?.value !== undefined) {
                      const brokerId = broker.broker_id;
                      const value = broker.value;
                      const source = broker.source || "socket-response";
                      const sourceId = broker.source_id || eventName;
                      
                      const mapEntry = {
                        brokerId,
                        mappedItemId: brokerId,
                        source,
                        sourceId,
                      };
                      
                      dispatch(brokerActions.addOrUpdateRegisterEntry(mapEntry));
                      
                      const valuePayload = {
                        brokerId,
                        value,
                      };
                      
                      dispatch(brokerActions.setValue(valuePayload));
                    } else {
                      console.warn("[SUBMIT TASK NEW] Invalid broker response - missing broker_id or value:", broker);
                    }
                  });
                }

                const isEnd = response?.end === true || response?.end === "true" || response?.end === "True";
                if (isEnd) {
                  dispatch(setTaskStreaming({ taskId, isStreaming: false }));
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
