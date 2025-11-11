// features/notes/components/textDiff/SaveIndicator.tsx

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveIndicatorProps {
    isDirty: boolean;
    isSaving?: boolean;
    lastSaved?: Date | string | null;
    onSave: () => void;
    className?: string;
}

export function SaveIndicator({
    isDirty,
    isSaving = false,
    lastSaved,
    onSave,
    className,
}: SaveIndicatorProps) {
    const formatLastSaved = (date: Date | string | null | undefined) => {
        if (!date) return null;

        const lastSavedDate = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diff = now.getTime() - lastSavedDate.getTime();

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (seconds < 10) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;

        return lastSavedDate.toLocaleDateString();
    };

    if (!isDirty && !isSaving && lastSaved) {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30">
                    <Check className="h-3 w-3" />
                    Saved {formatLastSaved(lastSaved)}
                </Badge>
            </div>
        );
    }

    if (isSaving) {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                </Badge>
            </div>
        );
    }

    if (isDirty) {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <Badge variant="outline" className="gap-1 text-orange-600 border-orange-500/30">
                    <Clock className="h-3 w-3" />
                    Unsaved changes
                </Badge>
                <Button size="sm" onClick={onSave} className="gap-1">
                    <Save className="h-3 w-3" />
                    Save
                </Button>
            </div>
        );
    }

    return null;
}

interface FloatingSaveButtonProps {
    isDirty: boolean;
    isSaving?: boolean;
    onSave: () => void;
    className?: string;
}

export function FloatingSaveButton({
    isDirty,
    isSaving = false,
    onSave,
    className,
}: FloatingSaveButtonProps) {
    if (!isDirty && !isSaving) return null;

    return (
        <div
            className={cn(
                'fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4',
                className
            )}
        >
            <Button
                size="lg"
                onClick={onSave}
                disabled={isSaving}
                className="gap-2 shadow-lg"
            >
                {isSaving ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="h-4 w-4" />
                        Save Changes
                    </>
                )}
            </Button>
        </div>
    );
}
