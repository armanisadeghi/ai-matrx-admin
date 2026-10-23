"use client";

/**
 * features/pdf/workspace/extractor/ExtractorSurface.tsx — the workspace page declares the agent surface
 * `matrx-user/pdf-extractor` (the surface the extractor studio used to declare): the document text, current page
 * and run state an agent reads, and the base write handlers that say the extraction-template editor is not on
 * screen. The Chunker panel registers the live handlers when it is mounted and those win.
 */
import type { ReactNode } from "react";
import { SurfaceRuntimeProvider, type SurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useAppSelector } from "@/lib/redux/hooks";
import { buildPdfExtractorScope, type ExtractionOutputColumnValue } from "@/features/pdf-extractor/lib/pdf-extractor-scope";
import { PDF_EXTRACTOR_WRITE_TARGETS, pdfExtractorManifest } from "@/features/surfaces/manifests/pdf-extractor.manifest";
import { parseTemplateColumns } from "@/features/page-extraction/utils/columns";
import { selectDraftForFile, selectIsEditingForFile, selectIsRunInFlightForFile, selectSelectedJobForFile } from "@/features/page-extraction/redux/selectors";
import type { ExtractorBridge } from "./extractorBridge";

export const PDF_EXTRACTOR_WORKSPACE_SURFACE_NAME = pdfExtractorManifest.surfaceName;

export function ExtractorSurface({ fileId, getPage, bridge, children }: { fileId: string; getPage(): number; bridge: ExtractorBridge; children: ReactNode }) {
  const draft = useAppSelector((s) => selectDraftForFile(s, fileId));
  const editing = useAppSelector((s) => selectIsEditingForFile(s, fileId));
  const selectedJobId = useAppSelector((s) => selectSelectedJobForFile(s, fileId));
  const runInFlight = useAppSelector((s) => selectIsRunInFlightForFile(s, fileId));

  const getScope = () => {
    const { doc, pages, running, status } = bridge.snapshot;
    const template = {
      extraction_template_editor: { editing, selected_template_id: selectedJobId, run_in_flight: runInFlight },
      extraction_template_draft: {
        template_name: draft.jobName,
        page_range: draft.scopePagesInputRaw,
        page_count: draft.scopePages.length,
        chunk_size: draft.chunkSize,
        chunk_overlap: draft.chunkOverlap,
        chunking_strategy: draft.chunkingStrategy,
        kind: draft.kind,
        agent_id: draft.agentId,
      },
      extraction_output_columns: (parseTemplateColumns(draft.outputSchema) ?? []) as ExtractionOutputColumnValue[],
    };
    const common = { visible_panes: ["pdf"], sidebar_view: "files" as const, find_query: "", library_document_count: 0, library_document_names: [] as string[], scope_kind: "full" as const };
    if (!doc) {
      return buildPdfExtractorScope({
        ...common,
        full_document_text: "",
        current_page_text: "",
        active_scope_text: "",
        filename: "",
        file_id: fileId,
        total_pages: 0,
        current_page: getPage(),
        using_clean_text: false,
        pipeline_running: running,
        pipeline_status: status,
        ...template,
      });
    }
    const page = getPage();
    const fullText = doc.cleanContent ?? doc.content ?? "";
    const usingClean = !!doc.cleanContent;
    const row = pages.find((p) => p.pageNumber === page);
    const pageText = (p: (typeof pages)[number]) => (usingClean ? p.cleanedText || p.rawText : p.rawText);
    return buildPdfExtractorScope({
      ...common,
      full_document_text: fullText,
      current_page_text: row ? pageText(row) : "",
      active_scope_text: fullText,
      filename: doc.name,
      file_id: fileId,
      processed_document_id: doc.id,
      total_pages: pages.length || doc.totalPages || 0,
      current_page: page,
      using_clean_text: usingClean,
      selected_text: typeof window !== "undefined" ? (window.getSelection()?.toString().trim() ?? "") : "",
      raw_document_text: doc.content ?? "",
      page_texts: pages.map((p) => ({ page_number: p.pageNumber, text: pageText(p), cleaned: usingClean && !!p.cleanedText })),
      pipeline_running: running,
      pipeline_status: status,
      ...template,
    });
  };

  const getWriteHandlers = (): SurfaceWriteHandlers => {
    const refuse = () => {
      throw new Error("The extraction template editor is not on screen. Open the Document tool, choose the Chunker section, and click New or Edit on a template first.");
    };
    const handlers: SurfaceWriteHandlers = {};
    for (const name of Object.values(PDF_EXTRACTOR_WRITE_TARGETS)) handlers[name] = refuse;
    return handlers;
  };

  return (
    <SurfaceRuntimeProvider surfaceName={pdfExtractorManifest.surfaceName} getScope={getScope} getWriteHandlers={getWriteHandlers} isEditable={false}>
      {children}
    </SurfaceRuntimeProvider>
  );
}
