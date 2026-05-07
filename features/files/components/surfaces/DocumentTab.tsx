/**
 * features/files/components/surfaces/DocumentTab.tsx
 *
 * The "Document" tab inside PreviewPane.
 *
 * Three states, no fallback to a blank screen:
 *
 *   1. `found`        — file has a processed_documents row.
 *                       Renders an embedded `<DocumentViewer/>` (the
 *                       same 4-pane viewer at /rag/viewer/[id]) plus
 *                       an "Open full viewer" button that navigates
 *                       to /rag/viewer/<id>.
 *
 *   2. `absent`       — file is not yet ingested. Show a CTA card
 *                       with "Process this file for RAG" and
 *                       streaming progress.
 *
 *   3. `unavailable`  — endpoint not implemented or transient failure.
 *                       Show a soft message with a retry button. Don't
 *                       break the rest of the preview surface.
 *
 * The tab listens for two cross-component events:
 *
 *   - "cloud-files:document-processed" — fired by `useFileIngest` after
 *     a successful ingest. Triggers a re-probe so we transition from
 *     `absent → loading → found` automatically.
 *   - "cloud-files:reprocess-document" — fired by the file context menu
 *     ("Reprocess for RAG") or any toolbar button. Kicks off the
 *     streaming ingest from inside this tab, regardless of current
 *     state. Lets a user re-process an already-ingested file with one
 *     click.
 */

"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  RotateCw,
  Rainbow,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFileById } from "@/features/files/redux/selectors";
import { DocumentViewer } from "@/features/documents/components/DocumentViewer";
import { IngestProgressDialog } from "@/features/library/components/IngestProgressDialog";
import { LibraryPreviewPage } from "@/features/library/components/LibraryPreviewPage";
import { useFileDocument } from "@/features/files/hooks/useFileDocument";
import {
  onFileDocumentProcessed,
  useFileIngest,
  type UseFileIngestState,
} from "@/features/files/hooks/useFileIngest";

export interface DocumentTabProps {
  fileId: string;
  className?: string;
  /** When the tab is hidden (other tab active) skip the heavy work. */
  active?: boolean;
  /**
   * Citation deep-link target. When the user opens a file from a search
   * result or chat citation, the chunk + page are forwarded into the
   * embedded `<DocumentViewer/>` so the right pane is highlighted on
   * first paint. The full-viewer link below preserves these too.
   */
  initialPage?: number;
  initialChunkId?: string;
}

