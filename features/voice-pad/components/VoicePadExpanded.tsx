"use client";

import React, { useRef, useCallback } from "react";
import { Copy, Trash2, X } from "lucide-react";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FloatingPanel } from "@/components/official-candidate/FloatingPanel";

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
}

interface VoicePadExpandedProps {
  entries: TranscriptEntry[];
  draftText: string;
  onDragStart: (e: React.MouseEvent) => void;
  onCollapse: () => void;
  onClose: () => void;
  onTranscriptionComplete: (text: string) => void;
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
  onDragStart,
  onCollapse,
  onClose,
  onTranscriptionComplete,
  onRemoveEntry,
  onClearAll,
  onDraftChange,
}: VoicePadExpandedProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const allText = entries.map((e) => e.text).join("\n\n");
  const displayText = draftText || allText;

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

  const hasContent = entries.length > 0 || draftText.trim().length > 0;

  return (
    <FloatingPanel
      title="Voice Pad"
      size="md"
      onDragStart={onDragStart}
      onClose={onClose}
      onCollapsedChange={(c) => {
        if (c) onCollapse();
      }}
      actions={
        <MicrophoneIconButton
          onTranscriptionComplete={onTranscriptionComplete}
          variant="icon-only"
          size="sm"
        />
      }
      bodyClassName="p-0"
    >
      {/* Transcript area */}
      <div className="p-2">
        {hasContent ? (
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={handleTextareaChange}
            placeholder="Transcribed text appears here..."
            className={cn(
              "w-full min-h-[80px] max-h-[240px] resize-y rounded-md",
              "bg-background/50 border border-border/50 px-2 py-1.5",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-ring",
            )}
            style={{ fontSize: "16px" }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-2">
              <MicrophoneIconButton
                onTranscriptionComplete={onTranscriptionComplete}
                variant="icon-only"
                size="lg"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tap the mic to start recording
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Transcriptions persist across page navigation
            </p>
          </div>
        )}
      </div>

      {/* Entry list with timestamps */}
      {entries.length > 1 && (
        <div className="px-2 pb-1 max-h-[120px] overflow-y-auto">
          <div className="text-xs text-muted-foreground/70 mb-1">
            Session entries
          </div>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-start gap-1 py-0.5 text-xs"
            >
              <span className="text-muted-foreground/50 shrink-0 mt-0.5">
                {formatTime(entry.timestamp)}
              </span>
              <span className="text-foreground/70 flex-1 line-clamp-1">
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

      {/* Actions footer */}
      {hasContent && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border/50 bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyAll}
            className="h-6 px-2 text-xs gap-1"
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground/50">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      )}
    </FloatingPanel>
  );
}
