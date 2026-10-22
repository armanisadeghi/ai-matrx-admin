/**
 * Surface manifest — Booklet imposition (`/print/booklet`).
 *
 * The person sets a page count; the page shows how those pages fold onto
 * saddle-stitch sheets. Emitter + handlers: `features/print/sections/BookletSection.tsx`.
 * Writes change the on-screen form only; printing stays the person's button.
 */

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  buildPrintToolManifest,
  printShown,
  type PrintField,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_BOOKLET_SURFACE_NAME = "matrx-user/print-booklet" as const;
export const PRINT_BOOKLET_FORM_TARGET = "booklet_settings" as const;

export const PRINT_BOOKLET_FIELDS: readonly PrintField[] = [
  {
    name: "page_count",
    label: "Page count",
    description: "How many pages the booklet has before padding to a multiple of 4.",
    kind: "number",
    min: 1,
    max: 2000,
  },
];

export const printBookletManifest = buildPrintToolManifest({
  surfaceName: PRINT_BOOKLET_SURFACE_NAME,
  label: "Booklet imposition",
  urlPattern: "/print/booklet",
  description: "Reorders a page run into fold-and-staple sheets.",
  situation:
    "They are laying out a {page_count|} page booklet for fold-and-staple printing: {sheet_count|} sheets, padded to {padded_page_count|} pages.",
  formLabel: "Booklet settings",
  fields: PRINT_BOOKLET_FIELDS,
  formTarget: { name: PRINT_BOOKLET_FORM_TARGET, label: "Booklet settings" },
  shown: [
    printShown("padded_page_count", "Padded page count", "number", "The page count rounded up to a multiple of 4."),
    printShown("sheet_count", "Sheets", "number", "Sheets of paper the booklet prints on."),
    printShown("sheets", "Sheet layout", "array", "Each sheet: { sheet, front: [left, right], back: [left, right] } page numbers; 0 is a blank pad page.", {
      autoContext: false,
      typicalCharCount: 600,
    }),
    printShown("needs_short_edge_duplex", "Needs short-edge duplex", "boolean", "True when the printer must flip on the short edge."),
    printShown("size_warning", "Size warning", "string", "The warning shown when the booklet is too thick to fold well. Empty when none.", {
      alwaysAvailable: false,
    }),
  ],
});

export function createPrintBookletScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
