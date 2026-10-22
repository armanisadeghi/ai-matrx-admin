"use client";

/**
 * features/pdf/workspace/tools/AnnotateTool.tsx — the workspace's "Annotate" mode.
 *
 * The Analysis Studio's canvas (View / Select / Draw regions over one page, the region context menu,
 * snap-to-text, label picker) as a mode of the workspace: the panel picks the mode, and while the tool
 * is open the host swaps the continuous viewer for `AnnotateViewer` on the workspace's current page.
 */
import { useEffect } from "react";
import { Eye, MousePointer2, Pencil } from "lucide-react";
import type { AnnotationLayerMode, PdfRegion } from "@ai-matrx/media/viewers/pdf";
import { Button } from "@ai-matrx/design-system/controls";
import { AnnotatablePdfCanvas } from "@/features/file-analysis/components/AnnotatablePdfCanvas";
import { PdfRegionContextMenu } from "@/features/file-analysis/components/RegionContextMenu";
import { useAnnotations } from "@/features/file-analysis/hooks/useAnnotations";

export interface AnnotateState {
  mode: AnnotationLayerMode;
  selectedId: string | null;
}

const MODES: Array<{ mode: AnnotationLayerMode; label: string; hint: string; Icon: typeof Eye }> = [
  { mode: "view", label: "View", hint: "Read-only: text selection and links work.", Icon: Eye },
  { mode: "select", label: "Select", hint: "Click a region to select it; drag to move, corners to resize.", Icon: MousePointer2 },
  { mode: "draw", label: "Draw", hint: "Drag over the page to make a region; the label picker opens.", Icon: Pencil },
];

/** The right-panel half: mode buttons. Mounting it turns annotating on; unmounting turns it off. */
export function AnnotatePanel({
  state,
  onState,
  onActive,
  goToPage,
  registerGoToPage,
}: {
  state: AnnotateState;
  onState(next: AnnotateState): void;
  onActive(active: boolean): void;
  goToPage(n: number): void;
  /** The viewer half pages through the same function the workspace uses. */
  registerGoToPage(fn: (n: number) => void): void;
}) {
  useEffect(() => {
    onActive(true);
    return () => onActive(false);
  }, [onActive]);
  useEffect(() => registerGoToPage(goToPage), [registerGoToPage, goToPage]);
  return (
    <div className="flex flex-col gap-3 p-3" data-pdf-annotate="">
      <div className="flex gap-1" role="group" aria-label="Annotation mode">
        {MODES.map(({ mode, label, Icon }) => (
          <Button key={mode} variant={state.mode === mode ? "primary" : "outline"} icon={<Icon />} aria-pressed={state.mode === mode} onClick={() => onState({ ...state, mode })}>
            {label}
          </Button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">{MODES.find((m) => m.mode === state.mode)?.hint}</div>
    </div>
  );
}

/** The viewer half: one page with the annotation layer. */
export function AnnotateViewer({
  fileId,
  pageNumber,
  state,
  onState,
  goToPage,
}: {
  fileId: string;
  pageNumber: number;
  state: AnnotateState;
  onState(next: AnnotateState): void;
  goToPage(n: number): void;
}) {
  const { annotations, create, update, remove } = useAnnotations(fileId);
  const regions: PdfRegion[] = annotations
    .filter((a) => a.status === "active")
    .map((a) => ({ id: a.id, page_number: a.page_number, bbox: a.bbox as { x0: number; y0: number; x1: number; y1: number }, kind: "annotation" as const }));
  const select = (id: string | null) => onState({ ...state, selectedId: id });
  return (
    <div className="relative h-full min-h-[40rem] w-full" data-pdf-annotate-viewer="">
      <PdfRegionContextMenu
        fileId={fileId}
        annotations={annotations}
        updateAnnotation={update}
        removeAnnotation={remove}
        onSelectAnnotation={select}
        selectedAnnotationId={state.selectedId}
      >
        <AnnotatablePdfCanvas
          fileId={fileId}
          pageNumber={pageNumber}
          onPageChange={goToPage}
          regions={regions}
          selectedId={state.selectedId}
          categoryOf={(id) => annotations.find((a) => a.id === id)?.label_category}
          mode={state.mode}
          createAnnotation={create}
          onAnnotationCreated={(a) => {
            select(a.id);
            if (a.page_number !== pageNumber) goToPage(a.page_number);
          }}
          onRegionUpdate={(id, bbox) => {
            void update(id, { bbox });
          }}
          onRegionClick={(id) => select(id)}
          onBackgroundClick={() => select(null)}
        />
      </PdfRegionContextMenu>
    </div>
  );
}
