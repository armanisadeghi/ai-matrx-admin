/**
 * features/pdf/workspace/capabilities.ts — THE capability census of the PDF studios and where each one
 * lives in the workspace (PDF-PLAN U7). Pure data, read by `__tests__/capabilities.test.ts`, which is the
 * BLOCKING test: every row's home must resolve to something that exists today, every server endpoint under
 * `ENDPOINTS.pdf` must be accounted for, and the deferred list may not grow unnoticed.
 *
 * Old homes: `features/pdf-extractor` (extractor studio), `features/file-analysis` (Analysis Studio and the
 * Edit tab), `features/pdf-demo` (+ the 27 `/demos/pdf-processing/*` pages).
 *
 * A row is one of:
 *  - `rail`: a tool of `@ai-matrx/office/pdf` (PDF_TOOLS id, status ready);
 *  - `analysis-tab`: a tab of the Analysis host tool (InspectorRail);
 *  - `host-tool`: another host tool of `useWorkspaceTools`;
 *  - `mode`: a viewer mode the host tool turns on;
 *  - `deferred`: NOT in the workspace yet. It names where it still lives; deleting that place is blocked.
 */
import type { PdfToolId } from "@ai-matrx/office/pdf-model";
import type { StudioInspectorTab } from "@/features/file-analysis/studio/InspectorRail";

export type CapabilityHome =
  | { kind: "rail"; tool: PdfToolId }
  | { kind: "analysis-tab"; tab: StudioInspectorTab }
  | { kind: "host-tool"; tool: "analysis" | "annotate" | "more" | "combine" | "document" }
  /** The /pdf front door (PdfFrontDoor): the document list and the picker with its upload. */
  | { kind: "front-door" }
  /** A surface the workspace page declares for agents. */
  | { kind: "page-surface"; surface: string }
  /** A badge in the corner of each page thumbnail (PdfWorkspaceHost.renderPageBadge). */
  | { kind: "thumbnail-badge" }
  | { kind: "mode"; tool: "annotate"; mode: "view" | "select" | "draw" }
  /** Source files (relative to the repo root) that must contain these markers: the restored folded-away features. */
  | { kind: "source-has"; checks: readonly { file: string; has: readonly string[] }[] }
  | { kind: "deferred"; stillAt: string; why: string };

export interface Capability {
  id: string;
  label: string;
  was: string;
  home: CapabilityHome;
  /** `ENDPOINTS.pdf` keys the capability calls (the test checks each exists). */
  endpoints?: readonly string[];
}

const tab = (t: StudioInspectorTab): CapabilityHome => ({ kind: "analysis-tab", tab: t });
const rail = (tool: PdfToolId): CapabilityHome => ({ kind: "rail", tool });
const deferred = (stillAt: string, why: string): CapabilityHome => ({ kind: "deferred", stillAt, why });
const EXTRACTOR = "features/pdf-extractor (route /tools/pdf-extractor)";

