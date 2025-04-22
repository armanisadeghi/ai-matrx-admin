import { createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "../../store";
import { SocketManager } from "@/lib/redux/socket/SocketManager";
import {
    setSocketStatus,
    setIsAuthenticated,
    setSocketSid,
    setSocketError,
    endStreamingTask,
    setCurrentServer,
    setFullUrl,
    setNamespace,
} from "./socketSlice";

export const socketConnecting = () => ({ type: "socket/connecting" });
export const socketConnected = () => ({ type: "socket/connected" });
export const socketInitialized = () => ({ type: "socket/initialized" });
export const socketDisconnected = () => ({ type: "socket/disconnected" });
export const socketError = (error: string) => ({ type: "socket/error", payload: error });

export const initializeSocket = createAsyncThunk(
    "socket/initialize",
    async (_, { dispatch }) => {
        const socketManager = SocketManager.getInstance();

        dispatch(socketConnecting());
        try {
            await socketManager.connect();
            const socket = await socketManager.getSocket();
            if (!socket) {
                throw new Error("Socket not available after connect");
            }
            const serverUrl = socket.io.uri && socket.nsp ? socket.io.uri.replace(socket.nsp, "") : "unknown";
            const fullUrl = socket.io.uri || "unknown";
            const namespace = socket.nsp || "/UserSession";
            dispatch(setSocketSid(socket.id || null));
            dispatch(setSocketStatus("running"));
            dispatch(setIsAuthenticated(true));
            dispatch(setCurrentServer(serverUrl));
            dispatch(setFullUrl(fullUrl));
            dispatch(setNamespace(namespace));
            dispatch(socketConnected());
            dispatch(socketInitialized());
        } catch (error) {
            const errorMessage = (error as Error).message || "Unknown socket initialization error";
            dispatch(setSocketError(errorMessage));
            dispatch(socketError(errorMessage));
            throw error;
        }
    }
);


export const startSocketTask = createAsyncThunk(
    'socket/startTask',
    async ({ eventName, data, isStreaming = false }: { eventName: string; data: any; isStreaming?: boolean }, { dispatch }) => {
        const socketManager = SocketManager.getInstance();

        try {
            const socket = await socketManager.getSocket();
            if (!socket) {
                throw new Error('Socket not connected');
            }
            const taskEventName = await socketManager.startTask(eventName, data, (response) => {
                const isEnd = response?.end === true || response?.end === "true" || response?.end === "True";
                if (isEnd && isStreaming) {
                    dispatch(endStreamingTask({ eventName: taskEventName, status: 'completed' }));
                }
                // For one-and-done, end is handled immediately; no further action needed
            });
            return { eventName: taskEventName, isStreaming }; // Pass isStreaming to extraReducers
        } catch (error) {
            const errorMessage = (error as Error).message || 'Failed to start socket task';
            dispatch(setSocketError(errorMessage));
            throw error;
        }
    }
);

export const emitSocketMessage = createAsyncThunk(
    'socket/emitMessage',
    async ({ eventName, data }: { eventName: string; data: any }, { dispatch }) => {
        const socketManager = SocketManager.getInstance();

        try {
            const socket = await socketManager.getSocket();
            if (!socket) {
                throw new Error('Socket not connected');
            }
            socket.emit(eventName, data);
        } catch (error) {
            const errorMessage = (error as Error).message || 'Failed to emit socket message';
            dispatch(setSocketError(errorMessage));
            throw error;
        }
    }
);