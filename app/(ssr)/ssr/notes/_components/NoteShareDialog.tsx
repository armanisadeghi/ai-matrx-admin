"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteShareDialogProps {
  noteId: string;
  onClose: () => void;
}

function generateShareLink(noteId: string) {
  return `${window.location.origin}/ssr/notes/share/${noteId}`;
}

export default function NoteShareDialog({ noteId, onClose }: NoteShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateShareLink(noteId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — silently ignore
    }
  }, [noteId]);

  return (
    <>
      <div
        className="fixed inset-0 z-110 bg-black/20"
        onClick={onClose}
      />
      <div className="fixed z-120 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(400px,90vw)] p-5 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-xl shadow-xl">
        <h3 className="text-sm font-medium mb-1">Share Note</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Anyone with this link can view and save a copy of this note.
        </p>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 h-8 px-3 text-xs bg-muted rounded-lg border border-border outline-none min-w-0 text-muted-foreground"
            value={generateShareLink(noteId)}
            readOnly
            onClick={(e) => e.currentTarget.select()}
          />
          <button
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-lg border border-border cursor-pointer transition-colors [&_svg]:w-4 [&_svg]:h-4",
              copied
                ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={copyLink}
          >
            {copied ? <Check /> : <Copy />}
          </button>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground cursor-pointer hover:bg-accent"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
