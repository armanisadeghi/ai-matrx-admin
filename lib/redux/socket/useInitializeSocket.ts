// lib/redux/socket/useInitializeSocket.ts

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import {socketInitialized} from "@/lib/redux/socket/actions";
import {SocketManager} from "@/lib/redux/socket/manager";

export const useInitializeSocket = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const socketManager = SocketManager.getInstance();
        socketManager.connect().then(() => {
            dispatch(socketInitialized());
        });

        return () => {
            socketManager.disconnect();
        };
    }, [dispatch]);
};
