/**
 * Surface manifest — Commerce printer certification (`matrx-user/commerce-printer-certify`).
 *
 * `/commerce/labels/printers/certify` (and `?id=` to re-check one): the guided
 * certification of a label printer against one label stock — describe the printer,
 * print the calibration page, answer four physical checks about it, get the verdict.
 *
 * Emitter: `CertifyPrinterWizard` (`features/commerce-intake/labels/printers/components/`).
 * Write target: `printer_details_draft` fills step 1 (printer, connection note, label
 * stock); nothing is saved. NOT writable on purpose: the four checks (only the person
 * holding the printed page can answer them), printing, and recording the verdict.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const COMMERCE_PRINTER_CERTIFY_SURFACE_NAME = "matrx-user/commerce-printer-certify";

const groups: SurfaceValueGroup[] = [
  { key: "certify_session", label: "Certification", sortOrder: 100, description: "The printer being certified and how far it got." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group: "certify_session",
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("certify_mode", "Mode", "string", 100, '"new" (certify a printer) or "recheck" (re-check a saved certification).', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("certification_id", "Certification ID", "string", 105, "UUID of the certification being re-checked (re-check only).", { typicalCharCount: 36 }),
  v("previous_status", "Previous result", "string", 110, "The saved result being re-checked (re-check only)."),
  v("step", "Step", "number", 120, "1 describe the printer · 2 print the calibration page · 3 answer the checks · 4 verdict.", {
    alwaysAvailable: true,
  }),
  v("printer_name", "Printer", "string", 130, "Make and model as typed."),
  v(
    "printer_details",
    "Printer details",
    "object",
    140,
    "{ make, model, connection_note, label_stock: { template_id, name, stock_code } } as filled in.",
    { typicalCharCount: 200 },
  ),
  v(
    "label_stocks",
    "Label stocks",
    "array",
    150,
    "The label stocks a printer can be certified against: { template_id, name, stock_code }.",
    { typicalCharCount: 1500, autoContext: false },
  ),
  v("calibration_printed", "Calibration printed", "boolean", 160, "True once the calibration page was sent to the printer."),
  v(
    "checks",
    "Checks",
    "array",
    170,
    "The four physical checks: { id, question, answer (true | false | null = not answered) }.",
    { typicalCharCount: 500 },
  ),
  v("verdict", "Verdict", "string", 180, '"certified" or "failed" once recorded (step 4); empty before.'),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "printer_details_draft",
    label: "Fill in the printer",
    description:
      'Fill step 1 for the person. NOTHING is saved. Value is a JSON object with any of { "make": string, "model": string, "connection_note": string, "template_id": a template_id from label_stocks }; only the keys you send change. Refused: an unknown label stock or key, a verdict already recorded.',
    valueType: "object",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "printer_details",
    group: "certify_session",
    sortOrder: 300,
  },
];

const declared: SurfaceManifest = {
  surfaceName: COMMERCE_PRINTER_CERTIFY_SURFACE_NAME,
  situation:
    "They are certifying a label printer ({certify_mode}): {printer_name|no printer named yet}, at step {step} of 4 (1 describe, 2 print the calibration page, 3 answer the checks, 4 verdict). Verdict: {verdict|not yet}. You can fill in the printer and label stock; only they can answer the checks.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Commerce printer certification",
  description: "Guided label printer certification: describe, print the calibration page, answer four checks, record the verdict.",
  urlPattern: "/commerce/labels/printers/certify",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const commercePrinterCertifyManifest = declared;

export function createCommercePrinterCertifyScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
