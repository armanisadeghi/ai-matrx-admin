import type { ReportOutputFacts } from "./report-output-offer-values";

export const NO_VOICE_LENS_NOTE = "No Voice & Lens note was set: write in the report's own tone and angle.";

export function buildGeneratorVariables(
  reportMarkdown: string,
  toneProfile: string,
  facts: ReportOutputFacts = {},
): Record<string, unknown> {
  return {
    report_markdown: reportMarkdown,
    // The mandate guarantees voice_lens on every call and its required-input gate treats a blank as
    // "nothing landed" (422 mandate_inputs_rejected) — a topic with no tone note must say so, never send "".
    voice_lens: toneProfile.trim() || NO_VOICE_LENS_NOTE,
    // Mapped-only facts by the provision's declared names — payload-neutral
    // on the mandate door unless a binding maps them.
    ...facts,
  };
}

