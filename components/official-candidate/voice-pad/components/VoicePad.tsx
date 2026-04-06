"use client";

import React, { lazy, Suspense, useState, useCallback } from "react";
import { Mic } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { closeOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  selectVoicePadEntries,
  selectVoicePadDraftText,
  addTranscriptEntry,
  removeTranscriptEntry,
  clearAllEntries,
  setDraftText,
} from "@/lib/redux/slices/voicePadSlice";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";

const VoicePadExpanded = lazy(() => import("./VoicePadExpanded"));

const VOICE_PAD_WINDOW_ID = "voice-pad";

function ExpandedLoadingFallback() {
  return (
    <div className="flex flex-1 min-h-0 items-center gap-2 text-muted-foreground text-sm p-3">
      <Mic className="h-4 w-4 animate-pulse shrink-0" />
      <span>Loading voice pad...</span>
    </div>
  );
}

export default function VoicePad() {
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectVoicePadEntries);
  const draftText = useAppSelector(selectVoicePadDraftText);
  const [liveTranscript, setLiveTranscript] = useState("");

  const handleClose = () => {
    dispatch(closeOverlay({ overlayId: "voicePad" }));
  };

  const handleTranscriptionComplete = (text: string) => {
    setLiveTranscript("");
    if (text.trim()) {
      dispatch(addTranscriptEntry(text));
    }
  };

  const handleLiveTranscript = (text: string) => {
    setLiveTranscript(text);
  };

  const handleRemoveEntry = (id: string) => {
    dispatch(removeTranscriptEntry(id));
  };

  const handleClearAll = () => {
    dispatch(clearAllEntries());
  };

  const handleDraftChange = (text: string) => {
    dispatch(setDraftText(text));
  };

  return (
    <WindowPanel
      id={VOICE_PAD_WINDOW_ID}
      title="Voice Pad"
      width={320}
      height={420}
      position="top-right"
      minWidth={280}
      minHeight={200}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      onClose={handleClose}
      urlSyncKey="voice"
      urlSyncId="default"
      actions={
        <MicrophoneIconButton
          id="voice-pad-header-mic"
          onTranscriptionComplete={handleTranscriptionComplete}
          onLiveTranscript={handleLiveTranscript}
          variant="icon-only"
          size="xs"
        />
      }
    >
      <Suspense fallback={<ExpandedLoadingFallback />}>
        <VoicePadExpanded
          entries={entries}
          draftText={draftText}
          liveTranscript={liveTranscript}
          onTranscriptionComplete={handleTranscriptionComplete}
          onLiveTranscript={handleLiveTranscript}
          onRemoveEntry={handleRemoveEntry}
          onClearAll={handleClearAll}
          onDraftChange={handleDraftChange}
        />
      </Suspense>
    </WindowPanel>
  );
}
