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
import { ReadFailure } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { ReaderDetails, detailDate } from "@/features/rich-document/reader/ReaderDetails";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
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

  /** A paid, whole-document AI run states what it does first. */
  const confirmRegenerate = async () => {
    const ok = await confirm({
      title: "Regenerate the document?",
      description: "Reassembles the whole document from the topic report and analyses — one large paid AI run. This version is kept, and its open comments go to the writer.",
      confirmLabel: "Regenerate",
    });
    if (ok) void handleRegenerate();
  };

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
        <Button variant="primary" icon={<FileText aria-hidden />} onClick={handleRegenerate} disabled={stream.isStreaming || !reportReady}>
          Generate document
        </Button>
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
        <Button variant="primary" icon={stream.isStreaming ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />} onClick={() => void confirmRegenerate()} disabled={stream.isStreaming}>
          Retry
        </Button>
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

  // Quiet actions over the document; its facts are in Details, its versions in Versions.
  const toolbar = (
    <>
      <Button
        variant="quiet"
        icon={stream.isStreaming ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
        aria-label="Regenerate document"
        title="Regenerate the document (a paid AI run)"
        onClick={() => void confirmRegenerate()}
        disabled={stream.isStreaming}
      />
      <CopyButtons
        size="icon"
        label={document.title ?? "Research document"}
        human={() => document.content ?? ""}
        contentFlavor="markdown"
        json={() => ({ title: document.title, content: document.content, version: document.capture_version })}
      />
    </>
  );

  const details = (
    <ReaderDetails
      sections={[
        {
          rows: [
            document.capture_version != null && { label: "Version", value: `v${document.capture_version}` },
            { label: "Assembled", value: detailDate(document.created_at) },
            document.status !== "success" && { label: "Status", value: <span className="capitalize">{document.status}</span> },
            docTokenUsage && docTokenUsage.models.length > 0 && { label: "Model", value: docTokenUsage.models.map((m) => m.model).join(", ") },
          ],
        },
        {
          title: "Cost",
          rows: docTokenUsage
            ? [
                { label: "Input", value: `${docTokenUsage.inputTokens.toLocaleString()} tokens` },
                docTokenUsage.cachedInputTokens > 0 && { label: "Cached", value: `${docTokenUsage.cachedInputTokens.toLocaleString()} tokens` },
                { label: "Output", value: `${docTokenUsage.outputTokens.toLocaleString()} tokens` },
                docTokenUsage.costUsd != null && { label: "Cost", value: <Cost usd={docTokenUsage.costUsd} short /> },
              ]
            : [],
        },
      ]}
    />
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
          <Button variant="primary" icon={stream.isStreaming ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />} onClick={() => void confirmRegenerate()} disabled={stream.isStreaming}>
              Regenerate
            </Button>
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
                rowVersion: document.version ?? null,
                onEdited: () => {
                  refetchDoc();
                  refresh();
                },
              }
            : null
        }
        panelLabel="Document"
        toolbar={toolbar}
        header={header}
        details={details}
        extraTabs={[
          {
            id: "versions",
            label: "Versions",
            content: (
              <VersionHistory
                embedded
                open
                onOpenChange={() => undefined}
                topicId={topicId}
                currentVersion={document.capture_version ?? 0}
                onCompare={(old, current) => setDiffDocs([old, current])}
              />
            ),
          },
        ]}
      />

    </>
  );
}
