import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  ListMusic,
  Heart,
  Share2,
  Music, // Added for placeholder
} from "lucide-react";

interface Track {
  url: string;
  cover: string | null;
  title: string;
  artist: string;
}

interface AudioComponentProps {
  tracks: Track[];
}

const AudioComponent = ({ tracks }: AudioComponentProps) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const audioRef = useRef(null);
  const track = tracks[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current
          .play()
          .catch((e) => console.log("Playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const onTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    audioRef.current.currentTime = time;
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setVolume(val);
    audioRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const formatTime = (time) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const skipTrack = (direction) => {
    let nextIndex =
      direction === "next" ? currentTrackIndex + 1 : currentTrackIndex - 1;
    if (nextIndex >= tracks.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = tracks.length - 1;
    setCurrentTrackIndex(nextIndex);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-sans text-white">
      {/* Background Glow Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <audio
        ref={audioRef}
        src={track.url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() =>
          isRepeat
            ? ((audioRef.current.currentTime = 0), audioRef.current.play())
            : skipTrack("next")
        }
      />

      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
        {/* Top Navigation */}
        <div className="p-6 flex items-center justify-between">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ListMusic size={20} className="text-neutral-400" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Now Playing
          </span>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Share2 size={20} className="text-neutral-400" />
          </button>
        </div>

        {/* Album Art / Placeholder */}
        <div className="px-8 pt-2 pb-8">
          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl group bg-neutral-900/50">
            {track.cover ? (
              <img
                src={track.cover}
                alt={track.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? "scale-110" : "scale-100"}`}
              />
            ) : (
              /* Beautiful Placeholder */
              <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-br from-neutral-800 to-neutral-900">
                <div
                  className={`absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 transition-opacity duration-1000 ${isPlaying ? "opacity-100" : "opacity-0"}`}
                />
                <div
                  className={`p-8 rounded-full bg-white/5 border border-white/10 transition-transform duration-700 ${isPlaying ? "scale-110" : "scale-100"}`}
                >
                  <Music
                    size={64}
                    className="text-white/20"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="absolute bottom-8 text-[10px] font-bold tracking-[0.2em] text-white/10 uppercase">
                  No Artwork Available
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

            <button
              onClick={() => setIsLiked(!isLiked)}
              className="absolute top-4 right-4 p-3 bg-black/20 backdrop-blur-md rounded-2xl hover:scale-110 transition-all active:scale-95 z-10"
            >
              <Heart
                size={20}
                className={isLiked ? "fill-red-500 text-red-500" : "text-white"}
              />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="px-8 text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1 line-clamp-1">
            {track.title}
          </h1>
          <p className="text-neutral-400 font-medium line-clamp-1">
            {track.artist}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-8 mb-8">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-purple-400 transition-all"
            style={{
              background: `linear-gradient(to right, white ${(currentTime / duration) * 100}%, rgba(255,255,255,0.1) ${(currentTime / duration) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-3 text-[10px] font-bold tracking-tighter text-neutral-500 uppercase">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="px-8 pb-10 flex flex-col items-center">
          <div className="flex items-center gap-8 mb-8">
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={`transition-colors ${isRepeat ? "text-purple-400" : "text-neutral-500 hover:text-white"}`}
            >
              <Repeat size={20} />
            </button>

            <div className="flex items-center gap-6">
              <button
                onClick={() => skipTrack("prev")}
                className="text-white/80 hover:text-white transition-colors"
              >
                <SkipBack size={32} fill="currentColor" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
              >
                {isPlaying ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" className="ml-1" />
                )}
              </button>

              <button
                onClick={() => skipTrack("next")}
                className="text-white/80 hover:text-white transition-colors"
              >
                <SkipForward size={32} fill="currentColor" />
              </button>
            </div>

            <button className="text-neutral-500 hover:text-white transition-colors">
              <Shuffle size={20} />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 w-full max-w-[200px] group">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-neutral-500 group-hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neutral-400 group-hover:accent-white transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioComponent;
