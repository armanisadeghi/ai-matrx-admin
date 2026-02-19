'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Settings, AlertCircle, ArrowRight, Zap, SlidersHorizontal, Hand, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTopicContext } from '../../context/ResearchContext';
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

const AUTONOMY_ICONS = { auto: Zap, semi: SlidersHorizontal, manual: Hand } as const;
const AUTONOMY_LABELS = { auto: 'Automatic', semi: 'Semi-Auto', manual: 'Manual' } as const;

export default function ResearchOverview() {
    const { topicId, progress, topic, refresh, isLoading, error } = useTopicContext();
    const api = useResearchApi();
    const isMobile = useIsMobile();

    const stream = useResearchStream(() => {
        refresh();
    });

    const [keywordModalOpen, setKeywordModalOpen] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [addingKeyword, setAddingKeyword] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const handleRun = useCallback(async () => {
        const response = await api.runPipeline(topicId);
        stream.startStream(response);
    }, [api, topicId, stream]);

    const handleSearch = useCallback(async () => {
        const response = await api.triggerSearch(topicId);
        stream.startStream(response);
    }, [api, topicId, stream]);

    const handleScrape = useCallback(async () => {
        const response = await api.triggerScrape(topicId);
        stream.startStream(response);
    }, [api, topicId, stream]);

    const handleAnalyze = useCallback(async () => {
        const response = await api.analyzeAll(topicId);
        stream.startStream(response);
    }, [api, topicId, stream]);

    const handleReport = useCallback(async () => {
        const response = await api.synthesize(topicId, {
            scope: 'project',
            iteration_mode: 'initial',
        });
        stream.startStream(response);
    }, [api, topicId, stream]);

    const handleRebuild = useCallback(async () => {
        const response = await api.synthesize(topicId, {
            scope: 'project',
            iteration_mode: 'rebuild',
        });
        stream.startStream(response);
    }, [api, topicId, stream]);

    const handleUpdate = useCallback(async () => {
        const response = await api.synthesize(topicId, {
            scope: 'project',
            iteration_mode: 'update',
        });
        stream.startStream(response);
    }, [api, topicId, stream]);

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
            <div className="p-4 sm:p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="flex gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-24 rounded-lg" />
                    ))}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!topic || error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60dvh] p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                    <AlertCircle className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold mb-2">Project Not Initialized</h2>
                <p className="text-muted-foreground text-sm max-w-md mb-6">
                    This project hasn&apos;t been set up yet. Complete the setup wizard to configure your research topic, keywords, and settings.
                </p>
                <Button asChild className="gap-2 min-h-[44px]">
                    <Link href="/p/research/topics/new">
                        Set Up Research
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        );
    }

    const hasReport = (progress?.project_syntheses ?? 0) > 0;
    const AutonomyIcon = AUTONOMY_ICONS[topic.autonomy_level];

    const keywordModalContent = (
        <div className="space-y-4 p-4">
            <Input
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="Enter a keyword..."
                className="text-base"
                style={{ fontSize: '16px' }}
                onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                autoFocus
            />
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setKeywordModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAddKeyword} disabled={!newKeyword.trim() || addingKeyword}>
                    Add Keyword
                </Button>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold truncate">{topic.name}</h1>
                        <StatusBadge status={topic.status} />
                    </div>
                    {topic.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                    )}
                    {/* Key settings pills — give the user visibility */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1 text-xs font-normal">
                            <AutonomyIcon className="h-3 w-3" />
                            {AUTONOMY_LABELS[topic.autonomy_level]}
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-xs font-normal">
                            <Search className="h-3 w-3" />
                            {topic.default_search_provider === 'brave' ? 'Brave Search' : 'Google'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-normal">
                            {topic.scrapes_per_keyword} scrapes / keyword
                        </Badge>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0 min-h-[36px]"
                    onClick={() => setSettingsOpen(true)}
                >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                </Button>
            </div>

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
                onClose={stream.clearMessages}
                onCancel={stream.cancel}
            />

            {/* Pipeline Cards — all clickable, navigate to the relevant section */}
            <PipelineCards topicId={topicId} progress={progress} />

            {/* Iteration Controls */}
            {hasReport && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <h2 className="text-sm font-semibold">Iterate on Research</h2>
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
                        <DrawerTitle className="px-4 pt-4 text-base font-semibold">Add Keyword</DrawerTitle>
                        {keywordModalContent}
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={keywordModalOpen} onOpenChange={setKeywordModalOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Keyword</DialogTitle>
                        </DialogHeader>
                        {keywordModalContent}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
