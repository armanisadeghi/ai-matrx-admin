"use client";

/**
 * Products & services for one brand (PRODUCTS.md § 6 "The screen"): the offering tree by group, each row
 * Yes / No / Other (the standard DecisionControl, as Smart Add's slots), its quotes, links and source families in
 * the hover peek, the coverage verdict on one line, Refresh with its points first, and the run to watch.
 *
 * Live: while the brand's `smart_add_brand_offerings` run goes, the run is adopted (`useWorkflowRun`) and the rows
 * re-read each time a step lands. Admin + debug: every value fed to each AI call is published to the Builder
 * panel (one provision snapshot per call) beside the run.
 */

import { ProductPrice, asProductPrice } from "@/components/cost/ProductPrice";
import { useQuery } from "@tanstack/react-query";
import { listBrandAssets } from "@/features/marketing/data/service";
import { photosOf } from "@/features/marketing/photos/subject-photos";
import { SubjectPhotosDialog } from "@/features/marketing/photos/SubjectPhotosDialog";
import { useEffect, useState } from "react";
import {
  DecisionControl,
  Button,
  PropertyRow,
  type DecisionAnswer,
} from "@ai-matrx/design-system/controls";
import {
  ErrorNotice,
  Peek,
  PeekHoverCard,
  type PeekRecord,
} from "@ai-matrx/design-system";
import {
  MatrxDataTable,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import { formatCount } from "@ai-matrx/kit/format";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import {
  selectRunEmissions,
  selectRunStatus,
} from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { openWorkflowRunWindowAction } from "@/features/overlays/definitions/workflowRunWindow.overlay";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { getJson, postNdjson } from "@/lib/python-client";
import { CostDoor } from "@/components/cost/CostDoor";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import {
  clearDecision,
  fetchLatestOfferingsRun,
  fetchOfferingItems,
  fetchOfferingsVerdict,
  fetchRunSnapshots,
  keepFlaggedOffering,
  keepOffering,
  rejectOffering,
  type OfferingItem,
  type OfferingsRun,
  type OfferingsVerdict,
} from "./data";

const SURFACE = "marketing.brands.offerings";
const TERMINAL = new Set([
  "completed",
  "failed",
  "cancelled",
  "errored",
  "error",
]);
const FAMILY_LABEL: Record<string, string> = {
  own_site: "Own site",
  own_accounts: "Own accounts",
  owner_listing: "Owner listing",
  own_store_elsewhere: "Store elsewhere",
  third_party_voice: "Reviews and mentions",
  person: "A person",
};

interface Props {
  brand: { id: string; name: string; organizationId: string };
}

function withReferral(url: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("ref")) u.searchParams.set("ref", "aimatrx");
    return u.toString();
  } catch {
    return url;
  }
}

/** Repeated identical quotes (one page read many times) fold into one line with a count. */
function foldQuotes(
  item: OfferingItem,
): { text: string; detail: string; count: number }[] {
  const byText = new Map<
    string,
    { text: string; detail: string; count: number }
  >();
  for (const q of item.quotes) {
    if (!q.quote || q.addressOnly) continue;
    const text = q.quote.trim();
    const hit = byText.get(text);
    if (hit) hit.count += 1;
    else
      byText.set(text, {
        text,
        detail: FAMILY_LABEL[q.family] ?? q.family,
        count: 1,
      });
  }
  return [...byText.values()];
}

function linkOf(item: OfferingItem): string | null {
  return item.quotes.find((q) => q.url)?.url ?? null;
}

function peekOf(item: OfferingItem): PeekRecord {
  const quotes = foldQuotes(item).slice(0, 6);
  const link = linkOf(item);
  const kind = item.kind === "product" ? "Product" : "Service";
  return {
    kind,
    id: item.key,
    title: item.name,
    subtitle: `${kind} · ${CERTAINTY_LABEL[item.certainty]}`,
    body: [
      {
        property: "Sources",
        value:
          item.families.map((f) => FAMILY_LABEL[f] ?? f).join(", ") ||
          "Address only",
      },
      ...(item.priceText ? [{ property: "Price", value: asProductPrice(item.priceText) }] : []),
      ...(item.group ? [{ property: "Group", value: item.group }] : []),
      ...(quotes.length
        ? [
            {
              section: "Quotes",
              rows: quotes.map((q) => ({
                text: `“${q.text}”`,
                detail:
                  q.count > 1 ? `${q.detail} · ${q.count} times` : q.detail,
              })),
            },
          ]
        : []),
    ],
    ...(link ? { href: withReferral(link) } : {}),
  };
}

