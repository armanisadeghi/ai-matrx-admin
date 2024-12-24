// dialogs/LoaderDialog.tsx
'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface LoaderDialogProps {
    open: boolean;
    title: string;
    message?: string;
}

export function LoaderDialog({ open, title, message }: LoaderDialogProps) {
    return (
        <Dialog open={open}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {message && <DialogDescription>{message}</DialogDescription>}
                </DialogHeader>
                <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </DialogContent>
        </Dialog>
    );
}
