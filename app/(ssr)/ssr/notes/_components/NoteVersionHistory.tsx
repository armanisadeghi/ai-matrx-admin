"use client";

// NoteVersionHistory — Side panel showing version timeline for the active note.
// Wraps the existing DiffHistory component with SSR notes workspace integration.

import React, { useCallback } from "react";
import dynamic from "next/dynamic";
import { X, History } from "lucide-react";
import { cn } from "@/lib/utils";

const DiffHistory = dynamic(
  () =>
    import("@/features/text-diff/components/DiffHistory").then((m) => ({
      default: m.DiffHistory,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
        Loading version history...
      </div>
    ),
  },
);

interface NoteVersionHistoryProps {
  noteId: string;
  onClose: () => void;
  /** Called when a version is restored so the workspace can refresh the note */
  onVersionRestored?: (versionNumber: number) => void;
  className?: string;
}

export function NoteVersionHistory({
  noteId,
  onClose,
  onVersionRestored,
  className,
}: NoteVersionHistoryProps) {
  const handleRestore = useCallback(
    (versionNumber: number) => {
      onVersionRestored?.(versionNumber);
    },
    [onVersionRestored],
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full border-l border-border bg-card/80 backdrop-blur-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">Version History</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-5 h-5 rounded hover:bg-accent transition-colors cursor-pointer [&_svg]:w-3 [&_svg]:h-3 text-muted-foreground hover:text-foreground"
        >
          <X />
        </button>
      </div>

      {/* Version Timeline */}
      <div className="flex-1 min-h-0 overflow-auto [&_.h-\[400px\]]:h-full">
        <DiffHistory
          noteId={noteId}
          onRestoreVersion={handleRestore}
          className="border-0 shadow-none rounded-none bg-transparent h-full"
        />
      </div>
    </div>
  );
}
