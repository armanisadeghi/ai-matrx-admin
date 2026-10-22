/**
 * BLOCKING capability test (PDF-PLAN U7): every capability of the old PDF studios is reachable in the
 * workspace or is on the explicit deferred list. Fails when a row's home no longer exists, when a server
 * endpoint is unaccounted for, and when the deferred list grows.
 */
import { ENDPOINTS } from "@ai-matrx/api";
import { PDF_TOOLS } from "@ai-matrx/office/pdf-model";
import { STUDIO_INSPECTOR_TAB_IDS } from "@/features/file-analysis/studio/InspectorRail";
import { PDF_CAPABILITIES } from "../capabilities";
import { CLEANUP_OPS } from "../tools/CleanupTool";
import { cleanupCallFor } from "../pdfOps";
import { WORKSPACE_TOOL_IDS } from "../useWorkspaceTools";

const MODES = ["view", "select", "draw"] as const;
const DEFERRED_PINNED = ["merge", "insert-pages", "strip-repeated", "studio-presets", "ai-clean", "extractor-sections", "extractor-docs", "agent-surface-pdf-extractor", "server-internal"];

describe("PDF workspace capability census", () => {
  it("every row's home exists", () => {
    const missing: string[] = [];
    for (const c of PDF_CAPABILITIES) {
      const h = c.home;
      if (h.kind === "rail" && !PDF_TOOLS.some((t) => t.id === h.tool && t.status === "ready")) missing.push(`${c.id}: rail tool ${h.tool} is not a ready tool`);
      if (h.kind === "analysis-tab" && !STUDIO_INSPECTOR_TAB_IDS.includes(h.tab)) missing.push(`${c.id}: Analysis tab ${h.tab} is gone`);
      if (h.kind === "host-tool" && !(h.tool in WORKSPACE_TOOL_IDS) && h.tool !== "more") missing.push(`${c.id}: host tool ${h.tool} is gone`);
      if (h.kind === "mode" && !MODES.includes(h.mode)) missing.push(`${c.id}: mode ${h.mode} is gone`);
    }
    expect(missing).toEqual([]);
  });

  it("the host tools the rows name are registered", () => {
    expect(Object.values(WORKSPACE_TOOL_IDS).sort()).toEqual(["analysis", "annotate", "more"]);
  });

  it("every endpoint a row names exists, and every endpoint under ENDPOINTS.pdf is accounted for", () => {
    const table = ENDPOINTS.pdf as Record<string, unknown>;
    const named = new Set(PDF_CAPABILITIES.flatMap((c) => c.endpoints ?? []));
    const unknown = [...named].filter((k) => !(k in table));
    // compress goes through the assets path (multipart), not a JSON endpoint key.
    const unaccounted = Object.keys(table).filter((k) => !named.has(k));
    expect({ unknown, unaccounted }).toEqual({ unknown: [], unaccounted: [] });
  });

  it("each Regions, images and OCR operation builds a server call against a real endpoint", () => {
    const table = ENDPOINTS.pdf as Record<string, unknown>;
    for (const op of CLEANUP_OPS) {
      const call = cleanupCallFor("f1", op === "redact-regions" ? { op, regions: [], reason: "r", scrubMetadata: true } : op === "render-all" ? { op, dpi: 150, fmt: "png", jpegQuality: 85, pages: null } : { op, threshold: 100 });
      if ("endpoint" in call) expect(table[call.endpoint]).toBeTruthy();
      expect(call.body).toMatchObject({ media: { file_id: "f1" } });
    }
  });

  it("the deferred list only shrinks", () => {
    const deferred = PDF_CAPABILITIES.filter((c) => c.home.kind === "deferred").map((c) => c.id);
    expect(deferred.filter((id) => !DEFERRED_PINNED.includes(id))).toEqual([]);
  });

  it("the Analysis tool offers every inspector tab (no allowedTabs filter)", () => {
    expect(STUDIO_INSPECTOR_TAB_IDS).toHaveLength(16);
  });
});
