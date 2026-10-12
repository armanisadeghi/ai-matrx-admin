"use client";

import { useState, useCallback } from "react";
import type { Layout } from "react-resizable-panels";
import { ResearchRecordReader } from "../reader/ResearchRecordReader";
import {
  RefreshCw,
  Download,
  History,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReadFailure } from "@ai-matrx/design-system";
import { StaleDataNotice } from "@ai-matrx/design-system";
import { useTopicContext, useStreamDebug } from "../../context/ResearchContext";
import { useResearchApi } from "../../hooks/useResearchApi";
import { useResearchDocument } from "../../hooks/useResearchState";
import { useResearchStream } from "../../hooks/useResearchStream";
import { VersionHistory } from "./VersionHistory";
import { VersionDiff } from "./VersionDiff";
import { DocumentSkeleton } from "../shared/Skeletons";
import type { ResearchDocument } from "../../types";
import { tokenUsageFromJson } from "../../types";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { StoppedEarlyNote } from "../shared/StoppedEarlyNote";
import { deriveReadiness } from "../../readiness";

// Universal v3 context menu — the SAME menu everywhere. This surface is the
// read-only assembled document, so it uses the NonEditable wrapper (Copy / AI
// Actions / Export / Convert still work via the DOM-content fallback). The
// wrapper is the lightweight shell (imported statically); MenuContent
// lazy-loads on first open.
import { Cost } from "@/components/cost/Cost";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { downloadFile } from "@ai-matrx/kit/download";

/** A string with real (non-whitespace) content. */
const hasText = (s: string | null | undefined): s is string =>
  !!s && s.trim().length > 0;

