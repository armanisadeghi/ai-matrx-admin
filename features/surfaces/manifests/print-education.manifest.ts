/**
 * Surface manifest — Cheat sheets, glossaries & study calendars (`/print/education`).
 *
 * The person picks which study printable to preview; the sample content and
 * the printer's layouts are shown. Emitter + handlers:
 * `features/print/sections/EducationSection.tsx`. The print options dialog
 * stays the person's.
 */

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  buildPrintToolManifest,
  printShown,
  type PrintField,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_EDUCATION_SURFACE_NAME = "matrx-user/print-education" as const;
export const PRINT_EDUCATION_FORM_TARGET = "study_printable" as const;

export const PRINT_EDUCATION_FIELDS: readonly PrintField[] = [
  {
    name: "artifact",
    label: "Printable",
    description: "Which study printable is on screen: a one-page cheat sheet, a glossary, or a study calendar.",
    kind: "choice",
    options: ["cheat-sheet", "glossary", "study-calendar"],
  },
];

export const printEducationManifest = buildPrintToolManifest({
  surfaceName: PRINT_EDUCATION_SURFACE_NAME,
  label: "Cheat sheets, glossaries & study calendars",
  urlPattern: "/print/education",
  description: "Study printables: a one-page cheat sheet, a glossary, or a dated study calendar.",
  situation: 'They are previewing the {artifact_label|} printable "{artifact_title|}" ({artifact_summary|}).',
  formLabel: "Printable",
  fields: PRINT_EDUCATION_FIELDS,
  formTarget: { name: PRINT_EDUCATION_FORM_TARGET, label: "Study printable" },
  shown: [
    printShown("artifact_label", "Printable name", "string", "The chosen printable's name."),
    printShown("artifact_title", "Title", "string", "The title of the content being previewed."),
    printShown("artifact_summary", "Size", "string", "How much content it holds (sections, entries, weeks)."),
    printShown("artifact_content", "Content", "object", "The full content being previewed, as the printer receives it.", {
      autoContext: false,
      typicalCharCount: 2500,
    }),
    printShown("layouts", "Layouts", "array", "The printer's layouts: { id, label, description }.", { typicalCharCount: 300 }),
  ],
});

export function createPrintEducationScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
