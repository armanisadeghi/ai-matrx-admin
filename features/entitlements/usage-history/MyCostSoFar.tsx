"use client";

/**
 * "What my activity has cost" — Settings -> Plan & usage. ONE place for a person's own spend:
 * an all-time (or per-period) total, the breakdown by feature / organization / day, and the
 * individual charges behind any row. Reads `billing.my_cost_breakdown` / `billing.my_cost_records`,
 * which sum every cost the platform recorded for the person (AI tokens AND hard costs: social data,
 * web search, messages, scraping, files), not just what the plan meter charged. A platform admin
 * reads dollars to the cent with points beside; everyone else reads points (20,000 points = $1).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { Skeleton } from "@ai-matrx/design-system";
import { formatPoints } from "@ai-matrx/kit/format";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { SettingsSection } from "@/components/official/settings/layout/SettingsSection";
import { formatSpendUsd } from "@/components/cost/formatAdminCost";
import {
  fetchMyCostBreakdown,
  fetchMyCostRecords,
  periodFor,
  MY_COST_RECORDS_PAGE,
  type MyCostGroup,
  type MyCostGroupRow,
  type MyCostPeriod,
  type MyCostPeriodKey,
  type MyCostRecord,
} from "./myCostService";

const PERIODS: { key: Exclude<MyCostPeriodKey, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];
const GROUPS: { key: MyCostGroup; label: string }[] = [
  { key: "feature", label: "By activity" },
  { key: "organization", label: "By organization" },
  { key: "day", label: "By day" },
];

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const dayOnly = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

/** Dollars (admin only) with the points beside, smaller; members read points alone. */
function Money({ usd, points }: { usd: number | null; points: number }) {
  if (usd === null) return <span className="tabular-nums">{formatPoints(points)}</span>;
  return (
    <span className="tabular-nums">
      {formatSpendUsd(usd)} <span className="text-[0.7em] text-muted-foreground">{formatPoints(points)}</span>
    </span>
  );
}

export function MyCostSoFar() {
  const [period, setPeriod] = useState<MyCostPeriod>(() => periodFor("all"));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [group, setGroup] = useState<MyCostGroup>("feature");
  const [rows, setRows] = useState<MyCostGroupRow[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<MyCostGroupRow | null>(null);

  useEffect(() => {
    let live = true;
    setRows(null);
    setError(null);
    setSelected(null);
    void fetchMyCostBreakdown(period, group)
      .then((r) => live && setRows(r))
      .catch((e: unknown) => live && setError(e));
    return () => { live = false; };
  }, [period, group, retry]);

  const admin = rows?.some((r) => r.costUsd !== null) ?? false;
  const total = useMemo(() => {
    const r = rows ?? [];
    return {
      calls: r.reduce((a, x) => a + x.calls, 0),
      points: r.reduce((a, x) => a + x.points, 0),
      charged: r.reduce((a, x) => a + x.chargedPoints, 0),
      usd: admin ? r.reduce((a, x) => a + (x.costUsd ?? 0), 0) : null,
    };
  }, [rows, admin]);

  const applyCustom = () => {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    const to = customTo ? new Date(`${customTo}T00:00:00`) : null;
    if (to) to.setDate(to.getDate() + 1); // the end day is included
    setPeriod({ key: "custom", from: from?.toISOString() ?? null, to: to?.toISOString() ?? null });
  };

  const columns = useMemo<MatrxColumnDef<MyCostGroupRow>[]>(() => [
    { id: "label", header: group === "day" ? "Day" : group === "organization" ? "Organization" : "Activity", accessorFn: (r) => r.label, width: 240 },
    { id: "calls", header: "Charges", accessorFn: (r) => r.calls, filter: "number", width: 90, align: "right", cell: (r) => (
      <button type="button" className="tabular-nums underline-offset-2 hover:underline" aria-label={`Open the ${r.calls} charges for ${r.label}`} onClick={() => setSelected(r)}>{r.calls.toLocaleString()}</button>
    ) },
    { id: "cost", header: admin ? "Cost" : "Points used", accessorFn: (r) => r.costUsd ?? r.points, filter: "number", width: 190, align: "right", cell: (r) => <Money usd={r.costUsd} points={r.points} /> },
    { id: "charged", header: "Counted against plan", accessorFn: (r) => r.chargedPoints, filter: "number", width: 150, align: "right", mobileHidden: true, cell: (r) => formatPoints(r.chargedPoints) },
    { id: "first", header: "First", accessorFn: (r) => r.firstAt ?? "", width: 120, mobileHidden: true, cell: (r) => dayOnly(r.firstAt) },
    { id: "last", header: "Last", accessorFn: (r) => r.lastAt ?? "", width: 120, mobileHidden: true, cell: (r) => dayOnly(r.lastAt) },
  ], [group, admin, setSelected]);

  return (
    <SettingsSection title="What your activity has cost">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <Button key={p.key} variant={period.key === p.key ? "primary" : "outline"} onClick={() => setPeriod(periodFor(p.key))}>{p.label}</Button>
        ))}
        <Input type="date" aria-label="From date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} width="md" />
        <Input type="date" aria-label="To date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} width="md" />
        <Button variant={period.key === "custom" ? "primary" : "outline"} disabled={!customFrom && !customTo} onClick={applyCustom}>Custom range</Button>
      </div>

      {error ? (
        <p className="mt-3 flex items-center gap-1 type-body text-muted-foreground">
          We couldn’t load your costs.
          <ErrorAlchemyMenu error={error} operation="load my costs" />
          <Button className="ml-2" variant="outline" onClick={() => setRetry((v) => v + 1)}>Try again</Button>
        </p>
      ) : null}
      {!rows && !error ? <Skeleton className="mt-3 h-40 w-full rounded-md" aria-label="Loading your costs" /> : null}

      {rows ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-md border border-border p-3 sm:grid-cols-4" aria-label="Total">
            <div><div className="type-secondary text-muted-foreground">{admin ? "Total cost" : "Total points used"}</div><div className="text-lg font-semibold"><Money usd={total.usd} points={total.points} /></div></div>
            <div><div className="type-secondary text-muted-foreground">Counted against plan</div><div className="text-lg font-semibold tabular-nums">{formatPoints(total.charged)}</div></div>
            <div><div className="type-secondary text-muted-foreground">Charges</div><div className="text-lg font-semibold tabular-nums">{total.calls.toLocaleString()}</div></div>
            <div><div className="type-secondary text-muted-foreground">Period</div><div className="text-lg font-semibold">{PERIODS.find((p) => p.key === period.key)?.label ?? "Custom"}</div></div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Break down by">
            {GROUPS.map((g) => (
              <Button key={g.key} variant={group === g.key ? "primary" : "outline"} onClick={() => setGroup(g.key)}>{g.label}</Button>
            ))}
          </div>
          <div className="mt-2">
            <MatrxDataTable
              tableId="my-cost-breakdown"
              data={rows}
              columns={columns}
              getRowId={(r) => r.key}
              density="condensed"
              pageSize={50}
              defaultSort={{ id: "cost", direction: "desc" }}
              coverage={{ noun: "group", answeredBy: "client", loaded: rows.length, total: rows.length }}
              emptyState={{ title: "No costs in this period", description: "Nothing you ran in this period had a cost." }}
            />
          </div>
          <MyCostRecords period={period} group={group} selected={selected} admin={admin} onClear={() => setSelected(null)} />
        </>
      ) : null}
    </SettingsSection>
  );
}

