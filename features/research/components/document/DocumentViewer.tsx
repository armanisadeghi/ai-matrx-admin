'use client';

import { useState, useCallback, useMemo } from 'react';
import { RefreshCw, Download, History, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchApi } from '../../hooks/useResearchApi';
import { useResearchDocument } from '../../hooks/useResearchState';
import { useResearchStream } from '../../hooks/useResearchStream';
import { VersionHistory } from './VersionHistory';
import { VersionDiff } from './VersionDiff';
import type { ResearchDocument } from '../../types';

export default function DocumentViewer() {
    const { topicId, refresh } = useTopicContext();
    const api = useResearchApi();
    const isMobile = useIsMobile();
    const { data: docData, refetch: refetchDoc } = useResearchDocument(topicId);
    const stream = useResearchStream(() => { refetchDoc(); refresh(); });

    const [showHistory, setShowHistory] = useState(false);
    const [diffDocs, setDiffDocs] = useState<[ResearchDocument, ResearchDocument] | null>(null);

    const document = docData as ResearchDocument | null;

    const headings = useMemo(() => {
        if (!document?.content) return [];
        const matches = document.content.match(/^#{1,3}\s+.+$/gm);
        return (matches ?? []).map(h => {
            const level = h.match(/^#+/)?.[0].length ?? 1;
            const text = h.replace(/^#+\s+/, '');
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return { level, text, id };
        });
    }, [document?.content]);

    const handleRegenerate = useCallback(async () => {
        const response = await api.generateDocument(topicId);
        stream.startStream(response);
    }, [api, topicId, stream]);

    const handleExport = useCallback(async (format: string) => {
        if (!document) return;
        try {
            if (format === 'json') {
                const content = JSON.stringify({ title: document.title, content: document.content, version: document.version }, null, 2);
                const blob = new Blob([content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = `research-${topicId}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // For other formats, download as text for now
                const blob = new Blob([document.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = `research-${topicId}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch {
            // fallback — download as text
        }
    }, [document, topicId]);

    if (!document) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
                <FileText className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">No document generated yet.</p>
                <Button onClick={handleRegenerate} disabled={stream.isStreaming} className="gap-2">
                    {stream.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Generate Document
                </Button>
            </div>
        );
    }

    if (document.status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
                <AlertTriangle className="h-12 w-12 text-destructive/60" />
                <div className="text-center space-y-1">
                    <p className="font-medium text-destructive">Document generation failed</p>
                    {document.error && (
                        <p className="text-sm text-muted-foreground max-w-md">{document.error}</p>
                    )}
                </div>
                <Button onClick={handleRegenerate} disabled={stream.isStreaming} variant="outline" className="gap-2">
                    {stream.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Retry Generation
                </Button>
            </div>
        );
    }

    if (diffDocs) {
        return (
            <VersionDiff
                oldDoc={diffDocs[0]}
                newDoc={diffDocs[1]}
                onClose={() => setDiffDocs(null)}
            />
        );
    }

    return (
        <div className="flex h-full min-h-0">
            {/* TOC Sidebar — Desktop Only */}
            {!isMobile && headings.length > 2 && (
                <aside className="hidden lg:block w-48 shrink-0 border-r border-border overflow-y-auto py-4 px-3">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Contents</div>
                    <nav className="space-y-1">
                        {headings.map((h, i) => (
                            <a
                                key={i}
                                href={`#${h.id}`}
                                className="block text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
                                style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                            >
                                {h.text}
                            </a>
                        ))}
                    </nav>
                </aside>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold">{document.title ?? 'Research Document'}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px]">v{document.version}</Badge>
                            <span className="text-xs text-muted-foreground">
                                {new Date(document.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={stream.isStreaming} className="gap-1.5 min-h-[44px] sm:min-h-0">
                            {stream.isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Regenerate
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px] sm:min-h-0">
                                    <Download className="h-3.5 w-3.5" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleExport('json')}>Export as JSON</DropdownMenuItem>
                                <DropdownMenuItem disabled>Export as PDF (coming soon)</DropdownMenuItem>
                                <DropdownMenuItem disabled>Export as DOCX (coming soon)</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-1.5 min-h-[44px] sm:min-h-0">
                            <History className="h-3.5 w-3.5" />
                            History
                        </Button>
                    </div>
                </div>

                {/* Token usage */}
                {document.token_usage && (
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-4 pb-4 border-b border-border">
                        {document.token_usage.input_tokens != null && (
                            <span>Input: {document.token_usage.input_tokens.toLocaleString()} tokens</span>
                        )}
                        {document.token_usage.output_tokens != null && (
                            <span>Output: {document.token_usage.output_tokens.toLocaleString()} tokens</span>
                        )}
                        {document.token_usage.estimated_cost != null && (
                            <span>Cost: ${document.token_usage.estimated_cost.toFixed(4)}</span>
                        )}
                    </div>
                )}

                {/* Markdown Content */}
                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-4">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({ children, ...props }) => <h1 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h1>,
                            h2: ({ children, ...props }) => <h2 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h2>,
                            h3: ({ children, ...props }) => <h3 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h3>,
                        }}
                    >
                        {document.content ?? ''}
                    </ReactMarkdown>
                </article>
            </div>

            {/* Version History */}
            <VersionHistory
                open={showHistory}
                onOpenChange={setShowHistory}
                topicId={topicId}
                currentVersion={document.version}
                onCompare={(old, current) => {
                    setDiffDocs([old, current]);
                    setShowHistory(false);
                }}
            />
        </div>
    );
}
