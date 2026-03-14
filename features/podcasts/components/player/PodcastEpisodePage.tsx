'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Music, Play, Pause } from 'lucide-react';
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

    // Defer video load so audio gets bandwidth priority
    useEffect(() => {
        if (effectiveMode !== 'with_video' || !episode.video_url) return;
        const id = setTimeout(() => setVideoSrc(episode.video_url!), 300);
        return () => clearTimeout(id);
    }, [effectiveMode, episode.video_url]);

    // ── Video mode ─────────────────────────────────────────────────────────
    if (effectiveMode === 'with_video') {
        return (
            <div className="h-full w-full relative flex flex-col overflow-hidden bg-black">
                {/* Full-bleed background video — muted always, no audio interference */}
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
                {/* Layered gradients: top for legibility, heavy bottom for player */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/95 pointer-events-none" />

                {/* Scrollable content layer */}
                <div className="relative z-10 h-full overflow-y-auto overscroll-contain">
                    <div className="min-h-full flex flex-col justify-end px-4 pt-16 pb-8 max-w-lg mx-auto">
                        {/* Episode info */}
                        <div className="mb-4">
                            {episode.show?.title && (
                                <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">{episode.show.title}</p>
                            )}
                            <h1 className="text-white font-bold text-2xl leading-tight">{episode.title}</h1>
                            {episode.description && (
                                <p className="text-white/60 text-sm mt-2 leading-relaxed">{episode.description}</p>
                            )}
                        </div>

                        {/* Player card */}
                        <div className="bg-black/60 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-2xl">
                            <PodcastAudioPlayer
                                audioUrl={episode.audio_url}
                                title={episode.title}
                                coverImageUrl={thumbnailImage ?? undefined}
                                dark
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Metadata mode ──────────────────────────────────────────────────────
    if (effectiveMode === 'with_metadata') {
        return (
            <div className="h-full w-full overflow-y-auto overscroll-contain bg-background">
                {/* Hero — image takes up the top third of the screen, edge-to-edge */}
                <div className="relative w-full aspect-square sm:aspect-video max-h-[50vh] overflow-hidden bg-zinc-900">
                    {coverImage ? (
                        <>
                            {/* Blurred background fill */}
                            <img
                                src={coverImage}
                                alt=""
                                aria-hidden
                                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
                                loading="eager"
                                decoding="async"
                            />
                            {/* Sharp foreground image, centered and contained */}
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
                    {/* Bottom fade into background */}
                    <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                </div>

                {/* Content below image */}
                <div className="px-4 pb-10 max-w-lg mx-auto -mt-2">
                    {/* Show name + episode metadata */}
                    {episode.show?.title && (
                        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">{episode.show.title}</p>
                    )}
                    {episode.episode_number != null && (
                        <p className="text-xs text-muted-foreground mb-1">Episode {episode.episode_number}</p>
                    )}
                    <h1 className="text-foreground font-bold text-2xl leading-tight mb-4">{episode.title}</h1>

                    {/* Player */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-6">
                        <PodcastAudioPlayer
                            audioUrl={episode.audio_url}
                            title={episode.title}
                        />
                    </div>

                    {/* Full description — no truncation, this is the content */}
                    {episode.description && (
                        <div>
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">About this episode</h2>
                            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{episode.description}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Audio only ─────────────────────────────────────────────────────────
    return (
        <div className="h-full w-full overflow-y-auto overscroll-contain bg-background flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm flex flex-col items-center gap-6 py-10">
                <div className="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center shadow-lg">
                    <Music className="h-14 w-14 text-primary/50" />
                </div>
                {episode.title && (
                    <h1 className="text-foreground font-bold text-xl text-center leading-snug">{episode.title}</h1>
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
