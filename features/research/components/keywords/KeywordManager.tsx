'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Loader2, Search, RefreshCw, X, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchKeywords } from '../../hooks/useResearchState';
import { useResearchApi } from '../../hooks/useResearchApi';
import { deleteKeyword as deleteKeywordService } from '../../service';
import type { ResearchKeyword } from '../../types';

export default function KeywordManager() {
    const { topicId } = useTopicContext();
    const { data: keywords, isLoading, refresh } = useResearchKeywords(topicId);
    const api = useResearchApi();
    const isMobile = useIsMobile();

    const [newKeyword, setNewKeyword] = useState('');
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [staleFilter, setStaleFilter] = useState<string>('all');
    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [drawerOpen, setDrawerOpen] = useState(false);

    const items = keywords ?? [];

    const providers = useMemo(() =>
        [...new Set(items.map(k => k.search_provider))].sort(),
        [items],
    );

    const filtered = useMemo(() => {
        let list = items;
        if (staleFilter === 'stale') list = list.filter(k => k.is_stale);
        else if (staleFilter === 'fresh') list = list.filter(k => !k.is_stale);
        if (providerFilter !== 'all') list = list.filter(k => k.search_provider === providerFilter);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(k => k.keyword.toLowerCase().includes(q));
        }
        return list;
    }, [items, staleFilter, providerFilter, search]);

    const hasActiveFilters = staleFilter !== 'all' || providerFilter !== 'all';
    const resetFilters = () => { setStaleFilter('all'); setProviderFilter('all'); };

    const handleAdd = async () => {
        const kw = newKeyword.trim();
        if (!kw) return;
        setAdding(true);
        try {
            await api.addKeywords(topicId, { keywords: [kw] });
            setNewKeyword('');
            refresh();
        } catch {
            // silent
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
            // silent
        } finally {
            setDeletingId(null);
        }
    };

    const filterSelects = (
        <>
            <Select value={staleFilter} onValueChange={setStaleFilter}>
                <SelectTrigger className="w-full sm:w-24 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Freshness" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="fresh">Fresh</SelectItem>
                    <SelectItem value="stale">Stale</SelectItem>
                </SelectContent>
            </Select>
            {providers.length > 1 && (
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <SelectTrigger className="w-full sm:w-24 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                        <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {providers.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {hasActiveFilters && (
                <button onClick={resetFilters} className="inline-flex items-center justify-center h-5 w-5 rounded-full glass-subtle text-muted-foreground/60 hover:text-foreground transition-colors shrink-0">
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </>
    );

    return (
        <div className="p-3 sm:p-4 space-y-3">
            {/* Add keyword — glass toolbar (renders instantly) */}
            <div className="flex items-center gap-1.5 p-1 rounded-full glass">
                <div className="flex-1 flex items-center gap-1.5 min-w-0 h-6 px-2 rounded-full glass-subtle">
                    <Search className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    <input
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        placeholder="Add a keyword..."
                        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/40"
                        style={{ fontSize: '16px' }}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        disabled={adding}
                    />
                    {newKeyword && (
                        <button onClick={() => setNewKeyword('')} className="shrink-0 p-0.5 rounded-full hover:bg-muted/50 transition-colors">
                            <X className="h-2.5 w-2.5 text-muted-foreground/60" />
                        </button>
                    )}
                </div>
                <button
                    onClick={handleAdd}
                    disabled={adding || !newKeyword.trim()}
                    className={cn(
                        'inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-medium transition-all shrink-0',
                        'bg-primary text-primary-foreground hover:bg-primary/90',
                        'disabled:opacity-40 disabled:pointer-events-none',
                    )}
                >
                    {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    <span className="hidden sm:inline">Add</span>
                </button>
                <button
                    onClick={refresh}
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full glass-subtle text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                >
                    <RefreshCw className="h-2.5 w-2.5" />
                </button>
            </div>

            {/* Search + filters row */}
            <div className="flex items-center gap-1.5">
                <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Filter keywords..."
                        className="w-full h-6 pl-7 pr-2 text-[11px] rounded-full glass-subtle border-0 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40"
                        style={{ fontSize: '16px' }}
                    />
                </div>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
                    {filtered.length}/{items.length}
                </span>
                {isMobile ? (
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className={cn(
                            'inline-flex items-center justify-center h-6 w-6 rounded-full glass-subtle transition-colors relative shrink-0',
                            hasActiveFilters ? 'text-primary' : 'text-muted-foreground/60',
                        )}
                    >
                        <SlidersHorizontal className="h-3 w-3" />
                        {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                ) : (
                    <>{filterSelects}</>
                )}
            </div>

            {isMobile && (
                <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <DrawerContent className="max-h-[75dvh]">
                        <DrawerTitle className="px-4 pt-3 text-xs font-semibold">Filter Keywords</DrawerTitle>
                        <div className="p-4 space-y-3 pb-safe">
                            <div className="flex flex-col gap-2">{filterSelects}</div>
                        </div>
                    </DrawerContent>
                </Drawer>
            )}

            {/* Keyword list — only this section shows loading */}
            {isLoading ? (
                <div className="space-y-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-xl" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[280px] gap-3 text-center px-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center">
                        <Search className="h-6 w-6 text-primary/40" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-foreground/70">
                            {items.length === 0 ? 'No keywords yet' : 'No matches'}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1 max-w-[240px]">
                            {items.length === 0
                                ? 'Add keywords to define what topics to research. Each keyword drives source discovery.'
                                : 'Try adjusting your search or filters to find what you\'re looking for.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {filtered.map(kw => (
                        <div
                            key={kw.id}
                            className="group flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-2.5 min-h-[44px] transition-all hover:border-primary/25 hover:bg-card/80"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm leading-tight">{kw.keyword}</div>
                                <div className="text-[10px] text-muted-foreground/50 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span>{kw.search_provider}</span>
                                    {kw.result_count !== null && <span>{kw.result_count} results</span>}
                                    {kw.last_searched_at && <span>{new Date(kw.last_searched_at).toLocaleDateString()}</span>}
                                    {kw.is_stale && <span className="text-yellow-600 dark:text-yellow-400 font-medium">Stale</span>}
                                </div>
                            </div>
                            <button
                                className="h-7 w-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all shrink-0"
                                disabled={deletingId === kw.id}
                                onClick={() => handleDelete(kw)}
                            >
                                {deletingId === kw.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                ) : (
                                    <Trash2 className="h-3 w-3 text-destructive/70" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
