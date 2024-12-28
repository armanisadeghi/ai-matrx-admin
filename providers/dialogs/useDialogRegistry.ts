'use client';

import { useEffect } from 'react';
import { DialogConfig } from './types';
import { useDialog } from './DialogContext';

export const useDialogRegistry = <T = any>(configs: DialogConfig<T>[]) => {
    const { registerDialog, unregisterDialog } = useDialog();

    useEffect(() => {
        configs.forEach(config => registerDialog(config));
        return () => configs.forEach(config => unregisterDialog(config.id));
    }, [configs, registerDialog, unregisterDialog]);
};
