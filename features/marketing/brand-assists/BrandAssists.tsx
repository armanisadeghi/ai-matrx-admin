"use client";

/**
 * Brand assists on a brand's home (Smart Add VISION Part 24): the producer and the results.
 *
 * Producer — on mount, reads the brand's ranked offers (aidream GET /brand-assists/{id}/offers: pre-filled,
 * exact cost) and my `brand.assist.*` history, drops what I declined or already ran, and emits the best ones
 * through the ONE door (`emitAssistTracked`). That door refuses past the producer policy's pending budget
 * (`brand.assist.`, max 3 across every brand) and while assists are quiet, so emitting stops at the first null.
 * Nothing runs here: a chip only runs from its card's verb button (THE INTENTIONAL-ACTION LAW).
 *
 * Results — every brand assist I ran for this brand, from its ledger receipt, so the result stays visible
 * after the chip is gone. The data itself lives in its normal home (named on each row).
 */
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AssistStrip } from "@/features/assists/components/AssistStrip";
import { selectAssistsForSurface } from "@/features/assists/redux/assistsSlice";
import { emitAssistTracked } from "@/features/assists/redux/emitTracked";
import { listMyAssistsBySourcePrefix } from "@/features/assists/service";
import { assistPriority, type Assist } from "@/features/assists/types";
import type { BrandAssistRunResult } from "@/features/assists/runtime/handlers/brand-assist";
import { callApi } from "@/lib/api/call-api";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  BRAND_ASSIST_SOURCE_PREFIX,
  BRAND_ASSIST_SURFACE,
  brandAssistDedupeKey,
  brandAssistSourceKey,
  costLine,
  offersToEmit,
  type BrandAssistOffers,
} from "./select-offers";

function isRunResult(value: unknown): value is BrandAssistRunResult {
  return Boolean(value && typeof value === "object" && typeof (value as { summary?: unknown }).summary === "string");
}

export function BrandAssists({ brandId, organizationId }: { brandId: string; organizationId: string }) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const [history, setHistory] = useState<Assist[]>([]);
  // This brand's pending chips. When one leaves the stack (run, declined, snoozed — `assistDecided` fires
  // after the ledger write) the receipt is new, so the results re-read without a page reload.
  const pendingHere = useAppSelector((state) =>
    selectAssistsForSurface(state, BRAND_ASSIST_SURFACE).filter((a) => a.entityId === brandId).length,
  );
  const lastPending = useRef<number | null>(null);

  useEffect(() => {
    const before = lastPending.current;
    lastPending.current = pendingHere;
    if (!userId || before === null || pendingHere >= before) return;
    let cancelled = false;
    void listMyAssistsBySourcePrefix(userId, BRAND_ASSIST_SOURCE_PREFIX)
      .then((mine) => {
        if (!cancelled) setHistory(mine);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pendingHere, userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const offers = await dispatch(
        callApi({
          // New door 2026-10-16 (aidream api/routers/brand_assists.py); not in the published api-types yet.
          path: "/brand-assists/{brand_id}/offers" as never,
          method: "GET",
          pathParams: { brand_id: brandId } as never,
          scopeOverrides: { organization_id: organizationId },
        }),
      );
      const mine = await listMyAssistsBySourcePrefix(userId, BRAND_ASSIST_SOURCE_PREFIX).catch(() => []);
      if (cancelled) return;
      setHistory(mine);
      if (offers.error || !offers.data) return;
      const data = offers.data as unknown as BrandAssistOffers;
      for (const offer of offersToEmit(data, mine)) {
        const cost = costLine(offer);
        const id = await emitAssistTracked(
          userId,
          {
            sourceKey: brandAssistSourceKey(offer.assist_id),
            sourceKind: "deterministic",
            title: offer.title,
            body: `${offer.body}\n\n**${cost}** · about 30 seconds`,
            action: {
              kind: "brand_assist",
              brandId,
              assistId: offer.assist_id,
              label: offer.verb,
              costPoints: offer.cost_points,
              costUsd: offer.cost_usd,
              lands: offer.lands,
            },
            surfaceName: BRAND_ASSIST_SURFACE,
            entityType: "web_brand",
            entityId: brandId,
            dedupeKey: brandAssistDedupeKey(offer.assist_id, brandId),
            priority: assistPriority("normal", Math.min(9, Math.round(offer.rank / 2))),
            confidence: 0.9,
          },
          dispatch,
        );
        // The door said no (budget of 3 reached, or assists are quiet): stop — never push past it.
        if (!id || cancelled) break;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, organizationId, userId, dispatch]);

  const results = history.filter(
    (row) => row.entityId === brandId && row.status === "accepted" && isRunResult(row.result),
  );

  return (
    <div className="flex flex-col gap-2" data-testid="brand-assists">
      <AssistStrip surfaceName={BRAND_ASSIST_SURFACE} filter={(a) => a.entityId === brandId} />
      {results.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2" data-testid="brand-assist-results">
          {results.slice(0, 4).map((row) => {
            const result = row.result as unknown as BrandAssistRunResult;
            return (
              <div key={row.id} className="rounded-lg border border-border bg-card p-2.5">
                <div className="text-sm font-medium text-foreground">{result.summary}</div>
                {result.items.slice(0, 5).map((item, i) => (
                  <div key={`${item.label}-${i}`} className="flex h-6 min-w-0 items-center gap-2 text-xs">
                    <span className="shrink-0 text-muted-foreground">{item.label}</span>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noreferrer" className="truncate text-foreground hover:underline">
                        {item.value}
                      </a>
                    ) : (
                      <span className="truncate text-foreground">{item.value}</span>
                    )}
                    {item.detail ? <span className="truncate text-muted-foreground">{item.detail}</span> : null}
                  </div>
                ))}
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">Saved to {result.lands}</span>
                  {result.review_href ? (
                    <a href={result.review_href} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-foreground hover:underline">
                      Review <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
