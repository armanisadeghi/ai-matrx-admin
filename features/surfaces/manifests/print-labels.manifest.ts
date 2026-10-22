/**
 * Surface manifest — Label sheets & roll stock (`/print/labels`).
 *
 * Label stock, label format and the rows that fill the labels, with a live
 * sheet preview and a scan check. Emitter + handlers:
 * `features/print/sections/LabelsSection.tsx`. Writes change the on-screen form
 * and rows only; Print, PDF and the calibration page stay the person's buttons.
 */

import type { SurfaceScopePayload, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import {
  PRINT_FORM_GROUP,
  buildPrintToolManifest,
  printShown,
  type PrintField,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_LABELS_SURFACE_NAME = "matrx-user/print-labels" as const;
export const PRINT_LABELS_FORM_TARGET = "label_settings" as const;
export const PRINT_LABELS_ROWS_TARGET = "label_rows" as const;
export const PRINT_LABELS_MAX_ROWS = 500;

export const PRINT_LABELS_FIELDS: readonly PrintField[] = [
  { name: "label_stock", label: "Label stock", description: "The sheet or roll, by an id from label_stock_options.", kind: "choice" },
  { name: "label_format", label: "Label format", description: "What each label shows, by an id from label_format_options.", kind: "choice" },
  { name: "error_correction", label: "Error correction", description: "QR error correction: L, M (default) or Q.", kind: "choice", options: ["L", "M", "Q"] },
  { name: "start_at_label", label: "Start at label", description: "The first label to print on, to reuse a partly used sheet (up to labels_per_sheet).", kind: "number", min: 1 },
  { name: "preview_mode", label: "Preview mode", description: "labels, or calibration (label outlines only).", kind: "choice", options: ["labels", "calibration"] },
];

const rowsTarget: SurfaceWriteTarget = {
  name: PRINT_LABELS_ROWS_TARGET,
  label: "Label rows",
  description: `Replaces every row of the current label format. Value: a JSON ARRAY of 0-${PRINT_LABELS_MAX_ROWS} objects, each with string values for the keys in row_fields (a missing key is an empty cell). Refused (nothing changes): a key not in row_fields, a non-string value, too many rows. Only the on-screen rows change: nothing is printed.`,
  valueType: "array",
  updatesValue: "label_rows",
  mode: "ui",
  applyPolicy: "ask",
  group: PRINT_FORM_GROUP,
  sortOrder: 295,
};

export const printLabelsManifest = buildPrintToolManifest({
  surfaceName: PRINT_LABELS_SURFACE_NAME,
  label: "Label sheets & roll stock",
  urlPattern: "/print/labels",
  description: "Lays out labels on Avery sheets or roll stock, with a calibration page.",
  situation:
    "They are laying out {label_count|no} {label_format_name|} labels on {label_stock_name|label stock}; scan check: {scan_check|none yet}.",
  formLabel: "Label settings",
  fields: PRINT_LABELS_FIELDS,
  formTarget: { name: PRINT_LABELS_FORM_TARGET, label: "Label settings" },
  shown: [
    printShown("label_rows", "Label rows", "array", "The rows that fill the labels, one object per label, keyed by row_fields.", {
      group: PRINT_FORM_GROUP,
      sortOrder: 150,
      typicalCharCount: 600,
    }),
    printShown("row_fields", "Row fields", "array", "The keys each row of the current format reads.", { group: PRINT_FORM_GROUP, sortOrder: 151 }),
    printShown("label_stock_name", "Stock", "string", "The chosen stock's code and name."),
    printShown("label_format_name", "Format", "string", "The chosen format's name."),
    printShown("label_count", "Labels", "number", "How many labels the rows make."),
    printShown("labels_per_sheet", "Labels per sheet", "number", "Labels on one sheet or roll page of this stock."),
    printShown("longest_payload_bytes", "Longest QR payload", "number", "Bytes in the longest QR value."),
    printShown("scan_check", "Scan check", "string", "Whether the QR codes will scan at this size, in the page's words. Empty with no labels.", {
      alwaysAvailable: false,
    }),
    printShown("label_stock_options", "Stock choices", "array", "Every stock: { id, name, kind (sheet | roll) }.", { autoContext: false, typicalCharCount: 800 }),
    printShown("label_format_options", "Format choices", "array", "Every format: { id, name }.", { autoContext: false, typicalCharCount: 200 }),
  ],
  extraTargets: [rowsTarget],
});

export function createPrintLabelsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

/** Parse a rows write against the current format's row fields. */
export function parseLabelRows(value: unknown, rowFields: readonly string[]): Record<string, string>[] {
  if (!Array.isArray(value)) throw new Error("Send a JSON array of rows.");
  if (value.length > PRINT_LABELS_MAX_ROWS) throw new Error(`At most ${PRINT_LABELS_MAX_ROWS} rows.`);
  return value.map((row, index) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) throw new Error(`Row ${index + 1} must be an object.`);
    const out: Record<string, string> = Object.fromEntries(rowFields.map((f) => [f, ""]));
    for (const [key, cell] of Object.entries(row as Record<string, unknown>)) {
      if (!rowFields.includes(key)) throw new Error(`Row ${index + 1}: "${key}" is not a field of this format (${rowFields.join(", ")}).`);
      if (typeof cell !== "string") throw new Error(`Row ${index + 1}: "${key}" must be a string.`);
      out[key] = cell;
    }
    return out;
  });
}
