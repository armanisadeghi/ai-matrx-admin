// types/audioRecording.types.ts

export type RecordingStatus =
    | 'recording'
    | 'paused'
    | 'completed'
    | 'uploading'
    | 'uploaded'
    | 'failed';

export interface Recording {
    id?: number;
    filename: string;
    title: string;
    duration: number;
    status: RecordingStatus;
    created_at: Date;
    updated_at: Date;
    size: number;
    blob?: Blob;
    upload_url?: string;
    waveform_data?: number[];
    last_position?: number;
    recording_quality?: {
        sampleRate: number;
        bitDepth: number;
        channels: number;
    };
}

export interface RecordingChunk {
    id?: number;
    recording_id: number;
    chunk_index: number;
    blob: Blob;
    timestamp: Date;
}

// Using a single AsyncResult type across the system
export type AsyncResult<T> = Promise<{
    data: T | null;
    error: Error | null;
}>;

export const STORES = {
    RECORDINGS: 'recordings',
    CHUNKS: 'recordingChunks'
} as const;

export type StoreNames = typeof STORES[keyof typeof STORES];