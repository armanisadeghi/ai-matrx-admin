"use client";

/**
 * Save-as-transcript button for a studio session. Materializes a regular
 * `transcripts` row from the studio's raw + cleaned segments and back-links
 * via `studio_sessions.transcript_id`. Subsequent clicks update the linked
 * transcript instead of creating duplicates.
 *
 * Rendered in the studio active-session header.
 */

import { useState } from "react";
import { ArrowDownToLine, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { saveAsTranscriptThunk } from "../../redux/transcriptBridge.thunks";

interface SaveAsTranscriptButtonProps {
  sessionId: string;
  hasLinkedTranscript: boolean;
  className?: string;
}

export function SaveAsTranscriptButton({
  sessionId,
  hasLinkedTranscript,
  className,
}: SaveAsTranscriptButtonProps) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await dispatch(saveAsTranscriptThunk({ sessionId }));
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : ArrowDownToLine;
  const label = hasLinkedTranscript
    ? busy
      ? "Updating transcript…"
      : "Update transcript"
    : busy
      ? "Saving…"
      : "Save as Transcript";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={
        hasLinkedTranscript
          ? "Push the latest studio state to the linked transcript"
          : "Materialize this session as a regular transcript"
      }
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors",
        busy
          ? "bg-muted text-muted-foreground cursor-wait"
          : "bg-secondary/30 text-foreground hover:bg-secondary/50",
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
