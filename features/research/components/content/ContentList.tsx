'use client';

import { useState } from 'react';
import { FileText, ChevronRight, CheckCircle, XCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchSources } from '../../hooks/useResearchState';

export default function ContentList() {
    const { topicId } = useTopicContext();
    const [search, setSearch] = useState('');

    // Sources with scraped content (success or thin) are the ones with content to review
    const { data: sources, isLoading } = useResearchSources(topicId, {
        limit: 200,
    });

    const scraped = (sources ?? []).filter(s =>
        s.scrape_status === 'success' || s.scrape_status === 'thin' || s.scrape_status === 'complete',
    );

    const filtered = scraped.filter(s =>
        !search || s.url.toLowerCase().includes(search.toLowerCase()) ||
        (s.title ?? '').toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4 border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                        <h1 className="text-xl font-bold">Content</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Scraped page content from all sources
                        </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                        {isLoading ? '—' : scraped.length} pages
                    </Badge>
                </div>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by URL or title..."
                        className="pl-9 text-base h-9"
                        style={{ fontSize: '16px' }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 rounded-xl" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <FileText className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No content yet</h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                            {scraped.length === 0
                                ? 'Run the pipeline to scrape sources and collect page content.'
                                : 'No results match your search.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(source => (
                            <Link
                                key={source.id}
                                href={`/p/research/topics/${topicId}/sources/${source.id}`}
                                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors min-h-[44px]"
                            >
                                <div className="shrink-0">
                                    {source.is_good_scrape ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-yellow-500" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={cn(
                                        'text-sm font-medium truncate',
                                        source.title ? 'text-foreground' : 'text-muted-foreground',
                                    )}>
                                        {source.title ?? source.url}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{source.url}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            'text-[10px]',
                                            source.scrape_status === 'success' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                            source.scrape_status === 'thin' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                                        )}
                                    >
                                        {source.scrape_status}
                                    </Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
