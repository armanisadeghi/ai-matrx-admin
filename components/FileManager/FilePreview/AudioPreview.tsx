// components/FileManager/FilePreview/AudioPreview.tsx
import React, { useState, useRef } from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPreviewProps {
    file: NodeStructure;
}

export const AudioPreview: React.FC<AudioPreviewProps> = ({ file }) => {
    const { getPublicUrl } = useFileSystem();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

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
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="p-4 flex flex-col space-y-4">
            <audio
                ref={audioRef}
                src={getPublicUrl(file.path)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />
            <div className="flex items-center justify-center space-x-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={togglePlay}
                >
                    {isPlaying ? (
                        <Pause className="h-4 w-4" />
                    ) : (
                        <Play className="h-4 w-4" />
                    )}
                </Button>
                <span className="text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>
            </div>
            <Slider
                value={[currentTime]}
                min={0}
                max={duration}
                step={0.1}
                onValueChange={([value]) => handleSeek(value)}
            />
            <div className="flex items-center space-x-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                >
                    {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                    ) : (
                        <Volume2 className="h-4 w-4" />
                    )}
                </Button>
                <Slider
                    value={[volume]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={([value]) => handleVolumeChange(value)}
                    className="w-24"
                />
            </div>
        </div>
    );
};
