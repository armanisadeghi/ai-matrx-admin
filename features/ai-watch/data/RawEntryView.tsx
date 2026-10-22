"use client";

/** One RAW entry of a capture index: inline bytes, a stored file, a pointer, or "not kept — why". */

import { Button } from "@ai-matrx/design-system/controls";
import { FileText } from "lucide-react";
import { useOpenFilePreviewWindow } from "@/features/overlays/definitions/filePreviewWindow.overlay";
import { DataPane } from "./DataPane";
import { sizeLabel, type RawEntry } from "./raw-data";

function entryNote(entry: RawEntry): string | null {
  const parts = [
    entry.source || null,
    entry.statusCode != null ? `HTTP ${entry.statusCode}` : null,
    entry.contentType,
    entry.detail?.attempt != null ? `attempt ${String(entry.detail.attempt)}` : null,
    entry.detail?.billed === false ? "not billed" : null,
    entry.detail?.replayed ? "test replay" : null,
    entry.detail?.transport_error ? String(entry.detail.transport_error) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function RawEntryView({ entry, storedText }: { entry: RawEntry; storedText?: string | null }) {
  const openFile = useOpenFilePreviewWindow();
  const size = sizeLabel(entry.bytes ?? entry.ref?.chars ?? null, entry.bytes != null ? "bytes" : "chars");
  if (!entry.kept) {
    return (
      <DataPane tier="raw" title={entry.label} size={size} note={entryNote(entry)} open>
        <div className="text-muted-foreground">Not kept — {entry.reason ?? "no reason recorded"}</div>
      </DataPane>
    );
  }
  if (entry.inline != null) {
    return (
      <DataPane
        tier="raw"
        title={entry.label}
        size={size}
        note={entry.inlineEncoding === "base64" ? `${entryNote(entry) ?? ""} · bytes as base64`.replace(/^ · /, "") : entryNote(entry)}
        value={entry.inline}
      />
    );
  }
  if (entry.fileId) {
    return (
      <DataPane tier="raw" title={entry.label} size={size} note={entryNote(entry)}>
        <Button variant="outline" icon={<FileText />} onClick={() => openFile({ fileId: entry.fileId })}>
          Open the stored bytes (gzip)
        </Button>
      </DataPane>
    );
  }
  if (entry.ref?.table === "chat.tool_call" && storedText != null) {
    return (
      <DataPane
        tier="raw"
        title={`${entry.label} · nothing cut`}
        size={size}
        note="No cut recorded: the stored result is the whole result"
        value={storedText}
      />
    );
  }
  return (
    <DataPane tier="raw" title={entry.label} size={size} note={entryNote(entry)}>
      <div className="text-muted-foreground">Kept in {entry.ref?.table ?? "another record"}</div>
    </DataPane>
  );
}
