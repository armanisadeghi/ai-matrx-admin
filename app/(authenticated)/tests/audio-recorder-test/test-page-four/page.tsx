'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    Mic,
    Pause,
    Play,
    StopCircle,
    Volume2,
    VolumeX,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecorder } from '@/app/(features)/voice-notes/hooks/useRecorder';
import { useToast } from '@/components/ui/use-toast';

export default function RecorderHookTestPage() {
    const { toast } = useToast();
    const [logs, setLogs] = useState<string[]>([]);
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const [permissionStatus, setPermissionStatus] = useState<PermissionState>('prompt');

    // Audio visualization
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}`;
        console.log(logMessage);
        setLogs(prev => [...prev, logMessage]);
    }, []);

    const {
        isRecording,
        isPaused,
        duration,
        formattedDuration,
        error: recorderError,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        currentRecording,
        previewStream,
        loading
    } = useRecorder({
        onRecordingStart: () => {
            addLog('Hook: Recording started');
            toast({
                title: 'Recording Started',
                description: 'The recording has begun successfully.',
            });
        },
        onRecordingStop: (recording) => {
            addLog(`Hook: Recording stopped. ID: ${recording.id}`);
            toast({
                title: 'Recording Stopped',
                description: `Recording saved: ${recording.filename}`,
            });
        },
        audioConstraints: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000
        }
    });

    // Permission handling
    useEffect(() => {
        const checkPermissions = async () => {
            try {
                addLog('Checking microphone permissions...');
                const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                setPermissionStatus(permission.state);
                addLog(`Permission status: ${permission.state}`);

                permission.addEventListener('change', () => {
                    setPermissionStatus(permission.state);
                    addLog(`Permission status changed to: ${permission.state}`);
                });
            } catch (err) {
                addLog(`Error checking permissions: ${err}`);
            }
        };

        checkPermissions();
    }, [addLog]);

    // Audio visualization setup
    useEffect(() => {
        if (!previewStream || !previewStream.getAudioTracks().length) {
            if (analyserRef.current) {
                addLog('Cleaning up audio visualization');
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                analyserRef.current = null;
            }
            return;
        }

        const setupAudioVisualization = async () => {
            try {
                addLog('Setting up audio visualization');

                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                }

                const audioContext = audioContextRef.current;
                const analyser = audioContext.createAnalyser();
                analyserRef.current = analyser;

                const source = audioContext.createMediaStreamSource(previewStream);
                source.connect(analyser);

                analyser.fftSize = 256;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const updateLevel = () => {
                    if (!analyserRef.current) return;

                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                    setAudioLevel(average);

                    if (isRecording && !isPaused) {
                        animationFrameRef.current = requestAnimationFrame(updateLevel);
                    }
                };

                updateLevel();
                addLog('Audio visualization setup complete');
            } catch (err) {
                addLog(`Error setting up audio visualization: ${err}`);
            }
        };

        setupAudioVisualization();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [previewStream, isRecording, isPaused, addLog]);

    // Button handlers
    const handleStartRecording = async () => {
        try {
            addLog('Starting recording process...');
            await startRecording();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            addLog(`Failed to start recording: ${errorMessage}`);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to start recording. Please check your microphone permissions.',
            });
        }
    };

    const handleStopRecording = async () => {
        try {
            addLog('Stopping recording...');
            await stopRecording();
        } catch (err) {
            addLog(`Error stopping recording: ${err}`);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to stop recording.',
            });
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Audio Recorder Hook Test</span>
                        <div className="flex gap-2">
                            {loading && <Badge variant="secondary">Loading...</Badge>}
                            <Badge variant={isRecording ? "destructive" : "secondary"}>
                                {isRecording ? "Recording" : "Idle"}
                            </Badge>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Status Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <div className="text-sm font-medium">Permission</div>
                            <Badge variant={
                                permissionStatus === 'granted' ? 'success' :
                                    permissionStatus === 'denied' ? 'destructive' :
                                        'secondary'
                            }>
                                {permissionStatus}
                            </Badge>
                        </div>

                        <div className="space-y-1">
                            <div className="text-sm font-medium">Stream</div>
                            <Badge variant="outline">
                                {previewStream ? (
                                    <span className="flex items-center gap-1">
                                        <Volume2 className="w-3 h-3" />
                                        Active
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <VolumeX className="w-3 h-3" />
                                        None
                                    </span>
                                )}
                            </Badge>
                        </div>

                        <div className="space-y-1">
                            <div className="text-sm font-medium">Status</div>
                            <Badge variant={isRecording ? "destructive" : "secondary"}>
                                {isRecording ? (isPaused ? "Paused" : "Recording") : "Ready"}
                            </Badge>
                        </div>

                        <div className="space-y-1">
                            <div className="text-sm font-medium">Duration</div>
                            <Badge variant="outline">{formattedDuration}</Badge>
                        </div>
                    </div>

                    <Separator />

                    {/* Audio Level Meter */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Audio Level</div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-100"
                                style={{ width: `${(audioLevel / 255) * 100}%` }}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Controls */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={handleStartRecording}
                            disabled={isRecording || loading || permissionStatus === 'denied'}
                            variant="default"
                        >
                            <Mic className="w-4 h-4 mr-2" />
                            Start Recording
                        </Button>

                        {isRecording && !isPaused && (
                            <Button onClick={pauseRecording} variant="secondary">
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                        )}

                        {isPaused && (
                            <Button onClick={resumeRecording} variant="secondary">
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                            </Button>
                        )}

                        {isRecording && (
                            <Button onClick={handleStopRecording} variant="destructive">
                                <StopCircle className="w-4 h-4 mr-2" />
                                Stop Recording
                            </Button>
                        )}
                    </div>

                    {/* Current Recording Info */}
                    {currentRecording && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Current Recording
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-xs overflow-auto bg-muted p-4 rounded-lg">
                                    {JSON.stringify(currentRecording, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error Display */}
                    {recorderError && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>{recorderError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Debug Logs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Debug Log</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[200px] w-full rounded-md border">
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