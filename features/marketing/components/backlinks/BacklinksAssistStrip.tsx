"use client";

/** Site-filtered page-layer assists for the Backlinks workspace. */

import { useCallback, useEffect } from "react";
import { AssistStrip } from "@/features/assists/components/AssistStrip";
import type { Assist } from "@/features/assists/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import type {
  BacklinkObservationRow,
  BacklinkTrendPoint,
  BacklinkWorkspaceData,
} from "@/features/marketing/data/backlinks-types";
import { useMandateHostValues } from "@/features/mandates/host-values/useMandateHostValues";
import {
  BACKLINK_ASSISTANT_MANDATE,
  BACKLINKS_ASSIST_SURFACE,
  isBacklinksAssist,
  produceBacklinksAssists,
} from "@/features/marketing/components/backlinks/backlinks-assists-producer";

/** One deterministic sweep per site per browser session. */
const sweptSites = new Set<string>();

export function BacklinksAssistStrip({
  siteId,
  siteLabel,
  brandId,
  brandNames,
  data,
  trend,
  rows,
  reviewEnabled,
  ready,
}: {
  siteId: string;
  siteLabel: string;
  brandId: string | null;
  brandNames: string[];
  data: BacklinkWorkspaceData;
  trend: BacklinkTrendPoint[];
  rows: BacklinkObservationRow[];
  reviewEnabled: boolean;
  /** Wait until all three already-mounted reads have settled so a partial
   * first render cannot suppress a real candidate for the whole session. */
  ready: boolean;
}) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const siteFilter = useCallback(
    (assist: Assist) => isBacklinksAssist(assist, siteId),
    [siteId],
  );

  // The Backlink Work Planner's chip opens the shared run window; the person
  // sends from its composer. The site's loaded state rides that first turn as
  // the mandate's offered values (audit F-7: the agent said "no rows arrived").
  useMandateHostValues(BACKLINK_ASSISTANT_MANDATE, "seo.backlinks_assist_sweep", {
    site_id: siteId,
    site_label: siteLabel,
    brand_id: brandId,
    brand_names: brandNames,
    summary: data.latestByDataset.summary ?? null,
    detail_snapshot: data.latestByDataset.backlinks ?? null,
    trend,
    rows,
    anchors: data.anchors,
    target_pages: data.targetPages,
    competitors: data.competitors,
    enrichment: data.enrichment,
    review_enabled: reviewEnabled,
  });

  useEffect(() => {
    if (!ready || !userId || sweptSites.has(siteId)) return;
    sweptSites.add(siteId);
    void produceBacklinksAssists({
      userId,
      dispatch,
      state: {
        siteId,
        siteLabel,
        brandId,
        brandNames,
        summary: data.latestByDataset.summary ?? null,
        detailSnapshot: data.latestByDataset.backlinks ?? null,
        trend,
        rows,
        anchors: data.anchors,
        targetPages: data.targetPages,
        competitors: data.competitors,
        enrichment: data.enrichment,
        reviewEnabled,
      },
    });
  }, [
    ready,
    userId,
    siteId,
    siteLabel,
    brandId,
    brandNames,
    data,
    trend,
    rows,
    reviewEnabled,
    dispatch,
  ]);

  return (
    <AssistStrip
      surfaceName={BACKLINKS_ASSIST_SURFACE}
      filter={siteFilter}
      className="hidden shrink-0 border-b border-border px-3 py-1.5 sm:block sm:px-4"
    />
  );
}
