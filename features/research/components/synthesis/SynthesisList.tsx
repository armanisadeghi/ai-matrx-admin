'use client';

import { useState, useMemo } from 'react';
import { Layers, ChevronDown, ChevronUp, RefreshCw, Loader2, AlertCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchSynthesis, useResearchKeywords } from '../../hooks/useResearchState';
import { useResearchApi } from '../../hooks/useResearchApi';
import { useResearchStream } from '../../hooks/useResearchStream';
import type { ResearchSynthesis } from '../../types';

function SynthesisCard({ synthesis, label }: { synthesis: ResearchSynthesis; label: string }) {
    const [expanded, setExpanded] = useState(false);

    const statusColors: Record<string, string> = {
        complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        success:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        error:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        failed:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent/30 transition-colors min-h-[44px]"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold truncate">{label}</span>
                        <Badge variant="secondary" className={cn('text-[10px] font-normal capitalize', statusColors[synthesis.status] ?? '')}>
                            {synthesis.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground/60 capitalize">{synthesis.scope}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {new Date(synthesis.created_at).toLocaleDateString()} · v{synthesis.version}
                        {synthesis.model_id && ` · ${synthesis.model_id}`}
                    </p>
                </div>
                {expanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
            </button>

            {expanded && (
                <div className="border-t border-border/50 px-3 py-3">
                    {synthesis.error ? (
                        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            {synthesis.error}
                        </div>
                    ) : synthesis.result ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-xs prose-headings:text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {synthesis.result}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No result yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SynthesisList() {
    const { topicId } = useTopicContext();
    const api = useResearchApi();
    const isMobile = useIsMobile();
    const stream = useResearchStream(() => {});

    const { data: allSyntheses, isLoading: synthLoading } = useResearchSynthesis(topicId);
    const { data: keywords } = useResearchKeywords(topicId);

    const [search, setSearch] = useState('');
    const [scopeFilter, setScopeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [keywordFilter, setKeywordFilter] = useState<string>('all');
    const [drawerOpen, setDrawerOpen] = useState(false);

    const synthList = allSyntheses ?? [];
    const kwList = keywords ?? [];

    const getKeywordLabel = (kwId: string | null) => {
        if (!kwId) return 'Unknown Keyword';
        const kw = kwList.find(k => k.id === kwId);
        return kw ? kw.keyword : 'Keyword';
    };

    const filtered = useMemo(() => {
        let items = synthList;
        if (scopeFilter !== 'all') items = items.filter(s => s.scope === scopeFilter);
        if (statusFilter !== 'all') items = items.filter(s => s.status === statusFilter);
        if (keywordFilter !== 'all') items = items.filter(s => s.keyword_id === keywordFilter);
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(s =>
                (s.result ?? '').toLowerCase().includes(q) ||
                (s.error ?? '').toLowerCase().includes(q) ||
                getKeywordLabel(s.keyword_id).toLowerCase().includes(q),
            );
        }
        return items;
    }, [synthList, scopeFilter, statusFilter, keywordFilter, search, kwList]);

    const projectSyntheses = filtered.filter(s => s.scope === 'project');
    const keywordSyntheses = filtered.filter(s => s.scope === 'keyword');

    const hasActiveFilters = scopeFilter !== 'all' || statusFilter !== 'all' || keywordFilter !== 'all';
    const resetFilters = () => { setScopeFilter('all'); setStatusFilter('all'); setKeywordFilter('all'); };

    const handleRunProjectSynthesis = async () => {
        const res = await api.synthesize(topicId, { scope: 'project', iteration_mode: 'initial' });
        stream.startStream(res);
    };

    const filterSelects = (
        <>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-full sm:w-24 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Scopes</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="keyword">Keyword</SelectItem>
                </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-24 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
            </Select>
            {kwList.length > 0 && (
                <Select value={keywordFilter} onValueChange={setKeywordFilter}>
                    <SelectTrigger className="w-full sm:w-32 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                        <SelectValue placeholder="Keyword" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Keywords</SelectItem>
                        {kwList.map(kw => (
                            <SelectItem key={kw.id} value={kw.id}>{kw.keyword}</SelectItem>
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
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-3 sm:px-4 pt-3 pb-2 space-y-1.5">
                <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5">
                    <span className="text-xs font-medium text-foreground/80">Synthesis</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{filtered.length}/{synthList.length}</span>
                    <div className="flex-1 relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search content, keywords..."
                            className="w-full h-6 pl-7 pr-2 text-[11px] rounded-full glass-subtle border-0 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
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
                    ) : null}
                    <button
                        onClick={handleRunProjectSynthesis}
                        disabled={stream.isStreaming}
                        className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full glass-subtle text-[11px] font-medium text-primary disabled:opacity-50 transition-colors shrink-0"
                    >
                        {stream.isStreaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        <span className="hidden sm:inline">Run</span>
                    </button>
                </div>
                {!isMobile && (
                    <div className="flex items-center gap-1.5 flex-wrap px-1">
                        {filterSelects}
                    </div>
                )}
            </div>

            {isMobile && (
                <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <DrawerContent className="max-h-[75dvh]">
                        <DrawerTitle className="px-4 pt-3 text-xs font-semibold">Filter Synthesis</DrawerTitle>
                        <div className="p-4 space-y-3 pb-safe">
                            <div className="flex flex-col gap-2">{filterSelects}</div>
                        </div>
                    </DrawerContent>
                </Drawer>
            )}

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                {synthLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 rounded-xl" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3">
                            <Layers className="h-5 w-5 text-primary/60" />
                        </div>
                        <p className="text-xs text-muted-foreground/70 max-w-xs">
                            {synthList.length === 0
                                ? 'No synthesis yet. Run the pipeline or click "Run" above.'
                                : 'No syntheses match your filters.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {projectSyntheses.length > 0 && (
                            <section className="space-y-2">
                                <div className="flex items-center gap-1.5 px-0.5">
                                    <Layers className="h-3 w-3 text-muted-foreground/50" />
                                    <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                                        Project Report
                                    </span>
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{projectSyntheses.length}</Badge>
                                </div>
                                {projectSyntheses.map(s => (
                                    <SynthesisCard key={s.id} synthesis={s} label="Project Report" />
                                ))}
                            </section>
                        )}

                        {keywordSyntheses.length > 0 && (
                            <section className="space-y-2">
                                <div className="flex items-center gap-1.5 px-0.5">
                                    <Layers className="h-3 w-3 text-muted-foreground/50" />
                                    <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                                        Keyword Syntheses
                                    </span>
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{keywordSyntheses.length}</Badge>
                                </div>
                                {keywordSyntheses.map(s => (
                                    <SynthesisCard
                                        key={s.id}
                                        synthesis={s}
                                        label={getKeywordLabel(s.keyword_id)}
                                    />
                                ))}
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
