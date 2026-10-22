/**
 * Surface manifest — Order printed copies (`/print/order`).
 *
 * The print-on-demand calculator: book size, page count, binding, interior,
 * paper, cover, quantity and delivery, priced live from the print catalog.
 * Emitter + handlers: `features/print/order/PrintOrderWorkspace.tsx`.
 *
 * The one write target only sets the book's options on screen (the price
 * re-quotes by itself). Paying and ordering open a real checkout and stay the
 * person's: there is deliberately no target for them.
 */

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  PRINT_FORM_GROUP,
  buildPrintToolManifest,
  printShown,
  type PrintField,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_ORDER_SURFACE_NAME = "matrx-user/print-order" as const;
export const PRINT_ORDER_FORM_TARGET = "book_options" as const;

export const PRINT_ORDER_FIELDS: readonly PrintField[] = [
  { name: "trim_id", label: "Book size", description: "An id from book_option_choices.trims.", kind: "choice" },
  { name: "page_count", label: "Pages", description: "Interior page count; page_window gives the range for the current choices.", kind: "number", min: 1 },
  { name: "binding_id", label: "Binding", description: "An id from book_option_choices.bindings.", kind: "choice" },
  { name: "color_id", label: "Interior", description: "An id from book_option_choices.colors.", kind: "choice" },
  { name: "paper_id", label: "Paper", description: "An id from book_option_choices.papers.", kind: "choice" },
  { name: "cover_finish_id", label: "Cover", description: "An id from book_option_choices.cover_finishes.", kind: "choice" },
  { name: "quantity", label: "Quantity", description: "How many copies.", kind: "number", min: 1, max: 100000 },
  { name: "destination", label: "Ship to", description: "An id from book_option_choices.destinations.", kind: "choice" },
  { name: "shipping_level", label: "Shipping", description: "A level from shipping_options (they load once the book's options are complete).", kind: "choice" },
];

export const printOrderManifest = buildPrintToolManifest({
  surfaceName: PRINT_ORDER_SURFACE_NAME,
  label: "Order printed copies",
  urlPattern: "/print/order",
  description: "Configures a printed book and prices printing and shipping live.",
  situation:
    "They are pricing {quantity|} printed copies of a {page_count|} page {size|} {binding|} book shipped to {destination_label|}; price: {price_total|not quoted yet}, still to choose: {missing_fields|nothing}.",
  formLabel: "Book options",
  fields: PRINT_ORDER_FIELDS,
  formTarget: { name: PRINT_ORDER_FORM_TARGET, label: "Book options" },
  shown: [
    printShown("catalog_status", "Catalog", "string", '"loading", "ready", "awaiting_credentials", "needs_organization" or "error". Options can only be set when "ready".'),
    printShown("size", "Size name", "string", "The chosen book size, in words.", { alwaysAvailable: false, group: PRINT_FORM_GROUP, sortOrder: 160 }),
    printShown("binding", "Binding name", "string", "The chosen binding, in words.", { alwaysAvailable: false, group: PRINT_FORM_GROUP, sortOrder: 161 }),
    printShown("interior", "Interior name", "string", "The chosen interior, in words.", { alwaysAvailable: false, group: PRINT_FORM_GROUP, sortOrder: 162 }),
    printShown("paper", "Paper name", "string", "The chosen paper, in words.", { alwaysAvailable: false, group: PRINT_FORM_GROUP, sortOrder: 163 }),
    printShown("cover", "Cover name", "string", "The chosen cover finish, in words.", { alwaysAvailable: false, group: PRINT_FORM_GROUP, sortOrder: 164 }),
    printShown("shipping", "Shipping name", "string", "The chosen shipping, in words.", { alwaysAvailable: false, group: PRINT_FORM_GROUP, sortOrder: 165 }),
    printShown("destination_label", "Ship to (address)", "string", "Where the copies ship, in words.", { group: PRINT_FORM_GROUP, sortOrder: 166 }),
    printShown("missing_fields", "Still to choose", "string", "The options not chosen yet, comma separated. Empty when the book is complete.", { alwaysAvailable: false }),
    printShown("page_window", "Page range", "string", "The page counts the current choices allow.", { alwaysAvailable: false }),
    printShown("price_status", "Price", "string", '"idle" (options incomplete), "loading", "ready", "awaiting_credentials", "needs_organization" or "error".'),
    printShown("price_total", "Total", "string", "The quoted total with tax and its currency. Empty until quoted.", { alwaysAvailable: false }),
    printShown("price_breakdown", "Price breakdown", "object", "The full quote: line items, shipping, fees, tax, discounts.", {
      alwaysAvailable: false,
      autoContext: false,
      typicalCharCount: 800,
    }),
    printShown("shipping_options", "Shipping choices", "array", "Shipping levels for the current book: { level, label }.", {
      alwaysAvailable: false,
      typicalCharCount: 200,
    }),
    printShown("book_option_choices", "Option choices", "object", "Every option by dimension: { trims, bindings, colors, papers, cover_finishes, destinations }, each { id, label, available, reason }.", {
      alwaysAvailable: false,
      autoContext: false,
      typicalCharCount: 4000,
    }),
  ],
});

export function createPrintOrderScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
