/**
 * features/pdf/workspace/extractor/autoClean.ts — the Feature Knob behind "AI clean on open".
 *
 * The extractor studio ran the AI clean by itself when a PDF with extracted text and no clean text was opened.
 * That is paid AI work, so the workspace ships it as the knob `pdf.workspace.auto_clean_on_open`, default OFF
 * (seeded by aidream `wf_115`); a person or an organization turns it on in Settings. The reader is the one
 * `useEffectiveKnob`; there is no code default: until the knob has answered, nothing runs.
 */
export const PDF_AUTO_CLEAN_KNOB = { feature: "pdf.workspace", key: "auto_clean_on_open" } as const;

/** The knob's answer as a decision: only a real `true` runs the clean. */
export function autoCleanIsOn(knobValue: unknown): boolean {
  return knobValue === true;
}
