"use client";

/**
 * features/pdf/workspace/WorkspaceSurface.tsx — the agent surface of the PDF workspace page.
 *
 * The workspace page declares `matrx-user/analysis-studio` (the surface the Analysis Studio route used to
 * declare): the scope an agent reads (file, page, tab, canvas mode, every annotation) is built at trigger
 * time, and the write handlers (label, extracted text, redact flag, focus an annotation) are built at apply
 * time and go through the same `useAnnotations().update` the region menu and the canvas use.
 */
import { useRef, type ReactNode } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createAnalysisStudioScope } from "@/features/surfaces/manifests/analysis-studio.manifest";
import { buildAnalysisStudioWriteHandlers } from "@/features/file-analysis/studio/analysis-studio-write-handlers";
import { useAnnotations } from "@/features/file-analysis/hooks/useAnnotations";
import { useLabelCatalog } from "@/features/file-analysis/hooks/useLabelCatalog";
import { usePages } from "@/features/file-analysis/hooks/usePages";
import type { StudioBridge } from "./useWorkspaceTools";

export const PDF_WORKSPACE_SURFACE_NAME = "matrx-user/analysis-studio";

export function WorkspaceSurface({ fileId, fileName, studio, children }: { fileId: string; fileName: string; studio: StudioBridge; children: ReactNode }) {
  const { annotations, update } = useAnnotations(fileId);
  // access-errors: ok — page counts for the agent scope; the Analysis panels surface the read failure with retry
  const { pages, active: activePages } = usePages(fileId);
  const { labels, categories } = useLabelCatalog();
  // One annotation write at a time: `update` patches the shared cache optimistically, so a second agent
  // write launched while the first settles would validate against a row in flux.
  const writeInFlight = useRef(false);

  const getScope = () => {
    const active = annotations.filter((a) => a.status === "active");
    const pageNumber = studio.getPage();
    const counts: Record<string, number> = {};
    for (const a of active) counts[a.label_category] = (counts[a.label_category] ?? 0) + 1;
    const row = (a: (typeof active)[number]) => ({
      id: a.id,
      page_number: a.page_number,
      label: a.label,
      label_category: a.label_category,
      extracted_text: a.extracted_text ?? "",
      redact: a.redact ?? false,
    });
    return createAnalysisStudioScope({
      file_id: fileId,
      filename: fileName,
      mime_type: "application/pdf",
      total_pages: pages.length,
      active_page_count: activePages.length,
      document_summary: { filename: fileName, file_id: fileId, processed_document_id: "", total_pages: pages.length, using_clean_text: false },
      current_page: pageNumber,
      inspector_tab: studio.tab,
      canvas_mode: studio.annotate.mode,
      studio_view_state: { current_page: pageNumber, inspector_tab: studio.tab, canvas_mode: studio.annotate.mode, selected_annotation_id: studio.annotate.selectedId ?? "" },
      selected_annotation_id: studio.annotate.selectedId ?? undefined,
      annotation_count: active.length,
      annotation_pages: [...new Set(active.map((a) => a.page_number))].sort((a, b) => a - b),
      current_page_annotations: active.filter((a) => a.page_number === pageNumber).map(({ page_number: _page, ...rest }) => {
        void _page;
        return { id: rest.id, label: rest.label, label_category: rest.label_category, extracted_text: rest.extracted_text ?? "", redact: rest.redact ?? false };
      }),
      annotations: active.map(row),
      annotation_categories: counts,
      selection: typeof window !== "undefined" ? (window.getSelection()?.toString().trim() ?? "") : "",
    });
  };

  const getWriteHandlers = () =>
    buildAnalysisStudioWriteHandlers({
      annotations,
      selectedAnnotationId: studio.annotate.selectedId,
      labels,
      categories,
      updateAnnotation: update,
      focusAnnotation: studio.focusAnnotation,
      writeInFlight,
    });

  return (
    <SurfaceRuntimeProvider surfaceName={PDF_WORKSPACE_SURFACE_NAME} getScope={getScope} getWriteHandlers={getWriteHandlers} isEditable>
      {children}
    </SurfaceRuntimeProvider>
  );
}
