"use client";

// The mic device caret lives in `@ai-matrx/media/voice`; the app's device choice, permission prompt and
// audio-settings door are wired in `features/audio/voiceInputPorts`.
import "@/features/audio/voiceInputPorts";

export { MicDeviceMenu, type MicDeviceMenuProps } from "@ai-matrx/media/voice";
