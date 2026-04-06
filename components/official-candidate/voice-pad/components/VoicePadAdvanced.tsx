"use client";

import React, { lazy, Suspense, useState, useCallback } from "react";
import { Mic, PanelLeftClose, PanelLeft } from "lucide-react";
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
import { Button } from "@/components/ui/ButtonMine";
import { VoicePadHistorySidebar } from "./VoicePadHistorySidebar";

const VoicePadExpanded = lazy(() => import("./VoicePadExpanded"));

const VOICE_PAD_ADVANCED_WINDOW_ID = "voice-pad-advanced";

function ExpandedLoadingFallback() {
  return (
    <div className="flex flex-1 min-h-0 items-center gap-2 text-muted-foreground text-sm p-3">
      <Mic className="h-4 w-4 animate-pulse shrink-0" />
      <span>Loading voice pad...</span>
    </div>
  );
}

function getInitialRect() {
  if (typeof window === "undefined") {
    return { x: 0, y: 60, width: 320, height: 420 };
  }
  return {
    x: Math.max(0, window.innerWidth - 340),
    y: 60,
    width: 320,
    height: 420,
  };
}

export default function VoicePadAdvanced() {
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectVoicePadEntries);
  const draftText = useAppSelector(selectVoicePadDraftText);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [showHistory, setShowHistory] = useState(false);

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

  const handleSelectHistoryItem = useCallback(
    (text: string) => {
      handleClearAll();
      handleDraftChange(text);
    },
    [handleDraftChange],
  );

  const leftActions = (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => setShowHistory((v) => !v)}
      title={showHistory ? "Hide history" : "Show history"}
      className="h-5 w-5 p-0"
    >
      {showHistory ? (
        <PanelLeftClose className="h-3 w-3" />
      ) : (
        <PanelLeft className="h-3 w-3" />
      )}
    </Button>
  );

  return (
    <WindowPanel
      id={VOICE_PAD_ADVANCED_WINDOW_ID}
      title="Advanced Voice Pad"
      initialRect={getInitialRect()}
      minWidth={280}
      minHeight={200}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      onClose={handleClose}
      urlSyncKey="voice"
      urlSyncId="default"
      actionsLeft={leftActions}
      actionsRight={
        <MicrophoneIconButton
          id="voice-pad-header-mic"
          onTranscriptionComplete={handleTranscriptionComplete}
          onLiveTranscript={handleLiveTranscript}
          variant="icon-only"
          size="xs"
        />
      }
    >
      <div className="flex bg-background h-full w-full min-h-0">
        {showHistory && (
          <VoicePadHistorySidebar
            onClose={() => setShowHistory(false)}
            onSelectTranscript={handleSelectHistoryItem}
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
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
        </div>
      </div>
    </WindowPanel>
  );
}
