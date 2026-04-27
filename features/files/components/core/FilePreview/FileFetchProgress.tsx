/**
 * features/files/components/core/FilePreview/FileFetchProgress.tsx
 *
 * Loading UI shared by every fetch-based previewer (PDF, Markdown, Code,
 * Text, Data). Shows the actual byte progress of the download instead of
 * a single indeterminate pulse — multi-megabyte fetches no longer feel
 * like the app froze.
 *
 * Renders:
 *   - A determinate progress bar when `total` is known (Content-Length
 *     was sent by the server)
 *   - An indeterminate pulse bar when `total` is null
 *   - A compact "Downloading <fileName> · 6.2 / 10 MB · 62%" line
 *
 * Keep the markup small — this is shown for every preview load.
 */

"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/features/files/utils/format";

export interface FileFetchProgressProps {
  /** Optional filename for the line, e.g. "report.pdf". */
  fileName?: string | null;
  /** Bytes received so far. */
  bytesLoaded: number;
  /** Bytes total when known (Content-Length header); null otherwise. */
  bytesTotal: number | null;
  /** Slim variant — half-height bar; for tight contexts. */
  slim?: boolean;
  className?: string;
}

export function FileFetchProgress({
  fileName,
  bytesLoaded,
  bytesTotal,
  slim,
  className,
}: FileFetchProgressProps) {
  const hasTotal = typeof bytesTotal === "number" && bytesTotal > 0;
  const pct = hasTotal
    ? Math.min(100, Math.round((bytesLoaded / (bytesTotal as number)) * 100))
    : null;

  const label =
    bytesLoaded === 0
      ? "Connecting…"
      : hasTotal
        ? `${formatFileSize(bytesLoaded)} / ${formatFileSize(bytesTotal as number)} · ${pct}%`
        : `${formatFileSize(bytesLoaded)} downloaded`;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="space-y-1.5 w-full max-w-xs">
        {fileName ? (
          <p
            className="truncate text-sm font-medium"
            title={fileName ?? ""}
          >
            Downloading {fileName}
          </p>
        ) : (
          <p className="text-sm font-medium">Downloading…</p>
        )}
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-muted",
            slim ? "h-1" : "h-2",
          )}
        >
          {hasTotal ? (
            <div
              className="h-full bg-primary transition-[width] duration-150 ease-out"
              style={{ width: `${pct ?? 0}%` }}
            />
          ) : (
            // No Content-Length — shimmer pulse over the whole bar
            // instead of a determinate fill. Browser quirk: when the
            // server omits Content-Length we can't compute a percentage,
            // and a fake percentage would be misleading.
            <div className="h-full w-full animate-pulse bg-primary/60" />
          )}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{label}</p>
      </div>
    </div>
  );
}

export default FileFetchProgress;
