/**
 * THE mic button lives in `@ai-matrx/media/voice`; the app's recorder, device choice, toast,
 * settings door and dialogs are wired once in `features/audio/voiceInputPorts`. This file is only
 * the app's import path for it (many importers), so the ports are always installed first.
 *
 * @official-component
 */

"use client";

import "../voiceInputPorts";

export {
  MicrophoneIconButton,
  type MicVariant,
  type MicrophoneIconButtonHandle,
  type MicrophoneIconButtonProps,
} from "@ai-matrx/media/voice";
