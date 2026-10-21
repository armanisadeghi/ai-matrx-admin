"use client";

/**
 * VoiceNoteButton — one-tap voice note for the current item.
 *
 * Tap: start recording (canonical `useSimpleRecorder` — captureLock + shared
 * mic + the ONE MediaRecorder controller). Tap again: stop; the blob goes to
 * the session's `addAudioNote`, which uploads it into the item's folder and
 * transcribes it in the background into the item's notes (the War Room
 * record-into-text pattern, minus the live-chunk engine a quick field note
 * doesn't need).
 */

import { Button as ControlButton } from "@ai-matrx/design-system/controls";
import React, { useEffect } from "react";
import { formatDurationSeconds } from "@ai-matrx/kit/format";
import { Mic, Square } from "lucide-react";

import { useSimpleRecorder } from "@/features/audio/hooks/useSimpleRecorder";
import { toast } from "@/lib/toast";

interface VoiceNoteButtonProps {
  onRecordingComplete: (blob: Blob) => void;
  /** Fired when recording starts/stops so the host can pause the shutter
   *  (one live capture app-wide — the video recorder shares the lock). */
  onActiveChange?: (active: boolean) => void;
  disabled?: boolean;
}

export function VoiceNoteButton({
  onRecordingComplete,
  onActiveChange,
  disabled,
}: VoiceNoteButtonProps) {
  const recorder = useSimpleRecorder({
    label: "Product voice note",
    onRecordingComplete,
    onError: (message) => toast.error(message),
  });

  useEffect(() => {
    onActiveChange?.(recorder.isRecording);
  }, [recorder.isRecording, onActiveChange]);

  const toggle = () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
    } else {
      void recorder.startRecording();
    }
  };

  return (
    recorder.isRecording ? (
      <ControlButton
        type="button"
        variant="danger"
        onClick={toggle}
        disabled={disabled}
        aria-label="Stop voice note"
        icon={<Square className="fill-current" />}
      >
        {formatDurationSeconds(recorder.duration, { style: "clock" })}
      </ControlButton>
    ) : (
      <ControlButton
        type="button"
        variant="outline"
        onClick={toggle}
        disabled={disabled}
        aria-label="Record a voice note"
        icon={<Mic />}
      />
    )
  );
}
