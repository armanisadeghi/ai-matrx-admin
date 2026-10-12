import { supabase } from "@/utils/supabase/client";
import { getJson, postJson } from "@/lib/python-client";
import { updateBrand } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";

import type { BrandCheckEstimate, BrandCheckRow } from "./types";

/**
 * `seo.ai_visibility_brand_check` is newer than the generated `database.types.ts`; the read is
 * typed here until `pnpm db-types` next runs, and RLS (the parent brand's access) is the gate.
 */
interface UntypedSeoReader {
  from(table: "ai_visibility_brand_check"): {
    select(columns: string): {
      eq(column: string, value: string): {
        order(column: string, opts: { ascending: boolean }): {
          limit(n: number): PromiseLike<{ data: BrandCheckRow[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
}

export function brandChecksKey(brandId: string) {
  return ["marketing", "ai-visibility", "brand", brandId] as const;
}

export async function listBrandChecks(brandId: string, limit = 20): Promise<BrandCheckRow[]> {
  const seo = supabase.schema("seo") as unknown as UntypedSeoReader;
  const { data, error } = await seo
    .from("ai_visibility_brand_check")
    .select("*")
    .eq("brand_id", brandId)
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not read this brand's AI checks: ${error.message}`);
  return data ?? [];
}

const BASE = "/ai-visibility/brands";

export async function estimateBrandCheck(
  brandId: string,
  organizationId: string,
  signal?: AbortSignal,
): Promise<BrandCheckEstimate> {
  const { data } = await getJson<BrandCheckEstimate>(`${BASE}/${brandId}/check/estimate`, {
    organizationId,
    signal,
  });
  return data;
}

export async function runBrandCheck(
  brandId: string,
  organizationId: string,
  maxCostUsd: number,
): Promise<{ id: string; score: number | null; checked_at: string }> {
  const { data } = await postJson<{ id: string; score: number | null; checked_at: string }>(
    `${BASE}/${brandId}/check`,
    { max_cost_usd: maxCostUsd },
    { organizationId },
  );
  return data;
}

/** Who this brand is compared against: kept on the brand profile (`profile.ai_visibility.competitors`). */
export async function saveBrandAiCompetitors(input: {
  brandId: string;
  expectedVersion: number;
  profile: Record<string, unknown>;
  competitors: string[];
}) {
  const current = (input.profile.ai_visibility ?? {}) as Record<string, unknown>;
  return updateBrand({
    brandId: input.brandId,
    expectedVersion: input.expectedVersion,
    patch: {
      profile: {
        ...input.profile,
        ai_visibility: { ...current, competitors: input.competitors },
      } as MarketingBrand["profile"],
    },
  });
}
