'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCcw, ArrowRightLeft, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { aiModelService } from '../service';
import type { AiModelRow, ModelUsageResult } from '../types';

interface ModelUsageAuditProps {
    model: AiModelRow;
    allModels: AiModelRow[];
    onReplaceDone: () => void;
}

export default function ModelUsageAudit({ model, allModels, onReplaceDone }: ModelUsageAuditProps) {
    const [usage, setUsage] = useState<ModelUsageResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [replacementId, setReplacementId] = useState('');
    const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
    const [replacing, setReplacing] = useState(false);
    const [replaceError, setReplaceError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await aiModelService.fetchUsage(model.id);
            setUsage(result);
        } catch (err) {
            console.error('Failed to fetch usage', err);
        } finally {
            setLoading(false);
        }
    }, [model.id]);

    useEffect(() => {
        load();
    }, [load]);

    const totalUsage = (usage?.prompts.length ?? 0) + (usage?.promptBuiltins.length ?? 0);

    const handleReplace = async () => {
        if (!replacementId) return;
        setReplacing(true);
        setReplaceError(null);
        try {
            await Promise.all([
                aiModelService.replaceModelInPrompts(model.id, replacementId),
                aiModelService.replaceModelInBuiltins(model.id, replacementId),
            ]);
            setReplaceDialogOpen(false);
            await load();
            onReplaceDone();
        } catch (err) {
            setReplaceError(err instanceof Error ? err.message : 'Replace failed');
        } finally {
            setReplacing(false);
        }
    };

    const replacementOptions = allModels.filter((m) => m.id !== model.id && !m.is_deprecated);

    const selectedReplacement = allModels.find((m) => m.id === replacementId);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Usage Audit</span>
                    {!loading && (
                        <Badge
                            variant="outline"
                            className={
                                totalUsage > 0
                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                    : 'text-muted-foreground'
                            }
                        >
                            {totalUsage} reference{totalUsage !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {totalUsage > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setReplaceDialogOpen(true)}
                        >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Replace Model
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={load}
                        disabled={loading}
                    >
                        <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        Loading usage data...
                    </div>
                </div>
            ) : !usage ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Failed to load usage data
                </div>
            ) : (
                <div className="flex-1 overflow-auto p-3 space-y-4">
                    {model.is_deprecated && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <strong>Deprecated model</strong> — this model is marked as deprecated but still has{' '}
                                {totalUsage} active reference{totalUsage !== 1 ? 's' : ''}.
                                Use "Replace Model" to migrate to an active model.
                            </div>
                        </div>
                    )}

                    <UsageSection
                        title="Prompts"
                        items={usage.prompts}
                        emptyMessage="No prompts reference this model directly."
                        linkBase="/ai/prompts/edit"
                    />

                    <UsageSection
                        title="Prompt Builtins"
                        items={usage.promptBuiltins}
                        emptyMessage="No prompt builtins reference this model."
                    />
                </div>
            )}

            <AlertDialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Replace Model References</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    Replace all {totalUsage} reference{totalUsage !== 1 ? 's' : ''} to{' '}
                                    <strong>{model.common_name || model.name}</strong> with:
                                </p>
                                <Select value={replacementId} onValueChange={setReplacementId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select replacement model..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {replacementOptions.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.common_name || m.name}
                                                {m.is_primary && (
                                                    <span className="ml-1 text-xs text-green-600">(primary)</span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {replaceError && (
                                    <p className="text-destructive text-sm">{replaceError}</p>
                                )}
                                {selectedReplacement && (
                                    <p className="text-xs text-muted-foreground">
                                        This will update {usage?.prompts.length ?? 0} prompt(s) and{' '}
                                        {usage?.promptBuiltins.length ?? 0} prompt builtin(s).
                                        This action cannot be undone.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReplace}
                            disabled={!replacementId || replacing}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {replacing ? 'Replacing...' : 'Replace All References'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function UsageSection({
    title,
    items,
    emptyMessage,
    linkBase,
}: {
    title: string;
    items: { id: string; name: string }[];
    emptyMessage: string;
    linkBase?: string;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">{title}</span>
                <Badge variant="outline" className="text-xs">
                    {items.length}
                </Badge>
            </div>
            {items.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-1">{emptyMessage}</p>
            ) : (
                <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Name</th>
                                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-28">ID</th>
                                {linkBase && (
                                    <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-12" />
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr
                                    key={item.id}
                                    className={`group ${i % 2 === 1 ? 'bg-muted/20' : ''} ${linkBase ? 'hover:bg-muted/40' : ''}`}
                                >
                                    <td className="px-3 py-1.5 font-medium">
                                        {linkBase ? (
                                            <Link
                                                href={`${linkBase}/${item.id}`}
                                                className="hover:text-primary hover:underline transition-colors"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {item.name}
                                            </Link>
                                        ) : (
                                            item.name
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-muted-foreground">
                                        <span title={item.id}>{item.id.slice(0, 8)}…</span>
                                    </td>
                                    {linkBase && (
                                        <td className="px-3 py-1.5 text-right">
                                            <Link
                                                href={`${linkBase}/${item.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                                                title={`Open in editor`}
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
