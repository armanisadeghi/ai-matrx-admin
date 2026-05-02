'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Settings, AlertCircle, ArrowRight, Zap, SlidersHorizontal, Hand, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTopicContext, useStreamDebug } from '../../context/ResearchContext';
import { useResearchApi } from '../../hooks/useResearchApi';
import { useResearchStream } from '../../hooks/useResearchStream';
import { usePipelineProgress } from '../../hooks/usePipelineProgress';
import { PipelineCards } from './PipelineCards';
import { ActionBar } from './ActionBar';
import { LivePipelineActivity } from './live-pipeline/LivePipelineActivity';
import { CostMetricsCard } from './CostMetricsCard';
import { IterationControls } from '../iteration/IterationControls';
import { TopicSettingsPanel } from './TopicSettingsPanel';
import { StatusBadge } from '../shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ResearchInfoEvent } from '../../types';

const AUTONOMY_ICONS = { auto: Zap, semi: SlidersHorizontal, manual: Hand } as const;
const AUTONOMY_LABELS = { auto: 'Auto', semi: 'Semi', manual: 'Manual' } as const;

export default function ResearchOverview() {
    const { topicId, progress, topic, refresh, isLoading, error } = useTopicContext();
    const api = useResearchApi();
    const isMobile = useIsMobile();
    const debug = useStreamDebug();

    const stream = useResearchStream();
    const pipeline = usePipelineProgress({ topic });

    const [keywordModalOpen, setKeywordModalOpen] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [addingKeyword, setAddingKeyword] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Drives every live-pipeline view. The reducer in usePipelineProgress
    // converts each event into normalized stage/work-item state.
    const handleStreamData = useCallback((payload: import('../../types').ResearchDataEvent) => {
        pipeline.dispatch(payload);
        // Refresh topic + sources whenever the backend confirms persistence.
        if (
            payload.event === 'search_sources_stored' ||
            payload.event === 'search_complete' ||
            payload.event === 'pipeline_complete'
        ) {
            refresh();
        }
    }, [pipeline, refresh]);

    const handleStreamInfo = useCallback((info: ResearchInfoEvent) => {
        pipeline.dispatchInfo(info);
        if (info.code === 'quota_exceeded') {
            toast.warning(info.message);
        }
    }, [pipeline]);

    const handleStreamPhase = useCallback((step: import('../../types').ResearchStreamStep) => {
        pipeline.dispatchPhase(step);
    }, [pipeline]);

    type StartOpts = { iterationMode: 'initial' | 'rebuild' | 'update' };
    const startStream = useCallback(
        async (response: Response, label: string, opts: StartOpts = { iterationMode: 'initial' }) => {
            pipeline.reset({ iterationMode: opts.iterationMode });
            await stream.startStream(response, {
                onData: handleStreamData,
                onInfo: handleStreamInfo,
                onStatusUpdate: handleStreamPhase,
                onEnd: () => refresh(),
            });
            debug.pushEvents(stream.rawEvents, label);
        },
        [pipeline, stream, handleStreamData, handleStreamInfo, handleStreamPhase, refresh, debug],
    );

    const handleRun = useCallback(async () => {
        const response = await api.runPipeline(topicId);
        await startStream(response, 'pipeline');
    }, [api, topicId, startStream]);

    const handleSearch = useCallback(async () => {
        const response = await api.triggerSearch(topicId);
        await startStream(response, 'search');
    }, [api, topicId, startStream]);

    const handleScrape = useCallback(async () => {
        const response = await api.triggerScrape(topicId);
        await startStream(response, 'scrape');
    }, [api, topicId, startStream]);

    const handleAnalyze = useCallback(async () => {
        const response = await api.analyzeAll(topicId);
        await startStream(response, 'analyze-all');
    }, [api, topicId, startStream]);

    const handleReport = useCallback(async () => {
        const response = await api.synthesize(topicId, { scope: 'project', iteration_mode: 'initial' });
        await startStream(response, 'synthesize', { iterationMode: 'initial' });
    }, [api, topicId, startStream]);

    const handleRebuild = useCallback(async () => {
        const response = await api.synthesize(topicId, { scope: 'project', iteration_mode: 'rebuild' });
        await startStream(response, 'synthesize-rebuild', { iterationMode: 'rebuild' });
    }, [api, topicId, startStream]);

    const handleUpdate = useCallback(async () => {
        const response = await api.synthesize(topicId, { scope: 'project', iteration_mode: 'update' });
        await startStream(response, 'synthesize-update', { iterationMode: 'update' });
    }, [api, topicId, startStream]);

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

    if (!topic && !isLoading) {
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
                    className="inline-flex items-center h-8 px-4 rounded-full shell-glass-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
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
        <div className="p-2 space-y-3">
            {/* Header — compact shell-glass bar */}
            <div className="@container flex items-center gap-2 p-1.5 rounded-full shell-glass">
                <div className="min-w-0 flex-1 flex items-center gap-1.5 px-1 overflow-hidden">
                    <h1 className="text-xs font-semibold truncate">{topic.name}</h1>
                    <StatusBadge status={topic.status} className="shrink-0" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={cn(
                        'inline-flex items-center gap-0.5 h-5 rounded-full text-[9px] font-medium',
                        'shell-glass-card text-muted-foreground/70',
                        'px-1 @[18rem]:px-1.5',
                    )}>
                        <AutonomyIcon className="h-2.5 w-2.5 shrink-0" />
                        <span className="hidden @[18rem]:inline truncate">{AUTONOMY_LABELS[topic.autonomy_level]}</span>
                    </span>
                    <span className={cn(
                        'inline-flex items-center gap-0.5 h-5 rounded-full text-[9px] font-medium',
                        'shell-glass-card text-muted-foreground/70',
                        'px-1 @[18rem]:px-1.5',
                    )}>
                        <Search className="h-2.5 w-2.5 shrink-0" />
                        <span className="hidden @[18rem]:inline truncate">
                            {topic.default_search_provider === 'brave' ? 'Brave' : 'Google'}
                        </span>
                    </span>
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full shell-glass-card text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        <Settings className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Description — only if present, subtle */}
            {topic.description && (
                <p className="text-[11px] text-muted-foreground px-1 line-clamp-1">{topic.description}</p>
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

            {/* Live Pipeline Activity — replaces the legacy spinner-style ProgressPanel */}
            {(stream.isStreaming ||
                pipeline.state.activeStage ||
                pipeline.state.completedAt) && (
                <LivePipelineActivity
                    pipeline={pipeline}
                    topic={topic}
                    topicId={topicId}
                    isStreaming={stream.isStreaming}
                    streamingText={stream.streamingText}
                    error={stream.error}
                    rawEvents={stream.rawEvents}
                    onCancel={stream.cancel}
                    onClose={() => {
                        stream.clearMessages();
                        pipeline.reset();
                    }}
                    onSourceUpdated={refresh}
                />
            )}

            {/* Pipeline Cards */}
            <PipelineCards topicId={topicId} progress={progress} />

            {/* Cost summary — populated by backend cost_summary on each topic refresh */}
            <CostMetricsCard costSummary={topic.cost_summary} />

            {/* Iteration Controls */}
            {hasReport && (
                <div className="space-y-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Iterate</span>
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
