/**
 * Surface manifest — QR codes (`/print/qr`).
 *
 * The value to encode, its error-correction level, and the two link builders
 * (short resolver link, GS1 Digital Link). Emitter + handlers:
 * `features/print/sections/QrSection.tsx`. Writes change the on-screen form only.
 */

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  buildPrintToolManifest,
  printShown,
  type PrintField,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_QR_SURFACE_NAME = "matrx-user/print-qr" as const;
export const PRINT_QR_FORM_TARGET = "qr_settings" as const;

export const PRINT_QR_FIELDS: readonly PrintField[] = [
  { name: "qr_value", label: "Value to encode", description: "The text or link the QR code holds.", kind: "text", typicalCharCount: 40 },
  {
    name: "error_correction",
    label: "Error correction",
    description: "How much of the code can be damaged and still scan: L 7%, M 15% (default), Q 25%, H 30%.",
    kind: "choice",
    options: ["L", "M", "Q", "H"],
  },
  { name: "resolver_origin", label: "Short link origin", description: "The site part of the short resolver link.", kind: "text" },
  { name: "resolver_code", label: "Short link code", description: "The code part of the short resolver link.", kind: "text", typicalCharCount: 10 },
  { name: "gs1_origin", label: "GS1 origin", description: "The site part of the GS1 Digital Link.", kind: "text" },
  { name: "gtin", label: "GTIN", description: "The product's GTIN for the GS1 Digital Link.", kind: "text", typicalCharCount: 14 },
  { name: "lot", label: "Lot", description: "Optional lot number for the GS1 Digital Link.", kind: "text", typicalCharCount: 8 },
  { name: "serial", label: "Serial", description: "Optional serial number for the GS1 Digital Link.", kind: "text", typicalCharCount: 8 },
  { name: "expiry", label: "Expiry (YYMMDD)", description: "Optional expiry date for the GS1 Digital Link, as YYMMDD.", kind: "text", typicalCharCount: 6 },
];

export const printQrManifest = buildPrintToolManifest({
  surfaceName: PRINT_QR_SURFACE_NAME,
  label: "QR codes",
  urlPattern: "/print/qr",
  description: "Makes a QR code at a chosen error-correction level, plus short-link and GS1 link builders.",
  situation:
    'They are making a QR code for "{qr_value|nothing yet}" at error correction {error_correction|M}: {symbol|no symbol yet}.',
  formLabel: "QR settings",
  fields: PRINT_QR_FIELDS,
  formTarget: { name: PRINT_QR_FORM_TARGET, label: "QR settings" },
  shown: [
    printShown("symbol", "Symbol", "string", "Bytes, QR version and module grid for the current value, or why it does not fit."),
    printShown("preview_status", "Preview", "string", '"ready", "empty" (no value) or "failed".'),
    printShown("render_error", "Error", "string", "Why the code could not be made. Empty when it was.", { alwaysAvailable: false }),
    printShown("resolver_url", "Short link", "string", "The built short resolver link, or empty when its inputs are invalid.", { alwaysAvailable: false }),
    printShown("resolver_error", "Short link error", "string", "Why the short link could not be built. Empty when it was.", { alwaysAvailable: false }),
    printShown("gs1_url", "GS1 Digital Link", "string", "The built GS1 Digital Link, or empty when its inputs are invalid.", { alwaysAvailable: false }),
    printShown("gs1_error", "GS1 error", "string", "Why the GS1 link could not be built. Empty when it was.", { alwaysAvailable: false }),
  ],
});

export function createPrintQrScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