export const PDF_CAPABILITIES: readonly Capability[] = [
  // Viewing and pages
  { id: "view", label: "View, zoom, fit, page navigation, two-up, reading mode", was: "PdfDocumentRenderer in every studio", home: rail("browse") },
  { id: "organize", label: "Rotate, delete and reorder pages", was: "PagesPanel, ManipulationPanel, PdfStudioReader", home: rail("organize"), endpoints: ["rotatePages", "deletePages", "reorderPages"] },
  { id: "extract-pages", label: "Extract pages to a new file", was: "PagesPanel, ManipulationPanel", home: rail("extract-pages"), endpoints: ["extractPages"] },
  { id: "split", label: "Split into parts", was: "DocumentOpsPanel, ManipulationPanel, CopyPagesOverlay", home: rail("split"), endpoints: ["split"] },
  { id: "crop", label: "Crop pages", was: "CropOverlay in PdfStudioReader, ManipulationPanel", home: rail("crop"), endpoints: ["cropPages"] },
  { id: "compress", label: "Compress", was: "DocumentOpsPanel, ManipulationPanel, usePdfOptimize", home: rail("compress"), endpoints: ["compress"] },
  { id: "redact-pattern", label: "Redact by pattern", was: "ManipulationPanel", home: rail("redact"), endpoints: ["redactPattern", "redactPatterns"] },
  { id: "extract-data", label: "Text and tables", was: "extractor Inspector, TablesContent, TextContent", home: rail("extract-data"), endpoints: ["extractTextRemote", "extractTables"] },
  { id: "scan", label: "Scan to PDF", was: "scanner route", home: rail("scan"), endpoints: ["fromImages"] },
  { id: "sign", label: "Sign (e-sign)", was: "esign", home: rail("sign") },
  // Analysis Studio inspector: all sixteen tabs
  { id: "tab-outline", label: "Outline", was: "InspectorRail tab", home: tab("outline") },
  { id: "tab-text", label: "Text", was: "InspectorRail tab", home: tab("text") },
  { id: "tab-pii", label: "PII candidates", was: "InspectorRail tab", home: tab("pii") },
  { id: "tab-tables", label: "Tables", was: "InspectorRail tab", home: tab("tables") },
  { id: "tab-images", label: "Embedded images", was: "InspectorRail tab", home: tab("images") },
  { id: "tab-regions", label: "Repeated regions (detect, redact)", was: "InspectorRail tab, RedactPanel", home: tab("regions"), endpoints: ["detectRepeatedRegions", "redactRepeatedRegions"] },
  { id: "tab-duplicates", label: "Duplicate pages", was: "InspectorRail tab", home: tab("duplicates") },
  { id: "tab-classification", label: "Page classification", was: "InspectorRail tab", home: tab("classification"), endpoints: ["classifyPages"] },
  { id: "tab-reading-order", label: "Reading order", was: "InspectorRail tab", home: tab("reading-order"), endpoints: ["extractReadingOrder"] },
  { id: "tab-metadata", label: "File info", was: "InspectorRail tab", home: tab("metadata") },
  { id: "tab-pages", label: "Pages panel: extract, delete, duplicate, rotate in bulk", was: "PagesPanel", home: tab("pages"), endpoints: ["duplicatePages"] },
  { id: "tab-docops", label: "Doc Ops: scrub, strip metadata, flatten annotations, compress, split", was: "DocumentOpsPanel", home: tab("docops"), endpoints: ["scrub", "stripMetadata", "flattenAnnotations"] },
  { id: "tab-annotations", label: "Notes (annotation list and editor)", was: "AnnotationsPanel", home: tab("annotations") },
  { id: "tab-findings", label: "Key findings", was: "FindingsPanel", home: tab("findings") },
  { id: "tab-redact", label: "Redact: marked regions, mask, restore, escrow key", was: "RedactPanel, MaskDialog, RestoreDialog, KeyHandoff", home: tab("redact") },
  { id: "tab-search", label: "Search the document (streamed)", was: "SearchPanel", home: tab("search") },
  // Annotation canvas
  { id: "canvas-view", label: "Annotation canvas: view", was: "StudioShell mode View", home: { kind: "mode", tool: "annotate", mode: "view" } },
  { id: "canvas-select", label: "Annotation canvas: select, move, resize", was: "StudioShell mode Select", home: { kind: "mode", tool: "annotate", mode: "select" } },
  { id: "canvas-draw", label: "Annotation canvas: draw a region, snap to text, label picker", was: "StudioShell mode Draw", home: { kind: "mode", tool: "annotate", mode: "draw" } },
  // Server-only operations whose only UI was a demo page
  { id: "redact-regions", label: "Redact drawn regions", was: "/demos/pdf-processing/redact-regions", home: { kind: "host-tool", tool: "more" }, endpoints: ["redactRegions"] },
  { id: "render-all", label: "Pages to images (ZIP)", was: "/demos/pdf-processing/render-all", home: { kind: "host-tool", tool: "more" }, endpoints: ["renderAll"] },
  { id: "ocr-text", label: "OCR as text", was: "/demos/pdf-processing/extract-text (force OCR)", home: { kind: "host-tool", tool: "more" }, endpoints: ["extractTextRemote"] },
  { id: "agent-surface-analysis-studio", label: "Agent surface matrx-user/analysis-studio: scope and annotation write handlers", was: "StudioShell", home: { kind: "host-tool", tool: "annotate" } },
  // Not in the workspace yet: each names where it lives and why. The list may only shrink.
  { id: "merge", label: "Merge PDFs (files picked from Files, ordered, page ranges)", was: "ManipulationPanel, /demos/pdf-processing/merge", home: { kind: "host-tool", tool: "combine" }, endpoints: ["merge"] },
  { id: "insert-pages", label: "Insert pages from another PDF (picked from Files)", was: "ManipulationPanel, /demos/pdf-processing/insert-pages", home: { kind: "host-tool", tool: "combine" }, endpoints: ["insertPages"] },
  { id: "strip-repeated", label: "Strip repeated regions (headers/footers) from the text", was: "/demos/pdf-processing/strip-repeated-regions", home: { kind: "host-tool", tool: "more" }, endpoints: ["stripRepeatedRegions"] },
  { id: "studio-presets", label: "Render studio presets", was: "PdfPresetPicker, /demos/pdf-processing/studio", home: deferred("features/pdf/components/PdfPresetPicker", "used by Doc Ops compress; presets render has no tool"), endpoints: ["studioPresets", "studioRender"] },
  { id: "ai-clean", label: "AI clean, process with AI, full pipeline, batch extract", was: "extractor studio, floating window cleanup button", home: { kind: "host-tool", tool: "document" }, endpoints: ["processWithAi", "fullPipeline", "cleanContent", "batchExtract", "documents", "document"] },
  { id: "extractor-sections", label: "Extractor inspector: AI widgets, Chunker, Stores, Lineage", was: "PdfStudioInspector", home: { kind: "host-tool", tool: "document" } },
  { id: "extractor-panes", label: "Run progress, text and chunks panes, copy-pages overlay, batch debug window", was: "PdfStudioShell and its parts", home: { kind: "host-tool", tool: "document" } },
  { id: "extractor-docs", label: "PDF file list (every uploaded PDF, text status column) and upload", was: "PdfStudioSidebar, PdfStudioUpload", home: { kind: "front-door" } },
  { id: "agent-surface-pdf-extractor", label: "Agent surface matrx-user/pdf-extractor (scope and write handlers)", was: "PdfStudioShell", home: { kind: "page-surface", surface: "matrx-user/pdf-extractor" } },
  { id: "thumbnail-annotation-badges", label: "Annotation count on each page thumbnail", was: "ThumbnailStrip", home: { kind: "thumbnail-badge" } },
  // Restored after the extractor studio fold-in dropped them (PDF U7c).
  { id: "batch-upload", label: "Multi-file batch upload with per-file progress", was: "PdfStudioUpload, PdfStudioUploadDrawer", home: { kind: "source-has", checks: [{ file: "features/pdf/workspace/PdfFrontDoor.tsx", has: ["<FileUploadDropzone", "application/pdf", "onUploaded", "DropzoneAcquisitionActions"] }] } },
  { id: "list-rename-archive", label: "Rename and archive (and restore) from the PDF list, row and bulk", was: "PdfStudioSidebar, pdfDocMenu, StudioDocRenameDialog", home: { kind: "source-has", checks: [{ file: "features/pdf/workspace/PdfDocumentList.tsx", has: ["defineRowVerbs", 'id: "rename"', 'id: "archive"', 'id: "restore"', "useTableBulkSelection", "ArchivedDisclosure", "renamePdfFile", "pdfFileRows", "deleteFile", "restoreFile"] }] } },
  { id: "mobile-layout", label: "Workspace at phone width: tools as a bottom sheet, thumbnails as a drawer, the viewer fills the screen", was: "PdfStudioMobile", home: { kind: "source-has", checks: [{ file: "node_modules/@ai-matrx/office/dist/", has: ["data-compact", "Page thumbnails"] }, { file: "features/pdf/workspace/PdfWorkspaceRoute.tsx", has: ["h-dvh", "<PdfWorkspace "] }] } },
  { id: "auto-clean-on-open", label: "AI clean on open, as the Feature Knob pdf.workspace.auto_clean_on_open (default off, cost behind the Cost door)", was: "useAutoCleanOnOpen in PdfStudioShell and PdfStudioMobile", home: { kind: "source-has", checks: [{ file: "features/pdf/workspace/extractor/autoClean.ts", has: ["auto_clean_on_open"] }, { file: "features/pdf/workspace/extractor/AutoCleanOnOpen.tsx", has: ["useEffectiveKnob", "useAutoCleanOnOpen", "force: false", "<CostDoor"] }, { file: "features/pdf/workspace/PdfWorkspaceRoute.tsx", has: ["<AutoCleanOnOpen"] }, { file: "features/pdf/workspace/extractor/ExtractorTool.tsx", has: ["<AutoCleanSetting"] }, { file: "lib/scoped-config/knob-keys.snapshot.json", has: ['"pdf.workspace","auto_clean_on_open"'] }] } },
  { id: "server-internal", label: "extract-text (non-streaming), render-page, render-thumbnail", was: "viewer and thumbnails", home: deferred("viewer internals", "no user-facing tool"), endpoints: ["extractText", "renderPage", "renderThumbnail"] },
];

/** Rows whose home is not the workspace yet. The test pins this set so it can only shrink. */
export const DEFERRED_CAPABILITY_IDS = PDF_CAPABILITIES.filter((c) => c.home.kind === "deferred").map((c) => c.id);
