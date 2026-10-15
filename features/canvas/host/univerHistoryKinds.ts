"use client";

/**
 * A document's or a workbook's snapshot history as a canvas tab — the existing
 * `DocumentHistoryViewer` / `WorkbookHistoryViewer`, beside the editor. The keys, the tab reader and
 * the toggle inputs live in `@ai-matrx/office/univer/history`; the registrations stay here, in the
 * host, and lazy-load the two views, so the package never imports a view (no import cycle).
 * Restore writes a new snapshot and the editor's realtime hook picks it up, so the tab needs
 * nothing from the editor.
 */

import { History } from "lucide-react";
import type { CanvasJson } from "@ai-matrx/canvas";
import { defineCanvasKind, type AnyCanvasKind } from "@ai-matrx/canvas/react";
import { DOCUMENT_HISTORY_KIND, WORKBOOK_HISTORY_KIND, readHistoryTab } from "@ai-matrx/office/univer/history";

export const DOCUMENT_HISTORY_CANVAS_KIND: AnyCanvasKind = defineCanvasKind<CanvasJson>({
  id: DOCUMENT_HISTORY_KIND,
  surface: "dom",
  label: "Document history",
  icon: History,
  load: () => import("@/features/documents/canvas/DocumentHistoryCanvasView"),
  unavailable: (data) => (readHistoryTab(data) ? null : "No document"),
  restore: true,
});

export const WORKBOOK_HISTORY_CANVAS_KIND: AnyCanvasKind = defineCanvasKind<CanvasJson>({
  id: WORKBOOK_HISTORY_KIND,
  surface: "dom",
  label: "Workbook history",
  icon: History,
  load: () => import("@/features/workbooks/canvas/WorkbookHistoryCanvasView"),
  unavailable: (data) => (readHistoryTab(data) ? null : "No workbook"),
  restore: true,
});
