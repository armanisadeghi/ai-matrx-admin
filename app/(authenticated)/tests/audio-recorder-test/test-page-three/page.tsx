'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Pause, Play, Square, StopCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function MediaRecorderTestPage() {
    // Core state
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [permissionStatus, setPermissionStatus] = useState<PermissionState>('prompt');
    const [error, setError] = useState<string | null>(null);

    // Debug state
    const [logs, setLogs] = useState<string[]>([]);
    const durationInterval = useRef<NodeJS.Timeout | null>(null);

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}`;
        console.log(logMessage);
        setLogs(prev => [...prev, logMessage]);
    }, []);

    // Permission handling
    const checkPermission = useCallback(async () => {
        try {
            addLog('Checking microphone permission...');
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            addLog(`Permission status: ${permission.state}`);
            setPermissionStatus(permission.state);

            permission.addEventListener('change', () => {
                addLog(`Permission status changed to: ${permission.state}`);
                setPermissionStatus(permission.state);
            });
        } catch (err) {
            addLog(`Permission check error: ${err}`);
            setError('Failed to check permissions');
        }
    }, [addLog]);

    useEffect(() => {
        checkPermission();
    }, [checkPermission]);

    // Stream handling
    const getStream = async () => {
        try {
            addLog('Requesting microphone stream...');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                }
            });
            addLog(`Stream obtained with ${mediaStream.getAudioTracks().length} audio tracks`);
            mediaStream.getAudioTracks().forEach(track => {
                addLog(`Track settings: ${JSON.stringify(track.getSettings())}`);
            });
            setStream(mediaStream);
            setError(null);
        } catch (err) {
            addLog(`Stream error: ${err}`);
            setError('Failed to get media stream');
        }
    };

    const stopStream = () => {
        if (stream) {
            addLog('Stopping all tracks in stream');
            stream.getTracks().forEach(track => {
                addLog(`Stopping track: ${track.kind}`);
                track.stop();
            });
            setStream(null);
        }
    };

    // Recorder handling
    const createRecorder = () => {
        if (!stream) {
            addLog('Cannot create recorder: No stream available');
            return;
        }

        try {
            addLog('Creating MediaRecorder...');
            addLog('Checking supported MIME types...');
            const mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                addLog('Warning: audio/webm;codecs=opus is not supported');
                throw new Error('Unsupported MIME type');
            }
            addLog(`Using MIME type: ${mimeType}`);

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 128000
            });

            mediaRecorder.ondataavailable = (event) => {
                addLog(`Data available: ${event.data.size} bytes`);
                if (event.data.size > 0) {
                    setAudioChunks(prev => [...prev, event.data]);
                }
            };

            mediaRecorder.onstart = () => {
                addLog('MediaRecorder started');
                setIsRecording(true);
                durationInterval.current = setInterval(() => {
                    setDuration(d => d + 1);
                }, 1000);
            };

            mediaRecorder.onpause = () => {
                addLog('MediaRecorder paused');
                setIsPaused(true);
            };

            mediaRecorder.onresume = () => {
                addLog('MediaRecorder resumed');
                setIsPaused(false);
            };

            mediaRecorder.onstop = () => {
                addLog('MediaRecorder stopped');
                setIsRecording(false);
                setIsPaused(false);
                if (durationInterval.current) {
                    clearInterval(durationInterval.current);
                }
            };

            mediaRecorder.onerror = (event) => {
                addLog(`MediaRecorder error: ${event.error}`);
                setError('MediaRecorder error occurred');
            };

            setRecorder(mediaRecorder);
            addLog('MediaRecorder created successfully');
        } catch (err) {
            addLog(`Error creating MediaRecorder: ${err}`);
            setError('Failed to create MediaRecorder');
        }
    };

    const startRecording = () => {
        if (recorder && recorder.state === 'inactive') {
            addLog('Starting recording...');
            setAudioChunks([]);
            setAudioUrl(null);
            setDuration(0);
            recorder.start(1000); // Capture in 1-second chunks
        }
    };

    const pauseRecording = () => {
        if (recorder && recorder.state === 'recording') {
            addLog('Pausing recording...');
            recorder.pause();
        }
    };

    const resumeRecording = () => {
        if (recorder && recorder.state === 'paused') {
            addLog('Resuming recording...');
            recorder.resume();
        }
    };

    const stopRecording = () => {
        if (recorder && recorder.state !== 'inactive') {
            addLog('Stopping recording...');
            recorder.stop();
            processAudioChunks();
        }
    };

    const processAudioChunks = () => {
        if (audioChunks.length === 0) return;

        addLog(`Processing ${audioChunks.length} audio chunks`);
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        addLog(`Created blob of size: ${audioBlob.size} bytes`);

        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        addLog(`Created audio URL: ${url}`);
    };

    const cleanup = () => {
        addLog('Starting cleanup...');

        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }

        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }

        if (recorder) {
            setRecorder(null);
        }

        stopStream();
        setAudioChunks([]);
        setDuration(0);
        setIsRecording(false);
        setIsPaused(false);
        addLog('Cleanup completed');
    };

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>MediaRecorder API Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Status Display */}
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                            Permission: {permissionStatus}
                        </Badge>
                        <Badge variant="outline">
                            Stream: {stream ? 'Active' : 'None'}
                        </Badge>
                        <Badge variant="outline">
                            Recorder: {recorder?.state || 'None'}
                        </Badge>
                        <Badge variant="outline">
                            Duration: {duration}s
                        </Badge>
                    </div>

                    {/* Media Controls */}
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={getStream}
                                disabled={!!stream}
                            >
                                <Mic className="w-4 h-4 mr-2" />
                                Get Stream
                            </Button>
                            <Button
                                onClick={stopStream}
                                disabled={!stream}
                                variant="destructive"
                            >
                                <Square className="w-4 h-4 mr-2" />
                                Stop Stream
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={createRecorder}
                                disabled={!stream || !!recorder}
                            >
                                Create Recorder
                            </Button>
                            <Button
                                onClick={startRecording}
                                disabled={!recorder || isRecording}
                            >
                                <Mic className="w-4 h-4 mr-2" />
                                Start Recording
                            </Button>
                            <Button
                                onClick={pauseRecording}
                                disabled={!isRecording || isPaused}
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                            <Button
                                onClick={resumeRecording}
                                disabled={!isPaused}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                            </Button>
                            <Button
                                onClick={stopRecording}
                                disabled={!isRecording}
                                variant="destructive"
                            >
                                <StopCircle className="w-4 h-4 mr-2" />
                                Stop
                            </Button>
                        </div>
                    </div>

                    {/* Audio Playback */}
                    {audioUrl && (
                        <div className="mt-4">
                            <audio src={audioUrl} controls className="w-full" />
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Debug Logs */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="text-sm">Debug Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[900px] w-full rounded-md border">
                                <div className="p-4 space-y-1">
                                    {logs.map((log, index) => (
                                        <div key={index} className="text-xs font-mono">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}