export default function DocumentViewer({ defaultLayout }: { defaultLayout?: Layout }) {
  const { topicId, progress, refresh } = useTopicContext();
  const api = useResearchApi();
  const debug = useStreamDebug();
  const {
    data: docData,
    isLoading: docLoading,
    error: docError,
    refresh: refetchDoc,
  } = useResearchDocument(topicId);
  const stream = useResearchStream();

  // Live streaming document text — accumulated chunk by chunk
  const [streamingDocText, setStreamingDocText] = useState("");

  const [showHistory, setShowHistory] = useState(false);
  const [diffDocs, setDiffDocs] = useState<
    [ResearchDocument, ResearchDocument] | null
  >(null);

  const document = docData as ResearchDocument | null;

  // Prefer the persisted document; fall back to the just-streamed text so the
  // viewer never flashes the empty "No document yet" state during the refetch
  // gap between `document_complete` and the DB row becoming visible.
  const displayContent = document?.content || streamingDocText;

  const handleRegenerate = useCallback(async () => {
    setStreamingDocText("");
    const response = await api.generateDocument(topicId);
    stream.startStream(response, {
      onChunk: (text) => setStreamingDocText((prev) => prev + text),
      onData: (payload: import("../../types").ResearchDataEvent) => {
        if (payload.type === "document_complete") {
          // Document assembled — refetch the saved row. We do NOT clear the
          // streamed text here: `displayContent` prefers `document.content`
          // once it lands, and keeping the streamed text avoids an empty flash
          // during the async refetch gap.
          refetchDoc();
          refresh();
        }
      },
      onEnd: () => {
        // Safety fallback: if document_complete wasn't caught, still refetch.
        refetchDoc();
        refresh();
      },
    });
    debug.pushEvents(stream.rawEvents, "document");
  }, [api, topicId, stream, refetchDoc, refresh, debug]);

  // NO AUTO-GENERATION. Merely opening this tab used to fire a full
  // document-assembly call — one of the most expensive operations in the
  // product — with no warning, no confirmation, and no way to decline. Clicking
  // a navigation item must never spend money. Generation is an explicit,
  // labeled action; the empty state below asks for it.
  const reportReady = (progress?.topic_syntheses ?? 0) > 0;
  // The assembled document predates the topic report it was built from — the
  // readiness ledger's `document_stale`, surfaced as a banner, never a silent
  // regeneration.
  const documentStale =
    deriveReadiness(progress).document.readiness === "stale";

  const handleExport = useCallback(
    async (format: string) => {
      if (!document) return;
      try {
        if (format === "json") {
          const content = JSON.stringify(
            {
              title: document.title,
              content: document.content,
              version: document.capture_version,
            },
            null,
            2,
          );
          const blob = new Blob([content], { type: "application/json" });
          const a = window.document.createElement("a");
          downloadFile(`research-${topicId}.${format}`, blob, blob.type);
        } else {
          // For other formats, download as text for now
          const blob = new Blob([document.content ?? ""], {
            type: "text/plain",
          });
          const a = window.document.createElement("a");
          downloadFile(`research-${topicId}.txt`, blob, blob.type);
        }
      } catch {
        // fallback — download as text
      }
    },
    [document, topicId],
  );

  // Show the streaming in-progress state while generating, OR while we hold
  // just-streamed text waiting for the saved row to land (no empty flash).
  if (!document && (stream.isStreaming || streamingDocText)) {
    return (
      <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-full matrx-glass-thin-border px-3 py-1.5 mb-4">
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
          <span className="type-secondary font-medium text-primary">
            {stream.isStreaming ? "Generating document…" : "Finalizing…"}
          </span>
          {stream.messages.length > 0 && (
            <span className="type-meta text-muted-foreground truncate">
              {stream.messages[stream.messages.length - 1].message}
            </span>
          )}
        </div>
        {streamingDocText && (
          <article>
            <RichContent level="full" imagePolicy="ai" source={streamingDocText} />
          </article>
        )}
      </div>
    );
  }

  // Initial fetch still in flight — use the shared skeleton, never bare text.
  if (!document && docLoading) {
    return <DocumentSkeleton />;
  }

  // The read failed — say so; "No document yet" would be a claim nobody read.
  if (!document && docError) {
    return (
      <ReadFailure
        error={docError}
        what="this topic's research document"
        onRetry={refetchDoc}
      />
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-3 p-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center">
          <FileText className="h-6 w-6 text-primary/40" />
        </div>
        <div>
          <p className="type-secondary font-medium text-foreground/70">
            No document yet
          </p>
          <p className="type-meta text-muted-foreground mt-1 max-w-[280px]">
            {reportReady
              ? "Assembles your topic report and every analysis into one long-form document. This is a single large AI call — it runs only when you ask for it."
              : "A document is assembled from your topic report. Run the pipeline far enough to produce one first."}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={stream.isStreaming || !reportReady}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all min-h-[44px]"
        >
          <FileText className="h-3 w-3" />
          Generate Document
        </button>
      </div>
    );
  }

  const docHasContent =
    !!document.content && document.content.trim().length > 0;
  // A failed/stopped doc that still produced content falls through to render
  // that content (with a note). Only a content-less failure shows this state.
  if (document.status === "failed" && !docHasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-3 p-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive/50" />
        </div>
        <div>
          <p className="type-secondary font-medium text-destructive/80">
            Generation failed
            <ErrorAlchemyMenu />
          </p>
          {document.error && (
            <p className="type-meta text-muted-foreground mt-1 max-w-[280px]">
              {document.error}
              <ErrorAlchemyMenu error={document.error} />
            </p>
          )}
        </div>
        <button
          onClick={handleRegenerate}
          disabled={stream.isStreaming}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all min-h-[44px]"
        >
          {stream.isStreaming ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Retry
        </button>
      </div>
    );
  }

  if (diffDocs) {
    return (
      <VersionDiff
        oldDoc={diffDocs[0]}
        newDoc={diffDocs[1]}
        onClose={() => setDiffDocs(null)}
      />
    );
  }

  const docTokenUsage = tokenUsageFromJson(document.token_usage);

  const toolbar = (
    <div className="flex items-center gap-2 rounded-full matrx-glass-thin-border px-3 py-1.5">
      <span className="type-secondary font-medium text-foreground/80 truncate">
        {document.title ?? "Document"}
      </span>
      {document.capture_version != null && (
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
          v{document.capture_version}
        </Badge>
      )}
      <span className="type-meta text-muted-foreground">
        {document.created_at
          ? new Date(document.created_at).toLocaleDateString()
          : ""}
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <button
          onClick={handleRegenerate}
          disabled={stream.isStreaming}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-full matrx-glass-card text-[11px] font-medium text-primary disabled:opacity-50 transition-colors"
        >
          {stream.isStreaming ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">Regen</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 h-6 px-2 rounded-full matrx-glass-card text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport("json")}>
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Export as PDF (coming soon)
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Export as DOCX (coming soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => setShowHistory(true)}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-full matrx-glass-card text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-3 w-3" />
          <span className="hidden sm:inline">History</span>
        </button>
      </div>
    </div>
  );

  const header = (
    <>
      {docError && (
        <StaleDataNotice
          hasData
          what="this document"
          onRetry={refetchDoc}
          retrying={docLoading}
          detail={docError}
          className="mb-3"
        />
      )}
      {/* Out-of-date document. Stated, never silently repaired: regenerating
          is a full document-assembly call, so it stays the user's call. */}
      {documentStale && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/[0.05] p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="min-w-0 flex-1 type-meta leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">
              Document out of date
            </span>{" "}
            · open comments go to the writer
          </p>
          <button
            onClick={handleRegenerate}
            disabled={stream.isStreaming}
            className="inline-flex shrink-0 items-center gap-1.5 h-7 px-3 rounded-full bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            {stream.isStreaming ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Regenerate
          </button>
        </div>
      )}

      {/* Token usage */}
      {docTokenUsage && (
        <div className="flex flex-wrap items-center gap-4 type-meta text-muted-foreground mb-4 pb-4 border-b border-border">
          <span>
            Input: {docTokenUsage.inputTokens.toLocaleString()} tokens
          </span>
          {docTokenUsage.cachedInputTokens > 0 && (
            <span className="text-muted-foreground/60">
              Cached: {docTokenUsage.cachedInputTokens.toLocaleString()}
            </span>
          )}
          <span>
            Output: {docTokenUsage.outputTokens.toLocaleString()} tokens
          </span>
          {docTokenUsage.models.length > 0 && (
            <span className="text-muted-foreground/50">
              {docTokenUsage.models.map((m) => m.model).join(", ")}
            </span>
          )}
          {docTokenUsage.costUsd != null && (
            <span className="inline-flex items-center gap-1">
              Cost: <Cost usd={docTokenUsage.costUsd} short />
            </span>
          )}
        </div>
      )}

      {/* Stopped early but content was produced — annotate, don't hide it.
          Gated on the failed status (not a stale error field) so a clean
          success never shows a false "stopped early" note. */}
      {!stream.isStreaming && document.status === "failed" && (
        <StoppedEarlyNote
          reason={document.error || "Generation stopped early."}
        />
      )}
    </>
  );

  // The assembled document in THE annotated reader: outline, highlights,
  // comments, the research right-click menu (live streaming text while a
  // regenerate runs, the saved row after).
  return (
    <>
      <ResearchRecordReader
        groupKey="research-document-reader"
        defaultLayout={defaultLayout}
        record={
          hasText(displayContent)
            ? {
                type: "research_document",
                id: document.id,
                title: document.title ?? "Research Document",
                version: document.capture_version ?? 1,
                kind: "document",
                body: displayContent,
                href: `/research/topics/${topicId}/document`,
              }
            : null
        }
        toolbar={toolbar}
        header={header}
      />

      {/* Version History */}
      <VersionHistory
        open={showHistory}
        onOpenChange={setShowHistory}
        topicId={topicId}
        currentVersion={document.capture_version ?? 0}
        onCompare={(old, current) => {
          setDiffDocs([old, current]);
          setShowHistory(false);
        }}
      />
    </>
  );
}
