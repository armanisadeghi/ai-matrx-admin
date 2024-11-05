// lib/hooks/useSocketInitialization.ts

import { useEffect } from 'react';
import { SocketManager } from '@/lib/socket/SocketManager';

export function useSocketInitialization() {
    useEffect(() => {
        const socketManager = SocketManager.getInstance();
        socketManager.connect();

        return () => {
            socketManager.disconnect();
        };
    }, []);
}
