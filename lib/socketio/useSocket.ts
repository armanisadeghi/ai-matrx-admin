import { SocketContext } from '@/app/samples/socket-test/components/SocketWithAuth';
import { SocketTask } from '@/lib/socketio/types';
import { useContext, useCallback } from 'react';
import { SocketManager } from '@/lib/socketio/SocketManager';


export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketWithAuth provider');
    }

    const {
        socketManager,
        socketStatus,
        isAuthenticated,
        matrixId,
        socketNamespace,
        socketSid,
        socket,
    } = context;

    const startTask = useCallback((eventName: string, data: SocketTask) => {
        socketManager.startTask(eventName, data);
    }, [socketManager]);

    const emitMessage = useCallback((eventName: string, data: any) => {
        socketManager.emitMessage(eventName, data);
    }, [socketManager]);

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
        socket,
        socketSid,
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
