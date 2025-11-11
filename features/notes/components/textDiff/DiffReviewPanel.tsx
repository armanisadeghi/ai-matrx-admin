// features/notes/components/textDiff/DiffReviewPanel.tsx

'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
    selectPendingDiffs,
    acceptDiff,
    rejectDiff,
    acceptAllDiffs,
    rejectAllDiffs,
    selectHasPendingDiffs,
} from '@/lib/redux/features/textDiff';
import type { ParsedDiff } from '@/lib/redux/features/textDiff';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Check,
    X,
    CheckCheck,
    XCircle,
    FileText,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InlineDiffHighlight } from './InlineDiffHighlight';

interface DiffReviewPanelProps {
    noteId: string;
    onSaveAll?: () => void;
    className?: string;
}

export function DiffReviewPanel({
    noteId,
    onSaveAll,
    className,
}: DiffReviewPanelProps) {
    const dispatch = useAppDispatch();
    const diffs = useAppSelector((state) => selectPendingDiffs(state, noteId));
    const hasPending = useAppSelector((state) =>
        selectHasPendingDiffs(state, noteId)
    );

    const pendingCount = diffs.filter((d) => d.status === 'pending').length;
    const acceptedCount = diffs.filter((d) => d.status === 'accepted').length;
    const rejectedCount = diffs.filter((d) => d.status === 'rejected').length;

    const handleAccept = (diffId: string) => {
        dispatch(acceptDiff({ noteId, diffId }));
    };

    const handleReject = (diffId: string) => {
        dispatch(rejectDiff({ noteId, diffId }));
    };

    const handleAcceptAll = () => {
        dispatch(acceptAllDiffs({ noteId }));
        if (onSaveAll) {
            // Small delay to allow Redux to update
            setTimeout(onSaveAll, 100);
        }
    };

    const handleRejectAll = () => {
        dispatch(rejectAllDiffs({ noteId }));
    };

    if (diffs.length === 0) {
        return null;
    }

    return (
        <Card className={cn('border-primary/20', className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                            AI Suggested Changes
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                            <span className="text-xs">Pending:</span>
                            <span className="font-bold">{pendingCount}</span>
                        </Badge>
                        {acceptedCount > 0 && (
                            <Badge
                                variant="outline"
                                className="gap-1 border-green-500/30 text-green-600"
                            >
                                <Check className="h-3 w-3" />
                                <span className="font-bold">{acceptedCount}</span>
                            </Badge>
                        )}
                        {rejectedCount > 0 && (
                            <Badge
                                variant="outline"
                                className="gap-1 border-red-500/30 text-red-600"
                            >
                                <X className="h-3 w-3" />
                                <span className="font-bold">{rejectedCount}</span>
                            </Badge>
                        )}
                    </div>
                </div>

                {hasPending && (
                    <div className="flex gap-2 pt-2">
                        <Button
                            size="sm"
                            onClick={handleAcceptAll}
                            className="gap-1"
                            variant="default"
                        >
                            <CheckCheck className="h-4 w-4" />
                            Accept All
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleRejectAll}
                            className="gap-1"
                            variant="outline"
                        >
                            <XCircle className="h-4 w-4" />
                            Reject All
                        </Button>
                    </div>
                )}
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                        {diffs.map((diff, index) => (
                            <DiffItem
                                key={diff.id}
                                diff={diff}
                                index={index + 1}
                                onAccept={() => handleAccept(diff.id)}
                                onReject={() => handleReject(diff.id)}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

interface DiffItemProps {
    diff: ParsedDiff;
    index: number;
    onAccept: () => void;
    onReject: () => void;
}

function DiffItem({ diff, index, onAccept, onReject }: DiffItemProps) {
    const isAccepted = diff.status === 'accepted';
    const isRejected = diff.status === 'rejected';
    const isPending = diff.status === 'pending';
    const hasError = diff.status === 'error';

    return (
        <div
            className={cn(
                'rounded-lg border p-3 transition-colors',
                isAccepted && 'border-green-500/30 bg-green-500/5',
                isRejected && 'border-red-500/30 bg-red-500/5',
                isPending && 'border-border',
                hasError && 'border-orange-500/30 bg-orange-500/5'
            )}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                        #{index}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {diff.type === 'search_replace'
                            ? 'Search & Replace'
                            : 'Line Range'}
                    </Badge>
                    {diff.matchInfo && (
                        <Badge
                            variant={
                                diff.matchInfo.found ? 'default' : 'destructive'
                            }
                            className="text-xs"
                        >
                            {diff.matchInfo.matchType === 'exact' && 'Exact Match'}
                            {diff.matchInfo.matchType === 'fuzzy' && 'Fuzzy Match'}
                            {diff.matchInfo.matchType === 'multiple' &&
                                'Multiple Matches'}
                            {diff.matchInfo.matchType === 'none' && 'No Match'}
                        </Badge>
                    )}
                </div>

                {isPending && (
                    <div className="flex gap-1">
                        <Button
                            size="sm"
                            onClick={onAccept}
                            className="h-7 gap-1"
                            variant="default"
                        >
                            <Check className="h-3 w-3" />
                            Accept
                        </Button>
                        <Button
                            size="sm"
                            onClick={onReject}
                            className="h-7 gap-1"
                            variant="outline"
                        >
                            <X className="h-3 w-3" />
                            Reject
                        </Button>
                    </div>
                )}

                {isAccepted && (
                    <Button
                        size="sm"
                        onClick={onReject}
                        className="h-7 gap-1 bg-green-600 hover:bg-green-700"
                    >
                        <Check className="h-3 w-3" />
                        Accepted
                    </Button>
                )}

                {isRejected && (
                    <Button
                        size="sm"
                        onClick={onAccept}
                        className="h-7 gap-1"
                        variant="outline"
                    >
                        <X className="h-3 w-3" />
                        Rejected
                    </Button>
                )}
            </div>

            {hasError && diff.error && (
                <div className="flex items-start gap-2 mb-2 p-2 bg-orange-500/10 rounded border border-orange-500/20">
                    <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <p className="text-xs text-orange-600">{diff.error}</p>
                </div>
            )}

            {diff.type === 'search_replace' ? (
                <InlineDiffHighlight
                    oldText={diff.searchText}
                    newText={diff.replaceText}
                />
            ) : (
                <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                        Lines {diff.startLine} - {diff.endLine}
                    </div>
                    <div className="rounded bg-muted/30 p-2">
                        <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">
                                Replace with:
                            </Badge>
                            <pre className="text-xs font-mono whitespace-pre-wrap flex-1">
                                {diff.replaceText}
                            </pre>
                        </div>
                    </div>
                    {diff.matchInfo?.actualLines && (
                        <div className="rounded bg-muted/30 p-2">
                            <div className="flex items-start gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">
                                    Current:
                                </Badge>
                                <pre className="text-xs font-mono whitespace-pre-wrap flex-1 line-through text-muted-foreground">
                                    {diff.matchInfo.actualLines.join('\n')}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
