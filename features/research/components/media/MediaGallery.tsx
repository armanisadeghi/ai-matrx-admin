'use client';

import { useCallback, useState } from 'react';
import { ImageIcon, Play, File, Check, X } from 'lucide-react';
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
    const [filter, setFilter] = useState<string>('all');

    const { data: media, refetch } = useResearchMedia(topicId);

    const mediaList = (media as ResearchMedia[]) ?? [];
    const filteredMedia = filter !== 'all' ? mediaList.filter(m => m.media_type === filter) : mediaList;

    const handleToggleRelevance = useCallback(async (item: ResearchMedia) => {
        await updateMedia(item.id, { is_relevant: !item.is_relevant });
        refetch();
    }, [refetch]);

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Media</h1>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-32 text-base sm:text-sm" style={{ fontSize: '16px' }}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Media</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="video">Videos</SelectItem>
                        <SelectItem value="document">Documents</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {filteredMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No media found. Media is extracted during scraping.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredMedia.map(item => {
                        const Icon = TYPE_ICONS[item.media_type] ?? File;

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    'group relative rounded-xl border bg-card overflow-hidden transition-all',
                                    item.is_relevant ? 'border-primary/30' : 'border-border opacity-60',
                                )}
                            >
                                {/* Thumbnail */}
                                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                                    {item.media_type === 'image' && item.url ? (
                                        <img
                                            src={item.thumbnail_url || item.url}
                                            alt={item.alt_text || ''}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <Icon className="h-8 w-8 text-muted-foreground/40" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-2">
                                    <p className="text-xs truncate">
                                        {item.alt_text || item.caption || item.url}
                                    </p>
                                </div>

                                {/* Relevance Toggle */}
                                <Button
                                    variant={item.is_relevant ? 'default' : 'outline'}
                                    size="icon"
                                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                                    onClick={() => handleToggleRelevance(item)}
                                >
                                    {item.is_relevant ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
