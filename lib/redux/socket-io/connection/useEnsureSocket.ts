'use client';

// useEnsureSocket — Hook for components that need a socket connection.
// Call ensure() on mount to lazily trigger socket initialization.
// Does nothing if already connected or connecting.

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { requestConnect } from '../slices/socketConnectionsSlice';

export function useEnsureSocket() {
    const dispatch = useAppDispatch();
    const primaryId = useAppSelector((s) => s.socketConnections.primaryConnectionId);
    const status = useAppSelector(
        (s) => s.socketConnections.connections[primaryId]?.connectionStatus ?? 'disconnected'
    );

    const ensure = useCallback(() => {
        if (status === 'disconnected') {
            dispatch(requestConnect());
        }
    }, [status, dispatch]);

    return {
        ensure,
        isConnected: status === 'connected',
        isConnecting: status === 'connecting',
        status,
    };
}
