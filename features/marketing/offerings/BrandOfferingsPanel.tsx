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

import { useEffect, useState } from "react";
import { DecisionControl, Button, PropertyRow, type DecisionAnswer } from "@ai-matrx/design-system/controls";
import { ErrorNotice, Peek, PeekHoverCard, type PeekRecord } from "@ai-matrx/design-system";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatCount } from "@ai-matrx/kit/format";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import { selectRunEmissions, selectRunStatus } from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { openWorkflowRunWindowAction } from "@/features/overlays/openers/workflowRunWindow";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { getJson, postNdjson } from "@/lib/python-client";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import {
  clearDecision,
  fetchLatestOfferingsRun,
  fetchOfferingItems,
  fetchOfferingsVerdict,
  fetchRunSnapshots,
  keepOffering,
  rejectOffering,
  type OfferingItem,
  type OfferingsRun,
  type OfferingsVerdict,
} from "./data";

const SURFACE = "marketing.brands.offerings";
const TERMINAL = new Set(["completed", "failed", "cancelled", "errored", "error"]);
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

function peekOf(item: OfferingItem): PeekRecord {
  const quotes = item.quotes.filter((q) => q.quote && !q.addressOnly).slice(0, 6);
  const facts = [
    `Sources: ${item.families.map((f) => FAMILY_LABEL[f] ?? f).join(", ") || "address only"}`,
    ...(item.priceText ? [`Price: ${item.priceText}`] : []),
    ...(item.group ? [`Group: ${item.group}`] : []),
    ...quotes.map((q) => `${FAMILY_LABEL[q.family] ?? q.family}: “${q.quote}”`),
  ];
  return {
    kind: item.kind === "product" ? "Product" : "Service",
    id: item.key,
    title: item.name,
    subtitle: `${item.kind === "product" ? "Product" : "Service"} · ${item.certainty}`,
    body: facts.map((fact) => ({ fact })),
  };
}

