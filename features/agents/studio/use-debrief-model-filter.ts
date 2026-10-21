import { useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import type { DebriefModelFilter } from "./debrief-models";

const positive = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

/**
 * The Debrief menu's filter from the knob register (`chat.debrief.min_context_tokens`, `min_strong_rating`,
 * `models_per_maker`, `top_rating_band`, `specialist_pattern`). `null` until all five answer.
 */
export function useDebriefModelFilter(): DebriefModelFilter | null {
  const minContextTokens = positive(useSessionKnob("chat.debrief.min_context_tokens"));
  const minStrongRating = positive(useSessionKnob("chat.debrief.min_strong_rating"));
  const modelsPerMaker = positive(useSessionKnob("chat.debrief.models_per_maker"));
  const topRatingBand = positive(useSessionKnob("chat.debrief.top_rating_band"));
  const specialist = useSessionKnob("chat.debrief.specialist_pattern");
  if (minContextTokens === null || minStrongRating === null || modelsPerMaker === null || topRatingBand === null) return null;
  if (typeof specialist !== "string") return null;
  return { minContextTokens, minStrongRating, modelsPerMaker, topRatingBand, specialistPattern: specialist };
}
