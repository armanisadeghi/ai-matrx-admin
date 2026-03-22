'use client';

/**
 * VersionPinInfo — Shows pinned version info in prompt app editors.
 *
 * Displays the current pin status and drift warning if behind.
 */

import React from 'react';
import { Pin, AlertTriangle, ArrowUp } from 'lucide-react';

interface VersionPinInfoProps {
    pinnedVersion?: number;
    currentPromptVersion?: number;
    promptName?: string;
    /** Called when user wants to upgrade the pin */
    onUpgradePin?: () => void;
    className?: string;
}

export function VersionPinInfo({
    pinnedVersion,
    currentPromptVersion,
    promptName,
    onUpgradePin,
    className = '',
}: VersionPinInfoProps) {
    if (!pinnedVersion) return null;

    const versionsBehind =
        currentPromptVersion && pinnedVersion < currentPromptVersion
            ? currentPromptVersion - pinnedVersion
            : 0;

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Pin badge */}
            <div className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md">
                <Pin className="w-3 h-3" />
                <span>Pinned to prompt v{pinnedVersion}</span>
                {promptName && (
                    <span className="text-blue-400 dark:text-blue-500">({promptName})</span>
                )}
            </div>

            {/* Drift warning */}
            {versionsBehind > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                        {versionsBehind} {versionsBehind === 1 ? 'version' : 'versions'} behind
                    </span>
                    {onUpgradePin && (
                        <button
                            onClick={onUpgradePin}
                            className="inline-flex items-center gap-0.5 ml-1 font-medium text-amber-700 dark:text-amber-300 hover:underline"
                        >
                            <ArrowUp className="w-3 h-3" />
                            Upgrade
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
