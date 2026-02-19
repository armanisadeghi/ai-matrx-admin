'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, MoreVertical, RefreshCw, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
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
import type { ResearchSource, BulkAction } from '../../types';

export default function SourceList() {
    const { topicId, refresh } = useTopicContext();
    const isMobile = useIsMobile();
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
                                <th className="w-12 px-2 py-2 text-left text-xs font-medium text-muted-foreground">Inc</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Title</th>
                                <th className="w-28 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Host</th>
                                <th className="w-12 px-3 py-2 text-center text-xs font-medium text-muted-foreground">Type</th>
                                <th className="w-20 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Origin</th>
                                <th className="w-24 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                                <th className="w-16 px-3 py-2" />
                                <th className="w-10 px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {sourceList.map(source => (
                                <tr
                                    key={source.id}
                                    className={cn(
                                        'border-b border-border hover:bg-muted/30 transition-colors',
                                        !source.is_included && 'opacity-50',
                                    )}
                                >
                                    <td className="px-3 py-2">
                                        <Checkbox
                                            checked={selected.has(source.id)}
                                            onCheckedChange={() => toggleSelect(source.id)}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <Switch
                                            checked={source.is_included}
                                            onCheckedChange={() => handleToggleInclude(source)}
                                            className="scale-75"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Link
                                            href={`/p/research/topics/${topicId}/sources/${source.id}`}
                                            className="font-medium hover:text-primary transition-colors line-clamp-1"
                                        >
                                            {source.title || source.url}
                                        </Link>
                                        <div className="text-xs text-muted-foreground truncate max-w-sm">{source.url}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className="text-xs text-muted-foreground truncate block max-w-28">{source.hostname}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <SourceTypeIcon type={source.source_type} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <OriginBadge origin={source.origin} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <StatusBadge status={source.scrape_status} />
                                    </td>
                                    <td className="px-3 py-2">
                                        {(source.scrape_status === 'pending' || source.scrape_status === 'failed' || source.scrape_status === 'thin') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 gap-1 text-xs"
                                                disabled={scrapingIds.has(source.id)}
                                                onClick={(e) => handleScrapeSource(source.id, e)}
                                            >
                                                <Download className="h-3 w-3" />
                                                {source.scrape_status === 'pending' ? 'Scrape' : 'Re-scrape'}
                                            </Button>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/p/research/topics/${topicId}/sources/${source.id}`}>
                                                        View Content
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleInclude(source)}>
                                                    {source.is_included ? 'Exclude' : 'Include'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateSource(source.id, { scrape_status: 'complete' }).then(() => refetchSources())}>
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Mark Complete
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateSource(source.id, { is_stale: true }).then(() => refetchSources())}>
                                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                                    Mark Stale
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(source.url, '_blank')}>
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Open URL
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
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
                    {sourceList.map(source => (
                        <Link
                            key={source.id}
                            href={`/p/research/topics/${topicId}/sources/${source.id}`}
                            className={cn(
                                'block rounded-xl border border-border bg-card p-3 transition-colors active:bg-muted/50',
                                !source.is_included && 'opacity-50',
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    checked={selected.has(source.id)}
                                    onCheckedChange={(e) => { e; toggleSelect(source.id); }}
                                    onClick={e => e.stopPropagation()}
                                    className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <SourceTypeIcon type={source.source_type} size={14} />
                                        <span className="font-medium text-sm truncate">{source.title || source.url}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate mt-0.5">{source.hostname}</div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <StatusBadge status={source.scrape_status} />
                                        <OriginBadge origin={source.origin} />
                                        {(source.scrape_status === 'pending' || source.scrape_status === 'failed' || source.scrape_status === 'thin') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-6 px-2 gap-1 text-xs"
                                                disabled={scrapingIds.has(source.id)}
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
                                    onClick={e => e.preventDefault()}
                                    className="scale-75 shrink-0"
                                />
                            </div>
                        </Link>
                    ))}
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
