'use client';

/**
 * DriftWarningBanner — Shows in prompt editors when apps use older versions.
 *
 * Displays: "⚠ 3 apps use older versions of this prompt"
 * Expandable to show which apps are behind and by how many versions.
 */

import React, { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { DriftItem } from '../types';

interface DriftWarningBannerProps {
    /** All drift items (may include apps for other prompts) */
    driftItems: DriftItem[];
    /** Filter to only show drift for this prompt's apps */
    promptName?: string;
    loading?: boolean;
    className?: string;
}

export function DriftWarningBanner({
    driftItems,
    promptName,
    loading,
    className = '',
}: DriftWarningBannerProps) {
    const [expanded, setExpanded] = useState(false);

    // Filter items if a promptName is provided
    const relevantItems = useMemo(() => {
        if (!promptName) return driftItems;
        return driftItems.filter(
            (item) => item.prompt_name === promptName
        );
    }, [driftItems, promptName]);

    if (loading || relevantItems.length === 0) return null;

    const appCount = relevantItems.length;

    return (
        <div className={`rounded-md border border-amber-500/30 bg-amber-500/5 ${className}`}>
            {/* Banner header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-left"
            >
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                        {appCount} {appCount === 1 ? 'app uses' : 'apps use'} older{' '}
                        {appCount === 1 ? 'version' : 'versions'} of this prompt
                    </span>
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-amber-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-amber-500" />
                )}
            </button>

            {/* Expanded list */}
            {expanded && (
                <div className="px-3 pb-2 space-y-1.5 border-t border-amber-500/20 pt-2">
                    {relevantItems.map((item) => (
                        <div
                            key={item.app_id}
                            className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-background/50"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate">{item.app_name}</span>
                                <span className="text-muted-foreground flex-shrink-0">
                                    v{item.pinned_version} → v{item.current_version}
                                </span>
                            </div>
                            <span className="text-amber-600 dark:text-amber-400 font-medium flex-shrink-0 ml-2">
                                {item.versions_behind} behind
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
