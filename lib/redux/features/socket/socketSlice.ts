// import { createSlice, PayloadAction, Action, createSelector } from "@reduxjs/toolkit";
// import { initializeSocket, startSocketTask, emitSocketMessage } from "./socketActions";
// import { RootState } from "@/lib/redux/store";

// export type SocketStatus = "pending" | "running" | "completed" | "failed";
// export type StreamingStatus = "inactive" | "streaming" | "completed" | "failed";

// interface StreamingTask {
//     status: StreamingStatus;
//     startedAt?: number;
//     error?: string;
// }

// interface SocketState {
//     status: SocketStatus;
//     isAuthenticated: boolean;
//     sid: string | null;
//     error: string | null;
//     streamingTasks: Record<string, StreamingTask>;
//     currentServer: string | null;
//     fullUrl: string | null;
//     namespace: string;
//     isSwitchingServer: boolean;
// }

// interface SocketErrorAction extends Action {
//     type: "socket/error";
//     payload: string;
// }

// interface SocketResponseReceivedAction extends Action {
//     type: "SOCKET_RESPONSE_RECEIVED";
//     payload: {
//         sid: string;
//         eventName: string;
//         taskIndex: number;
//         data: any;
//     };
// }

// const initialState: SocketState = {
//     status: "pending",
//     isAuthenticated: false,
//     sid: null,
//     error: null,
//     streamingTasks: {},
//     currentServer: null,
//     fullUrl: null,
//     namespace: "/UserSession",
//     isSwitchingServer: false,
// };

// const socketSlice = createSlice({
//     name: "socket",
//     initialState,
//     reducers: {
//         setSocketStatus: (state, action: PayloadAction<SocketStatus>) => {
//             state.status = action.payload;
//         },
//         setIsAuthenticated: (state, action: PayloadAction<boolean>) => {
//             state.isAuthenticated = action.payload;
//         },
//         setSocketSid: (state, action: PayloadAction<string | null>) => {
//             state.sid = action.payload;
//         },
//         setSocketError: (state, action: PayloadAction<string | null>) => {
//             state.error = action.payload;
//         },
//         startStreamingTask: (state, action: PayloadAction<string>) => {
//             const eventName = action.payload;
//             if (!state.streamingTasks[eventName]) {
//                 state.streamingTasks[eventName] = {
//                     status: "streaming",
//                     startedAt: Date.now(),
//                 };
//             }
//         },
//         endStreamingTask: (state, action: PayloadAction<{ eventName: string; status?: StreamingStatus; error?: string }>) => {
//             const { eventName, status = "completed", error } = action.payload;
//             if (state.streamingTasks[eventName]) {
//                 state.streamingTasks[eventName].status = status;
//                 if (error) state.streamingTasks[eventName].error = error;
//             }
//         },
//         clearStreamingTask: (state, action: PayloadAction<string>) => {
//             delete state.streamingTasks[action.payload];
//         },
//         setCurrentServer: (state, action: PayloadAction<string | null>) => {
//             state.currentServer = action.payload;
//         },
//         setFullUrl: (state, action: PayloadAction<string | null>) => {
//             state.fullUrl = action.payload;
//         },
//         setNamespace: (state, action: PayloadAction<string>) => {
//             state.namespace = action.payload;
//         },
//         setIsSwitchingServer: (state, action: PayloadAction<boolean>) => {
//             state.isSwitchingServer = action.payload;
//         },
//     },
//     extraReducers: (builder) => {
//         builder
//             .addCase("socket/connecting", (state) => {
//                 state.status = "pending";
//                 state.error = null;
//             })
//             .addCase("socket/connected", (state) => {
//                 state.status = "running";
//                 state.isAuthenticated = true;
//             })
//             .addCase("socket/initialized", (state) => {
//                 state.status = "running";
//             })
//             .addCase("socket/disconnected", (state) => {
//                 state.status = "completed";
//                 state.isAuthenticated = false;
//                 state.sid = null;
//                 state.streamingTasks = {};
//                 // Note: currentServer, fullUrl, namespace are preserved unless explicitly cleared
//             })
//             .addCase("socket/error", (state, action: SocketErrorAction) => {
//                 state.status = "failed";
//                 state.error = action.payload;
//                 state.isAuthenticated = false;
//             })
//             .addCase(initializeSocket.pending, (state) => {
//                 state.status = "pending";
//                 state.error = null;
//             })
//             .addCase(initializeSocket.fulfilled, (state) => {
//                 state.status = "running";
//                 state.isAuthenticated = true;
//             })
//             .addCase(initializeSocket.rejected, (state, action) => {
//                 state.status = "failed";
//                 state.error = action.error.message || "Initialization failed";
//                 state.isAuthenticated = false;
//             })
//             .addCase(startSocketTask.fulfilled, (state, action) => {
//                 const { eventName, isStreaming } = action.payload;
//                 if (isStreaming) {
//                     (state.streamingTasks as Record<string, StreamingTask>)[String(eventName)] = {
//                         status: "streaming",
//                         startedAt: Date.now(),
//                     };
//                 }
//             })
//             .addCase(startSocketTask.rejected, (state, action) => {
//                 state.error = action.error.message || "Task failed";
//             })
//             .addCase(emitSocketMessage.rejected, (state, action) => {
//                 state.error = action.error.message || "Message emission failed";
//             })
//             .addCase("SOCKET_RESPONSE_RECEIVED", (state, action: SocketResponseReceivedAction) => {
//                 const { eventName, taskIndex, data } = action.payload;
//                 const fullEventName = `${state.sid}_${eventName}_${taskIndex}`;
//                 if (state.streamingTasks[fullEventName]) {
//                     if (data.completed || data.error) {
//                         state.streamingTasks[fullEventName].status = data.error ? "failed" : "completed";
//                         if (data.error) state.streamingTasks[fullEventName].error = data.error;
//                     }
//                 }
//             });
//     },
// });

// export const {
//     setSocketStatus,
//     setIsAuthenticated,
//     setSocketSid,
//     setSocketError,
//     startStreamingTask,
//     endStreamingTask,
//     clearStreamingTask,
//     setCurrentServer,
//     setFullUrl,
//     setNamespace,
//     setIsSwitchingServer,
// } = socketSlice.actions;

// // Selectors
// const selectSocketState = (state: RootState) => state.socket;

// export const selectSocketStatus = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.status
// );

// export const selectIsAuthenticated = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.isAuthenticated
// );

// export const selectSocketSid = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.sid
// );

// export const selectSocketError = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.error
// );

// export const selectStreamingTasks = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.streamingTasks
// );

// export const selectCurrentServer = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.currentServer
// );

// export const selectFullUrl = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.fullUrl
// );

// export const selectNamespace = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.namespace
// );

// export const selectIsSwitchingServer = createSelector(
//     [selectSocketState],
//     (socketState) => socketState.isSwitchingServer
// );

// export default socketSlice.reducer;