// dialogs/SelectDialog.tsx
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SelectOption {
    label: string;
    value: string;
}

interface SelectDialogProps {
    open: boolean;
    title: string;
    message?: string;
    options: SelectOption[];
    onSelect: (value: string) => void;
    onClose: () => void;
}

export function SelectDialog({
    open,
    title,
    message,
    options,
    onSelect,
    onClose
}: SelectDialogProps) {
    const [value, setValue] = useState<string>('');

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {message && <DialogDescription>{message}</DialogDescription>}
                </DialogHeader>
                <div className="py-4">
                    <Select value={value} onValueChange={setValue}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={() => { onSelect(value); onClose(); }}
                        disabled={!value}
                    >
                        Select
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
