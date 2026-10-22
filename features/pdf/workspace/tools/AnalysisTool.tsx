"use client";

/**
 * features/pdf/workspace/tools/AnalysisTool.tsx — the workspace's "Analysis" tool: the whole Analysis
 * Studio inspector (Outline, Text, PII, Tables, Images, Regions, Dupes, Classify, Order, Info, Pages,
 * Doc Ops, Notes, Findings, Redact, Search) as one right-panel tool. `InspectorRail` is the same
 * component the old studio route mounted; here the page it follows is the workspace's current page and
 * "jump to page" scrolls the workspace viewer.
 */
import { useEffect } from "react";
import { InspectorRail, type StudioInspectorTab } from "@/features/file-analysis/studio/InspectorRail";
import { usePages } from "@/features/file-analysis/hooks/usePages";
import { useFileAnalysis } from "@/features/file-analysis/hooks/useFileAnalysis";

export function AnalysisTool({
  fileId,
  pageNumber,
  goToPage,
  registerGoToPage,
  reportPage,
  tab,
  onTab,
  selectedAnnotationId,
  onSelectAnnotation,
}: {
  fileId: string;
  pageNumber: number;
  goToPage(n: number): void;
  /** The agent surface can move the page even when Annotate is closed. */
  registerGoToPage(fn: (n: number) => void): void;
  reportPage(n: number): void;
  tab: StudioInspectorTab;
  onTab(tab: StudioInspectorTab): void;
  selectedAnnotationId: string | null;
  onSelectAnnotation(id: string | null): void;
}) {
  // access-errors: ok — page-id resolution from the shared cache; the panels bind the same store and surface read failures with retry
  const { pages } = usePages(fileId);
  useFileAnalysis(fileId);
  useEffect(() => reportPage(pageNumber), [reportPage, pageNumber]);
  useEffect(() => registerGoToPage(goToPage), [registerGoToPage, goToPage]);
  return (
    <InspectorRail
      fileId={fileId}
      activeTab={tab}
      onTabChange={onTab}
      pageNumber={pageNumber}
      selectedPageId={pages.find((p) => p.page_index + 1 === pageNumber)?.id ?? null}
      onJumpToPage={(n) => goToPage(n)}
      selectedAnnotationId={selectedAnnotationId}
      onSelectAnnotation={onSelectAnnotation}
    />
  );
}
