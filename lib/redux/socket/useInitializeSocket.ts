// lib/redux/socket/useInitializeSocket.ts

import { useEffect } from "react";
import {
    socketConnecting,
    socketConnected,
    socketInitialized,
    socketDisconnected,
    socketError,
} from "@/lib/redux/features/socket/socketActions";
import { SocketManager } from "@/lib/redux/socket/SocketManager";
import { useAppDispatch } from "@/lib/redux";
import { getChatActionsWithThunks } from "../entity/custom-actions/chatActions";

export const useInitializeSocket = () => {
    const dispatch = useAppDispatch();
    const chatActions = getChatActionsWithThunks();

    useEffect(() => {
        const socketManager = SocketManager.getInstance();
        
        socketManager.setDispatch(dispatch);
        socketManager.setChatActions(chatActions);

        
        dispatch(socketConnecting());
        socketManager
            .connect()
            .then(() => {
                dispatch(socketConnected());
                dispatch(socketInitialized());
            })
            .catch((error) => {
                console.error("useInitializeSocket - Socket connection error:", error);
                dispatch(socketError(error.message));
            });

        return () => {
            socketManager.disconnect();
            dispatch(socketDisconnected());
        };
    }, [dispatch]);
};

export type InitializeSocketHook = ReturnType<typeof useInitializeSocket>;