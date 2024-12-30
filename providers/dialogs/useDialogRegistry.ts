// providers\dialogs\useDialogRegistry.ts
'use client';

import React, { useEffect } from 'react';
import { DialogConfig } from './types';
import { useDialog } from './DialogContext';

export const useDialogRegistry = (configs: DialogConfig[]) => {
    const { registerDialog, unregisterDialog } = useDialog();
    
    // Use a ref to store configs to avoid unnecessary re-registrations
    const configsRef = React.useRef(configs);

    // Update ref if configs change
    useEffect(() => {
        configsRef.current = configs;
    }, [configs]);

    // Register/unregister dialogs
    useEffect(() => {
        // Register all dialogs
        configsRef.current.forEach(config => {
            registerDialog(config);
        });

        // Cleanup function to unregister all dialogs
        return () => {
            configsRef.current.forEach(config => {
                unregisterDialog(config.id);
            });
        };
    }, []); // Empty dependency array since we're using ref
};