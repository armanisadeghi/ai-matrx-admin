/**
 * `brand_assist` — run ONE 30-second brand assist the person clicked
 * (Smart Add VISION Part 24; aidream services/brand_assists).
 *
 * The door is fixed — `POST /brand-assists/{brandId}/run` — so a ledger row
 * can only name a brand and an assist id, never an address. The server runs
 * the job through the capability that already owns the data (colors and
 * fonts → brand assets as unconfirmed suggestions; search volume → keyword
 * market; who ranks → the site's brand search), so the result lives on after
 * the chip is gone. The returned result is the row's receipt (`result`), and
 * the brand page's results panel renders it.
 */

import type {
  AssistActionDefinition,
  AssistActionResult,
} from "../assist-action-types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSIST_ID = /^[a-z_]{2,40}$/;

export interface BrandAssistRunResult {
  assist_id: string;
  summary: string;
  items: { label: string; value: string; detail?: string; href?: string }[];
  lands: string;
  review_href?: string | null;
  cost_usd?: string | null;
  cost_points?: number | null;
}

export const brandAssistAction: AssistActionDefinition = {
  label: "Run brand assist",
  kind: "brand_assist",
  description:
    "Run one priced, pre-filled job that enriches one brand and lands its result in the brand's normal home.",
  handler: async (assist, ctx): Promise<AssistActionResult> => {
    const action = assist.action;
    if (action.kind !== "brand_assist") {
      return { ok: false, error: "brand_assist: wrong action payload" };
    }
    if (!UUID.test(action.brandId) || !ASSIST_ID.test(action.assistId)) {
      return { ok: false, error: "This assist names an unknown brand or job and was not run." };
    }
    const outcome = await ctx.callServer(`/brand-assists/${action.brandId}/run`, {
      assist_id: action.assistId,
    }, { timeoutMs: 90_000 });
    if (!outcome.ok) return { ok: false, error: outcome.error };
    const result = outcome.data as BrandAssistRunResult;
    // `sentence` is what the card's receipt toast says (AssistCard.run).
    return { ok: true, result: { ...result, sentence: result.summary } };
  },
};
