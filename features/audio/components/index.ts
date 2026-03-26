/**
 * Audio Feature Components
 *
 * Barrel export for all audio-related components
 */

// ── Standalone self-contained microphone icon (recommended for new usage) ──
export { MicrophoneIconButton, type MicrophoneIconButtonProps, type MicVariant } from './MicrophoneIconButton';
export { MicrophoneRecordingModal, type MicrophoneRecordingModalProps } from './MicrophoneRecordingModal';

// Helper components (used internally)
export { MicrophoneButton } from './MicrophoneButton';
export { TranscriptionLoader } from './TranscriptionLoader';
export { RecordingIndicator } from './RecordingIndicator';
export { AudioLevelIndicator } from './AudioLevelIndicator';
export { RecordingOverlay } from './RecordingOverlay';
export { VoiceTroubleshootingModal } from './VoiceTroubleshootingModal';
export { VoiceDiagnosticsDisplay } from './VoiceDiagnosticsDisplay';

// Official Components - exported from official components directory
export { VoiceTextarea, type VoiceTextareaProps } from '@/components/official/VoiceTextarea';
export { VoiceInputButton, type VoiceInputButtonProps } from '@/components/official/VoiceInputButton';

// Recovery components
export { AudioRecoveryToast } from './AudioRecoveryToast';
export { AudioRecoveryModal, type AudioRecoveryModalProps } from './AudioRecoveryModal';

// Helper component types
export type { MicrophoneButtonProps } from './MicrophoneButton';
export type { TranscriptionLoaderProps } from './TranscriptionLoader';
export type { RecordingIndicatorProps } from './RecordingIndicator';
export type { AudioLevelIndicatorProps } from './AudioLevelIndicator';
export type { VoiceTroubleshootingModalProps } from './VoiceTroubleshootingModal';
export type { VoiceDiagnosticsDisplayProps } from './VoiceDiagnosticsDisplay';

