/**
 * ONE PDF viewer — the source contract every PDF host in the app is held to.
 *
 * The viewer itself (pages, zoom/fit/rotate, the measured toolbar fold, the
 * stack toolbar, wheel/touch paging, the annotation layer, the PDF.js worker)
 * lives in `@ai-matrx/media/viewers/pdf` since 2026-10-22 — one viewer for the
 * app, the chat package, the extension and the desktop app. Its internal
 * contracts (suspense={false}, toolbar from the fold plan, continuous layout
 * draws the shared toolbar, no import-time worker effect) are guarded by the
 * package's own tests (media src/viewers/pdf/*.test.*). This file keeps the
 * APP on it:
 *
 *   1. No app file mounts react-pdf's <Document>/<Page> — the package does.
 *   2. No app file drives PDF.js directly (getDocument / GlobalWorkerOptions) —
 *      off-screen reads go through the package's `rasterizePdfPages` /
 *      `readPdfPageCount`.
 *   3. Only PdfPreview turns a cld file id into PDF.js bytes
 *      (`usePdfRemoteSource`) — every other host composes PdfPreview.
 *   4. No host embeds a PDF with the browser's native viewer.
 *   5. PdfPreview renders the package viewer and passes every chrome knob through.
 *   6. No host draws its own zoom control next to a PDF.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "../../../..");
const SCAN_DIRS = ["app", "features", "components", "lib"];
const PREVIEW = "features/pdf/components/viewer/PdfPreview.tsx";
const PACKAGE = "@ai-matrx/media/viewers/pdf";

/** Source STRINGS compiled inside the kind sandbox / code runtime, not app modules. */
const RAW_PDFJS_ALLOWED = new Set([
  "features/content-ir/studio/playground/demos/invoice-pdf.ts",
  "features/content-ir/sandbox/build-kind-sandbox.ts",
  "lib/code-runtime/app-scope.ts",
]);
/**
 * Native-embed exceptions, each with its reason. Spaces stores a page as
 * portable HTML blocks that must render outside React too (exported pages);
 * it is a known second viewer, listed in features/pdf/FEATURE.md.
 */
const NATIVE_EMBED_ALLOWED = new Set(["features/spaces/editor/stored-blocks.tsx"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))).map((f) => ({
  path: relative(ROOT, f),
  src: readFileSync(f, "utf8"),
}));

describe("one PDF viewer", () => {
  it("no app file imports react-pdf's Document/Page (the package viewer does)", () => {
    const offenders = files
      .filter((f) => !RAW_PDFJS_ALLOWED.has(f.path))
      .filter((f) =>
        /import\s*\{[^}]*\b(Document|Page)\b[^}]*\}\s*from\s*["']react-pdf["']/.test(f.src),
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("no app file drives PDF.js directly (rasterizePdfPages / readPdfPageCount do)", () => {
    const offenders = files
      .filter((f) => !RAW_PDFJS_ALLOWED.has(f.path))
      .filter((f) => /pdfjs\.getDocument\s*\(|GlobalWorkerOptions/.test(f.src))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("only PdfPreview resolves cld-file bytes for PDF.js", () => {
    const offenders = files
      .filter((f) => f.path !== PREVIEW && !f.path.startsWith("features/pdf/hooks/"))
      // The workspace host hands the same resolved URL to its page thumbnails and its download/print.
      .filter((f) => f.path !== "features/pdf/workspace/usePdfWorkspaceHost.tsx")
      .filter((f) => /\busePdfRemoteSource\s*\(/.test(f.src))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("no host embeds a PDF with the browser's native viewer", () => {
    const offenders = files
      .filter((f) => !NATIVE_EMBED_ALLOWED.has(f.path))
      .filter(
        (f) =>
          /<object[^>]*application\/pdf/.test(f.src) ||
          /<embed[^>]*(application\/pdf|\.pdf)/.test(f.src) ||
          /<iframe[^>]*(\.pdf\b|pdfUrl|type === ["']pdf["'])/.test(f.src),
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("PdfPreview renders the package viewer and passes the chrome knobs through", () => {
    const preview = readFileSync(join(ROOT, PREVIEW), "utf8");
    expect(preview).toContain(`from "${PACKAGE}"`);
    expect(preview).toMatch(/<PdfDocumentViewer\b/);
    for (const pass of [
      "toolbar={toolbar}",
      "pageNav={pageNav}",
      "toolbarStart={toolbarStart}",
      "toolbarEnd={toolbarEnd}",
    ]) {
      expect(preview).toContain(pass);
    }
  });

  it("no host draws its own zoom control — they dock into the shared toolbar", () => {
    const offenders = files
      .filter((f) => /aria-label=["']Zoom (in|out)["']/.test(f.src))
      .filter((f) => /\bPdf(Preview|DocumentViewer|StackToolbar)\b/.test(f.src))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
