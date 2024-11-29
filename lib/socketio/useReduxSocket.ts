// hooks/useReduxSocket.ts

import { SocketTask } from './types';
import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { SocketManager } from './SocketManager';
import { startSocketTask, emitSocketMessage } from '@/redux/features/socket/socketActions';
import { AppDispatch, RootState } from '../redux/store';


export const useReduxSocket = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { status: socketStatus, isAuthenticated, sid } = useSelector((state: RootState) => state.socket);
    const currentUser = useSelector((state: RootState) => state.user.currentUser);
    const { socketNamespace, sessionUrl } = useSelector((state: RootState) => state.config);

    const matrixId = currentUser?.matrixId || '';

    const socketManager = useMemo(() => SocketManager.getInstance(matrixId, sessionUrl, socketNamespace), [matrixId, sessionUrl, socketNamespace]);

    const startTask = useCallback((eventName: string, data: SocketTask) => {
        dispatch(startSocketTask({ eventName, data }));
    }, [dispatch]);

    const emitMessage = useCallback((eventName: string, data: any) => {
        dispatch(emitSocketMessage({ eventName, data }));
    }, [dispatch]);

    const addDirectListener = useCallback((eventName: string, callback: (data: any) => void) => {
        socketManager.addDirectListener(eventName, callback);
    }, [socketManager]);

    const removeDirectListener = useCallback((eventName: string, callback: (data: any) => void) => {
        socketManager.removeDirectListener(eventName, callback);
    }, [socketManager]);

    const isAuthenticatedAndConnected = useCallback(() => {
        return socketManager.isAuthenticatedAndConnected();
    }, [socketManager]);

    const addCatchallListener = useCallback((callback: (eventName: string, ...args: any[]) => void) => {
        socketManager.addCatchallListener(callback);
    }, [socketManager]);

    const removeCatchallListener = useCallback((callback: (eventName: string, ...args: any[]) => void) => {
        socketManager.removeCatchallListener(callback);
    }, [socketManager]);

    const addRawPacketListener = useCallback((callback: (packet: any) => void) => {
        socketManager.addRawPacketListener(callback);
    }, [socketManager]);

    const removeRawPacketListener = useCallback((callback: (packet: any) => void) => {
        socketManager.removeRawPacketListener(callback);
    }, [socketManager]);

    return {
        socketManager,
        socket: socketManager.getSocket(),
        socketSid: sid,
        socketStatus,
        isAuthenticated,
        matrixId,
        socketNamespace,
        startTask,
        emitMessage,
        addDirectListener,
        removeDirectListener,
        isAuthenticatedAndConnected,
        addCatchallListener,
        removeCatchallListener,
        addRawPacketListener,
        removeRawPacketListener,
    };
};
