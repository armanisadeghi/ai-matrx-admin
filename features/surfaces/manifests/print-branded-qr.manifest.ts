/**
 * Surface manifest — Branded QR codes (`/print/branded-qr`).
 *
 * A QR code in the person's colors with an optional center logo. Emitter +
 * handlers: `features/print/sections/StyledQrSection.tsx`. Writes change the
 * on-screen form only; the logo file stays the person's to choose.
 */

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  buildPrintToolManifest,
  printShown,
  type PrintField,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_BRANDED_QR_SURFACE_NAME = "matrx-user/print-branded-qr" as const;
export const PRINT_BRANDED_QR_FORM_TARGET = "branded_qr_style" as const;

export const PRINT_BRANDED_QR_FIELDS: readonly PrintField[] = [
  { name: "qr_value", label: "Value to encode", description: "The text or link the QR code holds.", kind: "text", typicalCharCount: 40 },
  {
    name: "dot_style",
    label: "Dot style",
    description: "The shape of the code's dots.",
    kind: "choice",
    options: ["square", "dots", "rounded", "classy", "extra-rounded"],
  },
  {
    name: "corner_style",
    label: "Corner style",
    description: "The shape of the three corner squares.",
    kind: "choice",
    options: ["square", "dot", "extra-rounded"],
  },
  { name: "module_color", label: "Module color", description: "The color of the code's dots.", kind: "color" },
  { name: "background_color", label: "Background", description: "The color behind the code.", kind: "color" },
  {
    name: "error_correction",
    label: "Error correction",
    description: "Q (25%) or H (30%, the default). A center logo needs the headroom.",
    kind: "choice",
    options: ["Q", "H"],
  },
];

export const printBrandedQrManifest = buildPrintToolManifest({
  surfaceName: PRINT_BRANDED_QR_SURFACE_NAME,
  label: "Branded QR codes",
  urlPattern: "/print/branded-qr",
  description: "A QR code in brand colors with an optional logo in the middle.",
  situation:
    'They are styling a QR code for "{qr_value|nothing yet}": {dot_style|} dots in {module_color|} on {background_color|}, logo: {logo_name|none}.',
  formLabel: "Style",
  fields: PRINT_BRANDED_QR_FIELDS,
  formTarget: { name: PRINT_BRANDED_QR_FORM_TARGET, label: "QR style" },
  shown: [
    printShown("logo_name", "Center logo", "string", "The file name of the chosen center logo. Empty when there is none.", { alwaysAvailable: false }),
    printShown("preview_status", "Preview", "string", '"ready", "empty" (no value), "rendering" or "failed".'),
    printShown("render_error", "Error", "string", "Why the code could not be made. Empty when it was.", { alwaysAvailable: false }),
  ],
});

export function createPrintBrandedQrScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
