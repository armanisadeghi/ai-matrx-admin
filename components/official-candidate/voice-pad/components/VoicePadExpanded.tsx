"use client";

import React, { useRef, useCallback } from "react";
import { Copy, StickyNote, Trash2, X } from "lucide-react";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openSaveToNotes } from "@/lib/redux/slices/overlaySlice";

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
}

interface VoicePadExpandedProps {
  entries: TranscriptEntry[];
  draftText: string;
  liveTranscript?: string;
  onTranscriptionComplete: (text: string) => void;
  onLiveTranscript?: (text: string) => void;
  onRemoveEntry: (id: string) => void;
  onClearAll: () => void;
  onDraftChange: (text: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function VoicePadExpanded({
  entries,
  draftText,
  liveTranscript,
  onTranscriptionComplete,
  onLiveTranscript,
  onRemoveEntry,
  onClearAll,
  onDraftChange,
}: VoicePadExpandedProps) {
  const dispatch = useAppDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const allText = entries.map((e) => e.text).join("\n\n");
  const baseText = draftText || allText;
  const displayText = liveTranscript ? (baseText ? baseText + "\n\n" + liveTranscript : liveTranscript) : baseText;

  const handleSaveToNotes = useCallback(() => {
    const text = draftText || allText;
    if (!text.trim()) {
      toast.info("Nothing to save");
      return;
    }
    dispatch(
      openSaveToNotes({
        content: text,
        defaultFolder: "transcripts",
        instanceId: crypto.randomUUID(),
      }),
    );
  }, [dispatch, draftText, allText]);

  const handleCopyAll = useCallback(async () => {
    const text = draftText || allText;
    if (!text.trim()) {
      toast.info("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [draftText, allText]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onDraftChange(e.target.value);
    },
    [onDraftChange],
  );

  const hasContent = entries.length > 0 || draftText.trim().length > 0 || (!!liveTranscript && liveTranscript.trim().length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        {hasContent ? (
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={handleTextareaChange}
            placeholder="Transcribed text appears here..."
            className={cn(
              "min-h-0 w-full flex-1 resize-none rounded-md",
              "bg-background/50 border border-border/50 px-2 py-1.5",
              "text-[13px] leading-snug text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-ring",
            )}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-2">
              <MicrophoneIconButton
                onTranscriptionComplete={onTranscriptionComplete}
                onLiveTranscript={onLiveTranscript}
                variant="icon-only"
                size="lg"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tap the mic to start recording
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Transcriptions persist across page navigation
            </p>
          </div>
        )}

        {entries.length > 1 && (
          <div className="max-h-[100px] shrink-0 overflow-y-auto border border-border/40 rounded-md px-2 py-1">
            <div className="text-[10px] font-medium text-muted-foreground/70 mb-1">
              Session entries
            </div>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start gap-1 py-0.5 text-[11px] leading-tight"
              >
                <span className="text-muted-foreground/50 shrink-0 mt-0.5 tabular-nums">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="text-foreground/80 flex-1 line-clamp-1">
                  {entry.text}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveEntry(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity"
                  aria-label="Remove entry"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 border-t border-border/50 bg-muted/20 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopyAll}
          className="h-6 px-2 text-[11px] gap-1"
        >
          <Copy className="h-3 w-3" />
          Copy
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSaveToNotes}
          className="h-6 px-2 text-[11px] gap-1"
        >
          <StickyNote className="h-3 w-3" />
          Notes
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-[11px] gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </Button>
        <div className="flex-1" />
        <span className="text-[11px] text-muted-foreground/60 tabular-nums">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>
    </div>
  );
}
