"use client";

/**
 * The brand page, live: what a server run writes for this brand (brand discovery's testimony, candidates and
 * findings; Smart Add's assets; the brand row itself) shows without a reload.
 *
 * postgres_changes on the five brand tables (all in the `supabase_realtime` publication, RLS-gated delivery), each
 * filtered to this brand. A change is never applied from the payload: it marks the brand's queries
 * (`["marketing", "brand", <id>, …]`) stale, coalesced, so a run saving fifty rows costs one refetch per query, never
 * fifty (rule 2). No write ever follows an event, so there is no echo loop to suppress (rule 1): this person's own
 * edits only cause the same refetch their mutation already asked for. A dropped socket refetches once (backfill).
 * A pending refetch is cleared on unmount and on a brand change.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { defineChannelNamespace } from "@ai-matrx/data/realtime";
import { useChannel } from "@ai-matrx/data/realtime/react";

import { marketingKeys } from "@/features/marketing/data/hooks";

const brandChannel = defineChannelNamespace({
  namespace: "marketing-brand-live",
  parts: ["brandId"],
  description: "server writes about one brand (web.brand and its testimony, choices, findings, assets)",
});

/** How long changes are gathered before the brand's queries refetch. */
const COALESCE_MS = 750;

export function useLiveBrand(brandId: string | null) {
  const queryClient = useQueryClient();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = () => {
    if (!brandId || pending.current) return;
    pending.current = setTimeout(() => {
      pending.current = null;
      void queryClient.invalidateQueries({ queryKey: [...marketingKeys.root, "brand", brandId] });
    }, COALESCE_MS);
  };

  // A pending refetch never outlives the page or the brand it was gathered for.
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
    },
    [brandId],
  );

  const byBrand = brandId ? `brand_id=eq.${brandId}` : "";
  useChannel(
    brandId
      ? {
          topic: brandChannel.topic({ brandId }),
          onBackfill: refresh,
          postgresChanges: [
            { event: "*", schema: "web", table: "brand", filter: `id=eq.${brandId}`, onChange: refresh },
            { event: "*", schema: "web", table: "brand_choice", filter: byBrand, onChange: refresh },
            { event: "*", schema: "web", table: "brand_testimony", filter: byBrand, onChange: refresh },
            { event: "*", schema: "web", table: "discovered_item", filter: byBrand, onChange: refresh },
            { event: "*", schema: "web", table: "brand_asset", filter: byBrand, onChange: refresh },
          ],
        }
      : null,
  );
}
