/**
 * The app must bundle pdf.js's LEGACY build. The default build of pdfjs-dist
 * 6.x calls brand-new built-ins (Map#getOrInsertComputed, Math.sumPrecise,
 * Uint8Array.fromBase64, Promise.try…) with no fallback, so on current Safari
 * and most Chrome every PDF surface threw and took the whole page down
 * (found 2026-10-20 on the anonymous /s/ share landing).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("pdf.js legacy build pin", () => {
  const config = read("next.config.js");

  it.each([
    ['"pdfjs-dist": "pdfjs-dist/legacy/build/pdf.mjs"'],
    ['"pdfjs-dist/web/pdf_viewer.mjs": "pdfjs-dist/legacy/web/pdf_viewer.mjs"'],
    ['"pdfjs-dist/build/pdf.worker.mjs": "pdfjs-dist/legacy/build/pdf.worker.mjs"'],
    ['"pdfjs-dist$": "pdfjs-dist/legacy/build/pdf.mjs"'],
  ])("next.config.js aliases %s", (entry) => {
    expect(config).toContain(entry);
  });

  it("serves the legacy worker", () => {
    expect(read("scripts/copy-pdfjs-worker.ts")).toContain(
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    );
  });

  it("the legacy build polyfills what the default build requires", () => {
    const legacy = read("node_modules/pdfjs-dist/legacy/build/pdf.mjs");
    expect(legacy).toContain("getOrInsertComputed");
    expect(legacy).toContain("sumPrecise");
  });
});
