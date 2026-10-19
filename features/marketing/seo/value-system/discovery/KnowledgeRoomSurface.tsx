"use client";

/**
 * The live half of `matrx-user/marketing-brand-knowledge`: mounts the room's
 * surface over the site scope it inherits (`MarketingSiteSurfaceProvider`,
 * mounted by `BrandIdentitySiteSurface`) and emits each rung's state/result.
 *
 * Mounted ONLY by the identity Knowledge route. `DiscoveryWorkspace` (also used
 * in the floating site discovery window) is untouched.
 *
 * It reads the SAME react-query entry the ladder renders from, so the scope is
 * the server state the person is looking at. `getScope` runs at trigger time.
 * No write targets: the ladder's edits are button runs and rulings in the
 * shared approval queue.
 */

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import { useMarketingSiteSurfaceBase } from "@/features/marketing/lib/scopes/site-surface-base";
import { createMarketingBrandKnowledgeScope } from "@/features/surfaces/manifests/marketing-brand-knowledge.manifest";
import { STEP_META } from "./DiscoveryLadder";
import {
  DISCOVERY_STEP_ORDER,
  getDiscoveryStatus,
  type DiscoveryStepKey,
  type DiscoveryStepStatus,
} from "./data";

export const MARKETING_BRAND_KNOWLEDGE_SURFACE_NAME =
  "matrx-user/marketing-brand-knowledge" as const;

export function KnowledgeRoomSurface({ children }: { children: ReactNode }) {
  const { siteId, getBaseValues } = useMarketingSiteSurfaceBase();
  // Same key + fetcher as DiscoveryLadder: one cache entry, one truth.
  const status = useQuery({
    queryKey: ["marketing", "seo", "discovery", siteId],
    queryFn: () => getDiscoveryStatus(siteId),
    staleTime: 15_000,
  });

  const getScope = (): SurfaceScopePayload => {
    const rows = new Map<string, DiscoveryStepStatus>();
    for (const row of status.data?.steps ?? []) rows.set(row.step, row);
    const done = (step: DiscoveryStepKey) => {
      const row = rows.get(step);
      return row?.status === "completed" && row.artifact != null;
    };
    const met = (step: DiscoveryStepKey) =>
      STEP_META[step].requires.every((need) => done(need));
    const artifact = (step: DiscoveryStepKey) =>
      done(step) ? (rows.get(step)?.artifact ?? undefined) : undefined;
    const completed = DISCOVERY_STEP_ORDER.filter(done);
    const next = DISCOVERY_STEP_ORDER.find(
      (step) => !done(step) && (rows.get(step)?.implemented ?? false) && met(step),
    );
    const loaded = status.data != null;
    return createMarketingBrandKnowledgeScope({
      ...getBaseValues(),
      discovery_steps: loaded
        ? DISCOVERY_STEP_ORDER.map((step) => {
            const row = rows.get(step);
            return {
              step,
              title: STEP_META[step].title,
              implemented: row?.implemented ?? false,
              status: done(step) ? "completed" : (row?.status ?? "not_run"),
              completed_at: row?.completed_at ?? null,
              prerequisites_met: met(step),
            };
          })
        : undefined,
      discovery_completed_steps: loaded ? completed : undefined,
      discovery_next_step: next,
      discovery_business_model: artifact("business_model"),
      discovery_ideal_customer: artifact("ideal_customer"),
      discovery_money_map: artifact("money_map"),
      discovery_offerings: artifact("offerings"),
      discovery_offering_values: artifact("offering_values"),
      discovery_proposed_setup: artifact("proposed_setup"),
      discovery_guidelines_draft: artifact("guidelines_draft"),
    });
  };

  return (
    <SurfaceRuntimeProvider
      surfaceName={MARKETING_BRAND_KNOWLEDGE_SURFACE_NAME}
      getScope={getScope}
    >
      {children}
    </SurfaceRuntimeProvider>
  );
}
