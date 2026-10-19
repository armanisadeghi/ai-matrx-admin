/**
 * ANGLES FOR THE DIRECTOR'S PEG — `news.angles` in peg mode (BRIEFS-NEWS-OPPORTUNITY brief 4, "Peg mode",
 * BRIEFS-STRATEGY-AND-ORG-CHART decision 6, approved 2026-09-27).
 *
 * The PR Director's menu carries the peg it checked (`pr_peg_check`: the hook and its three tests). This lane
 * hands that hook to the Angle writer as `story = {peg_kind, text, proof[], standing}` with `mode: "peg"`,
 * through the mandate door — never an agent id. Standing comes from the Director's own three tests: all pass
 * → strong, some → partial, none → none (and the Angle writer returns zero angles for none).
 *
 * The brand is the Director panel's (`PrDirectorBrandContext`); a menu shown outside the panel has none, and
 * the control says so instead of guessing.
 */

import { createContext } from "react";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import {
  mandateOutputUnusableSentence,
  runHeadlessAgentJson,
} from "@ai-matrx/chat/agents/redux/execution-system/thunks/run-headless-agent-json";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import type { PrPegView } from "@/features/content-ir/kinds/pr-play-menu";

export interface PrDirectorBrand {
  brandId: string;
  brandName: string;
  organizationId: string | null;
}

/** Set by `PrDirectorPanel` around its chat column, so a menu answered there knows its brand. */
export const PrDirectorBrandContext = createContext<PrDirectorBrand | null>(null);

export type PegStanding = "strong" | "partial" | "none";

export function pegStanding(peg: PrPegView): PegStanding {
  const passed = [peg.passesNew, peg.passesTimely, peg.passesOthersCare].filter(Boolean).length;
  return passed === 3 ? "strong" : passed === 0 ? "none" : "partial";
}

/** The `story` a peg-mode run receives: the hook, never a news signal. */
export function pegStory(peg: PrPegView) {
  return {
    peg_kind: "director_peg",
    text: peg.text,
    proof: [] as string[],
    standing: pegStanding(peg),
  };
}

/** The brand as `news_client_context`, from what this screen holds (the server's builder adds the rest on a monitor run). */
export function pegClientContext(brand: PrDirectorBrand, now: string) {
  return {
    __kind: "news_client_context",
    run_generated_at: now,
    brand_id: brand.brandId,
    organization_id: brand.organizationId,
    company: { __kind: "news_client_company", name: brand.brandName },
  };
}

export interface PegAngle {
  headline: string;
  whyNow: string;
  tentative: boolean;
}

export interface PegAnglesResult {
  angles: PegAngle[];
  /** The Angle writer's own next step (it says why when there are zero angles). */
  nextStep: string;
}

export function readPegAngles(data: unknown): PegAnglesResult | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  const angles = Array.isArray(value.angles) ? value.angles : [];
  return {
    angles: angles
      .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
      .map((a) => ({
        headline: typeof a.headline === "string" ? a.headline : "",
        whyNow: typeof a.why_now === "string" ? a.why_now : "",
        tentative: a.tentative === true,
      }))
      .filter((a) => a.headline !== ""),
    nextStep: typeof value.next_step === "string" ? value.next_step : "",
  };
}

/** One peg-mode run. Resolves the angles, or a sentence to show. */
export function findPegAngles(args: { peg: PrPegView; brand: PrDirectorBrand }) {
  return async (
    dispatch: AppDispatch,
    getState: () => RootState,
  ): Promise<{ ok: true; result: PegAnglesResult } | { ok: false; error: string }> => {
    const now = new Date().toISOString();
    const result = await runHeadlessAgentJson(dispatch, getState, {
      initiation: "user",
      mandateKey: MANDATE_KEYS.news__angles,
      surfaceKey: `pr-director-peg:${args.brand.brandId}`,
      sourceFeature: "pr-director",
      surfaceName: null,
      organizationId: args.brand.organizationId,
      variables: {
        story: pegStory(args.peg),
        mode: "peg",
        client_context: pegClientContext(args.brand, now),
        run_generated_at: now,
      },
      timeoutMs: 180_000,
    });
    const unusable = mandateOutputUnusableSentence(result);
    if (unusable) return { ok: false, error: unusable };
    const read = result.success ? readPegAngles(result.data) : null;
    if (!read) return { ok: false, error: result.error ?? "The angle writer returned nothing." };
    return { ok: true, result: read };
  };
}
