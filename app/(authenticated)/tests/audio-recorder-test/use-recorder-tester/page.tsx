'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, MicIcon, PauseIcon, PlayIcon, CircleStop } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRecorder } from '@/app/(features)/voice-notes/hooks/useRecorder';
import { useEffect, useState, useRef, useCallback } from 'react';

export default function RecorderTestPage() {
    const { toast } = useToast();
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [debugLog, setDebugLog] = useState<string[]>([]);

    const addDebugLog = useCallback((message: string) => {
        console.log(message);
        setDebugLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
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
        loading,
    } = useRecorder({
        onRecordingStart: () => {
            addDebugLog('Recording started callback triggered');
            toast({
                title: 'Recording Started',
                description: 'The recording has begun successfully.',
            });
        },
        onRecordingStop: (recording) => {
            addDebugLog(`Recording stopped callback triggered. ID: ${recording.id}`);
            toast({
                title: 'Recording Stopped',
                description: `Recording saved: ${recording.filename}`,
            });
        }
    });

    useEffect(() => {
        addDebugLog(`Recorder status changed: ${status}`);
    }, [status, addDebugLog]);

    useEffect(() => {
        const checkPermissions = async () => {
            try {
                addDebugLog('Checking microphone permissions...');
                const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                setPermissionStatus(permission.state);
                addDebugLog(`Permission status: ${permission.state}`);

                permission.addEventListener('change', () => {
                    setPermissionStatus(permission.state);
                    addDebugLog(`Permission status changed to: ${permission.state}`);
                });
            } catch (err) {
                addDebugLog(`Error checking permissions: ${err}`);
                console.error('Permission check error:', err);
            }
        };

        checkPermissions();
    }, [addDebugLog]);

    const handleStartRecording = async () => {
        try {
            addDebugLog('Starting recording process...');
            await startRecording();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            addDebugLog(`Failed to start recording: ${errorMessage}`);
            console.error('Recording error:', err);

            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to start recording. Please check your microphone permissions.',
            });
        }
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Voice Recorder Test</span>
                        <div className="flex gap-2">
                            {loading && <Badge variant="secondary">Loading...</Badge>}
                            <Badge variant="outline">{status}</Badge>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Permission Status */}
                    <div className="mb-4">
                        <Badge variant={
                            permissionStatus === 'granted' ? 'success' :
                                permissionStatus === 'denied' ? 'destructive' :
                                    'secondary'
                        }>
                            Microphone: {permissionStatus || 'unknown'}
                        </Badge>
                    </div>

                    {/* Status Display */}
                    <div className="flex items-center space-x-2">
                        <Badge variant={isRecording ? "destructive" : "secondary"}>
                            {isRecording ? "Recording" : "Idle"}
                        </Badge>
                        {isPaused && <Badge variant="warning">Paused</Badge>}
                        <span className="text-sm text-muted-foreground">
                            Duration: {formattedDuration}
                        </span>
                    </div>

                    {/* Controls */}
                    <div className="flex space-x-2">
                        <Button
                            onClick={handleStartRecording}
                            disabled={isRecording || loading || permissionStatus === 'denied'}
                            variant="default"
                        >
                            <MicIcon className="w-4 h-4 mr-2" />
                            Start
                        </Button>

                        {isRecording && !isPaused && (
                            <Button onClick={pauseRecording} variant="secondary">
                                <PauseIcon className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                        )}

                        {isPaused && (
                            <Button onClick={resumeRecording} variant="secondary">
                                <PlayIcon className="w-4 h-4 mr-2" />
                                Resume
                            </Button>
                        )}

                        {isRecording && (
                            <Button onClick={stopRecording} variant="destructive">
                                <CircleStop className="w-4 h-4 mr-2" />
                                Stop
                            </Button>
                        )}
                    </div>

                    {/* Current Recording Info */}
                    {currentRecording && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h3 className="font-medium mb-2">Current Recording</h3>
                            <pre className="text-sm overflow-auto">
                                {JSON.stringify(currentRecording, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Error Display */}
                    {recorderError && (
                        <Alert variant="destructive">
                            <InfoIcon className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{recorderError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Debug Info */}
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                        <h3 className="font-medium mb-2">Debug Info</h3>
                        <div className="text-sm space-y-1">
                            <p>Audio Tracks: {previewStream?.getAudioTracks().length || 0}</p>
                            <p>Audio Context: {audioContextRef.current ? 'Created' : 'Not Created'}</p>
                            <p>Analyser: {analyserRef.current ? 'Created' : 'Not Created'}</p>
                            <p>Current Status: {status}</p>
                            <div className="mt-2">
                                <h4 className="font-medium">Debug Log:</h4>
                                <div className="max-h-40 overflow-y-auto">
                                    {debugLog.map((log, index) => (
                                        <div key={index} className="text-xs">{log}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}