const CERTAINTY_LABEL: Record<OfferingItem["certainty"], string> = {
  confirmed: "Confirmed",
  likely: "Likely",
  possible: "Possible",
};

/** Light semantic color per certainty: confirmed green, likely primary, possible amber. */
const CERTAINTY_TONE: Record<OfferingItem["certainty"], string> = {
  confirmed: "bg-success/10 text-success-ink",
  likely: "bg-primary/10 text-primary-ink",
  possible: "bg-warning/10 text-warning-ink",
};

function groupOf(item: OfferingItem): string {
  return item.group ?? item.sourceGroups[0] ?? "Other";
}

function verdictLabel(verdict: OfferingsVerdict | null): string | null {
  return verdict?.verdict === "complete"
    ? "Complete"
    : verdict?.verdict === "more_exists"
      ? "More exists"
      : verdict?.verdict === "cant_tell"
        ? "Can't tell"
        : null;
}

function offeringColumns(
  onAnswer: (item: OfferingItem, a: DecisionAnswer | null) => void,
  photoCount: (item: OfferingItem) => number,
  onPhotos: (item: OfferingItem) => void,
): MatrxColumnDef<OfferingItem>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      label: "Name",
      width: 300,
      cell: (item) => (
        <PeekHoverCard
          trigger={
            <span
              className="block min-w-0 truncate"
              data-offering-key={item.key}
            >
              {item.name}
            </span>
          }
        >
          <Peek record={peekOf(item)} />
        </PeekHoverCard>
      ),
    },
    {
      id: "group",
      accessorFn: groupOf,
      header: "Group",
      label: "Group",
      width: 180,
    },
    {
      id: "kind",
      accessorFn: (item) => (item.kind === "product" ? "Product" : "Service"),
      header: "Kind",
      label: "Kind",
      width: 100,
      filter: "select",
    },
    {
      id: "price",
      accessorFn: (item) => item.priceText ?? "",
      header: "Price",
      label: "Price",
      width: 100,
      cell: (item) =>
        item.priceText ? (
          <ProductPrice className="tabular-nums">{item.priceText}</ProductPrice>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "photos",
      accessorFn: photoCount,
      header: "Photos",
      label: "Photos",
      width: 120,
      cell: (item) =>
        item.offeringId ? (
          <Button
            variant="quiet"
            data-offering-photos={item.offeringId}
            onClick={() => onPhotos(item)}
          >
            {photoCount(item) ? `${photoCount(item)} photo${photoCount(item) === 1 ? "" : "s"}` : "Add photos"}
          </Button>
        ) : (
          <span className="text-muted-foreground" title="Say Yes first: photos belong to a kept product">—</span>
        ),
    },
    {
      id: "sources",
      accessorFn: (item) => item.families.length,
      header: "Sources",
      label: "Sources",
      width: 90,
      cell: (item) => (
        <span
          className="tabular-nums"
          title={item.families.map((f) => FAMILY_LABEL[f] ?? f).join(", ")}
        >
          {item.families.length}
        </span>
      ),
    },
    {
      id: "certainty",
      accessorFn: (item) => CERTAINTY_LABEL[item.certainty],
      header: "Certainty",
      label: "Certainty",
      width: 110,
      filter: "select",
      cell: (item) => (
        <span
          className={`inline-flex rounded px-1.5 py-0.5 type-meta font-medium ${CERTAINTY_TONE[item.certainty]}`}
        >
          {CERTAINTY_LABEL[item.certainty]}
        </span>
      ),
    },
    {
      id: "decision",
      accessorFn: (item) =>
        item.status === "confirmed"
          ? "Yes"
          : item.status === "dismissed"
            ? "No"
            : "Not confirmed",
      header: "Is it theirs?",
      label: "Is it theirs?",
      helpText:
        "Yes keeps it as one of the brand's products or services; No removes it for good.",
      width: 230,
      filter: "select",
      cell: (item) => (
        <DecisionControl
          value={
            item.status === "confirmed"
              ? "yes"
              : item.status === "dismissed"
                ? "no"
                : null
          }
          onChange={(a) => onAnswer(item, a)}
          onSkip={() => onAnswer(item, null)}
          onClear={() => onAnswer(item, null)}
        />
      ),
    },
  ];
}

