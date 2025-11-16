/**
 * Audio Feature Components
 * 
 * Barrel export for all audio-related components
 */

// Helper components (used internally)
export { MicrophoneButton } from './MicrophoneButton';
export { TranscriptionLoader } from './TranscriptionLoader';
export { RecordingIndicator } from './RecordingIndicator';
export { AudioLevelIndicator } from './AudioLevelIndicator';
export { RecordingOverlay } from './RecordingOverlay';

// Official Components - exported from official components directory
export { VoiceTextarea, type VoiceTextareaProps } from '@/components/official/VoiceTextarea';
export { VoiceInputButton, type VoiceInputButtonProps } from '@/components/official/VoiceInputButton';

// Helper component types
export type { MicrophoneButtonProps } from './MicrophoneButton';
export type { TranscriptionLoaderProps } from './TranscriptionLoader';
export type { RecordingIndicatorProps } from './RecordingIndicator';
export type { AudioLevelIndicatorProps } from './AudioLevelIndicator';

