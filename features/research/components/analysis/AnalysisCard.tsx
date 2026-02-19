'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Brain, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useResearchApi } from '../../hooks/useResearchApi';
import type { ResearchAnalysis } from '../../types';

interface AnalysisCardProps {
    analysis: ResearchAnalysis | null;
    topicId?: string;
    sourceId?: string;
    onAnalyzed?: () => void;
}

export function AnalysisCard({ analysis, topicId, sourceId, onAnalyzed }: AnalysisCardProps) {
    const api = useResearchApi();
    const [expanded, setExpanded] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [retrying, setRetrying] = useState(false);

    const handleAnalyze = useCallback(async () => {
        if (!topicId || !sourceId) return;
        setAnalyzing(true);
        try {
            await api.analyzeSource(topicId, sourceId);
            onAnalyzed?.();
        } finally {
            setAnalyzing(false);
        }
    }, [api, topicId, sourceId, onAnalyzed]);

    const handleRetry = useCallback(async () => {
        if (!topicId || !analysis) return;
        setRetrying(true);
        try {
            await api.retryAnalysis(topicId, analysis.id);
            onAnalyzed?.();
        } finally {
            setRetrying(false);
        }
    }, [api, topicId, analysis, onAnalyzed]);

    // No analysis yet — prompt to run one
    if (!analysis) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">No analysis yet</div>
                <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={analyzing} className="gap-2 min-h-[44px] sm:min-h-0">
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    Analyze
                </Button>
            </div>
        );
    }

    const isFailed = analysis.status === 'failed';

    // Failed analysis — show error state with retry
    if (isFailed) {
        return (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="flex items-start gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-destructive">Analysis failed</span>
                                <Badge variant="secondary" className="text-[10px]">{analysis.agent_type}</Badge>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(analysis.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            {analysis.error && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{analysis.error}</p>
                            )}
                        </div>
                    </div>
                    {topicId && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRetry}
                            disabled={retrying}
                            className="gap-1.5 shrink-0 border-destructive/40 hover:border-destructive text-destructive hover:text-destructive min-h-[44px] sm:min-h-0"
                        >
                            {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Retry
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Successful analysis
    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Brain className="h-4 w-4 text-primary shrink-0" />
                    <Badge variant="secondary" className="text-[10px]">{analysis.agent_type}</Badge>
                    {analysis.model_id && (
                        <span className="text-xs text-muted-foreground truncate">{analysis.model_id}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        {new Date(analysis.created_at).toLocaleDateString()}
                    </span>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>

            {!expanded && analysis.result && (
                <div className="px-4 pb-3 text-xs text-muted-foreground line-clamp-2">
                    {analysis.result.slice(0, 200)}
                </div>
            )}

            {expanded && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {analysis.result ?? ''}
                        </ReactMarkdown>
                    </div>

                    {analysis.token_usage && (
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground border-t border-border pt-2">
                            {analysis.token_usage.input_tokens != null && (
                                <span>In: {analysis.token_usage.input_tokens.toLocaleString()}</span>
                            )}
                            {analysis.token_usage.output_tokens != null && (
                                <span>Out: {analysis.token_usage.output_tokens.toLocaleString()}</span>
                            )}
                            {analysis.token_usage.estimated_cost != null && (
                                <span>${analysis.token_usage.estimated_cost.toFixed(4)}</span>
                            )}
                        </div>
                    )}

                    {topicId && sourceId && (
                        <div className="flex justify-end">
                            <Button size="sm" variant="ghost" onClick={handleAnalyze} disabled={analyzing} className="gap-1.5 text-xs">
                                {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                Re-analyze
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
