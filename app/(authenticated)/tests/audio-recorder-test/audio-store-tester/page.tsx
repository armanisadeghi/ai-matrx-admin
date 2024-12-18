'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import AudioPlayerTester from './AudioPlayerTester';
import { useAudioStore } from '@/hooks/idb/useAudioStore';
import { Recording, RecordingChunk, RecordingStatus } from '@/types/audioRecording.types';

const DEFAULT_CHUNK_SIZE = 4096;
const DEFAULT_SAMPLE_RATE = 44100;

export default function AudioStoreTesting() {
    const {
        isLoading,
        createRecording,
        getRecording,
        getAllRecordings,
        updateRecording,
        deleteRecording,
        getRecordingsByStatus,
        saveChunk,
        getRecordingChunks,
        getRecordingWithChunks,
        updateRecordingStatus
    } = useAudioStore();

    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [selectedRecordingId, setSelectedRecordingId] = useState('');
    const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
    const [chunks, setChunks] = useState<RecordingChunk[]>([]);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('recordings');
    const [isCreatingTestData, setIsCreatingTestData] = useState(false);

    // Load recordings on mount
    useEffect(() => {
        loadAllRecordings();
    }, []);

    // Handle recording selection and chunk loading
    useEffect(() => {
        if (selectedRecordingId) {
            handleGetRecording();
            if (activeTab === 'chunks') {
                handleGetChunks();
            }
        } else {
            setSelectedRecording(null);
            setChunks([]);
        }
    }, [selectedRecordingId, activeTab]);

    const loadAllRecordings = async () => {
        const response = await getAllRecordings();
        if (response.data) {
            setRecordings(response.data);
        } else if (response.error) {
            setError(response.error);
        }
    };

    const createTestAudioData = (duration: number): Uint8Array => {
        const sampleRate = DEFAULT_SAMPLE_RATE;
        const samples = duration * sampleRate;
        const data = new Uint8Array(samples);

        // Generate a simple sine wave
        for (let i = 0; i < samples; i++) {
            data[i] = Math.floor(128 + 127 * Math.sin(2 * Math.PI * 440 * i / sampleRate));
        }

        return data;
    };

    const handleCreateRecording = async () => {
        setIsCreatingTestData(true);
        try {
            // Create test audio data (1 second)
            const audioData = createTestAudioData(1);
            const blob = new Blob([audioData], { type: 'audio/wav' });

            const newRecording: Partial<Omit<Recording, 'id'>> = {
                filename: `recording_${Date.now()}.wav`,
                title: `Test Recording ${Date.now()}`,
                status: 'recording',
                duration: 1, // 1 second
                created_at: new Date(),
                updated_at: new Date(),
                size: blob.size,
                blob,
                waveform_data: Array.from({ length: 50 }, () => Math.random()),
                recording_quality: {
                    sampleRate: DEFAULT_SAMPLE_RATE,
                    bitDepth: 16,
                    channels: 1
                }
            };

            const result = await createRecording(newRecording);
            setResult(result);
            if (!result.error) await loadAllRecordings();
        } finally {
            setIsCreatingTestData(false);
        }
    };

    const handleRecordingSelection = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setSelectedRecordingId(newId);
        if (newId) {
            const result = await getRecording(Number(newId));
            if (result.data) {
                setSelectedRecording(result.data);
            }
        } else {
            setSelectedRecording(null);
        }
    };

    const handleGetRecording = async () => {
        if (!selectedRecordingId) {
            setError('Please select a recording');
            return;
        }
        const result = await getRecording(Number(selectedRecordingId));
        setResult(result);
        if (result.data) {
            setSelectedRecording(result.data);
        }
    };

    const handleUpdateRecording = async () => {
        if (!selectedRecordingId) {
            setError('Please select a recording');
            return;
        }
        const result = await updateRecording(Number(selectedRecordingId), {
            title: `Updated Recording ${Date.now()}`
        });
        setResult(result);
        if (!result.error) await loadAllRecordings();
    };

    const handleDeleteRecording = async () => {
        if (!selectedRecordingId) {
            setError('Please select a recording');
            return;
        }
        const result = await deleteRecording(Number(selectedRecordingId));
        setResult(result);
        if (!result.error) {
            await loadAllRecordings();
            setSelectedRecordingId('');
            setSelectedRecording(null);
        }
    };

    const handleSaveChunk = async () => {
        if (!selectedRecordingId) {
            setError('Please select a recording');
            return;
        }

        // Create test audio data for chunk (0.5 seconds)
        const audioData = createTestAudioData(0.5);
        const blob = new Blob([audioData], { type: 'audio/wav' });

        const chunk = {
            recording_id: Number(selectedRecordingId),
            chunk_index: chunks.length,
            blob,
            timestamp: new Date()
        };

        const result = await saveChunk(chunk);
        setResult(result);
        if (!result.error) {
            handleGetChunks();
        }
    };

    const handleGetChunks = async () => {
        if (!selectedRecordingId) {
            setError('Please select a recording');
            return;
        }
        const result = await getRecordingChunks(Number(selectedRecordingId));
        if (result.data) {
            setChunks(result.data);
        }
        setResult(result);
    };

    const handleGetWithChunks = async () => {
        if (!selectedRecordingId) {
            setError('Please select a recording');
            return;
        }
        const result = await getRecordingWithChunks(Number(selectedRecordingId));
        setResult(result);
    };

    const handleUpdateStatus = async (status: RecordingStatus) => {
        if (!selectedRecordingId) {
            setError('Please select a recording');
            return;
        }
        const result = await updateRecordingStatus(Number(selectedRecordingId), status);
        setResult(result);
        if (!result.error) {
            await loadAllRecordings();
            await handleGetRecording();
        }
    };

    const isStatusTransitionAllowed = (newStatus: RecordingStatus): boolean => {
        if (!selectedRecording) return false;

        const currentStatus = selectedRecording.status;
        const validTransitions: Record<RecordingStatus, RecordingStatus[]> = {
            'recording': ['paused', 'completed'],
            'paused': ['recording', 'completed'],
            'completed': ['uploading'],
            'uploading': ['uploaded', 'failed'],
            'uploaded': [],
            'failed': ['uploading']
        };

        return validTransitions[currentStatus]?.includes(newStatus) || false;
    };

    const renderAudioPlayer = () => {
        if (!selectedRecording) return null;

        return (
            <div className="mt-4 space-y-2">
                <div className="flex flex-col gap-2 p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-sm">
                            <span className="font-medium">Status:</span> {selectedRecording.status}
                        </div>
                        <div className="text-sm">
                            <span className="font-medium">Size:</span> {selectedRecording.size} bytes
                        </div>
                        <div className="text-sm">
                            <span className="font-medium">Duration:</span> {selectedRecording.duration}s
                        </div>
                        <div className="text-sm">
                            <span className="font-medium">Created:</span> {new Date(selectedRecording.created_at).toLocaleString()}
                        </div>
                    </div>
                    {selectedRecording.recording_quality && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-sm">
                                <span className="font-medium">Sample Rate:</span> {selectedRecording.recording_quality.sampleRate}Hz
                            </div>
                            <div className="text-sm">
                                <span className="font-medium">Bit Depth:</span> {selectedRecording.recording_quality.bitDepth}bit
                            </div>
                            <div className="text-sm">
                                <span className="font-medium">Channels:</span> {selectedRecording.recording_quality.channels}
                            </div>
                        </div>
                    )}
                </div>
                <AudioPlayerTester
                    blob={selectedRecording.blob}
                    waveformData={selectedRecording.waveform_data}
                    title={selectedRecording.title}
                    duration={selectedRecording.duration}
                    onPositionChange={(position) => {
                        if (selectedRecording.id) {
                            updateRecording(selectedRecording.id, { last_position: position });
                        }
                    }}
                />
            </div>
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Audio Store Testing Interface</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs
                        defaultValue="recordings"
                        className="w-full"
                        value={activeTab}
                        onValueChange={setActiveTab}
                    >
                        <TabsList>
                            <TabsTrigger value="recordings">Recordings</TabsTrigger>
                            <TabsTrigger value="chunks">Chunks</TabsTrigger>
                        </TabsList>

                        <div className="flex gap-4 items-center mt-4">
                            <Label htmlFor="recordingSelect">Select Recording:</Label>
                            <select
                                id="recordingSelect"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedRecordingId}
                                onChange={handleRecordingSelection}
                            >
                                <option value="">Select a recording</option>
                                {recordings.map((recording) => (
                                    <option key={recording.id} value={recording.id}>
                                        {recording.title} ({recording.status})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {renderAudioPlayer()}

                        <TabsContent value="recordings" className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <Button
                                    onClick={handleCreateRecording}
                                    disabled={isLoading() || isCreatingTestData}
                                >
                                    Create Recording
                                </Button>
                                <Button
                                    onClick={handleGetRecording}
                                    disabled={isLoading() || !selectedRecordingId}
                                >
                                    Get Recording
                                </Button>
                                <Button
                                    onClick={handleUpdateRecording}
                                    disabled={isLoading() || !selectedRecordingId}
                                >
                                    Update Recording
                                </Button>
                                <Button
                                    onClick={handleDeleteRecording}
                                    disabled={isLoading() || !selectedRecordingId}
                                    variant="destructive"
                                >
                                    Delete Recording
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(['recording', 'paused', 'completed', 'uploading', 'uploaded', 'failed'] as RecordingStatus[]).map((status) => (
                                    <Button
                                        key={status}
                                        onClick={() => handleUpdateStatus(status)}
                                        disabled={
                                            isLoading() ||
                                            !selectedRecordingId ||
                                            !isStatusTransitionAllowed(status)
                                        }
                                        variant={status === 'failed' ? 'destructive' : 'secondary'}
                                    >
                                        Set {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="chunks" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Button
                                    onClick={handleSaveChunk}
                                    disabled={isLoading() || !selectedRecordingId || selectedRecording?.status !== 'recording'}
                                >
                                    Save Chunk
                                </Button>
                                <Button
                                    onClick={handleGetChunks}
                                    disabled={isLoading() || !selectedRecordingId}
                                >
                                    Get Chunks
                                </Button>
                                <Button
                                    onClick={handleGetWithChunks}
                                    disabled={isLoading() || !selectedRecordingId}
                                >
                                    Get Recording with Chunks
                                </Button>
                            </div>

                            {chunks.length > 0 ? (
                                <div className="mt-4">
                                    <h3 className="text-lg font-medium mb-2">Available Chunks ({chunks.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {chunks.map((chunk) => (
                                            <Card key={chunk.id} className="p-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <div className="font-medium">Chunk {chunk.chunk_index + 1}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {chunk.blob.size} bytes
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {new Date(chunk.timestamp).toLocaleString()}
                                                    </div>
                                                    {chunk.blob && (
                                                        <AudioPlayerTester
                                                            blob={chunk.blob}
                                                            title={`Chunk ${chunk.chunk_index + 1}`}
                                                        />
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ) : selectedRecordingId ? (
                                <Alert className="mt-4">
                                    <AlertDescription>
                                        No chunks available for this recording.
                                        {selectedRecording?.status === 'recording' &&
                                            ' Use the "Save Chunk" button to add test chunks.'}
                                    </AlertDescription>
                                </Alert>
                            ) : null}
                        </TabsContent>
                    </Tabs>

                    {isLoading() && (
                        <div className="mt-4">
                            <Progress value={null} className="w-full" />
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {result && (
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Operation Result</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="whitespace-pre-wrap bg-secondary p-4 rounded-md overflow-x-auto">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}