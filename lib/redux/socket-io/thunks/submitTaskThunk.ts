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
    
    console.log("=================== submitTask ===================");
    console.log("🔍 [DEBUG] Task ID:", taskId);
    console.log("🔍 [DEBUG] Task found:", !!task);
    
    if (!task) {
      console.error("❌ [ERROR] Task not found for ID:", taskId);
      dispatch(setTaskError({ taskId, error: `Task with ID ${taskId} not found` }));
      return [];
    }

    console.log("🔍 [DEBUG] Task details:", {
      service: task.service,
      taskName: task.taskName,
      connectionId: task.connectionId,
      isValid: task.isValid,
      validationErrors: task.validationErrors
    });

    // Validate the task and update its state
    console.log("🔄 [DEBUG] Validating task...");
    dispatch(validateTask({ taskId }));
    
    const updatedState = getState();
    const validatedTask = updatedState.socketTasks.tasks[taskId];
    
    console.log("🔍 [DEBUG] Task validation result:", {
      isValid: validatedTask.isValid,
      validationErrors: validatedTask.validationErrors
    });
    
    if (!validatedTask.isValid) {
      const errorMessage = validatedTask.validationErrors.join("; ");
      console.error("❌ [ERROR] Task validation failed:", errorMessage);
      dispatch(setTaskError({ taskId, error: errorMessage }));
      return [];
    }

    let connection = state.socketConnections.connections[task.connectionId];
    console.log("🔍 [DEBUG] Initial connection state:", {
      connectionExists: !!connection,
      socketExists: !!connection?.socket,
      connectionStatus: connection?.connectionStatus,
      isAuthenticated: connection?.isAuthenticated
    });

    // Check if we need to reconnect
    if (!connection || !connection.socket || connection.connectionStatus !== "connected") {
      const socketManager = SocketConnectionManager.getInstance();
      console.log("🔄 [DEBUG] Connection not available, attempting to establish connection...");
      
      try {
        console.log("🔄 [DEBUG] Attempting reconnect for connectionId:", task.connectionId);
        const socket = await socketManager.reconnect(task.connectionId);
        
        if (socket) {
          console.log("✅ [DEBUG] Reconnect successful, updating connection state...");
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
          console.log("✅ [DEBUG] Connection updated after reconnect");
        } else {
          console.log("⚠️ [DEBUG] Reconnect failed, initializing new primary connection...");
          const newConnectionId = await socketManager.initializePrimaryConnection();
          console.log("🔍 [DEBUG] New connection ID:", newConnectionId);
          
          const newSocket = await socketManager.getSocket(
            newConnectionId,
            socketManager.getUrl(newConnectionId),
            socketManager.getNamespace(newConnectionId)
          );
          
          if (newSocket) {
            console.log("✅ [DEBUG] New socket created, updating connection and task...");
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
            console.log("✅ [DEBUG] Task connection ID updated to:", newConnectionId);
          } else {
            console.error("❌ [ERROR] Failed to create new socket");
            dispatch(setTaskError({ taskId, error: "Failed to create new socket connection" }));
            return [];
          }
        }
      } catch (error) {
        console.error("❌ [ERROR] Connection establishment failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to establish connection";
        dispatch(setTaskError({ taskId, error: errorMessage }));
        return [];
      }
      
      if (!connection || !connection.socket || connection.connectionStatus !== "connected") {
        console.error("❌ [ERROR] Final connection check failed:", {
          connectionExists: !!connection,
          socketExists: !!connection?.socket,
          connectionStatus: connection?.connectionStatus
        });
        dispatch(setTaskError({ taskId, error: "Unable to establish socket connection" }));
        return [];
      }
    }

    console.log("✅ [DEBUG] Connection established, preparing to emit task...");
    console.log("🔍 [DEBUG] Emit parameters:", {
      service: task.service,
      taskName: task.taskName,
      taskDataKeys: Object.keys(task.taskData || {}),
      socketConnected: connection.socket.connected,
      socketId: connection.socket.id
    });

    // Add timeout for the emit operation
    const EMIT_TIMEOUT = 30000; // 30 seconds
    
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let isResolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      const safeResolve = (value: string[]) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(value);
        }
      };

      const safeReject = (error: any) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(error);
        }
      };

      // Set up timeout
      timeoutId = setTimeout(() => {
        console.error("❌ [ERROR] Task emission timeout after", EMIT_TIMEOUT, "ms");
        const errorUuid = `timeout-error-${Date.now()}`;
        dispatch(addResponse({ listenerId: errorUuid, taskId }));
        dispatch(
          updateErrorResponse({
            listenerId: errorUuid,
            error: {
              message: `Task emission timeout after ${EMIT_TIMEOUT}ms`,
              type: "timeout_error",
              code: "EMIT_TIMEOUT",
              details: { taskId, service: task.service, taskName: task.taskName },
            },
          })
        );
        dispatch(markResponseEnd(errorUuid));
        dispatch(setTaskError({ taskId, error: "Task emission timeout" }));
        safeReject(new Error("Task emission timeout"));
      }, EMIT_TIMEOUT);

      console.log("🚀 [DEBUG] Emitting task to server...");
      
      try {
        connection.socket.emit(
          task.service,
          { taskName: task.taskName, taskData: task.taskData },
          (response: { response_listener_events?: string[] }) => {
            console.log("📨 [DEBUG] Server response received:", response);
            
            if (isResolved) {
              console.log("⚠️ [DEBUG] Response received after timeout/resolution, ignoring");
              return;
            }

            const eventNames = response?.response_listener_events || [];
            console.log("🔍 [DEBUG] Event names from server:", eventNames);
            
            if (!eventNames.length) {
              console.error("❌ [ERROR] No event names received from server");
              const errorUuid = `internal-error-${Date.now()}`;
              dispatch(addResponse({ listenerId: errorUuid, taskId }));
              dispatch(
                updateErrorResponse({
                  listenerId: errorUuid,
                  error: {
                    message: "No event names received from server",
                    type: "internal_error",
                    code: "NO_EVENT_NAMES_RECEIVED",
                    details: { response },
                  },
                })
              );
              dispatch(markResponseEnd(errorUuid));
              dispatch(setTaskError({ taskId, error: "No event names received from server" }));
              safeResolve([]);
              return;
            }

            console.log("✅ [DEBUG] Setting up listeners for events:", eventNames);
            dispatch(setTaskListenerIds({ taskId, listenerIds: eventNames }));

            eventNames.forEach((eventName: string) => {
              console.log("🔧 [DEBUG] Setting up listener for event:", eventName);
              dispatch(addResponse({ listenerId: eventName, taskId }));
              
              let isFirstResponse = true;
              const listener = (response: any) => {
                console.log(`📨 [DEBUG] Event ${eventName} received response:`, {
                  type: typeof response,
                  isString: typeof response === "string",
                  hasData: response?.data !== undefined,
                  hasInfo: response?.info !== undefined,
                  hasError: response?.error !== undefined,
                  hasBroker: response?.broker !== undefined,
                  isEnd: response?.end === true || response?.end === "true" || response?.end === "True",
                  isFirstResponse
                });

                // Set isStreaming to true on the first response of any kind
                if (isFirstResponse) {
                  console.log(`🔄 [DEBUG] Setting streaming state for task ${taskId}`);
                  dispatch(setTaskStreaming({ taskId, isStreaming: true }));
                  isFirstResponse = false;
                }

                // Handle text responses
                if (typeof response === "string") {
                  console.log(`📝 [DEBUG] Appending text chunk for ${eventName}:`, response.substring(0, 100));
                  dispatch(appendTextChunk({ listenerId: eventName, text: response }));
                } else {
                  // Handle object responses
                  if (response?.data !== undefined) {
                    console.log(`📊 [DEBUG] Updating data response for ${eventName}`);
                    dispatch(updateDataResponse({ listenerId: eventName, data: response.data }));
                  }
                  
                  if (response?.info !== undefined) {
                    console.log(`ℹ️ [DEBUG] Updating info response for ${eventName}`);
                    dispatch(updateInfoResponse({ listenerId: eventName, info: response.info }));
                  }
                  
                  if (response?.error !== undefined) {
                    console.log(`❌ [DEBUG] Error response for ${eventName}:`, response.error);
                    dispatch(updateErrorResponse({ listenerId: eventName, error: response.error }));
                  }
                  
                  if (response?.broker !== undefined) {
                    console.log(`🏢 [DEBUG] Broker response for ${eventName}:`, response.broker);
                    const brokerResponse: SocketBrokerObject | SocketBrokerObject[] = response.broker;
                    
                    const brokers = Array.isArray(brokerResponse) ? brokerResponse : [brokerResponse];
                    
                    brokers.forEach((broker: SocketBrokerObject) => {
                      if (broker?.broker_id && broker?.value !== undefined) {
                        const brokerId = broker.broker_id;
                        const value = broker.value;
                        const source = broker.source || "socket-response";
                        const sourceId = broker.source_id || eventName;
                        
                        console.log(`🏢 [DEBUG] Processing broker ${brokerId} with value:`, value);
                        
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
                        console.warn(`⚠️ [DEBUG] Invalid broker response for ${eventName}:`, broker);
                      }
                    });
                  }

                  // Handle end condition
                  const isEnd = response?.end === true || response?.end === "true" || response?.end === "True";
                  if (isEnd) {
                    console.log(`🏁 [DEBUG] End signal received for ${eventName}`);
                    dispatch(setTaskStreaming({ taskId, isStreaming: false }));
                    dispatch(markResponseEnd(eventName));
                    connection.socket.off(eventName, listener);
                    
                    const state = getState();
                    const allResponsesEnded = eventNames.every((listenerId) =>
                      state.socketResponse[listenerId]?.ended
                    );
                    
                    console.log(`🔍 [DEBUG] All responses ended check:`, {
                      eventNames,
                      allEnded: allResponsesEnded,
                      endedStates: eventNames.map(id => ({
                        id,
                        ended: state.socketResponse[id]?.ended
                      }))
                    });
                    
                    if (allResponsesEnded) {
                      console.log(`✅ [DEBUG] All responses completed, marking task as complete`);
                      dispatch(completeTask(taskId));
                    }
                  }
                }
              };

              // Add error handling for the listener
              connection.socket.on(eventName, listener);
              
              // Also listen for connection errors
              connection.socket.on('connect_error', (error: any) => {
                console.error(`❌ [ERROR] Socket connection error during task ${taskId}:`, error);
                dispatch(setTaskError({ taskId, error: `Connection error: ${error.message}` }));
                safeReject(error);
              });

              connection.socket.on('disconnect', (reason: string) => {
                console.error(`❌ [ERROR] Socket disconnected during task ${taskId}:`, reason);
                dispatch(setTaskError({ taskId, error: `Socket disconnected: ${reason}` }));
                safeReject(new Error(`Socket disconnected: ${reason}`));
              });
            });

            console.log(`✅ [DEBUG] All listeners set up, resolving with event names:`, eventNames);
            safeResolve(eventNames);
          }
        );
        
        console.log("🚀 [DEBUG] Task emitted successfully, waiting for response...");
        
      } catch (error) {
        console.error("❌ [ERROR] Error during task emission:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error during task emission";
        dispatch(setTaskError({ taskId, error: errorMessage }));
        safeReject(error);
      }
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

    console.log("=================== createAndSubmitTask ===================")

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

    console.log("=================== submitTaskNew ===================")

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
