'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRead } from "@ai-matrx/design-system";
import { ReadFailure } from '@ai-matrx/design-system';
import { UntrustedCount } from '@ai-matrx/design-system';
import { ExternalLink, Plus, Loader2, Link2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@ai-matrx/design-system/controls';
import { Checkbox } from '@/components/ui/checkbox';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchApi } from '../../hooks/useResearchApi';
import type { ExtractedLink } from '../../types';
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

export default function LinkExplorer() {
    const { topicId, refresh } = useTopicContext();
    const api = useResearchApi();
    const linksRead = useRead(
        async () => {
            const res = await api.getLinks(topicId);
            if (!res.ok) {
                throw new Error(`Links request failed (${res.status} ${res.statusText})`);
            }
            return (await res.json()) as ExtractedLink[];
        },
        [topicId],
        { initialData: [] as ExtractedLink[] },
    );
    const links = linksRead.data ?? [];
    const isLoading = linksRead.isLoading && links.length === 0;
    const refetch = linksRead.retry;
    const [search, setSearch] = useState('');

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);

    const linkList = (links as ExtractedLink[]) ?? [];

    const filtered = useMemo(() => {
        if (!search) return linkList;
        const q = search.toLowerCase();
        return linkList.filter(l =>
            l.url.toLowerCase().includes(q) ||
            (l.link_text ?? '').toLowerCase().includes(q) ||
            (l.found_on_title ?? '').toLowerCase().includes(q) ||
            (l.found_on_url ?? '').toLowerCase().includes(q),
        );
    }, [linkList, search]);

    const toggleSelect = useCallback((url: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(url)) next.delete(url); else next.add(url);
            return next;
        });
    }, []);

    const handleAddToScope = useCallback(async (urls?: string[]) => {
        const urlsToAdd = urls || [...selected];
        if (urlsToAdd.length === 0) return;
        setAdding(true);
        try {
            await api.addLinksToScope(topicId, { urls: urlsToAdd });
            setSelected(new Set());
            refetch();
            refresh();
        } finally {
            setAdding(false);
        }
    }, [api, topicId, selected, refetch, refresh]);

    return (
        <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
                <span className="type-secondary font-medium text-foreground/80">Links</span>
                <span className="type-meta text-muted-foreground tabular-nums">
                    <UntrustedCount read={linksRead} value={`${filtered.length}/${linkList.length}`} label="Links" />
                </span>
                <div className="flex-1">
                    <Field
                        icon={<Search />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search url, text, source..."
                    />
                </div>
                {selected.size > 0 && (
                    <Button
                        variant="outline"
                        onClick={() => handleAddToScope()}
                        disabled={adding}
                        icon={adding ? <Loader2 className="animate-spin" /> : <Plus />}
                    >
                        Add {selected.size}
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="type-secondary">Loading links...</span>
                </div>
            ) : linksRead.isError && linkList.length === 0 ? (
                <ReadFailure error={linksRead.error} what="this topic's links" onRetry={refetch} />
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[280px] gap-3 text-center px-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center">
                        <Link2 className="h-6 w-6 text-primary/40" />
                    </div>
                    <div>
                        <p className="type-secondary font-medium text-foreground/70">
                            {linkList.length === 0 ? 'No links yet' : 'No matches'}
                        </p>
                        <p className="type-meta text-muted-foreground mt-1 max-w-[240px]">
                            {linkList.length === 0
                                ? 'Links are automatically extracted from pages when you read your sources.'
                                : 'Try adjusting your search to find what you\'re looking for.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {filtered.map((link, i) => (
                        <div key={`${link.url}-${i}`} className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-2.5">
                            <Checkbox
                                checked={selected.has(link.url)}
                                onCheckedChange={() => toggleSelect(link.url)}
                                className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                                <OutboundLink
                                    href={link.url}
                                    className="type-secondary font-medium text-primary hover:underline flex items-center gap-1 break-all"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {link.link_text || link.url}
                                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                </OutboundLink>
                                {link.link_text && (
                                    <div className="type-meta text-muted-foreground truncate mt-px">{link.url}</div>
                                )}
                                {link.found_on_title && (
                                    <div className="type-meta text-muted-foreground mt-0.5">
                                        from: {link.found_on_title}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="quiet"
                                onClick={() => handleAddToScope([link.url])}
                                disabled={adding}
                                className="shrink-0"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
