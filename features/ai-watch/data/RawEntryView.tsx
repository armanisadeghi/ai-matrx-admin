"use client";

/** One RAW entry of a capture index: inline bytes, a stored file, a pointer, or "not kept — why". */

import { useEffect, useState } from "react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { Braces, FileText, Text, UnfoldVertical } from "lucide-react";
import { useOpenFilePreviewWindow } from "@/features/overlays/definitions/filePreviewWindow.overlay";
import { rememberFileOrganization } from "@/features/files/api/fileOrganization";
import { fetchFileBlob } from "@/features/files/hooks/useFileBlob";
import { gunzipIfNeeded } from "@/features/files/utils/gunzip";
import { DataPane } from "./DataPane";
import { rawIsJson, rawTextView, sizeLabel, type RawEntry } from "./raw-data";

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

/**
 * A raw answer kept as a gzipped file (anything over `ai_watch.raw_inline_max_bytes`): fetched and
 * gunzipped in the browser on first open, shown as text — JSON laid out, exact bytes one click
 * away. A very large answer shows its first part and says so, with the rest one click away.
 */
function StoredRawEntry({
  entry,
  size,
  note,
  organizationId,
}: {
  entry: RawEntry & { fileId: string };
  size: string;
  note: string | null;
  organizationId?: string | null;
}) {
  const openFile = useOpenFilePreviewWindow();
  const fileId = entry.fileId;
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState<{ text: string | null; error: string | null } | null>(null);
  const [formatted, setFormatted] = useState(true);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    // The capture is filed in the run's organization — read it there, whatever org is active.
    if (organizationId) rememberFileOrganization(fileId, organizationId);
    fetchFileBlob(fileId)
      .then(gunzipIfNeeded)
      .then(
        (text) => {
          if (!cancelled) setLoaded({ text, error: null });
        },
        (err: unknown) => {
          if (!cancelled) setLoaded({ text: null, error: err instanceof Error ? err.message : String(err) });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [requested, fileId, organizationId]);

  const openStored = (
    <Button variant="quiet" icon={<FileText />} onClick={() => openFile({ fileId })}>
      Open the stored file
    </Button>
  );
  const decoded = loaded?.text ?? null;
  if (decoded == null) {
    return (
      <DataPane tier="raw" title={entry.label} size={size} note={note} open={requested} onToggle={(o) => o && setRequested(true)}>
        {loaded?.error ? (
          <div className="flex flex-col gap-1">
            <ErrorNotice title="The stored answer could not be opened" message={loaded.error} />
            {openStored}
          </div>
        ) : requested ? (
          <RegionSkeleton shape="rows" count={3} aria-label="Opening the stored answer" />
        ) : (
          <div className="text-muted-foreground">Opens when expanded</div>
        )}
      </DataPane>
    );
  }
  const isJson = rawIsJson(decoded);
  const view = rawTextView(decoded, { formatted: formatted && isJson, full });
  const partial = view.shownChars < view.totalChars;
  const viewNote = [
    note,
    view.formatted ? "JSON laid out" : "exact bytes",
    partial ? `showing the first ${sizeLabel(view.shownChars)} of ${sizeLabel(view.totalChars)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <DataPane tier="raw" title={entry.label} size={size} note={viewNote} value={view.text} open>
      <div className="flex flex-wrap items-center gap-1">
        {partial ? (
          <Button variant="outline" icon={<UnfoldVertical />} onClick={() => setFull(true)}>
            Show all {sizeLabel(view.totalChars)}
          </Button>
        ) : null}
        {isJson ? (
          <Button
            variant="quiet"
            icon={view.formatted ? <Text /> : <Braces />}
            onClick={() => setFormatted((f) => !f)}
          >
            {view.formatted ? "Exact bytes" : "Lay out JSON"}
          </Button>
        ) : null}
        {openStored}
      </div>
    </DataPane>
  );
}

export function RawEntryView({
  entry,
  storedText,
  organizationId,
}: {
  entry: RawEntry;
  storedText?: string | null;
  /** The step row's organization — where its stored captures are filed. */
  organizationId?: string | null;
}) {
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
      <StoredRawEntry
        entry={{ ...entry, fileId: entry.fileId }}
        size={size}
        note={entryNote(entry)}
        organizationId={organizationId}
      />
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
