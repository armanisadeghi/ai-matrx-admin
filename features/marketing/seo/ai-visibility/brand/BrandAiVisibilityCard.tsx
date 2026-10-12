"use client";

/**
 * "What AI says about you" — the compact brand Overview card. The owner is the BRAND (a
 * social-first or person brand has no website); the full view is one click away.
 */

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { marketingRoutes } from "@/features/marketing/lib/routes";

import { useBrandChecks, useBrandCheckEstimate } from "./hooks";
import { RunCheckButton } from "./RunCheckButton";
import { ShareBars } from "./ShareBars";

export function BrandAiVisibilityCard({
  brandId,
  brandSeg,
  organizationId,
  canEdit,
}: {
  brandId: string;
  brandSeg: string;
  organizationId: string;
  canEdit: boolean;
}) {
  const checks = useBrandChecks(brandId);
  const estimate = useBrandCheckEstimate(brandId, organizationId, canEdit);
  const latest = checks.data?.[0] ?? null;
  const viewHref = marketingRoutes.brandAiVisibility(brandSeg);
  const competitors = estimate.data?.competitors ?? latest?.competitors ?? [];

  return (
    <SectionCard
      title="What AI says about you"
      action={{ label: "Open", href: viewHref }}
      headerExtra={
        canEdit ? <RunCheckButton brandId={brandId} organizationId={organizationId} /> : null
      }
    >
      {checks.isPending ? (
        <div className="h-16 animate-pulse rounded-md bg-muted/50" />
      ) : checks.isError ? (
        <p className="text-sm text-destructive">{checks.error.message}</p>
      ) : estimate.isError && canEdit && !latest ? (
        <p className="text-sm text-destructive">{estimate.error.message}</p>
      ) : latest ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
          <div className="shrink-0">
            <div className="text-3xl font-semibold tabular-nums">
              {latest.score == null ? "—" : `${latest.score}%`}
            </div>
            <div className="text-xs text-muted-foreground">
              share of voice · {formatDistanceToNow(new Date(latest.checked_at), { addSuffix: true })}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <ShareBars entries={latest.entries} limit={4} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {competitors.length === 0 ? (
            <>
              Add who you compete with to run a check.{" "}
              <Link href={viewHref} className="underline">
                Add competitors
              </Link>
            </>
          ) : (
            <>Not checked yet. Compared against {competitors.join(", ")}.</>
          )}
        </p>
      )}
    </SectionCard>
  );
}
