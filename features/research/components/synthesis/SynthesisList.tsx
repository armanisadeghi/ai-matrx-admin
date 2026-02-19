'use client';

import { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchSynthesis, useResearchKeywords } from '../../hooks/useResearchState';
import { useResearchApi } from '../../hooks/useResearchApi';
import { useResearchStream } from '../../hooks/useResearchStream';
import type { ResearchSynthesis } from '../../types';

function SynthesisCard({ synthesis, label }: { synthesis: ResearchSynthesis; label: string }) {
    const [expanded, setExpanded] = useState(false);

    const statusColors: Record<string, string> = {
        complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        error:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors min-h-[44px]"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{label}</span>
                        <Badge variant="secondary" className={cn('text-[10px] font-normal capitalize', statusColors[synthesis.status] ?? '')}>
                            {synthesis.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">{synthesis.scope}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(synthesis.created_at).toLocaleDateString()} · v{synthesis.version}
                    </p>
                </div>
                {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
            </button>

            {expanded && (
                <div className="border-t border-border px-4 py-4">
                    {synthesis.error ? (
                        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            {synthesis.error}
                        </div>
                    ) : synthesis.result ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {synthesis.result}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No result yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SynthesisList() {
    const { topicId } = useTopicContext();
    const api = useResearchApi();
    const stream = useResearchStream(() => {});

    const { data: allSyntheses, isLoading: synthLoading } = useResearchSynthesis(topicId);
    const { data: keywords } = useResearchKeywords(topicId);

    const projectSyntheses = (allSyntheses ?? []).filter(s => s.scope === 'project');
    const keywordSyntheses = (allSyntheses ?? []).filter(s => s.scope === 'keyword');

    const getKeywordLabel = (kwId: string | null) => {
        if (!kwId) return 'Unknown Keyword';
        const kw = (keywords ?? []).find(k => k.id === kwId);
        return kw ? kw.keyword : 'Keyword';
    };

    const handleRunProjectSynthesis = async () => {
        const res = await api.synthesize(topicId, { scope: 'project', iteration_mode: 'initial' });
        stream.startStream(res);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4 border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold">Synthesis</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            AI-generated analyses across keywords and the full topic
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 shrink-0 min-h-[36px]"
                        onClick={handleRunProjectSynthesis}
                        disabled={stream.isStreaming}
                    >
                        {stream.isStreaming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Run Synthesis</span>
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {synthLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Project-level syntheses */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Project Report
                                </h2>
                                <Badge variant="secondary" className="text-[10px]">{projectSyntheses.length}</Badge>
                            </div>
                            {projectSyntheses.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        No project synthesis yet. Run the pipeline or click &ldquo;Run Synthesis&rdquo; above.
                                    </p>
                                </div>
                            ) : (
                                projectSyntheses.map(s => (
                                    <SynthesisCard key={s.id} synthesis={s} label="Project Report" />
                                ))
                            )}
                        </section>

                        {/* Keyword syntheses */}
                        {keywordSyntheses.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Keyword Syntheses
                                    </h2>
                                    <Badge variant="secondary" className="text-[10px]">{keywordSyntheses.length}</Badge>
                                </div>
                                {keywordSyntheses.map(s => (
                                    <SynthesisCard
                                        key={s.id}
                                        synthesis={s}
                                        label={getKeywordLabel(s.keyword_id)}
                                    />
                                ))}
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
