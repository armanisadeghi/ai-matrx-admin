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

            {/* ── Hero — full-width image with info below ───────────────── */}
            <div className="relative shrink-0 overflow-hidden bg-zinc-900">
                {/* Full-width cover art */}
                {coverImage ? (
                    <>
                        {/* Blurred fill so edges don't show white on non-square images */}
                        <img
                            src={coverImage}
                            alt=""
                            aria-hidden
                            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
                            loading="eager"
                            decoding="async"
                        />
                        <img
                            src={coverImage}
                            alt={show.title}
                            className="relative z-10 w-full object-cover"
                            style={{ maxHeight: '38vh' }}
                            loading="eager"
                            decoding="async"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </>
                ) : (
                    <div className="w-full flex items-center justify-center bg-zinc-900" style={{ height: '20vh' }}>
                        <Mic className="h-16 w-16 text-white/20" />
                    </div>
                )}
                {/* Gradient fade at bottom into the info row */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none z-20" />

                {/* Info row — sits over the gradient at the bottom of the image */}
                <div className="relative z-30 px-4 pb-3 pt-2 flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-white font-bold text-xl leading-tight line-clamp-1">{show.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            {show.author && (
                                <p className="text-white/60 text-xs truncate">by {show.author}</p>
                            )}
                            <p className="text-white/40 text-xs shrink-0">
                                · {publishedEpisodes.length} {publishedEpisodes.length === 1 ? 'episode' : 'episodes'}
                            </p>
                        </div>
                        {show.description && (
                            <p className="text-white/65 text-xs mt-1 line-clamp-2 leading-relaxed">{show.description}</p>
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
