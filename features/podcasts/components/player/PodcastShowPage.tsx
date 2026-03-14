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
        <div className="h-full w-full overflow-y-auto overscroll-contain bg-background">
            {/* ── Hero ─────────────────────────────────────────────────── */}
            <div className="relative w-full overflow-hidden bg-zinc-900">
                {/* Blurred background fill — always covers the full area */}
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

                {/* Foreground hero content */}
                <div className="relative z-10 px-4 pt-8 pb-10 max-w-2xl mx-auto flex flex-col items-center text-center gap-5">
                    {/* Cover art — big, prominent, with shadow */}
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt={show.title}
                            className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl object-cover shadow-2xl ring-1 ring-white/10"
                            loading="eager"
                            decoding="async"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-48 h-48 rounded-3xl bg-white/10 flex items-center justify-center shadow-2xl">
                            <Mic className="h-20 w-20 text-white/30" />
                        </div>
                    )}

                    {/* Titles */}
                    <div>
                        <h1 className="text-white font-bold text-3xl leading-tight">{show.title}</h1>
                        {show.author && (
                            <p className="text-white/60 text-sm mt-1">by {show.author}</p>
                        )}
                        <p className="text-white/40 text-xs mt-1.5">
                            {publishedEpisodes.length} {publishedEpisodes.length === 1 ? 'episode' : 'episodes'}
                        </p>
                    </div>

                    {/* Full description */}
                    {show.description && (
                        <p className="text-white/75 text-sm leading-relaxed max-w-md">{show.description}</p>
                    )}
                </div>
            </div>

            {/* ── Episode list ─────────────────────────────────────────── */}
            <div className="max-w-2xl mx-auto px-4 pt-2 pb-10">
                {publishedEpisodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Music className="h-12 w-12 opacity-20" />
                        <p className="text-sm">No episodes published yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 pt-4">
                        {publishedEpisodes.map((ep, idx) => (
                            <Link
                                key={ep.id}
                                href={`/p/podcast/${ep.slug}`}
                                className="group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                            >
                                {/* Thumbnail or fallback */}
                                <div className="relative shrink-0">
                                    {(ep.thumbnail_url ?? ep.image_url ?? coverImage) ? (
                                        <img
                                            src={(ep.thumbnail_url ?? ep.image_url ?? coverImage)!}
                                            alt={ep.title}
                                            className="w-16 h-16 rounded-xl object-cover shadow-sm"
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                                            <Music className="h-7 w-7 text-muted-foreground/50" />
                                        </div>
                                    )}
                                </div>

                                {/* Text */}
                                <div className="min-w-0 flex-1">
                                    {ep.episode_number != null && (
                                        <p className="text-xs text-muted-foreground mb-0.5">Episode {ep.episode_number}</p>
                                    )}
                                    <p className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                        {ep.title}
                                    </p>
                                    {ep.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{ep.description}</p>
                                    )}
                                    {ep.duration_seconds != null && (
                                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
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
    );
}
