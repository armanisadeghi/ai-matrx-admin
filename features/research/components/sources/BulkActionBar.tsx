'use client';

import { X, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionBarProps {
    selectedCount: number;
    onInclude: () => void;
    onExclude: () => void;
    onMarkStale: () => void;
    onMarkComplete: () => void;
    onClear: () => void;
}

export function BulkActionBar({ selectedCount, onInclude, onExclude, onMarkStale, onMarkComplete, onClear }: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-border bg-card shadow-lg px-4 py-2 mb-safe">
            <span className="text-sm font-medium tabular-nums mr-1">{selectedCount} selected</span>
            <div className="h-4 w-px bg-border" />
            <Button variant="ghost" size="sm" onClick={onInclude} className="gap-1.5 text-xs">
                <Eye className="h-3.5 w-3.5" />
                Include
            </Button>
            <Button variant="ghost" size="sm" onClick={onExclude} className="gap-1.5 text-xs">
                <EyeOff className="h-3.5 w-3.5" />
                Exclude
            </Button>
            <Button variant="ghost" size="sm" onClick={onMarkComplete} className="gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
            </Button>
            <Button variant="ghost" size="sm" onClick={onMarkStale} className="gap-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                Stale
            </Button>
            <Button variant="ghost" size="icon" onClick={onClear} className="h-6 w-6 rounded-full ml-1">
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}
