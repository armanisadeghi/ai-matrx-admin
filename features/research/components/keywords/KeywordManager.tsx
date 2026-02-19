'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchKeywords } from '../../hooks/useResearchState';
import { useResearchApi } from '../../hooks/useResearchApi';
import { deleteKeyword as deleteKeywordService } from '../../service';
import type { ResearchKeyword } from '../../types';

export default function KeywordManager() {
    const { topicId } = useTopicContext();
    const { data: keywords, isLoading, refresh } = useResearchKeywords(topicId);
    const api = useResearchApi();

    const [newKeyword, setNewKeyword] = useState('');
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleAdd = async () => {
        const kw = newKeyword.trim();
        if (!kw) return;
        setAdding(true);
        try {
            await api.addKeywords(topicId, { keywords: [kw] });
            setNewKeyword('');
            refresh();
        } catch {
            // error handled silently for now
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (keyword: ResearchKeyword) => {
        setDeletingId(keyword.id);
        try {
            await deleteKeywordService(keyword.id);
            refresh();
        } catch {
            // error handled silently for now
        } finally {
            setDeletingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-3">
                <Skeleton className="h-8 w-48" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
            </div>
        );
    }

    const items = keywords ?? [];

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Keywords</h2>
                    <p className="text-sm text-muted-foreground mt-1">{items.length} keyword{items.length !== 1 ? 's' : ''}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={refresh} className="h-9 w-9">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Add keyword */}
            <div className="flex gap-2">
                <Input
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    placeholder="Add a keyword..."
                    className="text-base flex-1"
                    style={{ fontSize: '16px' }}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    disabled={adding}
                />
                <Button onClick={handleAdd} disabled={adding || !newKeyword.trim()} className="gap-2 min-h-[44px]">
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add
                </Button>
            </div>

            {/* Keyword list */}
            {items.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                    <Search className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No keywords yet. Add keywords to drive your research pipeline.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map(kw => (
                        <div key={kw.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 min-h-[44px]">
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm">{kw.keyword}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                                    <span>Provider: {kw.search_provider}</span>
                                    {kw.result_count !== null && <span>{kw.result_count} results</span>}
                                    {kw.last_searched_at && <span>Last searched {new Date(kw.last_searched_at).toLocaleDateString()}</span>}
                                    {kw.is_stale && <span className="text-yellow-600 dark:text-yellow-400">Stale</span>}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                disabled={deletingId === kw.id}
                                onClick={() => handleDelete(kw)}
                            >
                                {deletingId === kw.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
