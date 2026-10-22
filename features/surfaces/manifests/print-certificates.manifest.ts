/**
 * Surface manifest — Certificates & workbooks (`/print/certificates`).
 *
 * A completion certificate (or its HR acknowledgment twin) and the workbook
 * composer that can end on it. Emitter + handlers:
 * `features/print/sections/CertificateSection.tsx`. Writes change the
 * on-screen form only; printing stays the person's button.
 */

import type { SurfaceScopePayload, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import {
  PRINT_FORM_GROUP,
  buildPrintToolManifest,
  printShown,
  type PrintField,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_CERTIFICATES_SURFACE_NAME = "matrx-user/print-certificates" as const;
export const PRINT_CERTIFICATES_FORM_TARGET = "certificate_settings" as const;
export const PRINT_CERTIFICATES_SIGNATURES_TARGET = "signatures" as const;

export const PRINT_CERTIFICATES_FIELDS: readonly PrintField[] = [
  { name: "recipient_name", label: "Recipient", description: "Who the certificate is for.", kind: "text", typicalCharCount: 30 },
  { name: "certificate_date", label: "Date", description: "The date printed on the certificate, as written.", kind: "text", typicalCharCount: 20 },
  { name: "certificate_title", label: "Title", description: 'The certificate\'s title, e.g. "Certificate of Completion".', kind: "text", typicalCharCount: 30 },
  { name: "certificate_subtitle", label: "Subtitle", description: "The line under the title (usually the course).", kind: "text", typicalCharCount: 50 },
  { name: "certificate_body", label: "Body", description: "The sentence after the recipient's name.", kind: "text", typicalCharCount: 100 },
  {
    name: "variant",
    label: "Variant",
    description: "The certificate's face: formal, modern-minimal, or acknowledgment (the HR signature page).",
    kind: "choice",
    options: ["formal", "modern-minimal", "acknowledgment"],
  },
  { name: "include_toc", label: "Include table of contents", description: "Whether the workbook has a contents page.", kind: "boolean" },
  { name: "end_on_certificate", label: "End on the certificate", description: "Whether the workbook's last page is this certificate.", kind: "boolean" },
];

const signaturesTarget: SurfaceWriteTarget = {
  name: PRINT_CERTIFICATES_SIGNATURES_TARGET,
  label: "Signature lines",
  description:
    'Rewrites the signature lines. Value: a JSON ARRAY with exactly one object per existing line, in order, each { "name"?: string (empty prints a blank rule to sign by hand), "role": string (required) }. Refused (nothing changes): a different number of lines, a missing role. Only the on-screen form changes: nothing is printed.',
  valueType: "array",
  updatesValue: "signatures",
  mode: "ui",
  applyPolicy: "ask",
  group: PRINT_FORM_GROUP,
  sortOrder: 295,
};

export const printCertificatesManifest = buildPrintToolManifest({
  surfaceName: PRINT_CERTIFICATES_SURFACE_NAME,
  label: "Certificates & workbooks",
  urlPattern: "/print/certificates",
  description: "A completion certificate or signature page, and a workbook that can end on it.",
  situation:
    'They are making a {variant|} certificate "{certificate_title|}" for {recipient_name|someone}, and a {workbook_page_count|} page workbook.',
  formLabel: "Certificate",
  fields: PRINT_CERTIFICATES_FIELDS,
  formTarget: { name: PRINT_CERTIFICATES_FORM_TARGET, label: "Certificate settings" },
  shown: [
    printShown("signatures", "Signature lines", "array", "Each signature line: { name (empty = blank rule), role }.", {
      group: PRINT_FORM_GROUP,
      sortOrder: 150,
      typicalCharCount: 120,
    }),
    printShown("workbook_title", "Workbook", "string", "The workbook's title."),
    printShown("workbook_sections", "Workbook sections", "array", "Each section: { title, content_pages }.", { typicalCharCount: 200 }),
    printShown("workbook_page_count", "Workbook pages", "number", "Pages in the composed workbook."),
  ],
  extraTargets: [signaturesTarget],
});

export function createPrintCertificatesScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

/** Parse a signatures write: same count as today, each with a role. */
export function parseSignatureLines(
  value: unknown,
  currentCount: number,
): { name?: string; role: string }[] {
  if (!Array.isArray(value)) throw new Error("Send a JSON array of signature lines.");
  if (value.length !== currentCount) {
    throw new Error(`The certificate has ${currentCount} signature lines; send exactly ${currentCount}.`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) throw new Error(`Line ${index + 1} must be an object.`);
    const { name, role } = entry as { name?: unknown; role?: unknown };
    if (typeof role !== "string" || !role.trim()) throw new Error(`Line ${index + 1} needs a role.`);
    if (name !== undefined && name !== null && typeof name !== "string") throw new Error(`Line ${index + 1}: name must be a string.`);
    return typeof name === "string" && name ? { name, role } : { role };
  });
}