export function DocumentTab({
  fileId,
  className,
  active,
  initialPage,
  initialChunkId,
}: DocumentTabProps) {
  const file = useAppSelector((s) => selectFileById(s, fileId));
  const { state, refresh } = useFileDocument(fileId);
  const ingest = useFileIngest(fileId);

  // Re-probe whenever ingest completes anywhere in the app.
  useEffect(() => {
    return onFileDocumentProcessed((processedFileId) => {
      if (processedFileId === fileId) refresh();
    });
  }, [fileId, refresh]);

  // External "reprocess" trigger: file context menu, toolbar, etc. Works
  // regardless of current state — flips an absent file to running, or
  // re-runs ingestion on an already-found document.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ fileId?: string; force?: boolean }>)
        .detail;
      if (!detail || detail.fileId !== fileId) return;
      void ingest.run({ force: detail.force ?? true });
    };
    window.addEventListener("cloud-files:reprocess-document", handler);
    return () =>
      window.removeEventListener("cloud-files:reprocess-document", handler);
  }, [fileId, ingest]);

  // Skip mounting the heavy DocumentViewer until the user clicks the tab.
  if (active === false) {
    return <div className={cn("h-full w-full", className)} />;
  }

  // While an ingest is in flight (or has just errored), render the
  // ProcessingProgressDialog as the floating bottom-right widget by
  // default — the file table the user came from stays visible behind
  // it. The user can click the widget's expand button to see the full
  // four-stage stepper + previews if they want detail. The placeholder
  // under the widget tells them where to look in case they collapsed
  // the preview pane while a run is in flight.
  const ingestActive = ingest.status === "running" || ingest.status === "error";
  if (ingestActive) {
    return (
      <>
        <IngestProgressDialog
          open
          fileName={file?.fileName ?? "this file"}
          ingest={ingest}
          defaultMinimized
          onClose={() => {
            ingest.reset();
            refresh();
          }}
        />
        <div
          className={cn(
            "flex h-full w-full items-center justify-center gap-2 text-sm text-muted-foreground",
            className,
          )}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {ingest.status === "running"
              ? "Processing — live progress in the corner."
              : "Processing failed — see the corner widget for details."}
          </span>
        </div>
      </>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center gap-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Looking up document…</span>
      </div>
    );
  }

  if (state.status === "absent") {
    return (
      <NotIngestedCard
        fileName={file?.fileName ?? null}
        ingest={ingest}
        className={className}
      />
    );
  }

  if (state.status === "unavailable") {
    return (
      <UnavailableCard
        reason={state.reason}
        onRetry={refresh}
        className={className}
      />
    );
  }

  // state.status === "found"
  const docId = state.doc.processed_document_id;
  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-1 text-xs shrink-0">
        <span className="text-muted-foreground">
          {state.doc.derivation_kind} · {state.doc.total_pages ?? 0} pages ·{" "}
          {state.doc.chunk_count} chunks
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void ingest.run({ force: true })}
            title="Re-run the RAG pipeline (force re-ingest)"
            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-[11px] font-medium hover:bg-accent"
          >
            <RotateCw className="h-3 w-3" />
            Reprocess
          </button>
          <Link
            href={(() => {
              const qs = new URLSearchParams();
              if (initialPage) qs.set("page", String(initialPage));
              if (initialChunkId) qs.set("chunk", initialChunkId);
              const tail = qs.toString();
              return `/rag/viewer/${docId}${tail ? `?${tail}` : ""}`;
            })()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-[11px] font-medium hover:bg-accent"
            title="Open in full document viewer"
          >
            <ExternalLink className="h-3 w-3" />
            Full viewer
          </Link>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* The legacy 4-pane DocumentViewer hits /api/document/* which has
            its own bugs (returns 404 for many docs). We render the
            LibraryPreviewPage in embedded mode here — same data, working
            endpoints, gives the user real pages + raw + cleaned text +
            chunks + per-doc lexical search.

            The old DocumentViewer import is kept so the codebase still
            type-checks if anything else references it; this surface
            no longer renders it. */}
        <LibraryPreviewPage documentId={docId} embedded />
        {false && (
          <DocumentViewer
            documentId={docId}
            initialPage={initialPage}
            initialChunkId={initialChunkId}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Not ingested yet" CTA — primary action is the streaming reprocess.
// ---------------------------------------------------------------------------

function NotIngestedCard({
  fileName,
  ingest,
  className,
}: {
  fileName: string | null;
  ingest: UseFileIngestState & {
    run: (opts?: { force?: boolean }) => Promise<void>;
    runOnce: (opts?: { force?: boolean }) => Promise<void>;
    cancel: () => void;
    reset: () => void;
  };
  className?: string;
}) {
  const subtitle =
    ingest.status === "error"
      ? `Ingest failed: ${ingest.error}`
      : ingest.status === "complete"
        ? "Done — refreshing…"
        : "Run the RAG pipeline (extract → clean → chunk → embed) so this file can be searched, cited, and added to data stores.";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Rainbow className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-sm font-semibold">
          {fileName
            ? `${fileName} hasn't been processed for RAG yet`
            : "This file hasn't been processed for RAG yet"}
        </h3>
        <p className="text-xs text-muted-foreground break-words">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void ingest.run()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Rainbow className="h-3.5 w-3.5" />
          Process for RAG
        </button>
        {ingest.status === "error" && (
          <button
            type="button"
            onClick={ingest.reset}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streaming-progress card. Used while a run is in flight, regardless of
// the lookup state.
// ---------------------------------------------------------------------------

function IngestProgressCard({
  fileName,
  ingest,
  className,
}: {
  fileName: string | null;
  ingest: UseFileIngestState & {
    run: (opts?: { force?: boolean }) => Promise<void>;
    runOnce: (opts?: { force?: boolean }) => Promise<void>;
    cancel: () => void;
    reset: () => void;
  };
  className?: string;
}) {
  const progressFrac =
    ingest.progress && ingest.progress.total > 0
      ? Math.min(1, ingest.progress.current / ingest.progress.total)
      : 0;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <div className="space-y-1 max-w-md">
        <h3 className="text-sm font-semibold">
          {fileName ? `Processing ${fileName}…` : "Processing for RAG…"}
        </h3>
        <p className="text-xs text-muted-foreground capitalize">
          {ingest.progress?.message ?? ingest.progress?.stage ?? "starting"}
        </p>
      </div>
      <div className="w-64 max-w-full">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progressFrac * 100}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="capitalize">
            {ingest.progress?.stage ?? "starting"}
          </span>
          <span className="tabular-nums">
            {ingest.progress?.current ?? 0} / {ingest.progress?.total ?? 0}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={ingest.cancel}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        <X className="h-3.5 w-3.5" />
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Lookup unavailable" — endpoint not implemented yet, or transient.
// ---------------------------------------------------------------------------

function UnavailableCard({
  reason,
  onRetry,
  className,
}: {
  reason: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center",
        className,
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
        <AlertCircle className="h-6 w-6 text-amber-500" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-sm font-semibold">
          Document lookup is unavailable
        </h3>
        <p className="text-xs text-muted-foreground break-words">{reason}</p>
        <p className="text-[10px] text-muted-foreground/70">
          The Python team is shipping `GET /files/&#123;id&#125;/document`
          (REQUESTS.md item 14a). Until then, RAG features may not detect
          existing processings.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        Retry
      </button>
    </div>
  );
}
