'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Settings, AlertCircle, ArrowRight, Zap, SlidersHorizontal, Hand, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTopicContext, useStreamDebug } from '../../context/ResearchContext';
import { useResearchApi } from '../../hooks/useResearchApi';
import { useResearchStream } from '../../hooks/useResearchStream';
import { PipelineCards } from './PipelineCards';
import { ActionBar } from './ActionBar';
import { ProgressPanel } from './ProgressPanel';
import { IterationControls } from '../iteration/IterationControls';
import { TopicSettingsPanel } from './TopicSettingsPanel';
import { StatusBadge } from '../shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const AUTONOMY_ICONS = { auto: Zap, semi: SlidersHorizontal, manual: Hand } as const;
const AUTONOMY_LABELS = { auto: 'Auto', semi: 'Semi', manual: 'Manual' } as const;

export default function ResearchOverview() {
    const { topicId, progress, topic, refresh, isLoading, error } = useTopicContext();
    const api = useResearchApi();
    const isMobile = useIsMobile();
    const debug = useStreamDebug();

    const stream = useResearchStream();

    const [keywordModalOpen, setKeywordModalOpen] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [addingKeyword, setAddingKeyword] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Live counters derived from stream data events — shown in ProgressPanel
    const [liveStats, setLiveStats] = useState<{
        sourcesFound: number;
        scraped: number;
        scrapeGood: number;
        analyzed: number;
        analysisFailed: number;
    }>({ sourcesFound: 0, scraped: 0, scrapeGood: 0, analyzed: 0, analysisFailed: 0 });

    // When sources are stored (search_sources_stored) or a phase completes, refresh topic state.
    // The stream doesn't carry full row data — events like search_sources_stored tell us
    // how many rows were stored, then we refetch from Supabase.
    const handleStreamData = useCallback((payload: import('../../types').ResearchDataEvent) => {
        // Update live counters from real data events
        if (payload.event === 'search_sources_stored') {
            setLiveStats(s => ({ ...s, sourcesFound: s.sourcesFound + payload.stored_count }));
        }
        if (payload.event === 'search_page_complete') {
            setLiveStats(s => ({ ...s, sourcesFound: Math.max(s.sourcesFound, payload.total_so_far) }));
        }
        if (payload.event === 'scrape_complete') {
            setLiveStats(s => ({
                ...s,
                scraped: s.scraped + 1,
                scrapeGood: payload.is_good_scrape ? s.scrapeGood + 1 : s.scrapeGood,
            }));
        }
        if (payload.event === 'analysis_complete') {
            setLiveStats(s => ({ ...s, analyzed: s.analyzed + 1 }));
        }
        if (payload.event === 'analysis_failed') {
            setLiveStats(s => ({ ...s, analysisFailed: s.analysisFailed + 1 }));
        }
        // Refresh source list when the backend confirms sources were persisted
        if (payload.event === 'search_sources_stored' || payload.event === 'search_complete') {
            refresh();
        }
    }, [refresh]);

    const resetStats = useCallback(() => {
        setLiveStats({ sourcesFound: 0, scraped: 0, scrapeGood: 0, analyzed: 0, analysisFailed: 0 });
    }, []);

    const handleRun = useCallback(async () => {
        resetStats();
        const response = await api.runPipeline(topicId);
        stream.startStream(response, {
            onData: handleStreamData,
            onEnd: () => refresh(),
        });
        debug.pushEvents(stream.rawEvents, 'pipeline');
    }, [api, topicId, stream, handleStreamData, refresh, debug, resetStats]);

    const handleSearch = useCallback(async () => {
        resetStats();
        const response = await api.triggerSearch(topicId);
        stream.startStream(response, {
            onData: handleStreamData,
            onEnd: () => refresh(),
        });
        debug.pushEvents(stream.rawEvents, 'search');
    }, [api, topicId, stream, handleStreamData, refresh, debug, resetStats]);

    const handleScrape = useCallback(async () => {
        resetStats();
        const response = await api.triggerScrape(topicId);
        stream.startStream(response, {
            onData: handleStreamData,
            onEnd: () => refresh(),
        });
        debug.pushEvents(stream.rawEvents, 'scrape');
    }, [api, topicId, stream, handleStreamData, refresh, debug, resetStats]);

    const handleAnalyze = useCallback(async () => {
        resetStats();
        const response = await api.analyzeAll(topicId);
        stream.startStream(response, {
            onData: handleStreamData,
            onEnd: () => refresh(),
        });
        debug.pushEvents(stream.rawEvents, 'analyze-all');
    }, [api, topicId, stream, handleStreamData, refresh, debug, resetStats]);

    const handleReport = useCallback(async () => {
        const response = await api.synthesize(topicId, { scope: 'project', iteration_mode: 'initial' });
        stream.startStream(response, { onEnd: () => refresh() });
        debug.pushEvents(stream.rawEvents, 'synthesize');
    }, [api, topicId, stream, refresh, debug]);

    const handleRebuild = useCallback(async () => {
        const response = await api.synthesize(topicId, { scope: 'project', iteration_mode: 'rebuild' });
        stream.startStream(response, { onEnd: () => refresh() });
        debug.pushEvents(stream.rawEvents, 'synthesize-rebuild');
    }, [api, topicId, stream, refresh, debug]);

    const handleUpdate = useCallback(async () => {
        const response = await api.synthesize(topicId, { scope: 'project', iteration_mode: 'update' });
        stream.startStream(response, { onEnd: () => refresh() });
        debug.pushEvents(stream.rawEvents, 'synthesize-update');
    }, [api, topicId, stream, refresh, debug]);

    const handleAddKeyword = useCallback(async () => {
        if (!newKeyword.trim()) return;
        setAddingKeyword(true);
        try {
            await api.addKeywords(topicId, { keywords: [newKeyword.trim()] });
            setNewKeyword('');
            setKeywordModalOpen(false);
            refresh();
        } finally {
            setAddingKeyword(false);
        }
    }, [api, topicId, newKeyword, refresh]);

    if (isLoading) {
        return (
            <div className="p-3 sm:p-4 space-y-3">
                <Skeleton className="h-7 w-48 rounded-full" />
                <div className="flex gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-16 rounded-full" />
                    ))}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!topic || error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60dvh] p-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary mb-3">
                    <AlertCircle className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold mb-1.5">Not Initialized</h2>
                <p className="text-muted-foreground text-xs max-w-sm mb-5">
                    Complete the setup wizard to configure your research topic, keywords, and settings.
                </p>
                <Button asChild size="sm" className="gap-1.5 rounded-full h-8 px-4 text-xs">
                    <Link href="/p/research/topics/new">
                        Set Up Research
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </div>
        );
    }

    const hasReport = (progress?.project_syntheses ?? 0) > 0;
    const AutonomyIcon = AUTONOMY_ICONS[topic.autonomy_level];

    const keywordModalContent = (
        <div className="space-y-3 p-4">
            <Input
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="Enter a keyword..."
                className="h-9 text-xs rounded-lg"
                style={{ fontSize: '16px' }}
                onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                autoFocus
            />
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => setKeywordModalOpen(false)}
                    className="inline-flex items-center h-8 px-4 rounded-full glass-subtle text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim() || addingKeyword}
                    className={cn(
                        'inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-medium transition-all min-h-[44px]',
                        'bg-primary text-primary-foreground hover:bg-primary/90',
                        'disabled:opacity-40 disabled:pointer-events-none',
                    )}
                >
                    {addingKeyword && <Loader2 className="h-3 w-3 animate-spin" />}
                    Add Keyword
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-3 sm:p-4 space-y-3">
            {/* Header — compact glass bar */}
            <div className="flex items-center gap-2 p-1.5 rounded-full glass">
                <div className="min-w-0 flex-1 flex items-center gap-1.5 px-1 overflow-hidden">
                    <h1 className="text-sm font-semibold truncate">{topic.name}</h1>
                    <StatusBadge status={topic.status} />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={cn(
                        'inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full text-[9px] font-medium',
                        'glass-subtle text-muted-foreground/70',
                    )}>
                        <AutonomyIcon className="h-2.5 w-2.5" />
                        {AUTONOMY_LABELS[topic.autonomy_level]}
                    </span>
                    <span className={cn(
                        'hidden sm:inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full text-[9px] font-medium',
                        'glass-subtle text-muted-foreground/70',
                    )}>
                        <Search className="h-2.5 w-2.5" />
                        {topic.default_search_provider === 'brave' ? 'Brave' : 'Google'}
                    </span>
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full glass-subtle text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                        <Settings className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Description — only if present, subtle */}
            {topic.description && (
                <p className="text-[11px] text-muted-foreground/60 px-1 line-clamp-1">{topic.description}</p>
            )}

            {/* Action Buttons */}
            <ActionBar
                onRun={handleRun}
                onSearch={handleSearch}
                onScrape={handleScrape}
                onAnalyze={handleAnalyze}
                onReport={handleReport}
                isStreaming={stream.isStreaming}
            />

            {/* Progress Panel */}
            <ProgressPanel
                isStreaming={stream.isStreaming}
                currentStep={stream.currentStep}
                messages={stream.messages}
                error={stream.error}
                liveStats={liveStats}
                onClose={stream.clearMessages}
                onCancel={stream.cancel}
            />

            {/* Pipeline Cards */}
            <PipelineCards topicId={topicId} progress={progress} />

            {/* Iteration Controls */}
            {hasReport && (
                <div className="space-y-2">
                    <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider px-1">Iterate</span>
                    <IterationControls
                        onRebuild={handleRebuild}
                        onUpdate={handleUpdate}
                        onAddKeywords={() => setKeywordModalOpen(true)}
                        isLoading={stream.isStreaming}
                    />
                </div>
            )}

            {/* Topic Settings Panel */}
            <TopicSettingsPanel
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                topic={topic}
                onSaved={refresh}
            />

            {/* Add Keyword Modal */}
            {isMobile ? (
                <Drawer open={keywordModalOpen} onOpenChange={setKeywordModalOpen}>
                    <DrawerContent className="max-h-[50dvh]">
                        <DrawerTitle className="px-4 pt-3 text-sm font-semibold">Add Keyword</DrawerTitle>
                        {keywordModalContent}
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={keywordModalOpen} onOpenChange={setKeywordModalOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-sm">Add Keyword</DialogTitle>
                        </DialogHeader>
                        {keywordModalContent}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
