"use client";

/**
 * features/pdf/workspace/useWorkspaceTools.tsx — the tools this app brings to the PDF workspace rail
 * (`PdfWorkspaceHost.tools`): Analysis (the whole Analysis Studio inspector), Annotate (the region
 * canvas mode) and Regions, images and OCR (redact drawn regions, page images, OCR text). These are how the older studios live inside the one workspace; see `capabilities.ts`.
 */
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { FileCog, ListTree, Pencil } from "lucide-react";
import type { PdfHostTool, PdfViewerState } from "@ai-matrx/office/pdf-model";
import type { StudioInspectorTab } from "@/features/file-analysis/studio/InspectorRail";
import { AnalysisTool } from "./tools/AnalysisTool";
import { AnnotatePanel, AnnotateViewer, type AnnotateState } from "./tools/AnnotateTool";
import { CleanupTool } from "./tools/CleanupTool";

export interface StudioBridge {
  annotate: AnnotateState;
  tab: StudioInspectorTab;
  getPage(): number;
  focusAnnotation(annotationId: string, pageNumber: number): void;
}

export const WORKSPACE_TOOL_IDS = { analysis: "analysis", annotate: "annotate", more: "more" } as const;

export function useWorkspaceTools(opts: { fileId: string; fileName: string; openFile(id: string): void }) {
  const { fileId, fileName, openFile } = opts;
  const [annotating, setAnnotating] = useState(false);
  const [annotate, setAnnotate] = useState<AnnotateState>({ mode: "select", selectedId: null });
  const [tab, setTab] = useState<StudioInspectorTab>("outline");
  const goTo = useRef<(n: number) => void>(() => undefined);
  /** The page the open tool last reported (the agent surface reads it at run time). */
  const pageRef = useRef(1);
  const reportPage = useCallback((n: number) => {
    pageRef.current = n;
  }, []);
  const registerGoTo = useCallback((fn: (n: number) => void) => {
    goTo.current = fn;
    return () => undefined;
  }, []);

  const tools = useMemo<PdfHostTool[]>(
    () => [
      {
        id: WORKSPACE_TOOL_IDS.analysis,
        label: "Analysis",
        hint: "Outline, text, tables, search, notes, findings, redaction",
        icon: ListTree,
        wide: true,
        group: 1,
        render: (ctx) => (
          <AnalysisTool
            fileId={fileId}
            pageNumber={ctx.currentPage}
            goToPage={ctx.goToPage}
            registerGoToPage={registerGoTo}
            reportPage={reportPage}
            tab={tab}
            onTab={setTab}
            selectedAnnotationId={annotate.selectedId}
            onSelectAnnotation={(id) => setAnnotate((a) => ({ ...a, selectedId: id }))}
          />
        ),
      },
      {
        id: WORKSPACE_TOOL_IDS.annotate,
        label: "Annotate",
        hint: "Draw and edit labelled regions on a page",
        icon: Pencil,
        followsPage: true,
        group: 1,
        render: (ctx) => <AnnotatePanel state={annotate} onState={setAnnotate} onActive={setAnnotating} goToPage={ctx.goToPage} registerGoToPage={registerGoTo} />,
      },
      {
        id: WORKSPACE_TOOL_IDS.more,
        label: "Regions, images and OCR",
        hint: "Redact drawn regions, save page images, recognize text",
        icon: FileCog,
        group: 1,
        render: () => <CleanupTool fileId={fileId} fileName={fileName} onOpenFile={openFile} />,
      },
    ],
    [fileId, fileName, openFile, tab, annotate, registerGoTo, reportPage],
  );

  /** The viewer to draw instead of the continuous one while Annotate is open (null: the normal viewer). */
  const viewerOverride = useCallback(
    (state: PdfViewerState): ReactNode =>
      annotating ? <AnnotateViewer fileId={fileId} pageNumber={state.currentPage} state={annotate} onState={setAnnotate} goToPage={(n) => goTo.current(n)} /> : null,
    [annotating, annotate, fileId],
  );

  /** What the agent surface (`matrx-user/analysis-studio`) reads and drives. */
  const studio: StudioBridge = {
    annotate,
    tab,
    getPage: () => pageRef.current,
    focusAnnotation: (id, page) => {
      setAnnotate((a) => ({ ...a, selectedId: id }));
      goTo.current(page);
    },
  };

  return { tools, viewerOverride, studio };
}
