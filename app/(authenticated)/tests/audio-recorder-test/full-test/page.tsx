'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useVoiceNotes } from "@/app/(features)/voice-notes/hooks/useVoiceNotes";

export default function Page() {
    const [isVideo, setIsVideo] = useState(false);
    const {
        isRecording,
        isPaused,
        isMuted,
        duration,
        formattedDuration,
        status,
        error,
        previewStream,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        muteRecording,
        unmuteRecording,
        recordings,
        currentRecording,
        loading,
        play,
        pause,
        stop,
        seek,
        refreshRecordings,
        deleteRecording
    } = useVoiceNotes({ video: isVideo });

    const videoRef = useRef<HTMLVideoElement>(null);

    // Handle video preview stream
    useEffect(() => {
        if (videoRef.current && previewStream && isVideo) {
            videoRef.current.srcObject = previewStream;
            videoRef.current.play();
        }
    }, [previewStream, isVideo]);

    return (
        <div className="p-4 space-y-4">
            {/* Controls */}
            <div className="flex space-x-2 items-center">
                <button
                    onClick={() => setIsVideo(!isVideo)}
                    className="px-4 py-2 bg-primary text-white rounded"
                >
                    {isVideo ? 'Switch to Audio' : 'Switch to Video'}
                </button>
                <span>{status}</span>
                <span>Duration: {formattedDuration}</span>
                {error && <span className="text-red-500">{error}</span>}
            </div>

            {/* Recording Controls */}
            <div className="flex space-x-2">
                <button
                    onClick={startRecording}
                    disabled={isRecording}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Start
                </button>
                <button
                    onClick={pauseRecording}
                    disabled={!isRecording || isPaused}
                    className="px-4 py-2 bg-yellow-500 text-white rounded"
                >
                    Pause
                </button>
                <button
                    onClick={resumeRecording}
                    disabled={!isPaused}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                >
                    Resume
                </button>
                <button
                    onClick={stopRecording}
                    disabled={!isRecording && !isPaused}
                    className="px-4 py-2 bg-red-500 text-white rounded"
                >
                    Stop
                </button>
                <button
                    onClick={muteRecording}
                    disabled={isMuted}
                    className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                    Mute
                </button>
                <button
                    onClick={unmuteRecording}
                    disabled={!isMuted}
                    className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                    Unmute
                </button>
            </div>

            {/* Video Preview */}
            {isVideo && (
                <video
                    ref={videoRef}
                    className="w-full h-auto bg-black"
                    autoPlay
                    muted
                    playsInline
                />
            )}

            {/* Recordings List */}
            <div className="space-y-2">
                <h2 className="text-xl font-bold">Recordings</h2>
                {loading && <div>Loading...</div>}
                {Array.isArray(recordings) && recordings.length > 0 ? (
                    recordings.map((r) => (
                        <div
                            key={r.id}
                            className="flex items-center space-x-2"
                        >
                            <span>{r.title}</span>
                            <button
                                onClick={() => play(r.id)}
                                className="px-2 py-1 bg-blue-500 text-white rounded"
                            >
                                Play
                            </button>
                            <button
                                onClick={() => pause()}
                                className="px-2 py-1 bg-yellow-500 text-white rounded"
                            >
                                Pause
                            </button>
                            <button
                                onClick={() => stop()}
                                className="px-2 py-1 bg-red-500 text-white rounded"
                            >
                                Stop
                            </button>
                            <button
                                onClick={() => deleteRecording(r.id)}
                                className="px-2 py-1 bg-gray-500 text-white rounded"
                            >
                                Delete
                            </button>
                        </div>
                    ))
                ) : (
                    <div>No recordings available.</div>
                )}
            </div>
        </div>
    );
}
