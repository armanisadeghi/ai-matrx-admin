'use client';

/**
 * VersionHistoryPanel — Main version history UI.
 *
 * A slide-over panel showing version timeline, snapshot preview, and diff view.
 * Used across prompt, builtin, and app editors.
 */

import React, { useState, useCallback } from 'react';
import {
    X,
    History,
    Eye,
    GitCompare,
    RotateCcw,
    Loader2,
    AlertTriangle,
    Clock,
    ChevronRight,
} from 'lucide-react';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { VersionSnapshotView } from './VersionSnapshotView';
import { VersionDiffView } from './VersionDiffView';
import type { VersionEntityType, VersionHistoryItem } from '../types';

interface VersionHistoryPanelProps {
    entityType: VersionEntityType;
    entityId: string;
    entityName?: string;
    isOpen: boolean;
    onClose: () => void;
    /** Called after a version is promoted, so the editor can reload */
    onVersionPromoted?: (newVersion: number) => void;
}

type PanelView = 'list' | 'snapshot' | 'diff';

export function VersionHistoryPanel({
    entityType,
    entityId,
    entityName,
    isOpen,
    onClose,
    onVersionPromoted,
}: VersionHistoryPanelProps) {
    const {
        versions,
        loading,
        error,
        refresh,
        snapshot,
        snapshotLoading,
        snapshotVersion,
        loadSnapshot,
        clearSnapshot,
        diff,
        diffLoading,
        loadDiff,
        clearDiff,
        promote,
        promoting,
    } = useVersionHistory({ entityType, entityId, autoFetch: isOpen });

    const [view, setView] = useState<PanelView>('list');
    const [selectedForDiff, setSelectedForDiff] = useState<number[]>([]);
    const [showPromoteConfirm, setShowPromoteConfirm] = useState<number | null>(null);

    // View a snapshot
    const handleViewSnapshot = useCallback(
        async (version: number) => {
            await loadSnapshot(version);
            setView('snapshot');
        },
        [loadSnapshot]
    );

    // Toggle version selection for diff
    const handleToggleDiffSelection = useCallback(
        (version: number) => {
            setSelectedForDiff((prev) => {
                if (prev.includes(version)) {
                    return prev.filter((v) => v !== version);
                }
                if (prev.length >= 2) {
                    // Replace the oldest selection
                    return [prev[1], version];
                }
                return [...prev, version];
            });
        },
        []
    );

    // Run the diff
    const handleRunDiff = useCallback(async () => {
        if (selectedForDiff.length !== 2) return;
        const [a, b] = selectedForDiff.sort((x, y) => x - y);
        await loadDiff(a, b);
        setView('diff');
    }, [selectedForDiff, loadDiff]);

    // Promote a version
    const handlePromote = useCallback(
        async (version: number) => {
            const result = await promote(version);
            setShowPromoteConfirm(null);
            if (result?.success && onVersionPromoted) {
                onVersionPromoted(result.new_version);
            }
        },
        [promote, onVersionPromoted]
    );

    // Back to list
    const handleBackToList = useCallback(() => {
        setView('list');
        clearSnapshot();
        clearDiff();
    }, [clearSnapshot, clearDiff]);

    if (!isOpen) return null;

    const entityLabel =
        entityType === 'prompt' ? 'Prompt' : entityType === 'builtin' ? 'Builtin' : 'App';

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-lg bg-background border-l border-border shadow-xl flex flex-col h-full animate-in slide-in-from-right-full duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold">
                            {entityLabel} Version History
                        </h2>
                        {entityName && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                — {entityName}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Sub-nav for diff/snapshot views */}
                {view !== 'list' && (
                    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/20 flex-shrink-0">
                        <button
                            onClick={handleBackToList}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            ← All Versions
                        </button>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                            {view === 'snapshot' ? `Version ${snapshotVersion}` : 'Diff'}
                        </span>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading versions...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* List View */}
                    {view === 'list' && !loading && (
                        <div className="space-y-4">
                            {/* Diff controls */}
                            {selectedForDiff.length > 0 && (
                                <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-md">
                                    <span className="text-xs text-muted-foreground">
                                        {selectedForDiff.length === 1
                                            ? 'Select 1 more version to compare'
                                            : `Comparing v${selectedForDiff[0]} & v${selectedForDiff[1]}`}
                                    </span>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => setSelectedForDiff([])}
                                            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
                                        >
                                            Clear
                                        </button>
                                        {selectedForDiff.length === 2 && (
                                            <button
                                                onClick={handleRunDiff}
                                                disabled={diffLoading}
                                                className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                                            >
                                                {diffLoading ? 'Loading...' : 'View Diff'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Version timeline */}
                            <div className="space-y-1">
                                {versions.map((v) => (
                                    <VersionListItem
                                        key={v.version_id}
                                        item={v}
                                        isLatest={v === versions[0]}
                                        isSelectedForDiff={selectedForDiff.includes(v.version_number)}
                                        showPromoteConfirm={showPromoteConfirm === v.version_number}
                                        promoting={promoting}
                                        onView={() => handleViewSnapshot(v.version_number)}
                                        onToggleDiff={() => handleToggleDiffSelection(v.version_number)}
                                        onPromote={() => setShowPromoteConfirm(v.version_number)}
                                        onConfirmPromote={() => handlePromote(v.version_number)}
                                        onCancelPromote={() => setShowPromoteConfirm(null)}
                                    />
                                ))}
                            </div>

                            {versions.length === 0 && !loading && (
                                <p className="text-sm text-muted-foreground text-center py-12">
                                    No version history yet.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Snapshot View */}
                    {view === 'snapshot' && (
                        <>
                            {snapshotLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : snapshot ? (
                                <VersionSnapshotView
                                    snapshot={snapshot}
                                    versionNumber={snapshotVersion!}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-12">
                                    Failed to load snapshot.
                                </p>
                            )}
                        </>
                    )}

                    {/* Diff View */}
                    {view === 'diff' && (
                        <>
                            {diffLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : diff ? (
                                <VersionDiffView
                                    diff={diff}
                                    versionA={selectedForDiff[0]}
                                    versionB={selectedForDiff[1]}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-12">
                                    Failed to load diff.
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border flex-shrink-0 bg-muted/20">
                    <span className="text-xs text-muted-foreground">
                        {versions.length} {versions.length === 1 ? 'version' : 'versions'}
                    </span>
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
                    >
                        <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Sub-component: Version List Item
// ============================================================================

interface VersionListItemProps {
    item: VersionHistoryItem;
    isLatest: boolean;
    isSelectedForDiff: boolean;
    showPromoteConfirm: boolean;
    promoting: boolean;
    onView: () => void;
    onToggleDiff: () => void;
    onPromote: () => void;
    onConfirmPromote: () => void;
    onCancelPromote: () => void;
}

function VersionListItem({
    item,
    isLatest,
    isSelectedForDiff,
    showPromoteConfirm,
    promoting,
    onView,
    onToggleDiff,
    onPromote,
    onConfirmPromote,
    onCancelPromote,
}: VersionListItemProps) {
    const timestamp = new Date(item.changed_at);
    const timeStr = timestamp.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            className={`group rounded-md border transition-colors ${
                isSelectedForDiff
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-border/80 hover:bg-muted/30'
            }`}
        >
            <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Diff checkbox */}
                <button
                    onClick={onToggleDiff}
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelectedForDiff
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30 hover:border-primary/50'
                    }`}
                    title="Select for comparison"
                >
                    {isSelectedForDiff && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M8.5 2.5L4 7L1.5 4.5" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                    )}
                </button>

                {/* Version info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">v{item.version_number}</span>
                        {isLatest && (
                            <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                CURRENT
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{timeStr}</span>
                        {item.name && (
                            <span className="text-xs text-muted-foreground truncate">
                                · {item.name}
                            </span>
                        )}
                    </div>
                    {item.change_note && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            {item.change_note}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                        onClick={onView}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="View snapshot"
                    >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    {!isLatest && (
                        <button
                            onClick={onPromote}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                            title="Restore this version"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {/* Promote confirmation */}
            {showPromoteConfirm && (
                <div className="px-3 py-2 border-t border-border bg-amber-500/5">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                            <p className="text-xs text-foreground">
                                Restore v{item.version_number}? The current state will be snapshotted first, then overwritten with this version&apos;s data.
                            </p>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={onConfirmPromote}
                                    disabled={promoting}
                                    className="text-xs bg-amber-500 text-white px-2.5 py-1 rounded hover:bg-amber-600 disabled:opacity-50"
                                >
                                    {promoting ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        'Confirm Restore'
                                    )}
                                </button>
                                <button
                                    onClick={onCancelPromote}
                                    className="text-xs text-muted-foreground px-2.5 py-1 rounded hover:bg-muted"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
