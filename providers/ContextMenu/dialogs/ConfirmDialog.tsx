import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message?: string;
    onConfirm: (value: boolean) => void | Promise<void>;
    onClose: () => void;
}

export function ConfirmDialog({
    open,
    title,
    message='Are you sure?',
    onConfirm,
    onClose
}: ConfirmDialogProps) {
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await Promise.resolve(onConfirm(true));
            onClose();
        } catch (error) {
            console.error('Confirmation failed:', error);
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isConfirming}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming ? 'Confirming...' : 'Confirm'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}