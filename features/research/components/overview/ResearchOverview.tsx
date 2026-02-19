'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Settings, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchApi } from '../../hooks/useResearchApi';
import { useResearchStream } from '../../hooks/useResearchStream';
import { PipelineCards } from './PipelineCards';
import { ActionBar } from './ActionBar';
import { ProgressPanel } from './ProgressPanel';
import { IterationControls } from '../iteration/IterationControls';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';

export default function ResearchOverview() {
    const { topicId, progress, topic, refresh, isLoading, error } = useTopicContext();
    const api = useResearchApi();
    const isMobile = useIsMobile();

    const stream = useResearchStream(() => {
        refresh();
    });

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

    const [keywordModalOpen, setKeywordModalOpen] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [addingKeyword, setAddingKeyword] = useState(false);

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

    const hasReport = (progress?.project_syntheses ?? 0) > 0;

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Research Overview</h1>
                    {topic && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {topic.subject_name || 'Research Project'} &middot; {topic.autonomy_level}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                        <Link href="/p/research/topics/new">
                            <Settings className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
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

            {/* Pipeline Cards */}
            <PipelineCards progress={progress} />

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

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Link
                    href={`/p/research/topics/${topicId}/sources`}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                >
                    <div className="text-sm font-medium">View Sources</div>
                    <div className="text-xs text-muted-foreground mt-1">{progress?.total_sources ?? 0} sources</div>
                </Link>
                <Link
                    href={`/p/research/topics/${topicId}/document`}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                >
                    <div className="text-sm font-medium">View Document</div>
                    <div className="text-xs text-muted-foreground mt-1">{progress?.total_documents ?? 0} versions</div>
                </Link>
                <Link
                    href={`/p/research/topics/${topicId}/tags`}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                >
                    <div className="text-sm font-medium">Manage Tags</div>
                    <div className="text-xs text-muted-foreground mt-1">{progress?.total_tags ?? 0} tags</div>
                </Link>
            </div>

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
