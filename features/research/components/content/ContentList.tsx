'use client';

import { useState, useMemo } from 'react';
import { FileText, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchSources } from '../../hooks/useResearchState';
import { SCRAPE_STATUS_CONFIG, SOURCE_TYPE_CONFIG } from '../../constants';
import { ResearchFilterBar, type FilterDef } from '../shared/ResearchFilterBar';
import type { FilterOption } from '@/components/hierarchy-filter';
import type { ResearchSource } from '../../types';

export default function ContentList() {
    const { topicId } = useTopicContext();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [qualityFilter, setQualityFilter] = useState<string | null>(null);
    const [hostFilter, setHostFilter] = useState<string | null>(null);

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

        if (statusFilter) {
            items = items.filter(s => s.scrape_status === statusFilter);
        }
        if (typeFilter) {
            items = items.filter(s => s.source_type === typeFilter);
        }
        if (qualityFilter === 'good') {
            items = items.filter(s => s.scrape_status === 'success');
        } else if (qualityFilter === 'thin') {
            items = items.filter(s => s.scrape_status === 'thin');
        }
        if (hostFilter) {
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

    const statusOptions: FilterOption[] = useMemo(() =>
        Object.entries(SCRAPE_STATUS_CONFIG).map(([key, config]) => ({ id: key, label: config.label })),
        [],
    );
    const typeOptions: FilterOption[] = useMemo(() =>
        Object.entries(SOURCE_TYPE_CONFIG).map(([key, config]) => ({ id: key, label: config.label })),
        [],
    );
    const qualityOptions: FilterOption[] = [
        { id: 'good', label: 'Good' },
        { id: 'thin', label: 'Thin' },
    ];
    const hostOptions: FilterOption[] = useMemo(() =>
        hostnames.map(h => ({ id: h, label: h })),
        [hostnames],
    );

    const filterDefs: FilterDef[] = useMemo(() => {
        const defs: FilterDef[] = [
            { key: 'status', label: 'Status', allLabel: 'All Statuses', options: statusOptions, selectedId: statusFilter, onSelect: setStatusFilter },
            { key: 'type', label: 'Type', allLabel: 'All Types', options: typeOptions, selectedId: typeFilter, onSelect: setTypeFilter },
            { key: 'quality', label: 'Quality', allLabel: 'All Quality', options: qualityOptions, selectedId: qualityFilter, onSelect: setQualityFilter },
        ];
        if (hostnames.length > 0) {
            defs.push({ key: 'host', label: 'Host', allLabel: 'All Hosts', options: hostOptions, selectedId: hostFilter, onSelect: setHostFilter });
        }
        return defs;
    }, [statusOptions, typeOptions, qualityOptions, hostOptions, statusFilter, typeFilter, qualityFilter, hostFilter, hostnames.length]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-3 sm:px-4 pt-3 pb-2">
                <ResearchFilterBar
                    title="Content"
                    count={isLoading ? '—' : `${filtered.length}/${scraped.length}`}
                    filters={filterDefs}
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search title, url, description, host..."
                />
            </div>

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
                            <p className="text-[10px] text-muted-foreground mt-1 max-w-[240px]">
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
                                    <p className="text-[10px] text-muted-foreground truncate mt-px">{source.hostname}</p>
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
                                <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
