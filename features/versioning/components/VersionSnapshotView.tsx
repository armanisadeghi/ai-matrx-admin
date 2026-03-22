'use client';

/**
 * VersionSnapshotView — Read-only formatted view of a version snapshot.
 *
 * Renders all fields from a version snapshot in a structured layout,
 * with special handling for JSON objects, arrays, and long text.
 */

import React from 'react';
import type { VersionSnapshot } from '../types';

interface VersionSnapshotViewProps {
    snapshot: VersionSnapshot;
    versionNumber: number;
    className?: string;
}

/**
 * Renders a single field value with appropriate formatting.
 */
function FieldValue({ value }: { value: unknown }) {
    if (value === null || value === undefined) {
        return <span className="text-muted-foreground italic">null</span>;
    }

    if (typeof value === 'boolean') {
        return (
            <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${value ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {String(value)}
            </span>
        );
    }

    if (typeof value === 'number') {
        return <span className="font-mono text-sm">{value}</span>;
    }

    if (typeof value === 'string') {
        // Short strings inline, long strings in a pre block
        if (value.length > 200 || value.includes('\n')) {
            return (
                <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">
                    {value}
                </pre>
            );
        }
        return <span className="text-sm">{value}</span>;
    }

    if (Array.isArray(value) || typeof value === 'object') {
        const formatted = JSON.stringify(value, null, 2);
        return (
            <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">
                {formatted}
            </pre>
        );
    }

    return <span className="text-sm">{String(value)}</span>;
}

/**
 * Fields to hide from the snapshot view (internal/metadata).
 */
const HIDDEN_FIELDS = new Set([
    'id', 'prompt_id', 'builtin_id', 'app_id',
    'user_id', 'created_by_user_id',
    'search_tsv', 'change_note', 'changed_at',
]);

export function VersionSnapshotView({ snapshot, versionNumber, className = '' }: VersionSnapshotViewProps) {
    const entries = Object.entries(snapshot).filter(
        ([key]) => !HIDDEN_FIELDS.has(key)
    );

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center gap-2 pb-2 border-b border-border">
                <h3 className="text-sm font-semibold">Version {versionNumber} Snapshot</h3>
                <span className="text-xs text-muted-foreground">
                    {entries.length} fields
                </span>
            </div>

            <div className="space-y-4">
                {entries.map(([key, value]) => (
                    <div key={key} className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {key.replace(/_/g, ' ')}
                        </label>
                        <FieldValue value={value} />
                    </div>
                ))}
            </div>

            {entries.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                    No data in this snapshot.
                </p>
            )}
        </div>
    );
}
