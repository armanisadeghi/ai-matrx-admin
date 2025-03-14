// previews/AudioPreview.tsx
import React, { useRef, useState, useEffect } from 'react';
import { 
  Pause, Play, Volume2, VolumeX, SkipBack, SkipForward, 
  Repeat, RefreshCw, List, Music 
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface AudioPreviewProps {
  file: {
    url: string;
    blob?: Blob | null;
    type: string;
    details?: any;
  };
  isLoading: boolean;
}

const AudioPreview: React.FC<AudioPreviewProps> = ({ file, isLoading }) => {
  if (isLoading) return <div className="flex items-center justify-center h-full">Loading audio...</div>;
  
  const filename = file.details?.filename || 'Audio file';
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  // Generate simulated waveform data on load
  useEffect(() => {
    const generateWaveform = () => {
      // Generate 100 random values between 0.1 and 1 for the waveform visualization
      const data = Array.from({ length: 100 }, () => 0.1 + Math.random() * 0.9);
      setWaveformData(data);
    };
    
    generateWaveform();
  }, [file.url]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number) => {
    if (audioRef.current) {
      audioRef.current.volume = value;
      setVolume(value);
      if (value > 0 && isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const toggleLoop = () => {
    if (audioRef.current) {
      audioRef.current.loop = !isLooping;
      setIsLooping(!isLooping);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + 10, duration);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - 10, 0);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate the current percentage for the progress bar
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="p-6 flex flex-col space-y-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg max-w-3xl mx-auto">
      <audio
        ref={audioRef}
        src={file.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        loop={isLooping}
      />
      
      {/* File info and waveform visualization */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-full text-white">
          <Music className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-lg truncate">{filename}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {file.details?.size ? `${Math.round(file.details.size / 1024)} KB` : ''}
            {file.details?.mimetype ? ` · ${file.details.mimetype.split('/')[1].toUpperCase()}` : ''}
          </p>
        </div>
      </div>

      {/* Waveform visualization */}
      <div className="relative h-16 w-full bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-indigo-500/20 dark:bg-indigo-500/30 transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
        <div className="absolute top-0 left-0 h-full w-full flex items-center justify-center">
          <div className="flex h-full items-end w-full px-2">
            {waveformData.map((height, index) => (
              <div 
                key={index}
                className={`w-full mx-px rounded-t ${
                  (index / waveformData.length) * 100 < progressPercentage 
                    ? 'bg-indigo-500 dark:bg-indigo-400' 
                    : 'bg-gray-400 dark:bg-gray-600'
                }`}
                style={{ 
                  height: `${height * 100}%`,
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Time indicators */}
      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Progress slider */}
      <Slider
        value={[currentTime]}
        min={0}
        max={duration || 100}
        step={0.1}
        onValueChange={([value]) => handleSeek(value)}
        className="mt-0"
      />

      {/* Main controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            className={`p-2 rounded-full ${isLooping ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'} hover:bg-gray-200 dark:hover:bg-gray-700`}
            onClick={toggleLoop}
            aria-label="Toggle loop"
          >
            <Repeat className="h-5 w-5" />
          </button>
          <button
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={restart}
            aria-label="Restart"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={skipBackward}
            aria-label="Skip backward 10 seconds"
          >
            <SkipBack className="h-6 w-6" />
          </button>
          
          <button
            className="p-4 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </button>
          
          <button
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={skipForward}
            aria-label="Skip forward 10 seconds"
          >
            <SkipForward className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <Slider
            value={[isMuted ? 0 : volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([value]) => handleVolumeChange(value)}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPreview;