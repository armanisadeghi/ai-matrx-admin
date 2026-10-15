/**
 * A cloud document is laid out as a real paginated page (Letter, 1in margins = 624px of text), never
 * the squeezed pageless 415px column it used to be; Page setup values round-trip through Univer's
 * own enums (written out in document-page-style.ts so tests can avoid Univer's runtime).
 */
import { DocumentFlavor, PageOrientType } from "@univerjs/core";

import {
  defaultDocumentPageStyle,
  isLegacySqueezedPageStyle,
  pageSetupCommandParams,
  pageSetupFromStyle,
} from "../document-page-style";
import { sanitizeUniverDocSnapshot } from "../utils/sanitizeUniverDocSnapshot";

describe("a document is a real page", () => {
  it("the default is Letter, 1in margins, paginated", () => {
    const s = defaultDocumentPageStyle();
    expect(s.pageSize).toEqual({ width: 816, height: 1056 });
    expect(s.documentFlavor).toBe(DocumentFlavor.TRADITIONAL);
    expect(s.pageOrient).toBe(PageOrientType.PORTRAIT);
    expect((s.pageSize!.width! - s.marginLeft! - s.marginRight!)).toBe(624);
  });

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

  it("Page setup values round-trip (A4 landscape, 1.5in left)", () => {
    const v = { ...pageSetupFromStyle(defaultDocumentPageStyle()), paper: "A4" as const, orientation: "landscape" as const, marginLeft: 1.5 };
    const params = pageSetupCommandParams(v);
    expect(params.pageSize).toEqual({ width: 1124, height: 794 });
    expect(params.pageOrient).toBe(PageOrientType.LANDSCAPE);
    expect(params.marginLeft).toBe(144);
    const back = pageSetupFromStyle(params as never);
    expect(back).toMatchObject({ paper: "A4", orientation: "landscape", marginLeft: 1.5, pageless: false });
  });
});