/** Rows a past defect may have wrongly added: name, why it needs a look, and Yes (keep) / No (not ours). */
function flaggedColumnsFor(
  onAnswer: (item: OfferingItem, a: DecisionAnswer | null) => void,
): MatrxColumnDef<OfferingItem>[] {
  const [nameCol] = offeringColumns(onAnswer);
  return [
    nameCol,
    {
      id: "reason",
      accessorFn: (item) => item.review?.reason ?? "",
      header: "Why",
      label: "Why",
      width: 420,
      cell: (item) => (
        <span className="block min-w-0 truncate" title={item.review?.reason}>
          {item.review?.reason}
        </span>
      ),
    },
    {
      id: "decision",
      accessorFn: () => "Open",
      header: "Is it theirs?",
      label: "Is it theirs?",
      helpText:
        "Yes keeps it as one of the brand's products or services; No retires it.",
      width: 230,
      cell: (item) => (
        <DecisionControl
          value={null}
          onChange={(a) => onAnswer(item, a)}
          onSkip={() => onAnswer(item, null)}
          onClear={() => onAnswer(item, null)}
        />
      ),
    },
  ];
}

/** The brand home's one-line Products & services summary; the list lives on its own page. */
export function BrandOfferingsSummary({ brand }: Props) {
  const [items, setItems] = useState<OfferingItem[] | null>(null);
  const [verdict, setVerdict] = useState<OfferingsVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([fetchOfferingItems(brand.id), fetchOfferingsVerdict(brand.id)])
      .then(([i, v]) => {
        if (!live) return;
        setItems(i);
        setVerdict(v);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, [brand.id]);
  if (error)
    return <ErrorNotice error={error} operation="Load products and services" />;
  const counts = new Map<string, number>();
  for (const it of items ?? [])
    counts.set(groupOf(it), (counts.get(groupOf(it)) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const confirmed = (items ?? []).filter(
    (i) => i.status === "confirmed" && !i.review,
  ).length;
  const needsLook = (items ?? []).filter((i) => i.review).length;
  const open = (items ?? []).filter((i) => i.status === "pending").length;
  const verdictText = verdictLabel(verdict);
  return (
    <div
      className="flex min-h-[74px] flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2"
      data-brand-offerings-summary={brand.id}
    >
      <div className="min-w-[7rem]">
        <PropertyRow
          label="Found"
          value={items ? formatCount(items.length) : "…"}
        />
      </div>
      <div className="min-w-[8rem]">
        <PropertyRow
          label="Confirmed"
          value={
            <span className="text-success-ink tabular-nums">
              {items ? formatCount(confirmed) : "…"}
            </span>
          }
        />
      </div>
      <div className="min-w-[8rem]">
        <PropertyRow
          label="To review"
          value={
            <span
              className={
                open ? "text-warning-ink tabular-nums" : "tabular-nums"
              }
            >
              {items ? formatCount(open) : "…"}
            </span>
          }
        />
      </div>
      {needsLook ? (
        <div className="min-w-[8rem]">
          <PropertyRow
            label="Needs a look"
            value={
              <span className="text-warning-ink tabular-nums">
                {formatCount(needsLook)}
              </span>
            }
          />
        </div>
      ) : null}
        <div className="min-w-[10rem]">
          <PropertyRow
            label="Top groups"
            value={
              <span className="flex min-h-6 flex-wrap gap-1">
                {top.map(([g, n]) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 rounded border border-border px-1.5 type-meta"
                  >
                    {g}{" "}
                    <span className="tabular-nums text-muted-foreground">
                      {n}
                    </span>
                  </span>
                ))}
                {top.length === 0 ? <span className="text-muted-foreground">{items ? "—" : "…"}</span> : null}
              </span>
            }
          />
        </div>
      {/* Coverage shows only once it is computed, last in the row, so its arrival moves nothing. */}
      {verdictText ? (
        <div className="min-w-[14rem]">
          <PropertyRow label="Coverage" value={verdictText} />
        </div>
      ) : null}
    </div>
  );
}

export function BrandOfferingsPanel({ brand }: Props) {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState<OfferingItem[] | null>(null);
  const [verdict, setVerdict] = useState<OfferingsVerdict | null>(null);
  const [run, setRun] = useState<OfferingsRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const runId = run?.id ?? null;
  useWorkflowRun(runId && !TERMINAL.has(run?.status ?? "") ? runId : null);
  const liveStatus = useAppSelector(selectRunStatus(runId ?? ""));
  const emissions = useAppSelector(selectRunEmissions(runId ?? ""));
  const builder = useBuilderFeed(SURFACE);
  const [photosFor, setPhotosFor] = useState<OfferingItem | null>(null);
  const brandAssets = useQuery({
    queryKey: ["marketing", "subject-photos", brand.id, "all"],
    queryFn: ({ signal }) => listBrandAssets(brand.id, signal),
  });
  const photoCounts = new Map<string, number>();
  for (const i of items ?? []) {
    if (!i.offeringId) continue;
    photoCounts.set(
      i.offeringId,
      photosOf(brandAssets.data ?? [], { brandId: brand.id, organizationId: brand.organizationId, kind: "offering", id: i.offeringId }).length,
    );
  }

  const load = async () => {
    try {
      const [i, v, r] = await Promise.all([
        fetchOfferingItems(brand.id),
        fetchOfferingsVerdict(brand.id),
        fetchLatestOfferingsRun(brand.id),
      ]);
      setItems(i);
      setVerdict(v);
      setRun((prev) =>
        prev && r && prev.id === r.id && !TERMINAL.has(r.status) ? prev : r,
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // First read, then again each time the watched run lands a step.
  useEffect(() => {
    let live = true;
    Promise.all([
      fetchOfferingItems(brand.id),
      fetchOfferingsVerdict(brand.id),
      fetchLatestOfferingsRun(brand.id),
    ])
      .then(([i, v, r]) => {
        if (!live) return;
        setItems(i);
        setVerdict(v);
        setRun((prev) =>
          prev && r && prev.id === r.id && !TERMINAL.has(r.status) ? prev : r,
        );
        setError(null);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, [brand.id, emissions.length, liveStatus]);

  // Admin + debug: the run and every AI call's exact inputs (one provision snapshot per call).
  useEffect(() => {
    if (!builder.isActive || !runId) return;
    void fetchRunSnapshots(runId).then((snaps) =>
      builder.publish(
        [
          {
            key: "offerings.run",
            label: "Products & services run",
            group: "workflow",
            data: run,
            ref: { type: "workflow_run", id: runId },
          },
          ...snaps.map((s, n) => ({
            key: `offerings.call.${s.id}`,
            label: `${n + 1}. ${s.label}`,
            group: "inputs" as const,
            data: { point: s.pointKey, snapshot: s.id },
            ref: { type: "provision_snapshot" as const, id: s.id },
          })),
          {
            key: "offerings.verdict",
            label: "Coverage verdict",
            group: "derived",
            data: verdict,
          },
        ],
        { prune: ["offerings.call."] },
      ),
    );
  }, [builder, runId, run, verdict, emissions.length]);

  const answerFlagged = async (item: OfferingItem, a: DecisionAnswer | null) => {
    if (a === null) return;
    try {
      // Yes clears the flag AND records the person's word (the one keep path), so the offering counts as confirmed.
      if (a === "yes") {
        await keepFlaggedOffering(item);
        await keepOffering(brand, item);
      } else await rejectOffering(brand, item);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const answer = async (item: OfferingItem, a: DecisionAnswer | null) => {
    try {
      if (a === "yes") await keepOffering(brand, item);
      else if (a === "no") await rejectOffering(brand, item);
      else await clearDecision(item);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const refresh = async () => {
    try {
      const { data: quote } = await getJson<{
        points: number;
        paid_sources: { source: string; points: number }[];
      }>(`/brand-offerings/${brand.id}/refresh/quote`);
      if (quote.points > 0) {
        const ok = await confirm({
          title: "Refresh products & services",
          description: (
            <>
              {quote.paid_sources.map((p) => p.source).join(", ")}.{" "}
              <CostDoor points={quote.points} prefix="up to " />
            </>
          ),
          confirmLabel: "Refresh",
        });
        if (!ok) return;
      }
      setRefreshing(true);
      for await (const ev of postNdjson(
        `/brand-offerings/${brand.id}/refresh`,
        { confirm_points: quote.points },
      )) {
        const data = (
          ev as { data?: { type?: string; follow_up_run_id?: string | null } }
        ).data;
        if (
          data?.type === "brand_offerings_refreshed" &&
          data.follow_up_run_id
        ) {
          setRun({
            id: data.follow_up_run_id,
            status: "running",
            createdAt: new Date().toISOString(),
          });
          dispatch(
            openWorkflowRunWindowAction({ runId: data.follow_up_run_id }),
          );
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  };

  const running = !!run && !TERMINAL.has(liveStatus ?? run.status);
  const verdictText = verdictLabel(verdict);
  const columns = offeringColumns(
    (i, a) => void answer(i, a),
    (i) => (i.offeringId ? (photoCounts.get(i.offeringId) ?? 0) : 0),
    (i) => setPhotosFor(i),
  );
  const flagged = (items ?? []).filter((i) => i.review);
  const flaggedColumns = flaggedColumnsFor((i, a) => void answerFlagged(i, a));

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      data-brand-offerings={brand.id}
    >
      <section className="rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="min-w-0">
            <PropertyRow
              label="Found"
              value={
                error ? "Not read" : items ? formatCount(items.length) : "…"
              }
            />
          </div>
          {verdictText ? (
            <div className="min-w-0">
              <PropertyRow
                label="Coverage"
                value={verdictText}
                {...(verdict?.line ? { help: verdict.line } : {})}
              />
            </div>
          ) : null}
          {verdict?.actions.length && verdict.verdict !== "complete" ? (
            <div className="min-w-0">
              <PropertyRow
                label="Next step"
                value={verdict.actions.join(" · ")}
              />
            </div>
          ) : null}
          <span className="flex-1" />
          {runId ? (
            <Button
              variant="quiet"
              onClick={() => dispatch(openWorkflowRunWindowAction({ runId }))}
            >
              {running ? "Watch it run" : "Last run"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => void refresh()}
            disabled={refreshing || running}
          >
            {running ? "Running" : "Refresh"}
          </Button>
        </div>
        {verdict?.scopeClaims.length ? (
          <div className="min-w-0">
            <PropertyRow
              label="The brand says"
              value={verdict.scopeClaims
                .slice(0, 3)
                .map((c) => `“${c.quote}”`)
                .join(" · ")}
            />
          </div>
        ) : null}
      </section>
      {flagged.length ? (
        <section
          className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3"
          data-offerings-needs-a-look={flagged.length}
        >
          <h3 className="type-title">
            Needs a look{" "}
            <span className="tabular-nums text-muted-foreground">
              {formatCount(flagged.length)}
            </span>
          </h3>
          <MatrxDataTable<OfferingItem>
            data={flagged}
            columns={flaggedColumns}
            getRowId={(item) => item.key}
            tableId="marketing.brand-offerings.needs-a-look"
            read={{ status: "ready", error: null, what: "products and services" }}
            defaultSort={{ id: "name", direction: "asc" }}
            searchText={(item) => `${item.name} ${item.review?.reason ?? ""}`}
            detail={{ enabled: false }}
            pageSize={25}
            emptyState={{ title: "Nothing needs a look" }}
          />
        </section>
      ) : null}
      {photosFor?.offeringId ? (
        <SubjectPhotosDialog
          open
          onOpenChange={(o) => !o && setPhotosFor(null)}
          name={photosFor.name}
          subject={{ brandId: brand.id, organizationId: brand.organizationId, kind: "offering", id: photosFor.offeringId }}
        />
      ) : null}
      <MatrxDataTable<OfferingItem>
        data={(items ?? []).filter((i) => !i.review)}
        columns={columns}
        getRowId={(item) => item.key}
        tableId="marketing.brand-offerings"
        read={{
          status: error ? "error" : items ? "ready" : "loading",
          error,
          onRetry: () => void load(),
          what: "products and services",
        }}
        isLoading={!items && !error}
        defaultSort={{ id: "name", direction: "asc" }}
        searchText={(item) =>
          `${item.name} ${groupOf(item)} ${item.priceText ?? ""}`
        }
        grouping={{
          columnId: "group",
          groupableColumnIds: ["group", "kind", "certainty", "decision"],
          order: "value-asc",
          rowNoun: "offering",
        }}
        detail={{ enabled: false }}
        pageSize={100}
        emptyState={{ title: "No products or services found yet" }}
      />
    </div>
  );
}
