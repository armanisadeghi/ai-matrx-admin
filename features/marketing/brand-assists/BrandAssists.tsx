"use client";

/**
 * Brand assists on a brand's home (Smart Add VISION Part 24): the producer and the results.
 *
 * Producer — on mount, reads the brand's ranked offers (aidream GET /brand-assists/{id}/offers: pre-filled;
 * the server ranks by cost, the card never shows it) and my `brand.assist.*` history, drops what I declined or already ran, and emits the best ones
 * through the ONE door (`emitAssistTracked`). That door refuses past the producer policy's pending budget
 * (`brand.assist.`, max 3 across every brand) and while assists are quiet, so emitting stops at the first null.
 * Nothing runs here: a chip only runs from its card's verb button (THE INTENTIONAL-ACTION LAW).
 *
 * Results — every brand assist I ran for this brand, from its ledger receipt, so the result stays visible
 * after the chip is gone. The data itself lives in its normal home (named on each row).
 *
 * Placement (Arman, 2026-10-21): offers and results never take the page's premium top space. They share ONE
 * compact, foldable "Discoveries" card low on the Overview, one at a time with previous / next.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
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
  isRetiredBrandAssist,
  brandAssistSourceKey,
  offersToEmit,
  type BrandAssistOffers,
} from "./select-offers";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

function isRunResult(value: unknown): value is BrandAssistRunResult {
  return Boolean(value && typeof value === "object" && typeof (value as { summary?: unknown }).summary === "string");
}

export function BrandAssists({ brandId, organizationId }: { brandId: string; organizationId: string }) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const [history, setHistory] = useState<Assist[]>([]);
  // This brand's pending chips. When one leaves the stack (run, declined, snoozed — `assistDecided` fires
  // after the ledger write) the receipt is new, so the results re-read without a page reload.
  const surfaceAssists = useAppSelector((state) => selectAssistsForSurface(state, BRAND_ASSIST_SURFACE));
  const pendingHere = surfaceAssists.filter((a) => a.entityId === brandId).length;
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
        const id = await emitAssistTracked(
          userId,
          {
            sourceKey: brandAssistSourceKey(offer.assist_id),
            sourceKind: "deterministic",
            title: offer.title,
            body: offer.body,
            action: {
              kind: "brand_assist",
              brandId,
              assistId: offer.assist_id,
              label: offer.verb,
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

  // One card per job: a job run twice shows its latest receipt only (history arrives newest first).
  const seenJobs = new Set<string>();
  const results = history.filter((row) => {
    if (row.entityId !== brandId || row.status !== "accepted" || !isRunResult(row.result)) return false;
    if (isRetiredBrandAssist(row.sourceKey)) return false;
    const job = (row.result as BrandAssistRunResult).assist_id ?? row.id;
    if (seenJobs.has(job)) return false;
    seenJobs.add(job);
    return true;
  });
  const pending = surfaceAssists.filter((a) => a.entityId === brandId && !isRetiredBrandAssist(a.sourceKey));
  const items: Discovery[] = [
    ...pending.map((assist): Discovery => ({ kind: "offer", id: assist.id, assist })),
    ...results.map((row): Discovery => ({ kind: "result", id: row.id, result: row.result as unknown as BrandAssistRunResult })),
  ];
  const [index, setIndex] = useState(0);
  const at = items.length ? Math.min(index, items.length - 1) : 0;
  const current = items[at] ?? null;

  return (
    <>
      {/* Hydrates the assists ledger and renders the current offer's chip (verb / Not now); nothing else. */}
      <div className="hidden">
        <AssistStrip surfaceName={BRAND_ASSIST_SURFACE} filter={() => false} />
      </div>
      {current ? (
        <SectionCard
          title="Discoveries"
          anchor="overview-discoveries"
          collapsible
          about="Small jobs we can run for this brand and what they found. One at a time; nothing runs without your click."
          headerExtra={
            items.length > 1 ? (
              <span className="flex items-center gap-0.5">
                <Button variant="quiet" icon={<ChevronLeft />} aria-label="Previous discovery" title="Previous" disabled={at === 0} onClick={() => setIndex(at - 1)} />
                <span className="type-meta tabular-nums text-muted-foreground">
                  {at + 1} of {items.length}
                </span>
                <Button variant="quiet" icon={<ChevronRight />} aria-label="Next discovery" title="Next" disabled={at >= items.length - 1} onClick={() => setIndex(at + 1)} />
              </span>
            ) : undefined
          }
        >
          {/* On a phone the action sits under the text, so the title is never cut to one word. */}
          <div className="flex min-h-[60px] flex-col items-stretch gap-x-3 gap-y-1.5 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center" data-testid="brand-assists">
            {current.kind === "offer" ? (
              <>
                {/* The chip carries the title; the line beside it says only what it does. */}
                {current.assist.body ? (
                  <span className="min-w-0 flex-1 type-meta text-muted-foreground sm:truncate">{current.assist.body}</span>
                ) : (
                  <span className="hidden flex-1 sm:block" />
                )}
                <AssistStrip surfaceName={BRAND_ASSIST_SURFACE} filter={(a) => a.id === current.id} />
              </>
            ) : (
              <ResultLine result={current.result} />
            )}
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}

type Discovery =
  | { kind: "offer"; id: string; assist: Assist }
  | { kind: "result"; id: string; result: BrandAssistRunResult };

/** One finished job: its summary, colors as swatches (never hex lists), other items as short text, and Review. */
function ResultLine({ result }: { result: BrandAssistRunResult }) {
  const colors = result.items.filter((item) => item.label === "Color" && /^#[0-9a-f]{3,8}$/i.test(item.value));
  const others = result.items.filter((item) => !colors.includes(item)).slice(0, 3);
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate type-title text-foreground">{result.summary}</span>
        {others.length ? (
          <span className="block truncate type-meta text-muted-foreground">
            {others.map((item) => item.value).join(" · ")}
          </span>
        ) : null}
      </span>
      {colors.length ? (
        <span className="flex shrink-0 items-center -space-x-1" aria-label={`${colors.length} colors`}>
          {colors.slice(0, 6).map((item, i) => (
            // ui-exception: a swatch renders the brand's own color value
            <span key={`${item.value}-${i}`} className="size-6 rounded-full border-2 border-card" style={{ background: item.value }} title={item.value} />
          ))}
        </span>
      ) : null}
      {result.review_href ? (
        <Button asChild variant="outline" icon={<ExternalLink />}>
          <OutboundLink href={result.review_href}>Review</OutboundLink>
        </Button>
      ) : null}
    </>
  );
}
