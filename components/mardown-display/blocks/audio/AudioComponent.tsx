"use client";
/**
 * AudioComponent — rich multi-track player in portrait or landscape layout.
 *
 * These are the "full-page" / "showcase" variants of the audio player.
 * For the inline chat block, use AudioOutputBlock instead.
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Music,
} from "lucide-react";

export interface AudioTrack {
  url: string;
  cover?: string | null;
  title: string;
  artist: string;
}

export interface AudioComponentProps {
  tracks: AudioTrack[];
  autoPlay?: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────────────────── */

function formatTime(t: number): string {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/** Themed range slider using CSS vars */
function RangeTrack({
  min,
  max,
  value,
  step,
  onChange,
  thin = false,
}: {
  min: number;
  max: number;
  value: number;
  step?: number;
  onChange: (v: number) => void;
  thin?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <>
      <input
        type="range"
        min={min}
        max={max || 0}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full appearance-none cursor-pointer rounded-full audio-component-range ${thin ? "h-1" : "h-1.5"}`}
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)`,
        }}
      />
      <style>{`
        input[type='range'].audio-component-range::-webkit-slider-thumb {
          appearance: none;
          width: 13px; height: 13px;
          background: hsl(var(--primary));
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid hsl(var(--background));
          box-shadow: 0 0 8px hsl(var(--primary) / 0.5);
          transition: transform 0.15s;
        }
        input[type='range'].audio-component-range:hover::-webkit-slider-thumb {
          transform: scale(1.3);
        }
        input[type='range'].audio-component-range::-moz-range-thumb {
          width: 13px; height: 13px;
          background: hsl(var(--primary));
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid hsl(var(--background));
        }
      `}</style>
    </>
  );
}

