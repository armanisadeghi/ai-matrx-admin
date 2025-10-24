// features/notes/components/ShareNoteDialog.tsx
"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Check } from 'lucide-react';
import { generateShareLink } from '../service/notesService';

interface ShareNoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    noteId: string;
    noteLabel: string;
}

export function ShareNoteDialog({
    open,
    onOpenChange,
    noteId,
    noteLabel,
}: ShareNoteDialogProps) {
    const [copied, setCopied] = useState(false);
    const shareLink = generateShareLink(noteId);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Share "{noteLabel}"</DialogTitle>
                    <DialogDescription>
                        Anyone with this link can view and accept this note into their collection.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="share-link">Shareable Link</Label>
                        <div className="flex gap-2">
                            <Input
                                id="share-link"
                                value={shareLink}
                                readOnly
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleCopyLink}
                                className="flex-shrink-0"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        {copied && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                                Link copied to clipboard!
                            </p>
                        )}
                    </div>
                </div>
                
                <DialogFooter>
                    <Button
                        type="button"
                        onClick={() => onOpenChange(false)}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

