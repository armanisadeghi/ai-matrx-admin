// dialogs/InputDialog.tsx
'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InputDialogProps {
    open: boolean;
    title: string;
    message?: string;
    label: string;
    placeholder?: string;
    onSubmit: (value: string) => void | Promise<void>;
    onClose: () => void;
}

export function InputDialog({
    open,
    title,
    message,
    label,
    placeholder,
    onSubmit,
    onClose
}: InputDialogProps) {
    const [value, setValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await Promise.resolve(onSubmit(value));
            onClose();
        } catch (error) {
            console.error('Dialog submission failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {message && <DialogDescription>{message}</DialogDescription>}
                </DialogHeader>
                <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">
                        {label}
                    </label>
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        disabled={isSubmitting}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !value.trim()}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}