// dialogs/CustomDialog.tsx
'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";

interface CustomDialogProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function CustomDialog({ open, onClose, children }: CustomDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                {children}
            </DialogContent>
        </Dialog>
    );
}
