/**
 * Recording constants for the transcripts feature.
 * Re-exports from the centralized audio constants.
 */

import { AUDIO_LIMITS, RECORDING_ERROR_CODES } from '@/features/audio/constants';
export type { RecordingStatus } from '@/features/audio/constants';

export const RECORDING_LIMITS = {
    MAX_DURATION_SECONDS: AUDIO_LIMITS.MAX_DURATION_SECONDS,
    MAX_FILE_SIZE_BYTES: AUDIO_LIMITS.MAX_FILE_SIZE_BYTES,
    WARN_DURATION_SECONDS: AUDIO_LIMITS.WARN_DURATION_SECONDS,
    WARN_SIZE_BYTES: AUDIO_LIMITS.MAX_FILE_SIZE_BYTES * 0.8,
    ESTIMATED_BYTES_PER_SECOND: AUDIO_LIMITS.ESTIMATED_BYTES_PER_SECOND,
} as const;

export const RECORDING_ERRORS = RECORDING_ERROR_CODES;
