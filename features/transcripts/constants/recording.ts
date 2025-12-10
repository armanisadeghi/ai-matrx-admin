// features/transcripts/constants/recording.ts

/**
 * Recording limits based on Whisper API constraints and best practices
 */
export const RECORDING_LIMITS = {
    MAX_DURATION_SECONDS: 600, // 10 minutes
    MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25MB (Whisper limit)
    WARN_DURATION_SECONDS: 480, // Warn at 8 minutes
    WARN_SIZE_BYTES: 20 * 1024 * 1024, // Warn at 20MB
    ESTIMATED_BYTES_PER_SECOND: 16000, // ~128kbps for webm/opus
} as const;

/**
 * Recording states
 */
export type RecordingStatus = 
    | 'idle' 
    | 'requesting-permission' 
    | 'recording' 
    | 'paused' 
    | 'stopped' 
    | 'error';

/**
 * Error codes for recording
 */
export const RECORDING_ERRORS = {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    NO_MICROPHONE: 'NO_MICROPHONE',
    DURATION_EXCEEDED: 'DURATION_EXCEEDED',
    SIZE_EXCEEDED: 'SIZE_EXCEEDED',
    BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
    UNKNOWN: 'UNKNOWN',
} as const;

