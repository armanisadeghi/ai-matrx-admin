import { FC, ReactNode } from 'react';
import { AlertDialogConfig, DialogComponent, StandardDialogConfig } from './types';
import { DialogTemplate } from './DialogTemplates';

// Now update our create functions to match these types
export const createStandardDialog = (
    config: Omit<StandardDialogConfig, 'type'>
): DialogComponent => {
    return function StandardDialogComponent({ isOpen, onClose }) {
        return (
            <DialogTemplate
                config={{
                    type: 'standard',
                    ...config
                }}
                isOpen={isOpen}
                onOpenChange={(open) => !open && onClose()}
            />
        );
    };
};

export const createAlertDialog = (
    config: Omit<AlertDialogConfig, 'type'>
): DialogComponent => {
    return function AlertDialogComponent({ isOpen, onClose }) {
        return (
            <DialogTemplate
                config={{
                    type: 'alert',
                    ...config
                }}
                isOpen={isOpen}
                onOpenChange={(open) => !open && onClose()}
            />
        );
    };
};
