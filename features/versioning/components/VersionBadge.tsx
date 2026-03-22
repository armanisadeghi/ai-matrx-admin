'use client';

/**
 * VersionBadge — Displays the current version number with relative time.
 *
 * Renders: "Version 7 · 2h ago"
 * Clickable — calls `onOpenHistory` to open the version history panel.
 */

import React from 'react';
import { History } from 'lucide-react';

interface VersionBadgeProps {
    version: number;
    updatedAt?: string | null;
    /** Called when the badge is clicked to open version history */
    onOpenHistory?: () => void;
    /** Compact mode — just the version number, no timestamp */
    compact?: boolean;
    className?: string;
}

/**
 * Formats a timestamp into a human-readable relative time string.
 */
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export function VersionBadge({
    version,
    updatedAt,
    onOpenHistory,
    compact = false,
    className = '',
}: VersionBadgeProps) {
    const content = (
        <>
            <History className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium">v{version}</span>
            {!compact && updatedAt && (
                <>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="text-muted-foreground">{formatRelativeTime(updatedAt)}</span>
                </>
            )}
        </>
    );

    const baseStyles =
        'inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 transition-colors';

    if (onOpenHistory) {
        return (
            <button
                onClick={onOpenHistory}
                className={`${baseStyles} bg-muted/50 hover:bg-muted text-foreground cursor-pointer ${className}`}
                title="View version history"
            >
                {content}
            </button>
        );
    }

    return (
        <span className={`${baseStyles} bg-muted/50 text-muted-foreground ${className}`}>
            {content}
        </span>
    );
}
