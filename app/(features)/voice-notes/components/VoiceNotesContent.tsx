'use client';

import { useState } from 'react';
import { useVoiceNotes } from '../hooks/useVoiceNotes';
import { RecordingControls } from './RecordingControls';
import { RecordingsList } from './RecordingsList';

export default function VoiceNotesContent() {
    const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);

    const {
        // Recording state
        isRecording,
        isPaused,
        duration,
        formattedDuration,
        error,
        loading,

        // Recording controls
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,

        // Data
        recordings,

        // Playback
        play,
        pause,
        stop,
        refreshRecordings,
        deleteRecording,
    } = useVoiceNotes();

    const handlePlay = async (id: number) => {
        // Stop current if playing different recording
        if (currentPlayingId !== null && currentPlayingId !== id) {
            stop();
        }
        setCurrentPlayingId(id);
        await play(id);
    };

    const handlePause = () => {
        pause();
        setCurrentPlayingId(null);
    };

    const handleDelete = async (id: number) => {
        // Stop if currently playing
        if (currentPlayingId === id) {
            stop();
            setCurrentPlayingId(null);
        }
        await deleteRecording(id);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-textured">
            <div className="flex-1 overflow-y-auto">
                <div className="container max-w-5xl mx-auto p-6 space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Voice Notes</h1>
                        <p className="text-muted-foreground">
                            Record, manage, and play back your voice notes
                        </p>
                    </div>

                    {/* Recording Controls */}
                    <RecordingControls
                        isRecording={isRecording}
                        isPaused={isPaused}
                        duration={duration}
                        formattedDuration={formattedDuration}
                        loading={loading}
                        error={error}
                        onStart={startRecording}
                        onStop={stopRecording}
                        onPause={pauseRecording}
                        onResume={resumeRecording}
                    />

                    {/* Recordings List */}
                    <RecordingsList
                        recordings={recordings}
                        currentPlayingId={currentPlayingId}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onDelete={handleDelete}
                        onRefresh={refreshRecordings}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
}

