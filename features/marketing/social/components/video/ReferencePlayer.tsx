"use client";

/**
 * A stored reference video (a plain file URL) played with the SAME transport as the engine's preview player:
 * the package's PlayerControls over a native <video> element, so the clone page and the studio look and key alike.
 * The video is the clock: its time becomes the frame number PlayerControls draws (a fixed 30 frames per second).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { CenterPlayButton, PlayerControls } from "@ai-matrx/media/video/react";

const FPS = 30;

export function ReferencePlayer({ src, className }: { src: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [width, setWidth] = useState(288);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === boxRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);
  const seek = useCallback((frame: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, frame / FPS);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === " " || key === "k") toggle();
    else if (key === "ArrowRight") seek(Math.round(time * FPS) + (e.shiftKey ? FPS : 1));
    else if (key === "ArrowLeft") seek(Math.round(time * FPS) - (e.shiftKey ? FPS : 1));
    else if (key === "m") setMuted((m) => !m);
    else if (key === "f") toggleFullscreen();
    else return;
    e.preventDefault();
  };

  const frameCount = Math.max(1, Math.round(duration * FPS));
  return (
    <div className={className} tabIndex={0} onKeyDown={onKey} data-testid="reference-player">
      <div ref={boxRef} className={`relative h-full w-full overflow-clip bg-black ${fullscreen ? "flex items-center justify-center" : ""}`}>
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted={muted}
          className="h-full w-full cursor-pointer object-contain"
          onClick={toggle}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onVolumeChange={(e) => setVolume(e.currentTarget.volume)}
        />
        {playing || duration === 0 ? null : <CenterPlayButton width={width} onPlay={toggle} />}
        <PlayerControls
          frame={Math.min(frameCount - 1, Math.round(time * FPS))}
          frameCount={frameCount}
          fps={FPS}
          playing={playing}
          disabled={duration === 0}
          width={width}
          onToggle={toggle}
          onSeek={seek}
          volume={volume}
          muted={muted}
          onVolume={(v) => {
            if (videoRef.current) videoRef.current.volume = v;
            setMuted(v === 0);
          }}
          onMute={setMuted}
          rate={rate}
          onRate={(r) => {
            if (videoRef.current) videoRef.current.playbackRate = r;
            setRate(r);
          }}
          fullscreen={fullscreen}
          onFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
}
