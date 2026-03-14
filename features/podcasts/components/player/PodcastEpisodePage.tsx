'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import type { PcEpisodeWithShow } from '../../types';
import { PodcastAudioPlayer } from './PodcastAudioPlayer';

interface PodcastEpisodePageProps {
    episode: PcEpisodeWithShow;
}

export function PodcastEpisodePage({ episode }: PodcastEpisodePageProps) {
    const coverImage = episode.image_url ?? episode.show?.image_url ?? null;
    const thumbnailImage = episode.thumbnail_url ?? episode.show?.thumbnail_url ?? coverImage;
    const [videoFailed, setVideoFailed] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);

    const coverExists = !!(episode.title || coverImage || episode.description);
    const effectiveMode = (() => {
        if (episode.display_mode === 'with_video' && episode.video_url && !videoFailed) return 'with_video';
        if ((episode.display_mode === 'with_metadata' || episode.display_mode === 'with_video') && coverExists) return 'with_metadata';
        return 'audio_only';
    })();

    useEffect(() => {
        if (effectiveMode !== 'with_video' || !episode.video_url) return;
        const id = setTimeout(() => setVideoSrc(episode.video_url!), 300);
        return () => clearTimeout(id);
    }, [effectiveMode, episode.video_url]);

    // ── Video mode — full viewport, no scroll ──────────────────────────────
    if (effectiveMode === 'with_video') {
        return (
            <div className="h-full w-full relative flex flex-col overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    src={videoSrc ?? undefined}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    onError={() => setVideoFailed(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/95 pointer-events-none" />

                {/* Fixed bottom content — no scroll, fits in viewport */}
                <div className="relative z-10 h-full flex flex-col justify-end px-4 pb-8 max-w-lg mx-auto w-full">
                    <div className="mb-4">
                        {episode.show?.title && (
                            <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1 truncate">{episode.show.title}</p>
                        )}
                        <h1 className="text-white font-bold text-xl leading-tight line-clamp-2">{episode.title}</h1>
                        {episode.description && (
                            <p className="text-white/60 text-sm mt-1.5 leading-relaxed line-clamp-2">{episode.description}</p>
                        )}
                    </div>

                    <div className="bg-black/60 backdrop-blur-xl rounded-3xl p-4 border border-white/10 shadow-2xl">
                        <PodcastAudioPlayer
                            audioUrl={episode.audio_url}
                            title={episode.title}
                            coverImageUrl={thumbnailImage ?? undefined}
                            dark
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ── Metadata mode — fixed layout, no page scroll ───────────────────────
    if (effectiveMode === 'with_metadata') {
        return (
            <div className="h-full w-full flex flex-col overflow-hidden bg-background">
                {/* Hero image — takes up the top portion, constrained */}
                <div className="relative shrink-0 overflow-hidden bg-zinc-900" style={{ height: '38%' }}>
                    {coverImage ? (
                        <>
                            <img
                                src={coverImage}
                                alt=""
                                aria-hidden
                                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
                                loading="eager"
                                decoding="async"
                            />
                            <img
                                src={coverImage}
                                alt={episode.title}
                                className="relative z-10 w-full h-full object-contain"
                                loading="eager"
                                decoding="async"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Music className="h-20 w-20 text-white/20" />
                        </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                </div>

                {/* Content below image — takes remaining height, scrolls only if needed */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                    <div className="px-4 pt-3 pb-6 max-w-lg mx-auto">
                        {episode.show?.title && (
                            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">{episode.show.title}</p>
                        )}
                        {episode.episode_number != null && (
                            <p className="text-xs text-muted-foreground mb-0.5">Episode {episode.episode_number}</p>
                        )}
                        <h1 className="text-foreground font-bold text-xl leading-tight mb-3">{episode.title}</h1>

                        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-4">
                            <PodcastAudioPlayer
                                audioUrl={episode.audio_url}
                                title={episode.title}
                            />
                        </div>

                        {episode.description && (
                            <div>
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About this episode</h2>
                                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{episode.description}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Audio only — perfectly centered, no scroll ─────────────────────────
    return (
        <div className="h-full w-full flex flex-col items-center justify-center overflow-hidden bg-background px-4">
            <div className="w-full max-w-sm flex flex-col items-center gap-5">
                <div className="w-28 h-28 rounded-3xl bg-primary/10 flex items-center justify-center shadow-lg">
                    <Music className="h-12 w-12 text-primary/50" />
                </div>
                {episode.title && (
                    <h1 className="text-foreground font-bold text-xl text-center leading-snug line-clamp-3">{episode.title}</h1>
                )}
                <div className="w-full bg-card rounded-2xl border border-border shadow-sm p-4">
                    <PodcastAudioPlayer
                        audioUrl={episode.audio_url}
                        title={episode.title}
                    />
                </div>
            </div>
        </div>
    );
}
