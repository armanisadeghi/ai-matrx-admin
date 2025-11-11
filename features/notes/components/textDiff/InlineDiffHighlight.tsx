// features/notes/components/textDiff/InlineDiffHighlight.tsx

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InlineDiffHighlightProps {
    oldText: string;
    newText: string;
    className?: string;
}

export function InlineDiffHighlight({
    oldText,
    newText,
    className,
}: InlineDiffHighlightProps) {
    return (
        <div className={cn('space-y-2', className)}>
            {oldText && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                    <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs font-semibold text-red-600 shrink-0">
                            − Remove
                        </span>
                    </div>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-red-700 line-through decoration-red-500">
                        {oldText}
                    </pre>
                </div>
            )}

            {newText && (
                <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                    <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs font-semibold text-green-600 shrink-0">
                            + Add
                        </span>
                    </div>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-green-700">
                        {newText}
                    </pre>
                </div>
            )}
        </div>
    );
}

interface SideBySideDiffProps {
    oldText: string;
    newText: string;
    className?: string;
}

export function SideBySideDiff({
    oldText,
    newText,
    className,
}: SideBySideDiffProps) {
    return (
        <div className={cn('grid grid-cols-2 gap-2', className)}>
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                <div className="flex items-start gap-2 mb-1">
                    <span className="text-xs font-semibold text-red-600 shrink-0">
                        − Original
                    </span>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-red-700">
                    {oldText}
                </pre>
            </div>

            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-start gap-2 mb-1">
                    <span className="text-xs font-semibold text-green-600 shrink-0">
                        + Modified
                    </span>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-green-700">
                    {newText}
                </pre>
            </div>
        </div>
    );
}

interface UnifiedDiffProps {
    oldText: string;
    newText: string;
    showLineNumbers?: boolean;
    className?: string;
}

export function UnifiedDiff({
    oldText,
    newText,
    showLineNumbers = false,
    className,
}: UnifiedDiffProps) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    // Simple line-by-line diff
    const diff = computeLineDiff(oldLines, newLines);

    return (
        <div
            className={cn(
                'rounded-md border border-border bg-muted/30 p-3 font-mono text-xs',
                className
            )}
        >
            <div className="space-y-0.5">
                {diff.map((line, index) => (
                    <div
                        key={index}
                        className={cn(
                            'flex items-start gap-2',
                            line.type === 'removed' && 'bg-red-500/10 text-red-700',
                            line.type === 'added' && 'bg-green-500/10 text-green-700',
                            line.type === 'unchanged' && 'text-muted-foreground'
                        )}
                    >
                        {showLineNumbers && (
                            <span className="text-muted-foreground/50 w-8 text-right shrink-0">
                                {line.lineNumber}
                            </span>
                        )}
                        <span className="shrink-0 w-4">
                            {line.type === 'removed' && '−'}
                            {line.type === 'added' && '+'}
                            {line.type === 'unchanged' && ' '}
                        </span>
                        <span
                            className={cn(
                                'whitespace-pre-wrap flex-1',
                                line.type === 'removed' && 'line-through'
                            )}
                        >
                            {line.content}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

type DiffLine =
    | { type: 'added'; content: string; lineNumber: number }
    | { type: 'removed'; content: string; lineNumber: number }
    | { type: 'unchanged'; content: string; lineNumber: number };

function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const result: DiffLine[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    // Simple implementation - for production, use a proper diff algorithm like Myers
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
        const oldLine = oldLines[oldIndex];
        const newLine = newLines[newIndex];

        if (oldIndex >= oldLines.length) {
            // Only new lines left
            result.push({
                type: 'added',
                content: newLine,
                lineNumber: newIndex + 1,
            });
            newIndex++;
        } else if (newIndex >= newLines.length) {
            // Only old lines left
            result.push({
                type: 'removed',
                content: oldLine,
                lineNumber: oldIndex + 1,
            });
            oldIndex++;
        } else if (oldLine === newLine) {
            // Lines match
            result.push({
                type: 'unchanged',
                content: oldLine,
                lineNumber: oldIndex + 1,
            });
            oldIndex++;
            newIndex++;
        } else {
            // Lines differ - check if next old line matches current new line
            if (oldLines[oldIndex + 1] === newLine) {
                // Old line was removed
                result.push({
                    type: 'removed',
                    content: oldLine,
                    lineNumber: oldIndex + 1,
                });
                oldIndex++;
            } else if (newLines[newIndex + 1] === oldLine) {
                // New line was added
                result.push({
                    type: 'added',
                    content: newLine,
                    lineNumber: newIndex + 1,
                });
                newIndex++;
            } else {
                // Both lines changed
                result.push({
                    type: 'removed',
                    content: oldLine,
                    lineNumber: oldIndex + 1,
                });
                result.push({
                    type: 'added',
                    content: newLine,
                    lineNumber: newIndex + 1,
                });
                oldIndex++;
                newIndex++;
            }
        }
    }

    return result;
}
