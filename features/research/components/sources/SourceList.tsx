'use client';

import { useState, useCallback, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ExternalLink, MoreVertical, RefreshCw, CheckCircle2, AlertTriangle, Download, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchSources, useResearchKeywords } from '../../hooks/useResearchState';
import { bulkUpdateSources, updateSource } from '../../service';
import { useSourceFilters } from '../../hooks/useSourceFilters';
import { SourceFilters } from './SourceFilters';
import { BulkActionBar } from './BulkActionBar';
import { StatusBadge } from '../shared/StatusBadge';
import { SourceTypeIcon } from '../shared/SourceTypeIcon';
import { OriginBadge } from '../shared/OriginBadge';
import type { ResearchSource, BulkAction, SourceSortBy } from '../../types';

function formatPageAge(pageAge: string | null): { display: string; daysOld: number | null } {
    if (!pageAge) return { display: '—', daysOld: null };
    const date = new Date(pageAge);
    if (isNaN(date.getTime())) return { display: pageAge, daysOld: null };
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return { display: 'Today', daysOld: 0 };
    if (days === 1) return { display: '1d ago', daysOld: 1 };
    if (days < 30) return { display: `${days}d ago`, daysOld: days };
    if (days < 365) return { display: `${Math.floor(days / 30)}mo ago`, daysOld: days };
    return { display: `${Math.floor(days / 365)}y ago`, daysOld: days };
}

