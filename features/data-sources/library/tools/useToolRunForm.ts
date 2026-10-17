"use client";

import { useQuery } from "@tanstack/react-query";
import { parseServedRunForm, type ServedRunFormSchema } from "@ai-matrx/chat/mandates/invoke/served-input";

import { getJson } from "@/lib/python-client";

/** What the run-form says about the Tool itself, beside its inputs (CONTRACT §10; our words only). */
export interface ToolFormFacts {
  displayName: string;
  summary: string;
  displayNoun: string;
  priceHintPoints: number | null;
  state: string;
  /** Plain sentence when the Tool is paused or off ("Domain Authority is paused while we check it."). */
  offNotice: string | null;
}

export interface ToolRunForm {
  schema: ServedRunFormSchema;
  facts: ToolFormFacts;
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

/**
 * The friendly form of one Tool: `GET /tools/{tool_id}/run-form` (the workflow run-form shape),
 * compiled by the server from the Tool's own declaration. One read per Tool per session.
 */
export function useToolRunForm(toolId: string | null) {
  return useQuery<ToolRunForm>({
    queryKey: ["tools", "run-form", toolId],
    enabled: Boolean(toolId),
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { data } = await getJson<Record<string, unknown>>(`/tools/${encodeURIComponent(toolId ?? "")}/run-form`, { signal });
      return {
        schema: parseServedRunForm(data),
        facts: {
          displayName: str(data.display_name, "Tool"),
          summary: str(data.summary),
          displayNoun: str(data.display_noun),
          priceHintPoints: typeof data.price_hint_points === "number" ? data.price_hint_points : null,
          state: str(data.state, "live"),
          offNotice: typeof data.tool_off_notice === "string" ? data.tool_off_notice : null,
        },
      };
    },
  });
}