function MyCostRecords({ period, group, selected, admin, onClear }: { period: MyCostPeriod; group: MyCostGroup; selected: MyCostGroupRow | null; admin: boolean; onClear: () => void }) {
  const [records, setRecords] = useState<MyCostRecord[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const filter = useMemo(() => {
    if (!selected) return {};
    if (group === "feature") return { feature: selected.key };
    if (group === "organization") return { organizationId: selected.key || null };
    return {};
  }, [group, selected]);

  // A day has no server filter of its own: its window is the day itself.
  const effective = useMemo<MyCostPeriod>(() => {
    if (group === "day" && selected) {
      const start = new Date(`${selected.key}T00:00:00Z`);
      const end = new Date(start.getTime() + 86_400_000);
      return { key: "custom", from: start.toISOString(), to: end.toISOString() };
    }
    return period;
  }, [group, selected, period]);

  const load = useCallback(async (before: MyCostRecord | null) => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchMyCostRecords(effective, { ...filter, before: before ? { at: before.createdAt, id: before.id } : null });
      setRecords((prev) => (before ? [...prev, ...page] : page));
      setMore(page.length === MY_COST_RECORDS_PAGE);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [effective, filter]);

  useEffect(() => { void load(null); }, [load]);

  const columns = useMemo<MatrxColumnDef<MyCostRecord>[]>(() => [
    { id: "at", header: "When", accessorFn: (r) => r.createdAt, filter: "date", width: 170, cell: (r) => when(r.createdAt) },
    { id: "activity", header: "Activity", accessorFn: (r) => r.featureLabel, filter: "select", width: 200 },
    { id: "detail", header: "What", accessorFn: (r) => r.detail, width: 260, mobileHidden: true },
    { id: "org", header: "Organization", accessorFn: (r) => r.organizationName ?? "—", filter: "select", width: 180, mobileHidden: true },
    { id: "cost", header: admin ? "Cost" : "Points used", accessorFn: (r) => r.costUsd ?? r.points, filter: "number", width: 190, align: "right", cell: (r) => <Money usd={r.costUsd} points={r.points} /> },
    { id: "charged", header: "Counted against plan", accessorFn: (r) => r.chargedPoints, filter: "number", width: 150, align: "right", mobileHidden: true, cell: (r) => formatPoints(r.chargedPoints) },
  ], [admin]);

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="type-secondary font-medium text-muted-foreground">{selected ? `Charges: ${selected.label}` : "Every charge, newest first"}</span>
        {selected ? <Button variant="outline" onClick={onClear}>Show all</Button> : null}
      </div>
      {error ? (
        <p className="flex items-center gap-1 type-body text-muted-foreground">We couldn’t load the charges.<ErrorAlchemyMenu error={error} operation="load my charges" /></p>
      ) : (
        <MatrxDataTable
          tableId="my-cost-records"
          data={records}
          columns={columns}
          getRowId={(r) => r.id}
          isLoading={loading && records.length === 0}
          density="condensed"
          pageSize={50}
          defaultSort={{ id: "at", direction: "desc" }}
          coverage={{ noun: "charge", answeredBy: "client", loaded: records.length, total: more ? undefined : records.length }}
          emptyState={{ title: "No charges here", description: "Nothing in this selection had a cost." }}
        />
      )}
      {more ? (
        <div className="mt-2 flex justify-center">
          <Button variant="outline" disabled={loading} onClick={() => void load(records.at(-1) ?? null)}>Load more</Button>
        </div>
      ) : null}
    </div>
  );
}
