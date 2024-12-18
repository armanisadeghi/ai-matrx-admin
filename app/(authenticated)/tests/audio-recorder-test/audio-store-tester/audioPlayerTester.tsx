'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AudioPlayerTesterProps {
    blob?: Blob;
    waveformData?: number[];
    title: string;
    duration?: number;
    onPositionChange?: (position: number) => void;
}

export default function AudioPlayerTester({
                                              blob,
                                              waveformData,
                                              title,
                                              duration,
                                              onPositionChange
                                          }: AudioPlayerTesterProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (blob) {
            if (!(blob instanceof Blob)) {
                setAudioError('Invalid blob data type');
                return;
            }

            if (blob.size === 0) {
                setAudioError('Audio data is empty (0 bytes)');
                return;
            }

            try {
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setAudioError(null);
                return () => URL.revokeObjectURL(url);
            } catch (err) {
                setAudioError(`Failed to create audio URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        } else {
            setAudioError('No audio data provided');
        }
    }, [blob]);

    useEffect(() => {
        if (audioRef.current) {
            const audio = audioRef.current;

            const handleTimeUpdate = () => {
                setCurrentTime(audio.currentTime);
                onPositionChange?.(audio.currentTime);
            };

            const handleLoadedMetadata = () => {
                setAudioDuration(audio.duration);
            };

            const handleEnded = () => {
                setIsPlaying(false);
                setCurrentTime(0);
            };

            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('ended', handleEnded);

            return () => {
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('ended', handleEnded);
            };
        }
    }, [onPositionChange]);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSliderChange = (value: number[]) => {
        const newTime = value[0];
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const resetAudio = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!blob) {
        return (
            <Card className="w-full">
                <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                        No audio data available
                    </div>
                </CardContent>
            </Card>
        );
    }
    if (audioError) {
        return (
            <Card className="w-full">
                <CardContent className="pt-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="ml-2">
                            {audioError}
                            {blob && (
                                <div className="mt-2 text-xs">
                                    Blob details: {blob.size} bytes, type: {blob.type || 'unknown'}
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="w-full">
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{title}</span>
                        <span className="text-sm text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(audioDuration)}
            </span>
                    </div>

                    {waveformData && waveformData.length > 0 && (
                        <div className="h-12 w-full flex items-center gap-0.5">
                            {waveformData.map((amplitude, idx) => (
                                <div
                                    key={idx}
                                    className="h-full w-1 bg-primary"
                                    style={{
                                        opacity: currentTime / audioDuration > idx / waveformData.length ? 1 : 0.3,
                                        height: `${amplitude * 100}%`
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <Slider
                        value={[currentTime]}
                        max={audioDuration}
                        step={0.1}
                        onValueChange={handleSliderChange}
                        className="w-full"
                    />

                    <div className="flex justify-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={resetAudio}
                        >
                            <RotateCcw className="h-4 w-4"/>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={togglePlayPause}
                        >
                            {isPlaying ? (
                                <Pause className="h-4 w-4"/>
                            ) : (
                                <Play className="h-4 w-4"/>
                            )}
                        </Button>
                    </div>

                    {audioUrl && (
                        <audio ref={audioRef} src={audioUrl} preload="metadata"/>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}