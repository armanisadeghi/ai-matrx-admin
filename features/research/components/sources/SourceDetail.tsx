'use client';

import { useState, useCallback } from 'react';
import { ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, ClipboardPaste, ChevronLeft, Download, Loader2, Globe, Hash, Clock, Calendar, FileText, Tag, Info, Link2 } from 'lucide-react';
import Image from 'next/image';
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

function formatPageAge(pageAge: string | null): string {
    if (!pageAge) return '—';
    const date = new Date(pageAge);
    if (isNaN(date.getTime())) return pageAge;
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    if (days === 0) return `${formatted} (today)`;
    if (days === 1) return `${formatted} (1 day ago)`;
    if (days < 30) return `${formatted} (${days} days ago)`;
    if (days < 365) return `${formatted} (${Math.floor(days / 30)} months ago)`;
    return `${formatted} (${Math.floor(days / 365)} years ago)`;
}

function MetaRow({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0 pt-0.5">
                {icon}
                {label}
            </span>
            <div className="text-xs font-medium text-right">{children}</div>
        </div>
    );
}

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
    const [showRawSearch, setShowRawSearch] = useState(false);

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

    const typedSource = source as ResearchSource | null | undefined;

    return (
        <div className="flex flex-col md:flex-row h-full min-h-0">
            {/* Left Panel — Source Metadata */}
            <div className="w-full md:w-[340px] lg:w-[380px] shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto">
                <div className="p-4 space-y-4">
                    <Link
                        href={`/p/research/topics/${topicId}/sources`}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Sources
                    </Link>

                    {typedSource && (
                        <>
                            {/* Hero: thumbnail + title */}
                            <div className="space-y-3">
                                {typedSource.thumbnail_url && (
                                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
                                        <Image
                                            src={typedSource.thumbnail_url}
                                            alt={typedSource.title ?? ''}
                                            width={380}
                                            height={214}
                                            className="w-full h-full object-cover"
                                            unoptimized
                                        />
                                    </div>
                                )}
                                {!typedSource.thumbnail_url && (
                                    <div className="w-full h-20 rounded-lg bg-muted flex items-center justify-center">
                                        <Globe className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                )}
                                <div className="flex items-start gap-2">
                                    <SourceTypeIcon type={typedSource.source_type} />
                                    <h2 className="font-semibold text-sm leading-snug">{typedSource.title || 'Untitled'}</h2>
                                </div>
                                <a
                                    href={typedSource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-start gap-1 break-all"
                                >
                                    {typedSource.url}
                                    <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" />
                                </a>
                            </div>

                            {/* Description */}
                            {typedSource.description && (
                                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Description
                                    </p>
                                    <p className="text-xs leading-relaxed text-foreground/90">{typedSource.description}</p>
                                </div>
                            )}

                            {/* Extra Snippets */}
                            {typedSource.extra_snippets && typedSource.extra_snippets.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        Snippets ({typedSource.extra_snippets.length})
                                    </p>
                                    <div className="space-y-2">
                                        {typedSource.extra_snippets.map((snippet, i) => (
                                            <div key={i} className="border-l-2 border-border pl-3 py-0.5">
                                                <p className="text-xs text-foreground/80 leading-relaxed">{snippet}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Core metadata */}
                            <div className="space-y-0 rounded-lg border border-border p-3">
                                <MetaRow label="Host" icon={<Globe className="h-3 w-3" />}>
                                    <span>{typedSource.hostname ?? '—'}</span>
                                </MetaRow>
                                <MetaRow label="Rank" icon={<Hash className="h-3 w-3" />}>
                                    {typedSource.rank ? <span className="font-mono">#{typedSource.rank}</span> : <span className="text-muted-foreground">—</span>}
                                </MetaRow>
                                <MetaRow label="Status" icon={<Info className="h-3 w-3" />}>
                                    <StatusBadge status={typedSource.scrape_status} />
                                </MetaRow>
                                <MetaRow label="Origin" icon={<Tag className="h-3 w-3" />}>
                                    <OriginBadge origin={typedSource.origin} />
                                </MetaRow>
                                <MetaRow label="Included" icon={<CheckCircle2 className="h-3 w-3" />}>
                                    <Badge variant={typedSource.is_included ? 'default' : 'secondary'}>
                                        {typedSource.is_included ? 'Yes' : 'No'}
                                    </Badge>
                                </MetaRow>
                                <MetaRow label="Page Age" icon={<Calendar className="h-3 w-3" />}>
                                    <span className="text-right block">{formatPageAge(typedSource.page_age)}</span>
                                </MetaRow>
                                <MetaRow label="Discovered" icon={<Clock className="h-3 w-3" />}>
                                    <span>{new Date(typedSource.discovered_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </MetaRow>
                                <MetaRow label="Last Seen" icon={<Clock className="h-3 w-3" />}>
                                    <span>{new Date(typedSource.last_seen_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </MetaRow>
                                {typedSource.is_stale && (
                                    <MetaRow label="Stale" icon={<AlertTriangle className="h-3 w-3" />}>
                                        <Badge variant="destructive">Stale</Badge>
                                    </MetaRow>
                                )}
                            </div>

                            {/* Content version selector */}
                            {contentVersions.length > 0 && (
                                <div className="rounded-lg border border-border p-3 space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content Versions</p>
                                    {contentVersions.length > 1 ? (
                                        <div className="flex items-center justify-between gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={selectedVersion >= contentVersions.length - 1}
                                                onClick={() => setSelectedVersion(v => v + 1)}
                                            >
                                                &larr;
                                            </Button>
                                            <span className="text-xs tabular-nums text-center">
                                                v{contentVersions[selectedVersion]?.version ?? selectedVersion + 1} of {contentVersions.length}
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
                                    ) : (
                                        <div className="text-xs text-muted-foreground">1 version available</div>
                                    )}
                                    {currentContent && (
                                        <div className="space-y-0 text-xs">
                                            <div className="flex justify-between py-1 border-b border-border/50">
                                                <span className="text-muted-foreground">Chars</span>
                                                <span className="font-mono">{currentContent.char_count.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-border/50">
                                                <span className="text-muted-foreground">Quality</span>
                                                <Badge variant={currentContent.is_good_scrape ? 'default' : 'secondary'} className="text-xs">
                                                    {currentContent.quality_override ?? (currentContent.is_good_scrape ? 'Good' : 'Thin')}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-border/50">
                                                <span className="text-muted-foreground">Method</span>
                                                <span>{currentContent.capture_method}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-border/50">
                                                <span className="text-muted-foreground">Type</span>
                                                <span>{currentContent.content_type}</span>
                                            </div>
                                            {currentContent.published_at && (
                                                <div className="flex justify-between py-1 border-b border-border/50">
                                                    <span className="text-muted-foreground">Published</span>
                                                    <span>{new Date(currentContent.published_at).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {currentContent.modified_at && (
                                                <div className="flex justify-between py-1 border-b border-border/50">
                                                    <span className="text-muted-foreground">Modified</span>
                                                    <span>{new Date(currentContent.modified_at).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between py-1">
                                                <span className="text-muted-foreground">Scraped</span>
                                                <span>{new Date(currentContent.scraped_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Extracted links count */}
                            {currentContent?.extracted_links && currentContent.extracted_links.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Link2 className="h-3 w-3" />
                                    <span>{currentContent.extracted_links.length} extracted links</span>
                                </div>
                            )}

                            {/* Raw search result toggle */}
                            {typedSource.raw_search_result && (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setShowRawSearch(v => !v)}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                    >
                                        <FileText className="h-3 w-3" />
                                        {showRawSearch ? 'Hide' : 'Show'} raw search result
                                    </button>
                                    {showRawSearch && (
                                        <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed whitespace-pre-wrap break-all">
                                            {JSON.stringify(typedSource.raw_search_result, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-2 pt-2 border-t border-border">
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
            </div>

            {/* Right Panel — Content + Analysis */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-6">
                {currentContent ? (
                    <ContentViewer
                        topicId={topicId}
                        content={currentContent}
                        onSaved={handleContentSaved}
                    />
                ) : typedSource ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4 text-center px-4">
                        {typedSource.scrape_status === 'failed' ? (
                            <>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Scrape failed</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                        The scraper couldn&apos;t retrieve this page. You can re-scrape or paste content manually.
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