function SortHeader({
    label,
    field,
    currentSort,
    currentDir,
    onSort,
    className,
}: {
    label: string;
    field: SourceSortBy;
    currentSort?: SourceSortBy;
    currentDir?: string;
    onSort: (field: SourceSortBy) => void;
    className?: string;
}) {
    const isActive = currentSort === field;
    return (
        <button
            onClick={() => onSort(field)}
            className={cn(
                'flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors',
                isActive && 'text-foreground',
                className,
            )}
        >
            {label}
            {isActive ? (
                currentDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            ) : (
                <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
        </button>
    );
}

interface SourceRowProps {
    source: ResearchSource;
    topicId: string;
    selected: boolean;
    scraping: boolean;
    navigating: boolean;
    anyNavigating: boolean;
    onSelect: (id: string) => void;
    onToggleInclude: (source: ResearchSource) => void;
    onScrape: (sourceId: string, e: React.MouseEvent) => void;
    onNavigate: (id: string) => void;
}

function SourceRow({
    source,
    topicId,
    selected,
    scraping,
    navigating,
    anyNavigating,
    onSelect,
    onToggleInclude,
    onScrape,
    onNavigate,
}: SourceRowProps) {
    const [expanded, setExpanded] = useState(false);
    const { display: pageAgeDisplay } = formatPageAge(source.page_age);
    const hasSnippets = source.extra_snippets && source.extra_snippets.length > 0;

    return (
        <>
            <tr
                className={cn(
                    'border-b border-border transition-colors group',
                    !source.is_included && 'opacity-50',
                    navigating && 'bg-muted/60',
                    !anyNavigating && 'hover:bg-muted/30 cursor-pointer',
                    anyNavigating && !navigating && 'cursor-not-allowed opacity-70',
                )}
                onClick={() => !anyNavigating && onNavigate(source.id)}
            >
                {/* Checkbox */}
                <td className="px-3 py-2 w-10" onClick={e => e.stopPropagation()}>
                    <Checkbox
                        checked={selected}
                        onCheckedChange={() => onSelect(source.id)}
                        disabled={anyNavigating}
                    />
                </td>

                {/* Include toggle */}
                <td className="px-2 py-2 w-10" onClick={e => e.stopPropagation()}>
                    <Switch
                        checked={source.is_included}
                        onCheckedChange={() => onToggleInclude(source)}
                        className="scale-75"
                        disabled={anyNavigating}
                    />
                </td>

                {/* Rank */}
                <td className="px-2 py-2 w-10 text-center">
                    {source.rank ? (
                        <span className="text-xs font-mono font-semibold text-muted-foreground tabular-nums">
                            #{source.rank}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                </td>

                {/* Thumbnail + Title + Description */}
                <td className="px-3 py-2">
                    <div className="flex items-start gap-3 min-w-0">
                        {/* Thumbnail */}
                        <div className="shrink-0 w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                            {source.thumbnail_url ? (
                                <Image
                                    src={source.thumbnail_url}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                <Globe className="h-4 w-4 text-muted-foreground/50" />
                            )}
                        </div>
                        {/* Text */}
                        <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                                {source.title || source.url}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{source.url}</div>
                            {source.description && (
                                <div className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2 leading-relaxed">
                                    {source.description}
                                </div>
                            )}
                        </div>
                        {/* Expand toggle */}
                        {hasSnippets && (
                            <button
                                className="shrink-0 p-1 rounded hover:bg-muted transition-colors mt-0.5"
                                onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                                title={expanded ? 'Collapse snippets' : 'Expand snippets'}
                            >
                                {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                        )}
                    </div>
                </td>

                {/* Host */}
                <td className="px-3 py-2 w-28">
                    <span className="text-xs text-muted-foreground truncate block max-w-28">{source.hostname}</span>
                </td>

                {/* Type */}
                <td className="px-3 py-2 w-10 text-center">
                    <SourceTypeIcon type={source.source_type} />
                </td>

                {/* Origin */}
                <td className="px-3 py-2 w-20">
                    <OriginBadge origin={source.origin} />
                </td>

                {/* Page Age */}
                <td className="px-3 py-2 w-20" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{pageAgeDisplay}</span>
                </td>

                {/* Status */}
                <td className="px-3 py-2 w-24">
                    <StatusBadge status={source.scrape_status} />
                </td>

                {/* Actions */}
                <td className="px-3 py-2 w-24" onClick={e => e.stopPropagation()}>
                    {(source.scrape_status === 'pending' || source.scrape_status === 'failed' || source.scrape_status === 'thin') && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 gap-1 text-xs"
                            disabled={scraping || anyNavigating}
                            onClick={(e) => onScrape(source.id, e)}
                        >
                            {scraping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                            {source.scrape_status === 'pending' ? 'Scrape' : 'Re-scrape'}
                        </Button>
                    )}
                </td>

                {/* More menu */}
                <td className="px-3 py-2 w-10" onClick={e => e.stopPropagation()}>
                    {navigating ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={anyNavigating}>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onNavigate(source.id)}>
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(source.url, '_blank')}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open URL
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onToggleInclude(source)}>
                                    {source.is_included ? 'Exclude' : 'Include'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSource(source.id, { scrape_status: 'complete' })}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark Complete
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSource(source.id, { is_stale: true })}>
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Mark Stale
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </td>
            </tr>

            {/* Expanded snippets row */}
            {expanded && hasSnippets && (
                <tr className={cn('border-b border-border bg-muted/20', !source.is_included && 'opacity-50')}>
                    <td colSpan={11} className="px-3 py-3">
                        <div className="pl-[calc(40px+12px+12px)] space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional Snippets</p>
                            <div className="space-y-1.5">
                                {source.extra_snippets!.map((snippet, i) => (
                                    <p key={i} className="text-xs text-foreground/80 leading-relaxed border-l-2 border-border pl-3">
                                        {snippet}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

export default function SourceList() {
    const { topicId, refresh } = useTopicContext();
    const isMobile = useIsMobile();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [navigatingId, setNavigatingId] = useState<string | null>(null);

    const { filters, setFilters, resetFilters, hasActiveFilters } = useSourceFilters();
    const { data: sources, refetch: refetchSources } = useResearchSources(topicId, filters);
    const { data: keywords } = useResearchKeywords(topicId);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());

    const sourceList = (sources as ResearchSource[]) ?? [];
    const hostnames = useMemo(() =>
        [...new Set(sourceList.map(s => s.hostname).filter(Boolean) as string[])].sort(),
        [sourceList],
    );

    const handleNavigate = useCallback((id: string) => {
        if (navigatingId) return;
        setNavigatingId(id);
        startTransition(() => {
            router.push(`/p/research/topics/${topicId}/sources/${id}`);
        });
    }, [navigatingId, router, topicId]);

    const handleSort = useCallback((field: SourceSortBy) => {
        if (filters.sort_by === field) {
            if (filters.sort_dir === 'asc') {
                setFilters({ sort_by: field, sort_dir: 'desc' });
            } else {
                setFilters({ sort_by: undefined, sort_dir: undefined });
            }
        } else {
            setFilters({ sort_by: field, sort_dir: 'asc' });
        }
    }, [filters.sort_by, filters.sort_dir, setFilters]);

    const toggleSelect = useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (selected.size === sourceList.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(sourceList.map(s => s.id)));
        }
    }, [selected.size, sourceList]);

    const handleBulk = useCallback(async (action: BulkAction) => {
        await bulkUpdateSources(topicId, { source_ids: [...selected], action });
        setSelected(new Set());
        refetchSources();
        refresh();
    }, [topicId, selected, refetchSources, refresh]);

    const handleToggleInclude = useCallback(async (source: ResearchSource) => {
        await updateSource(source.id, { is_included: !source.is_included });
        refetchSources();
    }, [refetchSources]);

    const handleScrapeSource = useCallback(async (sourceId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setScrapingIds(prev => new Set(prev).add(sourceId));
        try {
            await updateSource(sourceId, { scrape_status: 'pending' });
            refetchSources();
        } finally {
            setScrapingIds(prev => { const next = new Set(prev); next.delete(sourceId); return next; });
        }
    }, [refetchSources]);

    const anyNavigating = isPending || navigatingId !== null;

    return (
        <div className="p-4 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Sources</h1>
                <span className="text-sm text-muted-foreground">{sourceList.length} results</span>
            </div>

            {/* Filters */}
            <SourceFilters
                filters={filters}
                onFilterChange={setFilters}
                onReset={resetFilters}
                hasActiveFilters={hasActiveFilters}
                keywords={(keywords as import('../../types').ResearchKeyword[]) ?? []}
                hostnames={hostnames}
            />

            {/* Desktop Table */}
            {!isMobile ? (
                <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="w-10 px-3 py-2">
                                    <Checkbox
                                        checked={selected.size === sourceList.length && sourceList.length > 0}
                                        onCheckedChange={toggleAll}
                                    />
                                </th>
                                <th className="w-10 px-2 py-2 text-left text-xs font-medium text-muted-foreground">Inc</th>
                                <th className="w-10 px-2 py-2 text-center">
                                    <SortHeader label="#" field="rank" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Title / Description</th>
                                <th className="w-28 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Host</th>
                                <th className="w-10 px-3 py-2 text-center text-xs font-medium text-muted-foreground">Type</th>
                                <th className="w-20 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Origin</th>
                                <th className="w-20 px-3 py-2 text-left">
                                    <SortHeader label="Age" field="page_age" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                                </th>
                                <th className="w-24 px-3 py-2 text-left">
                                    <SortHeader label="Status" field="scrape_status" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                                </th>
                                <th className="w-24 px-3 py-2" />
                                <th className="w-10 px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {sourceList.map(source => (
                                <SourceRow
                                    key={source.id}
                                    source={source}
                                    topicId={topicId}
                                    selected={selected.has(source.id)}
                                    scraping={scrapingIds.has(source.id)}
                                    navigating={navigatingId === source.id}
                                    anyNavigating={anyNavigating}
                                    onSelect={toggleSelect}
                                    onToggleInclude={handleToggleInclude}
                                    onScrape={handleScrapeSource}
                                    onNavigate={handleNavigate}
                                />
                            ))}
                        </tbody>
                    </table>
                    {sourceList.length === 0 && (
                        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                            No sources found. Run a search to discover sources.
                        </div>
                    )}
                </div>
            ) : (
                /* Mobile Card List */
                <div className="space-y-2">
                    {sourceList.map(source => {
                        const { display: pageAgeDisplay } = formatPageAge(source.page_age);
                        const isNavigating = navigatingId === source.id;
                        return (
                            <div
                                key={source.id}
                                onClick={() => !anyNavigating && handleNavigate(source.id)}
                                className={cn(
                                    'rounded-xl border border-border bg-card p-3 transition-colors relative',
                                    !source.is_included && 'opacity-50',
                                    isNavigating && 'bg-muted/60',
                                    !anyNavigating && 'active:bg-muted/50 cursor-pointer',
                                    anyNavigating && !isNavigating && 'cursor-not-allowed opacity-70',
                                )}
                            >
                                {isNavigating && (
                                    <div className="absolute inset-0 rounded-xl bg-background/50 z-10 flex items-center justify-center">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    </div>
                                )}
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        checked={selected.has(source.id)}
                                        onCheckedChange={() => toggleSelect(source.id)}
                                        onClick={e => e.stopPropagation()}
                                        className="mt-1"
                                        disabled={anyNavigating}
                                    />
                                    {/* Thumbnail */}
                                    <div className="shrink-0 w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                                        {source.thumbnail_url ? (
                                            <Image
                                                src={source.thumbnail_url}
                                                alt=""
                                                width={40}
                                                height={40}
                                                className="w-full h-full object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <Globe className="h-4 w-4 text-muted-foreground/50" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-2">
                                            {source.rank && (
                                                <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0">#{source.rank}</span>
                                            )}
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <SourceTypeIcon type={source.source_type} size={14} />
                                                <span className="font-medium text-sm line-clamp-1">{source.title || source.url}</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate mt-0.5">{source.hostname}</div>
                                        {source.description && (
                                            <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-2 leading-relaxed">{source.description}</div>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <StatusBadge status={source.scrape_status} />
                                            <OriginBadge origin={source.origin} />
                                            {source.page_age && (
                                                <span className="text-xs text-muted-foreground">{pageAgeDisplay}</span>
                                            )}
                                            {(source.scrape_status === 'pending' || source.scrape_status === 'failed' || source.scrape_status === 'thin') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 gap-1 text-xs"
                                                    disabled={scrapingIds.has(source.id) || anyNavigating}
                                                    onClick={(e) => handleScrapeSource(source.id, e)}
                                                >
                                                    <Download className="h-3 w-3" />
                                                    {source.scrape_status === 'pending' ? 'Scrape' : 'Re-scrape'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={source.is_included}
                                        onCheckedChange={() => handleToggleInclude(source)}
                                        onClick={e => e.stopPropagation()}
                                        className="scale-75 shrink-0"
                                        disabled={anyNavigating}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {sourceList.length === 0 && (
                        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                            No sources found.
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {sourceList.length >= filters.limit && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={filters.offset === 0}
                        onClick={() => setFilters({ offset: Math.max(0, filters.offset - filters.limit) })}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums">
                        {filters.offset + 1}–{filters.offset + sourceList.length}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ offset: filters.offset + filters.limit })}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selected.size}
                onInclude={() => handleBulk('include')}
                onExclude={() => handleBulk('exclude')}
                onMarkStale={() => handleBulk('mark_stale')}
                onMarkComplete={() => handleBulk('mark_complete')}
                onClear={() => setSelected(new Set())}
            />
        </div>
    );
}
