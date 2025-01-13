import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type DialogType = 'delete' | 'unsaved' | 'linkBroker';

interface DialogConfig {
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    destructive?: boolean;
}

const DIALOG_CONFIGS: Record<DialogType, DialogConfig> = {
    delete: {
        title: 'Delete Message',
        description: 'Are you sure you want to delete this message? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        destructive: true,
    },
    unsaved: {
        title: 'Unsaved Changes',
        description: 'You have unsaved changes. Are you sure you want to leave?',
        confirmText: 'Leave',
        cancelText: 'Stay',
        destructive: true,
    },
    linkBroker: {
        title: 'Link Broker',
        description: 'Would you like to link this message to a broker?',
        confirmText: 'Link',
        cancelText: 'Cancel',
        destructive: false,
    },
};

interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    type: DialogType;
    customDescription?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onOpenChange,
    onConfirm,
    type,
    customDescription,
}) => {
    const config = DIALOG_CONFIGS[type];
    
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{config.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {customDescription || config.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{config.cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={config.destructive ? 'bg-destructive hover:bg-destructive/90' : ''}
                    >
                        {config.confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmationDialog;