/**
 * Surface manifest — ZPL export (`/print/zpl`).
 *
 * One roll label as raw ZPL for a Zebra-class thermal printer, with a scan
 * check. Emitter + handlers: `features/print/sections/ZplSection.tsx`. Writes
 * change the on-screen form only; Copy ZPL stays the person's button.
 */

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  buildPrintToolManifest,
  printShown,
  type PrintField,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_ZPL_SURFACE_NAME = "matrx-user/print-zpl" as const;
export const PRINT_ZPL_FORM_TARGET = "zpl_settings" as const;

export const PRINT_ZPL_FIELDS: readonly PrintField[] = [
  { name: "roll_stock", label: "Roll stock", description: "The roll label stock, by an id from roll_stock_options.", kind: "choice" },
  { name: "dpi", label: "Printhead resolution", description: "The printer's resolution in dots per inch: 203 or 300.", kind: "choice", options: ["203", "300"] },
  { name: "qr_value", label: "QR value", description: "The text or link the label's QR code holds.", kind: "text", typicalCharCount: 40 },
  { name: "caption", label: "Caption", description: "The caption under the QR code.", kind: "text", typicalCharCount: 30 },
  { name: "badge", label: "Badge", description: "One short, large token (a bin letter, a size, a department).", kind: "text", typicalCharCount: 4 },
  { name: "detail_lines", label: "Detail lines", description: 'Small detail lines, separated by "|".', kind: "text", typicalCharCount: 60 },
];

export const printZplManifest = buildPrintToolManifest({
  surfaceName: PRINT_ZPL_SURFACE_NAME,
  label: "ZPL export",
  urlPattern: "/print/zpl",
  description: "Raw ZPL for a Zebra-class thermal printer, for one roll label.",
  situation:
    'They are making ZPL for a {roll_stock_name|roll} label at {dpi|203} dpi with the QR value "{qr_value|}"; scan check: {scan_check|}.',
  formLabel: "Label",
  fields: PRINT_ZPL_FIELDS,
  formTarget: { name: PRINT_ZPL_FORM_TARGET, label: "ZPL settings" },
  shown: [
    printShown("roll_stock_name", "Stock", "string", "The chosen roll stock's code and name."),
    printShown("scan_check", "Scan check", "string", "Whether the QR code will scan off this stock, in the page's words."),
    printShown("zpl", "ZPL", "string", "The generated ZPL text. Empty when it could not be made.", {
      alwaysAvailable: false,
      autoContext: false,
      typicalCharCount: 600,
    }),
    printShown("generation_error", "Error", "string", "Why the ZPL could not be made. Empty when it was.", { alwaysAvailable: false }),
    printShown("roll_stock_options", "Stock choices", "array", "Every roll stock: { id, name }.", { autoContext: false, typicalCharCount: 300 }),
  ],
});

export function createPrintZplScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
