'use client';

/**
 * ModelOverrideSelector — Compact model override picker for agent mode.
 *
 * Shows a small dropdown in the header controls that lets users override
 * the default model for an agent. Resets when cleared.
 */

import { useState, useEffect } from 'react';
import { Cpu, X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
    selectAvailableModels,
    selectModelOptions,
    fetchAvailableModels,
} from '@/lib/redux/slices/modelRegistrySlice';

interface ModelOverrideSelectorProps {
    currentOverride: string | null;
    onOverrideChange: (model: string | null) => void;
}

export default function ModelOverrideSelector({ currentOverride, onOverrideChange }: ModelOverrideSelectorProps) {
    const dispatch = useAppDispatch();
    const modelOptions = useAppSelector(selectModelOptions);
    const availableModels = useAppSelector(selectAvailableModels);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (availableModels.length === 0) {
            dispatch(fetchAvailableModels());
        }
    }, [dispatch, availableModels.length]);

    if (currentOverride) {
        const label = modelOptions.find(m => m.value === currentOverride)?.label ?? currentOverride;
        return (
            <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40 truncate max-w-[120px]">
                    {label}
                </span>
                <button
                    onClick={() => onOverrideChange(null)}
                    className="p-0.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                    title="Reset to default model"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors border border-transparent"
                title="Override model"
            >
                <Cpu className="h-3.5 w-3.5" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                        {modelOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    onOverrideChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50 text-foreground truncate transition-colors"
                            >
                                {opt.label}
                            </button>
                        ))}
                        {modelOptions.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">Loading models…</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
