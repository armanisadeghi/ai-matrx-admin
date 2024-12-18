'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Pause, Play, Square, StopCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Recording } from '@/types/audioRecording.types';
import {
    DirectUseRecorder
} from "@/app/(authenticated)/tests/audio-recorder-test/test-five-with-hook/direct-use-recorder";

export default function RecorderTestPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

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
        error,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        currentRecording,
        loading,
        status,
        hasStream,
        initializeStream,
        releaseStream
    } = DirectUseRecorder({
        onRecordingStart: () => addLog('Recording started'),
        onRecordingStop: (recording: Recording) => {
            addLog(`Recording stopped: ${recording.filename}`);
            // Here you could create an audio URL from the recording if needed
        }
    });

    return (
        <div className="container mx-auto p-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Voice Recorder Hook Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Status Display */}
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                            Status: {status}
                        </Badge>
                        <Badge variant="outline">
                            Stream: {hasStream ? 'Active' : 'None'}
                        </Badge>
                        <Badge variant="outline">
                            Duration: {formattedDuration}
                        </Badge>
                        {loading && (
                            <Badge variant="secondary">Loading...</Badge>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={initializeStream}
                            disabled={hasStream || loading}
                        >
                            <Mic className="w-4 h-4 mr-2" />
                            Initialize Stream
                        </Button>

                        <Button
                            onClick={releaseStream}
                            disabled={!hasStream || isRecording || loading}
                            variant="destructive"
                        >
                            <Square className="w-4 h-4 mr-2" />
                            Release Stream
                        </Button>

                        <Button
                            onClick={startRecording}
                            disabled={isRecording || loading}
                        >
                            <Mic className="w-4 h-4 mr-2" />
                            Start Recording
                        </Button>

                        {isRecording && !isPaused && (
                            <Button
                                onClick={pauseRecording}
                                disabled={loading}
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                        )}

                        {isPaused && (
                            <Button
                                onClick={resumeRecording}
                                disabled={loading}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                            </Button>
                        )}

                        {isRecording && (
                            <Button
                                onClick={stopRecording}
                                disabled={loading}
                                variant="destructive"
                            >
                                <StopCircle className="w-4 h-4 mr-2" />
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