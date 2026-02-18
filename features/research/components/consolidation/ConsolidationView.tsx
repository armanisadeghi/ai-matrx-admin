'use client';

import { useCallback, useState } from 'react';
import { ChevronLeft, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from '@tanstack/react-query';
import { useResearchApi } from '../../hooks/useResearchApi';
import type { ResearchTag, TagConsolidation } from '../../types';

interface ConsolidationViewProps {
    projectId: string;
    tagId: string;
}

export default function ConsolidationView({ projectId, tagId }: ConsolidationViewProps) {
    const api = useResearchApi();
    const [consolidating, setConsolidating] = useState(false);

    const { data: tags } = useQuery({
        queryKey: ['research-tags', projectId],
        queryFn: async ({ signal }) => {
            const res = await api.getTags(projectId, signal);
            return res.json() as Promise<ResearchTag[]>;
        },
    });

    const tag = tags?.find(t => t.id === tagId);

    const handleConsolidate = useCallback(async () => {
        setConsolidating(true);
        try {
            await api.consolidateTag(projectId, tagId);
        } finally {
            setConsolidating(false);
        }
    }, [api, projectId, tagId]);

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <Link href={`/p/research/${projectId}/tags`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
                Back to Tags
            </Link>

            {tag && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold">{tag.name}</h1>
                            {tag.description && (
                                <p className="text-sm text-muted-foreground mt-1">{tag.description}</p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleConsolidate}
                            disabled={consolidating}
                            className="gap-2 min-h-[44px] sm:min-h-0"
                        >
                            {consolidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Re-consolidate
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-muted-foreground text-sm">
                        Tag consolidation content will appear here after running consolidation.
                        Click &ldquo;Re-consolidate&rdquo; to generate or refresh the consolidated view.
                    </p>
                </div>
            </div>
        </div>
    );
}
