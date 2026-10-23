"use client";

/**
 * features/pdf/workspace/extractor/ExtractorTool.tsx — the workspace's "Document" tool: everything the extractor
 * studio did for the open file, as one panel of the PDF workspace.
 *
 *  - Run: AI clean (the restored cleanup button), the full pipeline, live run progress (rejoined after a refresh),
 *    page and word counts, the copy-pages overlay, the admin batch-debug window;
 *  - Text: the synced raw and cleaned text per page;
 *  - Chunks: the chunks of the current page;
 *  - Inspector: AI widgets, Chunker, Stores, Lineage.
 *
 * The processed document is found from the file (never typed): if the file has none yet, "Extract text" makes it
 * from the cloud file with no second upload. The run state is published to the page-level agent surface
 * (`matrx-user/pdf-extractor`) through `bridge`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, EmptyState, SegmentedControl } from "@ai-matrx/design-system/controls";
import { FileText, Loader2 } from "lucide-react";
import { useToastManager } from "@/hooks/useToastManager";
import { useShortcutTrigger } from "@ai-matrx/chat/agents/hooks/useShortcutTrigger";
import { usePdfExtractor, invalidateProcessedDocumentCache, type PdfDocument } from "@/features/pdf-extractor/hooks/usePdfExtractor";
import { usePdfDocRun } from "@/features/pdf-extractor/hooks/usePdfDocRun";
import { useProcessedDocumentPages } from "@/features/pdf-extractor/hooks/useProcessedDocumentPages";
import { useProcessedDocSync } from "@/features/pdf-extractor/hooks/useProcessedDocSync";
import { NO_PAGES_TO_CLEAN_REASON, canAiClean, isDocCleaned } from "@/features/pdf-extractor/service/cleanOutcome";
import { CopyPagesOverlay } from "@/features/pdf-extractor/components/CopyPagesOverlay";
import { PdfBatchExtractDebugTrigger } from "@/features/pdf-extractor/components/PdfBatchExtractDebugTrigger";
import { SyncedPdfTextView } from "@/features/pdf-extractor/components/SyncedPdfTextView";
import { PdfStudioChunksPane } from "@/features/pdf-extractor/studio/PdfStudioChunksPane";
import { useToolToggle } from "@/features/canvas/host/toolCanvas";
import { knowledgeAssetsInput } from "@/features/rag/canvas/knowledgeAssetsKind";
import { useExistingPdfExtraction } from "@/features/pdf/hooks/useExistingPdfExtraction";
import { resolvePdfSurfaceIds, invalidatePdfSurfaceLinks } from "@/features/pdf/hooks/usePdfSurfaceLinks";
import { confirmPaidPdfAi } from "./confirmPaidAi";
import { AutoCleanSetting } from "./AutoCleanOnOpen";
import { ExtractorInspector, type SectionKey } from "./ExtractorInspector";
import type { ExtractorBridge } from "./extractorBridge";

type Part = "run" | "text" | "chunks" | "inspector";

export function ExtractorTool({ fileId, pageNumber, bridge }: { fileId: string; pageNumber: number; bridge: ExtractorBridge }) {
  const toast = useToastManager("pdf-extractor");
  const extractor = usePdfExtractor({ loadHistory: false });
  const extraction = useExistingPdfExtraction();
  const triggerShortcut = useShortcutTrigger();
  const [part, setPart] = useState<Part>("run");
  const [docId, setDocId] = useState<string | null>(null);
  const [looked, setLooked] = useState(false);
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiCleanRunning, setAiCleanRunning] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [requestedSection, setRequestedSection] = useState<SectionKey | null>(null);
  const cleanInFlight = useRef(false);
  const pipelineInFlight = useRef(false);
  // Knowledge Assets is a canvas tab beside the document (one per document); this action toggles it.
  const knowledgeAssets = useToolToggle(knowledgeAssetsInput(doc ? { id: doc.id, name: doc.name, totalPages: doc.totalPages } : null));

  // Find the file's processed document (never create one without a click).
  useEffect(() => {
    let alive = true;
    setLooked(false);
    setDocId(null);
    setDoc(null);
    resolvePdfSurfaceIds({ fileId }).then(
      (ids) => {
        if (!alive) return;
        setDocId(ids.processedDocumentId ?? null);
        setLooked(true);
      },
      (e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "The document record could not be read.");
        setLooked(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [fileId]);

  const { fetchDocument } = extractor;
  useEffect(() => {
    if (!docId) return;
    let alive = true;
    fetchDocument(docId).then(
      (d) => {
        if (alive && d) setDoc(d);
      },
      (e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "The document could not be read.");
      },
    );
    return () => {
      alive = false;
    };
  }, [docId, fetchDocument]);

  const { pages, loading: pagesLoading, error: pagesError, refresh: refreshPages } = useProcessedDocumentPages({ processedDocumentId: doc?.id ?? "", enabled: !!doc });

  useProcessedDocSync({
    signal: extractor.processedDocSignal,
    activeDocId: doc?.id ?? null,
    fetchDocument,
    setActiveDoc: setDoc,
    refreshPages,
    refreshDocs: () => undefined,
  });

  const docRun = usePdfDocRun({
    docId: doc?.id ?? null,
    localStreaming: aiCleanRunning || pipelineRunning || extractor.batchStatus !== "idle",
    onSettled: async () => {
      if (!doc) return;
      invalidateProcessedDocumentCache(doc.id);
      const fresh = await fetchDocument(doc.id);
      if (fresh) setDoc(fresh);
      refreshPages();
    },
  });

  const running = aiCleanRunning || pipelineRunning || docRun.phase === "running";
  const status = liveStatus ?? docRun.label ?? "";
  bridge.snapshot = { doc, pages, running, status };

  const extractText = async () => {
    setError(null);
    try {
      const id = await extraction.extract(fileId);
      invalidatePdfSurfaceLinks(fileId);
      setDocId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The text could not be extracted.");
    }
  };

  const runAiClean = useCallback(async () => {
    if (!doc || cleanInFlight.current) return;
    cleanInFlight.current = true;
    if (!(await confirmPaidPdfAi(isDocCleaned(pages, doc.cleanContent) ? "reclean" : "clean", pages.length || doc.totalPages || 0))) {
      cleanInFlight.current = false;
      return;
    }
    setAiCleanRunning(true);
    setLiveStatus("Starting AI cleanup");
    try {
      if (!extractor.tabs.find((t) => t.id === doc.id)) extractor.openDocument(doc);
      const cleaned = await extractor.cleanContent(doc.id, { force: true, onProgress: setLiveStatus, onTextDelta: () => undefined });
      const fresh = await fetchDocument(doc.id);
      if (fresh) setDoc(fresh);
      refreshPages();
      if (cleaned.status === "queued") toast.info("Cleaning queued");
      else if (cleaned.alreadyCleaned) toast.success("Already cleaned");
      else toast.success("AI cleanup complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI cleanup failed");
    } finally {
      cleanInFlight.current = false;
      setAiCleanRunning(false);
      setLiveStatus(null);
    }
  }, [doc, pages, extractor, fetchDocument, refreshPages, toast]);

  const runPipeline = useCallback(async () => {
    if (!doc || pipelineInFlight.current) return;
    pipelineInFlight.current = true;
    if (!(await confirmPaidPdfAi("pipeline", pages.length || doc.totalPages || 0))) {
      pipelineInFlight.current = false;
      return;
    }
    setPipelineRunning(true);
    setLiveStatus("Starting pipeline");
    try {
      if (!extractor.tabs.find((t) => t.id === doc.id)) extractor.openDocument(doc);
      const { success, childDocId } = await extractor.runFullPipeline(doc.id, { onProgress: setLiveStatus, onTextDelta: () => undefined });
      if (!success) {
        toast.error("Pipeline run failed");
        return;
      }
      // A new processed document may be made; the workspace shows whichever now carries the data.
      const nextId = childDocId && childDocId !== doc.id ? childDocId : doc.id;
      invalidatePdfSurfaceLinks(fileId);
      setDocId(nextId);
      const fresh = await fetchDocument(nextId);
      if (fresh) setDoc(fresh);
      refreshPages();
      toast.success("Pipeline run complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      pipelineInFlight.current = false;
      setPipelineRunning(false);
      setLiveStatus(null);
    }
  }, [doc, pages, extractor, fetchDocument, refreshPages, toast, fileId]);

  const refresh = useCallback(async () => {
    if (!doc) return;
    try {
      if (!(await extractor.refreshDocument(doc.id))) {
        toast.error("Could not refresh this document");
        return;
      }
      const fresh = await fetchDocument(doc.id);
      if (fresh) setDoc(fresh);
      refreshPages();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    }
  }, [doc, extractor, fetchDocument, refreshPages, toast]);

  const runShortcut = useCallback(
    async (shortcutId: string) => {
      if (!doc) return;
      const docText = doc.cleanContent ?? doc.content ?? "";
      if (!docText) {
        toast.error("No extracted content yet");
        return;
      }
      try {
        const launchInitiation = { initiation: "user" as const };
        await triggerShortcut(shortcutId, { ...launchInitiation, scope: { selection: docText }, sourceFeature: "pdf-extractor" });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Run failed");
      }
    },
    [doc, triggerShortcut, toast],
  );

  if (!looked || (docId && !doc && !error)) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground" aria-busy="true">
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }
  if (!docId || !doc) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-4">
        <EmptyState
          icon={<FileText />}
          title="No text extracted yet"
          line={extraction.status === "extracting" ? (extraction.progress ?? "Extracting") : "Extract the text to clean it with AI, chunk it and ask agents about it."}
          action={
            <Button variant="primary" disabled={extraction.status === "extracting"} onClick={() => void extractText()}>
              {extraction.status === "extracting" ? "Extracting" : "Extract text"}
            </Button>
          }
        />
        {error ? <div role="alert" className="text-xs text-destructive">{error}</div> : null}
      </div>
    );
  }

  const cleaned = isDocCleaned(pages, doc.cleanContent);
  const cleanable = canAiClean(pages.length);
  return (
    <div className="flex h-full min-h-0 flex-col" data-pdf-extractor="">
      <div className="shrink-0 border-b border-border p-2">
        <SegmentedControl
          fill
          value={part}
          onValueChange={(v) => setPart(v)}
          aria-label="Document sections"
          data={[
            { value: "run", label: "Run" },
            { value: "text", label: "Text" },
            { value: "chunks", label: "Chunks" },
            { value: "inspector", label: "More" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {part === "run" ? (
          <div className="flex flex-col gap-3 p-3">
            <div className="text-xs text-muted-foreground">
              {doc.name} · {(pages.length || doc.totalPages || 0).toLocaleString()} pages · {cleaned ? "AI cleaned" : "not cleaned yet"}
            </div>
            <Button variant="primary" disabled={running || !cleanable} onClick={() => void runAiClean()} title={cleanable ? undefined : NO_PAGES_TO_CLEAN_REASON}>
              {aiCleanRunning ? "Cleaning" : cleaned ? "Clean again with AI" : "Clean with AI"}
            </Button>
            <AutoCleanSetting />
            <Button variant="outline" disabled={running} onClick={() => void runPipeline()}>
              {pipelineRunning ? "Running" : "Run the full pipeline"}
            </Button>
            <Button variant="outline" disabled={!pages.length} onClick={() => setCopyOpen(true)}>Copy pages</Button>
            <Button variant="outline" onClick={knowledgeAssets.toggle}>Knowledge Assets</Button>
            <Button variant="quiet" disabled={running} onClick={() => void refresh()}>Refresh from the server</Button>
            {running && status ? <div role="status" className="text-xs text-muted-foreground">{status}</div> : null}
            {docRun.phase === "failed" && docRun.errorMessage ? <div role="alert" className="text-xs text-destructive">{docRun.errorMessage}</div> : null}
            {pagesError ? <div role="alert" className="text-xs text-destructive">The pages could not be read.</div> : null}
            <PdfBatchExtractDebugTrigger />
          </div>
        ) : null}
        {part === "text" ? <SyncedPdfTextView doc={doc} onReprocess={() => void runPipeline()} reprocessing={pipelineRunning} /> : null}
        {part === "chunks" ? (
          <PdfStudioChunksPane docId={doc.id} activePage={pageNumber} hasCldFile onOpenChunkedRuns={() => { setRequestedSection("chunked"); setPart("inspector"); }} />
        ) : null}
        {part === "inspector" ? (
          <ExtractorInspector
            doc={doc}
            pages={pages}
            activePage={pageNumber}
            onRunShortcut={runShortcut}
            requestedSection={requestedSection}
            onSectionConsumed={() => setRequestedSection(null)}
          />
        ) : null}
      </div>
      <CopyPagesOverlay open={copyOpen} onClose={() => setCopyOpen(false)} doc={doc} pages={pages} pagesLoading={pagesLoading} />
    </div>
  );
}
