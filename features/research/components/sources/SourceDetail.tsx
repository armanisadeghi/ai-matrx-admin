'use client';

import { useState, useCallback } from 'react';
import { ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, ClipboardPaste, ChevronLeft, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useResearchSource, useSourceContent } from '../../hooks/useResearchState';
import { updateSource } from '../../service';
import { StatusBadge } from '../shared/StatusBadge';
import { SourceTypeIcon } from '../shared/SourceTypeIcon';
import { OriginBadge } from '../shared/OriginBadge';
import { ContentViewer } from './ContentViewer';
import { PasteContentModal } from './PasteContentModal';
import { AnalysisCard } from '../analysis/AnalysisCard';
import type { ResearchSource, ResearchContent, ResearchAnalysis } from '../../types';

interface SourceDetailProps {
    topicId: string;
    sourceId: string;
}

export default function SourceDetail({ topicId, sourceId }: SourceDetailProps) {
    const isMobile = useIsMobile();

    const { data: source, refresh: refetchSource } = useResearchSource(sourceId);

    const { data: contentData, refresh: refetchContent } = useSourceContent(sourceId);

    const [pasteOpen, setPasteOpen] = useState(false);
    const [scraping, setScraping] = useState(false);

    const contentVersions = ((contentData as Record<string, unknown>)?.content ?? contentData ?? []) as ResearchContent[];
    const analyses = ((contentData as Record<string, unknown>)?.analyses ?? []) as ResearchAnalysis[];
    const [selectedVersion, setSelectedVersion] = useState(0);
    const currentContent = contentVersions[selectedVersion] ?? null;

    const hasBeenScraped = source && source.scrape_status !== 'pending';

    const handleScrape = useCallback(async () => {
        setScraping(true);
        try {
            await updateSource(sourceId, { scrape_status: 'pending' });
            refetchSource();
        } finally {
            setScraping(false);
        }
    }, [sourceId, refetchSource]);

    const handleMarkComplete = useCallback(async () => {
        await updateSource(sourceId, { scrape_status: 'complete' });
        refetchSource();
    }, [sourceId, refetchSource]);

    const handleMarkStale = useCallback(async () => {
        await updateSource(sourceId, { is_stale: true });
        refetchSource();
    }, [sourceId, refetchSource]);

    const handleContentSaved = useCallback(() => {
        refetchContent();
    }, [refetchContent]);

    return (
        <div className="flex flex-col md:flex-row h-full min-h-0">
            {/* Left Panel — Source Metadata */}
            <div className="w-full md:w-[300px] lg:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto p-4 space-y-4">
                <Link href={`/p/research/topics/${topicId}/sources`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Sources
                </Link>

                {source && (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <SourceTypeIcon type={source.source_type} />
                                <h2 className="font-semibold text-sm line-clamp-2">{source.title || 'Untitled'}</h2>
                            </div>
                            <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 break-all"
                            >
                                {source.url}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Host</span>
                                <span className="font-medium">{source.hostname}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <StatusBadge status={source.scrape_status} />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Origin</span>
                                <OriginBadge origin={source.origin} />
                            </div>
                            {source.rank && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Rank</span>
                                    <span>#{source.rank}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Discovered</span>
                                <span>{new Date(source.discovered_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Included</span>
                                <Badge variant={source.is_included ? 'default' : 'secondary'}>
                                    {source.is_included ? 'Yes' : 'No'}
                                </Badge>
                            </div>
                        </div>

                        {/* Content Versions */}
                        {contentVersions.length > 1 && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Version</label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={selectedVersion >= contentVersions.length - 1}
                                        onClick={() => setSelectedVersion(v => v + 1)}
                                    >
                                        &larr;
                                    </Button>
                                    <span className="text-xs tabular-nums">
                                        {contentVersions.length - selectedVersion} of {contentVersions.length}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={selectedVersion <= 0}
                                        onClick={() => setSelectedVersion(v => v - 1)}
                                    >
                                        &rarr;
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-2 pt-2 border-t border-border">
                            {/* Primary scrape action — context-aware label */}
                            <Button
                                size="sm"
                                className="w-full justify-start gap-2 min-h-[44px] sm:min-h-0"
                                onClick={handleScrape}
                                disabled={scraping}
                            >
                                {scraping
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : hasBeenScraped ? <RefreshCw className="h-4 w-4" /> : <Download className="h-4 w-4" />
                                }
                                {scraping ? 'Queuing…' : hasBeenScraped ? 'Re-scrape' : 'Scrape'}
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start gap-2 min-h-[44px] sm:min-h-0" onClick={() => setPasteOpen(true)}>
                                <ClipboardPaste className="h-4 w-4" />
                                Paste Content
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start gap-2 min-h-[44px] sm:min-h-0" onClick={handleMarkComplete}>
                                <CheckCircle2 className="h-4 w-4" />
                                Mark Complete
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start gap-2 min-h-[44px] sm:min-h-0" onClick={handleMarkStale}>
                                <AlertTriangle className="h-4 w-4" />
                                Mark Stale
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Right Panel — Content + Analysis */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-6">
                {currentContent ? (
                    <ContentViewer
                        topicId={topicId}
                        content={currentContent}
                        onSaved={handleContentSaved}
                    />
                ) : source ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4 text-center px-4">
                        {source.scrape_status === 'failed' ? (
                            <>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Scrape failed</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                        {source.scrape_status === 'failed' ? 'The scraper couldn\'t retrieve this page.' : 'No content was captured.'} You can re-scrape or paste content manually.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleScrape} disabled={scraping} className="gap-2">
                                        {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                        Re-scrape
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)} className="gap-2">
                                        <ClipboardPaste className="h-4 w-4" />
                                        Paste
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                    <Download className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Not scraped yet</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                        This source hasn&apos;t been scraped. Click Scrape to fetch its content, or paste it manually.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleScrape} disabled={scraping} className="gap-2">
                                        {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                        Scrape
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)} className="gap-2">
                                        <ClipboardPaste className="h-4 w-4" />
                                        Paste
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                        Loading source…
                    </div>
                )}

                {/* Analysis Section */}
                {currentContent && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Analysis</h3>
                        {analyses.length > 0 ? (
                            analyses.map(analysis => (
                                <AnalysisCard key={analysis.id} analysis={analysis} />
                            ))
                        ) : (
                            <AnalysisCard
                                analysis={null}
                                topicId={topicId}
                                sourceId={sourceId}
                                onAnalyzed={refetchContent}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Paste Content Modal */}
            <PasteContentModal
                open={pasteOpen}
                onOpenChange={setPasteOpen}
                topicId={topicId}
                sourceId={sourceId}
                onSaved={() => { setPasteOpen(false); refetchContent(); }}
            />
        </div>
    );
}
