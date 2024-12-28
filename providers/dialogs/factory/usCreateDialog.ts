import { StandardDialogConfig, AlertDialogConfig } from "./types";


export const createStandardDialog = (
    config: Omit<StandardDialogConfig, 'type'>
): StandardDialogConfig => ({
    type: 'standard',
    ...config,
});

export const createAlertDialog = (
    config: Omit<AlertDialogConfig, 'type'>
): AlertDialogConfig => ({
    type: 'alert',
    ...config,
});

