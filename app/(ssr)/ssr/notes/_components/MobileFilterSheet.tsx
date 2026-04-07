'use client';

import React, { useCallback } from 'react';
import {
    Clock,
    CalendarClock,
    ArrowUpAZ,
    ArrowDownAZ,
    Layers,
    FolderOpen,
    Tag,
    Check,
    X,
    RotateCcw,
} from 'lucide-react';

interface MobileFilterSheetProps {
    open: boolean;
    onClose: () => void;
    // Sort
    sortField: string;
    sortOrder: 'asc' | 'desc';
    onSortChange: (field: string, order: 'asc' | 'desc') => void;
    // Folder filter
    folders: string[];
    activeFolder: string | null;
    onFolderChange: (folder: string | null) => void;
    // Tag filter
    allTags: string[];
    activeTags: string[];
    onTagsChange: (tags: string[]) => void;
    // Results count
    resultCount: number;
}

const SORT_OPTIONS: {
    field: string;
    order: 'asc' | 'desc';
    label: string;
    icon: React.ReactNode;
}[] = [
    { field: 'updated_at', order: 'desc', label: 'Recently Edited', icon: <Clock size={14} /> },
    { field: 'created_at', order: 'desc', label: 'Newest First', icon: <CalendarClock size={14} /> },
    { field: 'created_at', order: 'asc', label: 'Oldest First', icon: <CalendarClock size={14} /> },
    { field: 'label', order: 'asc', label: 'Title A-Z', icon: <ArrowUpAZ size={14} /> },
    { field: 'label', order: 'desc', label: 'Title Z-A', icon: <ArrowDownAZ size={14} /> },
];

const DEFAULT_SORT_FIELD = 'updated_at';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

export default function MobileFilterSheet({
    open,
    onClose,
    sortField,
    sortOrder,
    onSortChange,
    folders,
    activeFolder,
    onFolderChange,
    allTags,
    activeTags,
    onTagsChange,
    resultCount,
}: MobileFilterSheetProps) {
    const isDefault =
        sortField === DEFAULT_SORT_FIELD &&
        sortOrder === DEFAULT_SORT_ORDER &&
        activeFolder === null &&
        activeTags.length === 0;

    const toggleTag = useCallback(
        (tag: string) => {
            if (activeTags.includes(tag)) {
                onTagsChange(activeTags.filter(t => t !== tag));
            } else {
                onTagsChange([...activeTags, tag]);
            }
        },
        [activeTags, onTagsChange],
    );

    const handleReset = useCallback(() => {
        onSortChange(DEFAULT_SORT_FIELD, DEFAULT_SORT_ORDER);
        onFolderChange(null);
        onTagsChange([]);
    }, [onSortChange, onFolderChange, onTagsChange]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Bottom sheet */}
            <div
                role="dialog"
                aria-label="Filter and sort notes"
                className="fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[85dvh] rounded-t-2xl bg-card/95 backdrop-blur-2xl border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-200"
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-border/60" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 pt-1 shrink-0">
                    <span className="text-base font-semibold text-foreground">
                        Filter &amp; Sort
                    </span>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close filter sheet"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 pb-2">
                    {/* Sort */}
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                        Sort
                    </p>
                    <div className="flex flex-wrap gap-2 mb-5">
                        {SORT_OPTIONS.map(opt => {
                            const active = sortField === opt.field && sortOrder === opt.order;
                            return (
                                <button
                                    key={`${opt.field}-${opt.order}`}
                                    onClick={() => onSortChange(opt.field, opt.order)}
                                    className={`flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                                        active
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {opt.icon}
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Folders */}
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                        Folder
                    </p>
                    <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none -mx-5 px-5">
                        <button
                            onClick={() => onFolderChange(null)}
                            className={`flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                                activeFolder === null
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <Layers size={13} />
                            All Notes
                        </button>
                        {folders.map(folder => {
                            const active = activeFolder === folder;
                            return (
                                <button
                                    key={folder}
                                    onClick={() => onFolderChange(folder)}
                                    className={`flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                                        active
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    <FolderOpen size={13} />
                                    {folder}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tags */}
                    {allTags.length > 0 && (
                        <>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                                Tags
                            </p>
                            <div className="flex flex-wrap gap-2 mb-5">
                                {allTags.map(tag => {
                                    const active = activeTags.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                                                active
                                                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            <Tag size={12} />
                                            {tag}
                                            {active && <Check size={11} className="ml-0.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 px-5 pt-3 pb-safe border-t border-border/30 flex items-center gap-3">
                    <div className="flex-1 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{resultCount}</span>{' '}
                        note{resultCount !== 1 ? 's' : ''}
                    </div>

                    {!isDefault && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-muted/60 hover:bg-muted transition-colors"
                        >
                            <RotateCcw size={13} />
                            Reset
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </>
    );
}
