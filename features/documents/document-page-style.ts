/**
 * The ONE page geometry every Matrx cloud document is laid out with.
 *
 * Univer lays a document out inside `documentStyle.pageSize`. With no pageSize
 * the docs renderer has no page box at all: text never wraps (it runs off the
 * right edge) and the vertical extent is unbounded, so the docs viewport
 * reports nothing to scroll — the wheel is swallowed and the page sits frozen
 * at the top. Every writer of a Univer snapshot MUST stamp this style.
 *
 * Consumers: `DocumentEditor` (new empty doc), `markdown-to-univer-doc`
 * (markdown import), and `sanitizeUniverDocSnapshot` (recovery for snapshots
 * that reached storage without it — notably `origin='agent'` writes).
 */
import { DocumentFlavor, PageOrientType, type IDocumentData } from "@univerjs/core";

type DocumentStyle = NonNullable<IDocumentData["documentStyle"]>;

/** Univer lays documents out in 96-dpi CSS pixels: one inch is 96 units. */
export const PX_PER_INCH = 96;

/** Paper sizes the Page setup dialog offers, in 96-dpi pixels, portrait (width x height). */
export const PAPER_SIZES = {
  Letter: { width: 816, height: 1056, label: "Letter (8.5 x 11 in)" },
  Legal: { width: 816, height: 1344, label: "Legal (8.5 x 14 in)" },
  Tabloid: { width: 1056, height: 1632, label: "Tabloid (11 x 17 in)" },
  Executive: { width: 696, height: 1008, label: "Executive (7.25 x 10.5 in)" },
  Statement: { width: 528, height: 816, label: "Statement (5.5 x 8.5 in)" },
  A3: { width: 1123, height: 1587, label: "A3 (11.69 x 16.54 in)" },
  A4: { width: 794, height: 1124, label: "A4 (8.27 x 11.69 in)" },
  A5: { width: 559, height: 794, label: "A5 (5.83 x 8.27 in)" },
} as const;
export type PaperSizeName = keyof typeof PAPER_SIZES;

/** A real page, like Google Docs: Letter, one-inch margins (624px of text), paginated. */
export const DEFAULT_DOCUMENT_PAGE_STYLE: DocumentStyle = {
  pageSize: { width: 816, height: 1056 },
  documentFlavor: DocumentFlavor.TRADITIONAL,
  pageOrient: PageOrientType.PORTRAIT,
  marginTop: PX_PER_INCH,
  marginBottom: PX_PER_INCH,
  marginLeft: PX_PER_INCH,
  marginRight: PX_PER_INCH,
};

/** Fresh copy — Univer mutates the style it is handed. */
export function defaultDocumentPageStyle(): DocumentStyle {
  return {
    ...DEFAULT_DOCUMENT_PAGE_STYLE,
    pageSize: { ...DEFAULT_DOCUMENT_PAGE_STYLE.pageSize! },
  };
}

/**
 * The squeezed geometry every document was stamped with until 2026-10-15: A4 at 72 dpi (595 x 842)
 * with 90/72 margins, in Univer's pageless flavour, so the text column was ~415px with no paper.
 * Pageless was never offered then, so this exact shape is always the old default, never a choice.
 */
export function isLegacySqueezedPageStyle(style: DocumentStyle | undefined): boolean {
  const size = style?.pageSize;
  return (
    !!size &&
    size.width === 595 &&
    size.height === 842 &&
    style?.marginLeft === 90 &&
    style?.marginRight === 90 &&
    style?.marginTop === 72 &&
    style?.marginBottom === 72
  );
}

/** What the Page setup dialog edits. Margins are in inches, like Google's. */
export interface PageSetupValues {
  pageless: boolean;
  orientation: "portrait" | "landscape";
  paper: PaperSizeName;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  /** Paper colour, hex. Always a light colour so the black ink stays readable. */
  pageColor: string;
}

export const PAGE_COLORS = ["#ffffff", "#fff8e7", "#f3f3f3", "#e8f0fe", "#e6f4ea", "#fef7e0"] as const;
export const DEFAULT_PAGE_COLOR = PAGE_COLORS[0];
/** Key on `documentStyle` carrying the paper colour (Univer paints it from the host's surface theme). */
export const PAGE_COLOR_KEY = "matrxPageColor";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The dialog's values, read from a document's style (missing parts fall back to the default page). */
export function pageSetupFromStyle(style: DocumentStyle | undefined): PageSetupValues {
  const landscape = style?.pageOrient === PageOrientType.LANDSCAPE;
  const w = style?.pageSize?.width ?? DEFAULT_DOCUMENT_PAGE_STYLE.pageSize!.width!;
  const h = style?.pageSize?.height ?? DEFAULT_DOCUMENT_PAGE_STYLE.pageSize!.height!;
  const [pw, ph] = landscape ? [h, w] : [w, h];
  const paper =
    (Object.keys(PAPER_SIZES) as PaperSizeName[]).find(
      (k) => Math.abs(PAPER_SIZES[k].width - pw) <= 1 && Math.abs(PAPER_SIZES[k].height - ph) <= 1,
    ) ?? "Letter";
  const inch = (v: number | undefined) => round2((v ?? PX_PER_INCH) / PX_PER_INCH);
  const color = (style as Record<string, unknown> | undefined)?.[PAGE_COLOR_KEY];
  return {
    pageless: style?.documentFlavor === DocumentFlavor.MODERN,
    orientation: landscape ? "landscape" : "portrait",
    paper,
    marginTop: inch(style?.marginTop),
    marginBottom: inch(style?.marginBottom),
    marginLeft: inch(style?.marginLeft),
    marginRight: inch(style?.marginRight),
    pageColor: typeof color === "string" && color ? color : DEFAULT_PAGE_COLOR,
  };
}

/** Params for Univer's `docs.command.page-setup` (pageSize is the as-printed size: swapped when landscape). */
export function pageSetupCommandParams(v: PageSetupValues) {
  const base = PAPER_SIZES[v.paper];
  const landscape = v.orientation === "landscape";
  return {
    documentFlavor: v.pageless ? DocumentFlavor.MODERN : DocumentFlavor.TRADITIONAL,
    pageOrient: landscape ? PageOrientType.LANDSCAPE : PageOrientType.PORTRAIT,
    pageSize: landscape ? { width: base.height, height: base.width } : { width: base.width, height: base.height },
    marginTop: Math.round(v.marginTop * PX_PER_INCH),
    marginBottom: Math.round(v.marginBottom * PX_PER_INCH),
    marginLeft: Math.round(v.marginLeft * PX_PER_INCH),
    marginRight: Math.round(v.marginRight * PX_PER_INCH),
  };
}
