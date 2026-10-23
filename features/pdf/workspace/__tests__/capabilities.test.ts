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
import { cleanupCallFor, combineCallFor, stripRepeatedCallFor } from "../pdfOps";
import * as fs from "fs";
import * as path from "path";
import { pdfExtractorManifest } from "@/features/surfaces/manifests/pdf-extractor.manifest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), "features/pdf/workspace", rel), "utf8");
import { autoCleanIsOn } from "../extractor/autoClean";
import { WORKSPACE_TOOL_IDS } from "../useWorkspaceTools";

const MODES = ["view", "select", "draw"] as const;
const DEFERRED_PINNED = ["studio-presets", "server-internal"];

describe("PDF workspace capability census", () => {
  it("every row's home exists", () => {
    const missing: string[] = [];
    for (const c of PDF_CAPABILITIES) {
      const h = c.home;
      if (h.kind === "rail" && !PDF_TOOLS.some((t) => t.id === h.tool && t.status === "ready")) missing.push(`${c.id}: rail tool ${h.tool} is not a ready tool`);
      if (h.kind === "analysis-tab" && !STUDIO_INSPECTOR_TAB_IDS.includes(h.tab)) missing.push(`${c.id}: Analysis tab ${h.tab} is gone`);
      if (h.kind === "host-tool" && !(h.tool in WORKSPACE_TOOL_IDS)) missing.push(`${c.id}: host tool ${h.tool} is gone`);
      if (h.kind === "front-door" && !(read("PdfFrontDoor.tsx").includes("<PdfDocumentList") && read("PdfDocumentList.tsx").includes("pdfFileRows") && !read("PdfDocumentList.tsx").includes("usePdfStudioDocs") && read("PdfFrontDoor.tsx").includes("FilePickerWindow"))) missing.push(`${c.id}: the front door no longer lists documents and offers the picker`);
      if (h.kind === "page-surface" && !(h.surface === pdfExtractorManifest.surfaceName && read("PdfWorkspaceRoute.tsx").includes("<ExtractorSurface"))) missing.push(`${c.id}: the workspace page no longer declares ${h.surface}`);
      if (h.kind === "thumbnail-badge" && !read("usePdfWorkspaceHost.tsx").includes("renderPageBadge")) missing.push(`${c.id}: the host draws no thumbnail badge`);
      if (h.kind === "source-has") {
        for (const check of h.checks) {
          const abs = path.join(process.cwd(), check.file);
          // A path ending in "/" is a built package folder: every .js file in it, joined.
          const text = check.file.endsWith("/")
            ? (fs.existsSync(abs) ? fs.readdirSync(abs).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(abs, f), "utf8")).join("\n") : "")
            : fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
          const lacking = check.has.filter((m) => !text.includes(m));
          if (lacking.length) missing.push(`${c.id}: ${check.file} no longer has ${lacking.join(", ")}`);
        }
      }
      if (h.kind === "mode" && !MODES.includes(h.mode)) missing.push(`${c.id}: mode ${h.mode} is gone`);
    }
    expect(missing).toEqual([]);
  });

  it("AI clean on open is off unless the knob says true", () => {
    expect([undefined, null, false, "true", 1].map(autoCleanIsOn)).toEqual([false, false, false, false, false]);
    expect(autoCleanIsOn(true)).toBe(true);
  });

  it("the host tools the rows name are registered", () => {
    expect(Object.values(WORKSPACE_TOOL_IDS).sort()).toEqual(["analysis", "annotate", "combine", "document", "more"]);
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
    for (const op of CLEANUP_OPS.filter((o) => o !== "strip-repeated")) {
      const call = cleanupCallFor("f1", op === "redact-regions" ? { op, regions: [], reason: "r", scrubMetadata: true } : op === "render-all" ? { op, dpi: 150, fmt: "png", jpegQuality: 85, pages: null } : { op, threshold: 100 });
      if ("endpoint" in call) expect(table[call.endpoint]).toBeTruthy();
      expect(call.body).toMatchObject({ media: { file_id: "f1" } });
    }
  });

  it("merge and insert build one call each, with every file sent by id", () => {
    const merge = combineCallFor("f1", { op: "merge", sources: [{ fileId: "f2", pages: [1, 2] }, { fileId: "f3", pages: null }], filename: null });
    expect((ENDPOINTS.pdf as Record<string, unknown>)[merge.endpoint]).toBeTruthy();
    expect(merge.body).toMatchObject({ sources: [{ media: { file_id: "f1" } }, { media: { file_id: "f2" }, pages: [1, 2] }, { media: { file_id: "f3" } }], output_mode: "derivative" });
    const insert = combineCallFor("f1", { op: "insert", source: { fileId: "f2", pages: null }, afterPage: 3 });
    expect((ENDPOINTS.pdf as Record<string, unknown>)[insert.endpoint]).toBeTruthy();
    expect(insert.body).toMatchObject({ media: { file_id: "f1" }, source_media: { file_id: "f2" }, after_page: 3, output_mode: "derivative" });
  });

  it("strip repeated regions sends the file by id and only the thresholds that were set", () => {
    expect(stripRepeatedCallFor("f1", { minPagesRatio: null, minConfidence: 0.7, acceptedRegionIds: null }).body).toEqual({ media: { file_id: "f1" }, min_confidence: 0.7 });
  });

  it("the Regions, images and OCR tool offers strip repeated regions", () => {
    expect(CLEANUP_OPS).toContain("strip-repeated");
  });

  it("the deferred list only shrinks", () => {
    const deferred = PDF_CAPABILITIES.filter((c) => c.home.kind === "deferred").map((c) => c.id);
    expect(deferred.filter((id) => !DEFERRED_PINNED.includes(id))).toEqual([]);
  });

  it("the Analysis tool offers every inspector tab (no allowedTabs filter)", () => {
    expect(STUDIO_INSPECTOR_TAB_IDS).toHaveLength(16);
  });
});