/** Pseudo-visualizer bars (CSS animation only) */
function Visualizer({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-10 mb-6">
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full transition-all duration-500"
          style={{
            height: active ? `${20 + ((i * 37 + 13) % 80)}%` : "15%",
            background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--secondary)))`,
            animation: active
              ? `vis-bounce ${0.5 + (i % 4) * 0.13}s ease-in-out infinite alternate`
              : "none",
            animationDelay: `${i * 0.04}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes vis-bounce {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}

/** Cover art with branded placeholder */
function CoverArt({
  src,
  title,
  isPlaying,
  className = "w-full aspect-square",
  rounded = "rounded-2xl",
}: {
  src?: string | null;
  title?: string;
  isPlaying: boolean;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className} ${rounded} shadow-xl`}
    >
      {src ? (
        <img
          src={src}
          alt={title ?? "Album art"}
          className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? "scale-110" : "scale-100"}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--primary)/0.12)] to-[hsl(var(--secondary)/0.12)] border border-border">
          {isPlaying && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-6 rounded-full bg-primary/5 animate-ping" />
            </div>
          )}
          <div
            className={`p-6 rounded-full border border-border bg-card/60 backdrop-blur-sm transition-all duration-700 ${isPlaying ? "scale-110 shadow-lg shadow-primary/20" : "scale-100"}`}
          >
            <Music size={48} className="text-primary/60" strokeWidth={1.5} />
          </div>
          <span className="mt-4 text-[10px] font-bold tracking-[0.2em] text-muted-foreground/50 uppercase">
            No Artwork
          </span>
        </div>
      )}
      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Portrait layout
───────────────────────────────────────────────────────────────────────────── */

export const AudioComponentPortrait: React.FC<AudioComponentProps> = ({
  tracks,
  autoPlay = false,
}) => {
  const [idx, setIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const track = tracks[idx];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        setIdx((i) => (i + 1 < tracks.length ? i + 1 : 0));
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [isRepeat, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, idx]);

  const skip = useCallback(
    (dir: "prev" | "next") => {
      setIdx((i) => {
        const n = dir === "next" ? i + 1 : i - 1;
        return ((n % tracks.length) + tracks.length) % tracks.length;
      });
    },
    [tracks.length],
  );

  const changeVolume = (v: number) => {
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 w-full max-w-sm mx-auto shadow-md">
      <audio ref={audioRef} src={track.url} />

      {/* Now Playing label */}
      <div className="text-center mb-4">
        <span className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
          Now Playing
        </span>
      </div>

      {/* Cover art */}
      <div className="mb-5">
        <CoverArt src={track.cover} title={track.title} isPlaying={isPlaying} />
      </div>

      {/* Visualizer */}
      <Visualizer active={isPlaying} />

      {/* Track info */}
      <div className="text-center mb-5">
        <h2 className="font-bold text-xl text-foreground leading-tight line-clamp-1">
          {track.title}
        </h2>
        <p className="text-muted-foreground text-sm mt-1 line-clamp-1">
          {track.artist}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <RangeTrack
          min={0}
          max={duration}
          value={currentTime}
          onChange={(t) => {
            setCurrentTime(t);
            if (audioRef.current) audioRef.current.currentTime = t;
          }}
        />
        <div className="flex justify-between mt-1.5 text-[10px] font-mono text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setIsRepeat((r) => !r)}
          className={`p-2 rounded-full transition-colors ${isRepeat ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
        >
          <Repeat size={18} />
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => skip("prev")}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
          >
            <SkipBack size={26} />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="w-14 h-14 flex items-center justify-center bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause size={26} fill="currentColor" />
            ) : (
              <Play size={26} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={() => skip("next")}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
          >
            <SkipForward size={26} />
          </button>
        </div>

        <button
          onClick={toggleMute}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <VolumeX size={13} className="text-muted-foreground flex-shrink-0" />
        <RangeTrack
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={changeVolume}
          thin
        />
        <Volume2 size={13} className="text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Landscape layout
───────────────────────────────────────────────────────────────────────────── */

export const AudioComponentLandscape: React.FC<AudioComponentProps> = ({
  tracks,
  autoPlay = false,
}) => {
  const [idx, setIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const track = tracks[idx];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (isShuffle) {
        const next = Math.floor(Math.random() * tracks.length);
        setIdx(next);
      } else {
        setIdx((i) => (i + 1 < tracks.length ? i + 1 : 0));
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [isRepeat, isShuffle, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(0);
    setDuration(0);
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, idx]);

  const skip = useCallback(
    (dir: "prev" | "next") => {
      setIdx((i) => {
        if (isShuffle) return Math.floor(Math.random() * tracks.length);
        const n = dir === "next" ? i + 1 : i - 1;
        return ((n % tracks.length) + tracks.length) % tracks.length;
      });
    },
    [tracks.length, isShuffle],
  );

  const changeVolume = (v: number) => {
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 w-full shadow-md">
      <audio ref={audioRef} src={track.url} />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
          Now Playing
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {idx + 1} / {tracks.length}
        </span>
      </div>

      {/* Main layout: cover left, content right */}
      <div className="flex gap-6 items-start">
        {/* Cover */}
        <CoverArt
          src={track.cover}
          title={track.title}
          isPlaying={isPlaying}
          className="w-36 h-36 flex-shrink-0"
          rounded="rounded-xl"
        />

        {/* Right column */}
        <div className="flex-1 min-w-0">
          {/* Visualizer */}
          <Visualizer active={isPlaying} />

          {/* Track info */}
          <div className="mb-4">
            <h2 className="font-bold text-2xl text-foreground leading-tight line-clamp-1 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {track.title}
            </h2>
            <p className="text-muted-foreground mt-0.5 line-clamp-1">
              {track.artist}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-5">
            <RangeTrack
              min={0}
              max={duration}
              value={currentTime}
              onChange={(t) => {
                setCurrentTime(t);
                if (audioRef.current) audioRef.current.currentTime = t;
              }}
            />
            <div className="flex justify-between mt-1.5 text-[10px] font-mono text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            {/* Secondary left */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsShuffle((s) => !s)}
                className={`p-1.5 rounded-full transition-colors ${isShuffle ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                <Shuffle size={16} />
              </button>
              <button
                onClick={() => setIsRepeat((r) => !r)}
                className={`p-1.5 rounded-full transition-colors ${isRepeat ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                <Repeat size={16} />
              </button>
            </div>

            {/* Main playback */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => skip("prev")}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              >
                <SkipBack size={24} />
              </button>
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="w-12 h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? (
                  <Pause size={22} fill="currentColor" />
                ) : (
                  <Play size={22} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              <button
                onClick={() => skip("next")}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              >
                <SkipForward size={24} />
              </button>
            </div>

            {/* Volume right */}
            <div className="flex items-center gap-2 w-32">
              <button
                onClick={toggleMute}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <RangeTrack
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={changeVolume}
                thin
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Default export — landscape (most common embedding use case)
───────────────────────────────────────────────────────────────────────────── */

export default AudioComponentLandscape;
