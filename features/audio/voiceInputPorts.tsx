"use client";

/**
 * The app's side of the shared voice-input controls (`@ai-matrx/media/voice`): the ONE mic button,
 * device menu, transcription loader and record-then-transcribe hook live in the package; what is
 * genuinely this app's is wired here, once:
 *   - the recorder: the app-wide recorder behind `GlobalRecordingProvider` (`useVoiceCapture`),
 *   - the microphone choice: `useAudioDevices` (persisted to userPreferences, applied to the mic),
 *   - the failure notice (toast with "Get Help"), the audio-settings overlay, and the two dialogs.
 *
 * Imported for its effect by every app door to the controls (the re-export files in
 * features/audio/components, the chat registration) so no mic can render before it ran.
 */

import { createElement, lazy, Suspense, useCallback, useRef, type ComponentType } from "react";
import {
  configureVoiceInput,
  type InputDevicesState,
  type RecordingModalProps,
  type TroubleshootingModalProps,
} from "@ai-matrx/media/voice";
import { useVoiceCapture } from "@/features/audio/hooks/useVoiceCapture";
import { useAudioDevices } from "@/features/audio/useAudioDevices";
import { useOpenAudioDevices } from "@/features/overlays/definitions/audioDevices";
import { showVoiceInputErrorToast } from "@/features/audio/services/voiceInputErrorToast";

function useOpenAppAudioSettings(): () => void {
  const open = useOpenAudioDevices();
  return useCallback(() => {
    open();
  }, [open]);
}

function useAppInputDevices(): InputDevicesState {
  const { inputs, selectedInputId, setInput, requestPermission } = useAudioDevices();
  return {
    inputs,
    selectedInputId,
    setInput,
    // Opening the menu asks for the labels (a permission prompt only when one is needed).
    refresh: () => void requestPermission(),
    error: null,
  };
}

const LazyTroubleshooting = lazy(() =>
  import("@/features/audio/components/VoiceTroubleshootingModal").then((m) => ({ default: m.VoiceTroubleshootingModal })),
);
const LazyRecordingModal = lazy(() =>
  import("@/features/audio/components/MicrophoneRecordingModal").then((m) => ({ default: m.MicrophoneRecordingModal })),
);

/** A dialog that loads on first open and stays mounted after (its edited text survives a close). */
function lazyDialog<P extends { isOpen: boolean }>(Dialog: ComponentType<P>): ComponentType<P> {
  return function LazyDialog(props: P) {
    const opened = useRef(false);
    if (props.isOpen) opened.current = true;
    if (!opened.current) return null;
    return createElement(Suspense, { fallback: null }, createElement(Dialog, props));
  };
}

configureVoiceInput({
  useVoiceCapture,
  useInputDevices: useAppInputDevices,
  useOpenAudioSettings: useOpenAppAudioSettings,
  notifyError: ({ message, code, onHelp }) => showVoiceInputErrorToast({ message, code, onHelp: onHelp ?? (() => undefined) }),
  TroubleshootingModal: lazyDialog<TroubleshootingModalProps>(LazyTroubleshooting as ComponentType<TroubleshootingModalProps>),
  RecordingModal: lazyDialog<RecordingModalProps>(LazyRecordingModal as ComponentType<RecordingModalProps>),
});
