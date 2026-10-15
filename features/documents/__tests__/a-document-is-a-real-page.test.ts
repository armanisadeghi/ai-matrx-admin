/**
 * A cloud document is laid out as a real paginated page (Letter, 1in margins = 624px of text), never
 * the squeezed pageless 415px column it used to be. The page-style and Page setup round-trip tests
 * live with the code in @ai-matrx/office (`core/page-setup.test.ts`); this keeps the sanitizer half.
 */
import { DocumentFlavor, PageOrientType } from "@univerjs/core";

import { isLegacySqueezedPageStyle } from "@ai-matrx/office/core";
import { sanitizeUniverDocSnapshot } from "../utils/sanitizeUniverDocSnapshot";

describe("a document is a real page", () => {
  it("the squeezed legacy page (A4 at 72dpi, pageless) is moved to Letter by the sanitizer", () => {
    const snap = {
      documentStyle: { pageSize: { width: 595, height: 842 }, marginTop: 72, marginBottom: 72, marginLeft: 90, marginRight: 90, documentFlavor: DocumentFlavor.MODERN },
    };
    expect(isLegacySqueezedPageStyle(snap.documentStyle as never)).toBe(true);
    const out = sanitizeUniverDocSnapshot(snap as never);
    expect(out.documentStyle?.pageSize).toEqual({ width: 816, height: 1056 });
    expect(out.documentStyle?.documentFlavor).toBe(DocumentFlavor.TRADITIONAL);
    expect(out.documentStyle?.marginLeft).toBe(96);
  });

  it("a chosen pageless page is left alone", () => {
    const snap = { documentStyle: { pageSize: { width: 960, height: 1123 }, marginTop: 48, marginBottom: 48, marginLeft: 48, marginRight: 48, documentFlavor: DocumentFlavor.MODERN } };
    const out = sanitizeUniverDocSnapshot(snap as never);
    expect(out.documentStyle?.documentFlavor).toBe(DocumentFlavor.MODERN);
    expect(out.documentStyle?.pageSize?.width).toBe(960);
  });
});
