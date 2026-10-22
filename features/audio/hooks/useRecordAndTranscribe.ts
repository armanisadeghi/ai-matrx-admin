"use client";

// Record-then-transcribe lives in `@ai-matrx/media/voice` (a thin face over `useVoiceCapture`, whose
// recorder is the app-wide one wired in `features/audio/voiceInputPorts`).
import "../voiceInputPorts";

export { useRecordAndTranscribe, type UseRecordAndTranscribeProps } from "@ai-matrx/media/voice";
