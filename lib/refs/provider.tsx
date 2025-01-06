// lib/refs/provider.tsx
import React, { useCallback, useRef, useMemo } from 'react';
import { RefContext, RefManagerContext } from './context';
import { RefCollection, RefManagerMethods, RefMethod } from './types';

interface RefProviderProps {
    children: React.ReactNode;
}

export const RefProvider: React.FC<RefProviderProps> = ({ children }) => {
    const refsRef = useRef<RefCollection>({});

    const manager = useMemo<RefManagerMethods>(() => ({
        call: (componentId, methodName, ...args) => {
            return refsRef.current[componentId]?.[methodName]?.(...args);  // Added return
        },

        broadcast: (methodName, ...args) => {
            Object.values(refsRef.current).forEach(ref => {
                ref[methodName]?.(...args);
            });
        },

        hasMethod: (componentId, methodName) => {
            return !!refsRef.current[componentId]?.[methodName];
        },

        register: (componentId, methods) => {
            refsRef.current[componentId] = methods;
        },

        unregister: (componentId) => {
            delete refsRef.current[componentId];
        }
    }), []);

    return (
        <RefManagerContext.Provider value={manager}>
            <RefContext.Provider value={refsRef.current}>
                {children}
            </RefContext.Provider>
        </RefManagerContext.Provider>
    );
};