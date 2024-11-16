// lib/refs/hooks.ts
import {useContext, useEffect, useMemo, useRef} from 'react';
import { RefManagerContext, RefContext } from './context';
import { RefMethod } from './types';

export const useRefManager = () => {
    const manager = useContext(RefManagerContext);
    if (!manager) {
        throw new Error('useRefManager must be used within RefProvider');
    }
    return manager;
};

export const useComponentRef = (
    componentId: string,
    methods: { [key: string]: RefMethod }
) => {
    const manager = useRefManager();
    const methodsRef = useRef(methods);

    useEffect(() => {
        methodsRef.current = methods;
    }, [methods]);

    useEffect(() => {
        console.log(`Registering methods for ${componentId}:`, Object.keys(methods));
        manager.register(componentId, {
            ...methods,
            // Wrap methods to always use latest version
            ...Object.keys(methods).reduce((acc, key) => ({
                ...acc,
                [key]: (...args: any[]) => methodsRef.current[key](...args)
            }), {})
        });

        return () => {
            console.log(`Unregistering methods for ${componentId}`);
            manager.unregister(componentId);
        };
    }, [componentId, manager]); // Remove methods dependency
};