function OfferingRow({ item, onAnswer }: { item: OfferingItem; onAnswer: (item: OfferingItem, a: DecisionAnswer | null) => void }) {
  const link = item.quotes.find((q) => q.url)?.url ?? null;
  const value: DecisionAnswer | null = item.status === "confirmed" ? "yes" : item.status === "dismissed" ? "no" : null;
  return (
    <div className="flex min-w-0 items-center gap-2 py-1" data-offering-key={item.key}>
      <PeekHoverCard trigger={<span className="min-w-0 flex-1 truncate type-body">{item.name}</span>}>
        <Peek record={peekOf(item)} />
      </PeekHoverCard>
      <span className="shrink-0 type-caption text-muted-foreground">
        {item.kind === "product" ? "Product" : "Service"}
        {item.priceText ? ` · ${item.priceText}` : ""} · {item.families.length || 0} source
        {item.families.length === 1 ? "" : "s"} · {item.certainty}
      </span>
      {link ? (
        <OutboundLink href={withReferral(link)} target="_blank" rel="noopener" className="shrink-0 type-caption">
          Open
        </OutboundLink>
      ) : null}
      <DecisionControl
        value={value}
        onChange={(a) => onAnswer(item, a)}
        onSkip={() => onAnswer(item, null)}
        onClear={() => onAnswer(item, null)}
      />
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

  const load = async () => {
    try {
      const [i, v, r] = await Promise.all([
        fetchOfferingItems(brand.id),
        fetchOfferingsVerdict(brand.id),
        fetchLatestOfferingsRun(brand.id),
      ]);
      setItems(i);
      setVerdict(v);
      setRun((prev) => (prev && r && prev.id === r.id && !TERMINAL.has(r.status) ? prev : r));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // First read, then again each time the watched run lands a step.
  useEffect(() => {
    let live = true;
    Promise.all([fetchOfferingItems(brand.id), fetchOfferingsVerdict(brand.id), fetchLatestOfferingsRun(brand.id)])
      .then(([i, v, r]) => {
        if (!live) return;
        setItems(i);
        setVerdict(v);
        setRun((prev) => (prev && r && prev.id === r.id && !TERMINAL.has(r.status) ? prev : r));
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
          { key: "offerings.run", label: "Products & services run", group: "workflow", data: run, ref: { type: "workflow_run", id: runId } },
          ...snaps.map((s, n) => ({
            key: `offerings.call.${s.id}`,
            label: `${n + 1}. ${s.label}`,
            group: "inputs" as const,
            data: { point: s.pointKey, snapshot: s.id },
            ref: { type: "provision_snapshot" as const, id: s.id },
          })),
          { key: "offerings.verdict", label: "Coverage verdict", group: "derived", data: verdict },
        ],
        { prune: ["offerings.call."] },
      ),
    );
  }, [builder, runId, run, verdict, emissions.length]);

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
      const { data: quote } = await getJson<{ points: number; paid_sources: { source: string; points: number }[] }>(
        `/brand-offerings/${brand.id}/refresh/quote`,
      );
      if (quote.points > 0) {
        const ok = await confirm({
          title: "Refresh products & services",
          description: `Up to ${formatCount(quote.points)} points: ${quote.paid_sources.map((p) => p.source).join(", ")}.`,
          confirmLabel: `Spend up to ${formatCount(quote.points)} points`,
        });
        if (!ok) return;
      }
      setRefreshing(true);
      for await (const ev of postNdjson(`/brand-offerings/${brand.id}/refresh`, { confirm_points: quote.points })) {
        const data = (ev as { data?: { type?: string; follow_up_run_id?: string | null } }).data;
        if (data?.type === "brand_offerings_refreshed" && data.follow_up_run_id) {
          setRun({ id: data.follow_up_run_id, status: "running", createdAt: new Date().toISOString() });
          dispatch(openWorkflowRunWindowAction({ runId: data.follow_up_run_id }));
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  };

  const running = !!run && !TERMINAL.has(liveStatus ?? run.status);
  const groups = new Map<string, OfferingItem[]>();
  for (const it of items ?? []) {
    const g = it.group ?? it.sourceGroups[0] ?? "Other";
    groups.set(g, [...(groups.get(g) ?? []), it]);
  }
  const ordered = [...groups.entries()].sort((a, b) => (a[0] === "Other" ? 1 : b[0] === "Other" ? -1 : a[0].localeCompare(b[0])));
  const verdictText =
    verdict?.verdict === "complete" ? "Complete" : verdict?.verdict === "more_exists" ? "More exists" : verdict?.verdict === "cant_tell" ? "Can't tell" : null;

  return (
    <div className="flex min-w-0 flex-col gap-3" data-brand-offerings={brand.id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label">{error ? "Not read" : items ? `${items.length} found` : "Loading"}</span>
        {verdictText ? (
          <span className="type-caption text-muted-foreground">
            {verdictText}
            {verdict?.line ? ` · ${verdict.line}` : ""}
          </span>
        ) : null}
        <span className="flex-1" />
        {runId ? (
          <Button variant="quiet" onClick={() => dispatch(openWorkflowRunWindowAction({ runId }))}>
            {running ? "Watch it run" : "Last run"}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => void refresh()} disabled={refreshing || running}>
          {running ? "Running" : "Refresh"}
        </Button>
      </div>
      {verdict?.actions.length && verdict.verdict !== "complete" ? (
        <PropertyRow label="Next step" value={verdict.actions.join(" · ")} />
      ) : null}
      {verdict?.scopeClaims.length ? (
        <PropertyRow
          label="The brand says"
          value={verdict.scopeClaims.slice(0, 3).map((c) => `“${c.quote}”`).join(" · ")}
        />
      ) : null}
      {error ? <ErrorNotice error={error} operation="Load products and services" /> : null}
      {ordered.map(([group, rows]) => (
        <details key={group} open className="min-w-0">
          <summary className="type-label" data-clickable="">
            {group} <span className="text-muted-foreground">{rows.length}</span>
          </summary>
          <div className="flex min-w-0 flex-col pl-3">
            {rows.map((it) => (
              <OfferingRow key={it.key} item={it} onAnswer={(i, a) => void answer(i, a)} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
