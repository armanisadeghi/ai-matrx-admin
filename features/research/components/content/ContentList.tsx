'use client';

import { useState, useMemo } from 'react';
import { FileText, ChevronRight, CheckCircle, XCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchSources } from '../../hooks/useResearchState';
import { SCRAPE_STATUS_CONFIG, SOURCE_TYPE_CONFIG } from '../../constants';
import type { ResearchSource, ScrapeStatus, SourceType } from '../../types';

export default function ContentList() {
    const { topicId } = useTopicContext();
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [qualityFilter, setQualityFilter] = useState<string>('all');
    const [hostFilter, setHostFilter] = useState<string>('all');
    const [drawerOpen, setDrawerOpen] = useState(false);

    const { data: sources, isLoading } = useResearchSources(topicId, { limit: 200 });

    const scraped = useMemo(() =>
        (sources ?? []).filter(s =>
            s.scrape_status === 'success' || s.scrape_status === 'thin' || s.scrape_status === 'complete',
        ),
        [sources],
    );

    const hostnames = useMemo(() =>
        [...new Set(scraped.map(s => s.hostname).filter(Boolean) as string[])].sort(),
        [scraped],
    );

    const filtered = useMemo(() => {
        let items = scraped;

        if (statusFilter !== 'all') {
            items = items.filter(s => s.scrape_status === statusFilter);
        }
        if (typeFilter !== 'all') {
            items = items.filter(s => s.source_type === typeFilter);
        }
        if (qualityFilter === 'good') {
            items = items.filter(s => s.scrape_status === 'success');
        } else if (qualityFilter === 'thin') {
            items = items.filter(s => s.scrape_status === 'thin');
        }
        if (hostFilter !== 'all') {
            items = items.filter(s => s.hostname === hostFilter);
        }
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(s =>
                (s.title ?? '').toLowerCase().includes(q) ||
                s.url.toLowerCase().includes(q) ||
                (s.description ?? '').toLowerCase().includes(q) ||
                (s.hostname ?? '').toLowerCase().includes(q),
            );
        }

        return items;
    }, [scraped, statusFilter, typeFilter, qualityFilter, hostFilter, search]);

    const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || qualityFilter !== 'all' || hostFilter !== 'all';

    const resetFilters = () => {
        setStatusFilter('all');
        setTypeFilter('all');
        setQualityFilter('all');
        setHostFilter('all');
    };

    const filterSelects = (
        <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-28 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(SCRAPE_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-24 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(SOURCE_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger className="w-full sm:w-24 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Quality" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Quality</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="thin">Thin</SelectItem>
                </SelectContent>
            </Select>
            {hostnames.length > 0 && (
                <Select value={hostFilter} onValueChange={setHostFilter}>
                    <SelectTrigger className="w-full sm:w-32 h-7 text-[11px] rounded-full glass-subtle border-0" style={{ fontSize: '16px' }}>
                        <SelectValue placeholder="Host" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Hosts</SelectItem>
                        {hostnames.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {hasActiveFilters && (
                <button
                    onClick={resetFilters}
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full glass-subtle text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-3 sm:px-4 pt-3 pb-2 space-y-1.5">
                <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5">
                    <span className="text-xs font-medium text-foreground/80">Content</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{isLoading ? '—' : `${filtered.length}/${scraped.length}`}</span>
                    <div className="flex-1 relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search title, url, description, host..."
                            className="h-6 pl-7 pr-2 text-[11px] rounded-full glass-subtle border-0 bg-transparent"
                            style={{ fontSize: '16px' }}
                        />
                    </div>
                    {isMobile ? (
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className={cn(
                                'inline-flex items-center justify-center h-6 w-6 rounded-full glass-subtle transition-colors relative shrink-0',
                                hasActiveFilters ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground',
                            )}
                        >
                            <SlidersHorizontal className="h-3 w-3" />
                            {hasActiveFilters && (
                                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                        </button>
                    ) : null}
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
                        <DrawerTitle className="px-4 pt-3 text-xs font-semibold">Filter Content</DrawerTitle>
                        <div className="p-4 space-y-3 pb-safe">
                            <div className="flex flex-col gap-2">
                                {filterSelects}
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>
            )}

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                {isLoading ? (
                    <div className="space-y-1.5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 rounded-xl" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[280px] gap-3 text-center px-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary/40" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-foreground/70">
                                {scraped.length === 0 ? 'No content yet' : 'No matches'}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 mt-1 max-w-[240px]">
                                {scraped.length === 0
                                    ? 'Scrape your sources to collect page content for analysis and synthesis.'
                                    : 'Try adjusting your search or filters to find what you\'re looking for.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {filtered.map(source => (
                            <Link
                                key={source.id}
                                href={`/p/research/topics/${topicId}/sources/${source.id}`}
                                className="group flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-2.5 hover:border-primary/30 transition-colors min-h-[44px]"
                            >
                                <div className="shrink-0">
                                    {source.scrape_status === 'success' ? (
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500/70" />
                                    ) : (
                                        <XCircle className="h-3.5 w-3.5 text-yellow-500/70" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={cn(
                                        'text-xs font-medium truncate',
                                        source.title ? 'text-foreground' : 'text-muted-foreground',
                                    )}>
                                        {source.title ?? source.url}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 truncate mt-px">{source.hostname}</p>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        'text-[9px] h-4 px-1.5 shrink-0',
                                        source.scrape_status === 'success' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                                        source.scrape_status === 'thin' && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                                        source.scrape_status === 'complete' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                                    )}
                                >
                                    {source.scrape_status}
                                </Badge>
                                <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
