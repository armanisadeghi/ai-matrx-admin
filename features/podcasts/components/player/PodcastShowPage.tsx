'use client';

import React from 'react';
import { Music, Mic, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { PcShow, PcEpisode } from '../../types';

interface PodcastShowPageProps {
    show: PcShow;
    episodes: PcEpisode[];
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function PodcastShowPage({ show, episodes }: PodcastShowPageProps) {
    const publishedEpisodes = episodes.filter((e) => e.is_published);
    const coverImage = show.image_url ?? null;

    return (
        // Outer: fills the parent exactly — no overflow at this level
        <div className="h-full w-full flex flex-col overflow-hidden bg-background">

            {/* ── Hero — fixed height, never grows ─────────────────────── */}
            <div className="relative shrink-0 overflow-hidden bg-zinc-900">
                {coverImage && (
                    <img
                        src={coverImage}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
                        loading="eager"
                        decoding="async"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/80 pointer-events-none" />

                <div className="relative z-10 px-4 pt-5 pb-5 max-w-2xl mx-auto flex items-center gap-4">
                    {/* Cover art — compact on mobile */}
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt={show.title}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-2xl ring-1 ring-white/10 shrink-0"
                            loading="eager"
                            decoding="async"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center shadow-2xl shrink-0">
                            <Mic className="h-10 w-10 text-white/30" />
                        </div>
                    )}

                    {/* Title + meta — text truncated to prevent hero from growing */}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-white font-bold text-xl leading-tight line-clamp-2">{show.title}</h1>
                        {show.author && (
                            <p className="text-white/60 text-sm mt-0.5 truncate">by {show.author}</p>
                        )}
                        <p className="text-white/40 text-xs mt-1">
                            {publishedEpisodes.length} {publishedEpisodes.length === 1 ? 'episode' : 'episodes'}
                        </p>
                        {show.description && (
                            <p className="text-white/70 text-xs mt-1.5 line-clamp-2 leading-relaxed">{show.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Episode list — flex-1 takes remaining height, scrolls internally ── */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    {publishedEpisodes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 gap-3 text-muted-foreground">
                            <Music className="h-12 w-12 opacity-20" />
                            <p className="text-sm">No episodes published yet.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {publishedEpisodes.map((ep) => (
                                <Link
                                    key={ep.id}
                                    href={`/p/podcast/${ep.slug}`}
                                    className="group flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                                >
                                    <div className="relative shrink-0">
                                        {(ep.thumbnail_url ?? ep.image_url ?? coverImage) ? (
                                            <img
                                                src={(ep.thumbnail_url ?? ep.image_url ?? coverImage)!}
                                                alt={ep.title}
                                                className="w-14 h-14 rounded-xl object-cover shadow-sm"
                                                loading="lazy"
                                                decoding="async"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                                                <Music className="h-6 w-6 text-muted-foreground/50" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        {ep.episode_number != null && (
                                            <p className="text-xs text-muted-foreground mb-0.5">Ep {ep.episode_number}</p>
                                        )}
                                        <p className="font-semibold text-sm text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                            {ep.title}
                                        </p>
                                        {ep.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">{ep.description}</p>
                                        )}
                                        {ep.duration_seconds != null && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatDuration(ep.duration_seconds)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
