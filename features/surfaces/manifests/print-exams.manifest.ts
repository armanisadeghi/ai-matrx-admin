/**
 * Surface manifest — Practice tests & bubble sheets (`/print/exams`).
 *
 * A practice test printed as separate documents (question booklet, bubble
 * answer form, answer key, explanations) and the printer's settings. Emitter +
 * handlers: `features/print/sections/ExamSection.tsx`. The settings are the
 * package printer's own, so their keys arrive in `print_settings` at run time.
 * Each print button stays the person's.
 */

import type { SurfaceScopePayload, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import {
  PRINT_FORM_GROUP,
  buildPrintToolManifest,
  printShown,
} from "@/features/print/surfaces/print-tool-surface";

export const PRINT_EXAMS_SURFACE_NAME = "matrx-user/print-exams" as const;
export const PRINT_EXAMS_SETTINGS_TARGET = "exam_print_settings" as const;

const settingsTarget: SurfaceWriteTarget = {
  name: PRINT_EXAMS_SETTINGS_TARGET,
  label: "Print settings",
  description:
    'Sets the practice test\'s print settings. Value: a JSON object with ONLY the keys to change, each a "key" from print_settings, with a value of that entry\'s type: boolean = true | false; number = a number within its min/max; choice = one of its options. Refused (nothing changes): an unknown key, a wrong type, a value outside its range or options. Only the on-screen settings change: nothing is printed.',
  valueType: "object",
  updatesValue: "print_settings",
  mode: "ui",
  applyPolicy: "ask",
  group: PRINT_FORM_GROUP,
  sortOrder: 290,
};

export const printExamsManifest = buildPrintToolManifest({
  surfaceName: PRINT_EXAMS_SURFACE_NAME,
  label: "Practice tests & bubble sheets",
  urlPattern: "/print/exams",
  description: "A practice test, its bubble answer form and its answer key, each printed on its own.",
  situation:
    'They are printing the practice test "{test_title|}": {question_count|} questions, {total_points|} points, as separate booklet, bubble form, key and explanations.',
  formLabel: "Print settings",
  fields: [],
  shown: [
    printShown("print_settings", "Print settings", "array", "Every setting: { key, label, type (boolean | number | choice), value, options?, min?, max? }.", {
      group: PRINT_FORM_GROUP,
      sortOrder: 100,
      typicalCharCount: 400,
    }),
    printShown("test_title", "Test", "string", "The practice test's title."),
    printShown("instructions", "Instructions", "string", "The instructions printed on the booklet.", { typicalCharCount: 150, inlineUpTo: 1000 }),
    printShown("question_count", "Questions", "number", "How many questions the test has."),
    printShown("multiple_choice_count", "Multiple choice", "number", "How many questions are multiple choice."),
    printShown("free_response_count", "Free response", "number", "How many questions are free response."),
    printShown("total_points", "Points", "number", "Total points across all questions."),
    printShown("questions", "Questions list", "array", "Every question as the booklet prints it.", {
      autoContext: false,
      typicalCharCount: 3000,
    }),
    printShown("documents", "Documents", "array", "The separately printable documents: { id, label, description }.", { typicalCharCount: 300 }),
  ],
  extraTargets: [settingsTarget],
});

export function createPrintExamsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
