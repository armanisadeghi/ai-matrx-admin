'use client';

import { useCallback, useState, useMemo } from 'react';
import { ImageIcon, Play, File, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchMedia } from '../../hooks/useResearchState';
import { updateMedia } from '../../service';
import type { ResearchMedia } from '../../types';

const TYPE_ICONS = {
    image: ImageIcon,
    video: Play,
    document: File,
};

export default function MediaGallery() {
    const { topicId } = useTopicContext();
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [relevanceFilter, setRelevanceFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    const { data: media, refresh } = useResearchMedia(topicId);

    const mediaList = (media as ResearchMedia[]) ?? [];

    const filtered = useMemo(() => {
        let items = mediaList;
        if (typeFilter !== 'all') items = items.filter(m => m.media_type === typeFilter);
        if (relevanceFilter === 'relevant') items = items.filter(m => m.is_relevant);
        else if (relevanceFilter === 'excluded') items = items.filter(m => !m.is_relevant);
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(m =>
                (m.alt_text ?? '').toLowerCase().includes(q) ||
                (m.caption ?? '').toLowerCase().includes(q) ||
                m.url.toLowerCase().includes(q),
            );
        }
        return items;
    }, [mediaList, typeFilter, relevanceFilter, search]);

    const handleToggleRelevance = useCallback(async (item: ResearchMedia) => {
        await updateMedia(item.id, { is_relevant: !item.is_relevant });
        refresh();
    }, [refresh]);

    return (
        <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5">
                <span className="text-xs font-medium text-foreground/80">Media</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{filtered.length}/{mediaList.length}</span>
                <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search alt text, caption, url..."
                        className="w-full h-6 pl-7 pr-2 text-[11px] rounded-full glass-subtle border-0 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40"
                        style={{ fontSize: '16px' }}
                    />
                </div>
                <Select value={relevanceFilter} onValueChange={setRelevanceFilter}>
                    <SelectTrigger className="w-24 h-6 text-[11px] rounded-full glass-subtle border-0 shrink-0" style={{ fontSize: '16px' }}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="relevant">Relevant</SelectItem>
                        <SelectItem value="excluded">Excluded</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-24 h-6 text-[11px] rounded-full glass-subtle border-0 shrink-0" style={{ fontSize: '16px' }}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="video">Videos</SelectItem>
                        <SelectItem value="document">Docs</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-xs">
                        {mediaList.length === 0 ? 'No media found. Media is extracted during scraping.' : 'No media matches your filters.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {filtered.map(item => {
                        const Icon = TYPE_ICONS[item.media_type] ?? File;

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    'group relative rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden transition-all',
                                    item.is_relevant ? 'border-primary/20' : 'border-border/50 opacity-60',
                                )}
                            >
                                <div className="aspect-video bg-muted/50 flex items-center justify-center overflow-hidden">
                                    {item.media_type === 'image' && item.url ? (
                                        <img
                                            src={item.thumbnail_url || item.url}
                                            alt={item.alt_text || ''}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <Icon className="h-6 w-6 text-muted-foreground/30" />
                                    )}
                                </div>
                                <div className="p-1.5">
                                    <p className="text-[10px] truncate text-muted-foreground">
                                        {item.alt_text || item.caption || item.url}
                                    </p>
                                </div>
                                <Button
                                    variant={item.is_relevant ? 'default' : 'outline'}
                                    size="icon"
                                    className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                                    onClick={() => handleToggleRelevance(item)}
                                >
                                    {item.is_relevant ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
