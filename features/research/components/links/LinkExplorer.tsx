'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Plus, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchApi } from '../../hooks/useResearchApi';
import type { ExtractedLink } from '../../types';

export default function LinkExplorer() {
    const { topicId, refresh } = useTopicContext();
    const api = useResearchApi();
    const isMobile = useIsMobile();
    const [links, setLinks] = useState<ExtractedLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        api.getLinks(topicId)
            .then(res => res.json())
            .then((data: ExtractedLink[]) => {
                if (!cancelled) setLinks(data);
            })
            .catch(() => {
                if (!cancelled) setLinks([]);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [api, topicId]);

    const refetch = useCallback(() => {
        api.getLinks(topicId)
            .then(res => res.json())
            .then((data: ExtractedLink[]) => setLinks(data))
            .catch(() => setLinks([]));
    }, [api, topicId]);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);

    const linkList = (links as ExtractedLink[]) ?? [];

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
        <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Extracted Links</h1>
                {selected.size > 0 && (
                    <Button size="sm" onClick={() => handleAddToScope()} disabled={adding} className="gap-2 min-h-[44px] sm:min-h-0">
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Add {selected.size} to Scope
                    </Button>
                )}
            </div>

            {linkList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Link2 className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No extracted links yet. Links appear after scraping sources.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {linkList.map((link, i) => (
                        <div key={`${link.url}-${i}`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                            <Checkbox
                                checked={selected.has(link.url)}
                                onCheckedChange={() => toggleSelect(link.url)}
                                className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                                <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-primary hover:underline flex items-center gap-1 break-all"
                                >
                                    {link.link_text || link.url}
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                                {link.link_text && (
                                    <div className="text-xs text-muted-foreground truncate mt-0.5">{link.url}</div>
                                )}
                                {link.found_on_title && (
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                        Found on: {link.found_on_title}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddToScope([link.url])}
                                disabled={adding}
                                className="shrink-0 min-h-[44px] sm:min-h-0"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
