"use client";

/**
 * "What your activity has cost" — Settings -> Plan & usage. ONE place for a person's own spend:
 * a summary row (all time · this month · today), a period switcher, an organization filter, and a
 * table you drill: activity -> what it was -> each individual charge (a conversation charge opens
 * the conversation). Reads `billing.my_cost_breakdown` / `billing.my_cost_records`, which sum every
 * cost the platform recorded for the person (AI tokens AND hard costs: social data, web search,
 * messages, scraping, files), not just what the plan meter charged. An admin person reads dollars
 * to the cent with points beside; everyone else reads points (20,000 points = $1).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { Skeleton } from "@ai-matrx/design-system";
import { formatPoints } from "@ai-matrx/kit/format";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { NO_DRILL, chargeLink, costDisplay, dayWindow, drillInto, levelFor, type MyCostDrill, type MyCostTab } from "./myCostShaping";

const PERIODS: { key: Exclude<MyCostPeriodKey, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];
const TABS: { key: MyCostTab; label: string }[] = [
  { key: "feature", label: "By activity" },
  { key: "organization", label: "By organization" },
  { key: "day", label: "By day" },
];
const ALL_ORGS = "__all__";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const dayOnly = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

/** Dollars (admin only) with the points beside, smaller; members read points alone. */
function Money({ usd, points, big }: { usd: number | null; points: number; big?: boolean }) {
  const d = costDisplay(usd, points);
  if (d.primary === "points") return <span className="tabular-nums">{formatPoints(points)}</span>;
  return (
    <span className="tabular-nums">
      {formatSpendUsd(d.usd)} <span className={big ? "text-xs text-muted-foreground" : "text-[0.7em] text-muted-foreground"}>{formatPoints(points)}</span>
    </span>
  );
}


function sumRows(rows: MyCostGroupRow[] | null) {
  const r = rows ?? [];
  return {
    calls: r.reduce((a, x) => a + x.calls, 0),
    points: r.reduce((a, x) => a + x.points, 0),
    charged: r.reduce((a, x) => a + x.chargedPoints, 0),
    usd: r.some((x) => x.costUsd !== null) ? r.reduce((a, x) => a + (x.costUsd ?? 0), 0) : null,
  };
}

export function MyCostSoFar() {
  const [period, setPeriod] = useState<MyCostPeriod>(() => periodFor("month"));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [tab, setTab] = useState<MyCostTab>("feature");
  const [org, setOrg] = useState<{ id: string; label: string } | null>(null);
  const [drill, setDrill] = useState<MyCostDrill>(NO_DRILL);
  const [unattributed, setUnattributed] = useState(false);
  const [unattr, setUnattr] = useState<MyCostGroupRow[] | null>(null);
  const [orgOptions, setOrgOptions] = useState<MyCostGroupRow[]>([]);
  const [summary, setSummary] = useState<Record<"all" | "month" | "today", MyCostGroupRow[] | null>>({ all: null, month: null, today: null });
  const [rows, setRows] = useState<MyCostGroupRow[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);

  const orgId = org?.id ?? null;
  const admin = (summary.all ?? []).some((x) => x.costUsd !== null);
  const level: MyCostGroup = levelFor(tab, drill);

  // Summary row + organization options: always the whole picture for the chosen organization.
  useEffect(() => {
    let live = true;
    setError(null);
    const scope = { organizationId: orgId };
    const keys = ["all", "month", "today"] as const;
    const periods = { all: periodFor("all"), month: periodFor("month"), today: periodFor("today") };
    void Promise.all(keys.map((k) => fetchMyCostBreakdown(periods[k], "feature", scope)))
      .then((res) => live && setSummary({ all: res[0], month: res[1], today: res[2] }))
      .catch((e: unknown) => live && setError(e));
    return () => { live = false; };
  }, [orgId, retry]);
  useEffect(() => {
    let live = true;
    void fetchMyCostBreakdown(periodFor("all"), "organization").then((r) => live && setOrgOptions(r)).catch(() => undefined);
    return () => { live = false; };
  }, [retry]);

  // Admin only: costs with no person on them, so the totals reconcile (the door refuses everyone else).
  useEffect(() => {
    if (!admin) { setUnattr(null); return; }
    let live = true;
    // The same window and filter as the charges listed below it, so the card and the list agree.
    const window: MyCostPeriod = drill.day ? { key: "custom", ...dayWindow(drill.day) } : period;
    void fetchMyCostBreakdown(window, drill.feature ? "activity" : "feature", { scope: "unattributed", feature: drill.feature?.key ?? null })
      .then((r) => live && setUnattr(drill.activity ? r.filter((x) => x.key === drill.activity?.key) : r))
      .catch(() => live && setUnattr(null));
    return () => { live = false; };
  }, [admin, period, drill, retry]);

  // The table for the current level.
  useEffect(() => {
    let live = true;
    setRows(null);
    void fetchMyCostBreakdown(period, level, { organizationId: orgId, feature: drill.feature?.key ?? null })
      .then((r) => live && setRows(r))
      .catch((e: unknown) => live && setError(e));
    return () => { live = false; };
  }, [period, level, orgId, drill.feature, retry]);

  const total = useMemo(() => sumRows(rows), [rows]);
  const showUnattr = Boolean(admin && unattr && unattr.length > 0);
  const unattributedOn = unattributed && showUnattr;
  // How many charges the selection holds, from the same grouped read the table above uses.
  const knownTotal = unattributedOn
    ? sumRows(unattr).calls
    : !rows ? null
    : drill.activity ? rows.find((r) => r.key === drill.activity?.key)?.calls ?? null
    : drill.day ? rows.find((r) => r.key === drill.day)?.calls ?? null
    : total.calls;

  const choosePeriod = (p: MyCostPeriod) => { setPeriod(p); setDrill(NO_DRILL); };
  const applyCustom = () => {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    const to = customTo ? new Date(`${customTo}T00:00:00`) : null;
    if (to) to.setDate(to.getDate() + 1);
    choosePeriod({ key: "custom", from: from?.toISOString() ?? null, to: to?.toISOString() ?? null });
  };
  const open = useCallback((r: MyCostGroupRow) => {
    const next = drillInto(tab, drill, r);
    if (next.organization) setOrg(next.organization);
    setTab(next.tab);
    setDrill(next.drill);
  }, [tab, drill]);

  const columns = useMemo<MatrxColumnDef<MyCostGroupRow>[]>(() => [
    { id: "label", header: level === "day" ? "Day" : level === "organization" ? "Organization" : level === "activity" ? "What it was" : "Activity", accessorFn: (r) => r.label, width: 150 },
    { id: "calls", header: "Charges", accessorFn: (r) => r.calls, filter: "number", width: 70, align: "right", cell: (r) => (
      <button type="button" className="tabular-nums underline-offset-2 hover:underline" aria-label={`Open the ${r.calls} charges for ${r.label}`} onClick={() => open(r)}>{r.calls.toLocaleString()}</button>
    ) },
    { id: "cost", header: admin ? "Cost" : "Points used", accessorFn: (r) => r.costUsd ?? r.points, filter: "number", width: 150, align: "right", cell: (r) => <Money usd={r.costUsd} points={r.points} /> },
    { id: "charged", header: "Counted against plan", accessorFn: (r) => r.chargedPoints, filter: "number", width: 150, align: "right", mobileHidden: true, cell: (r) => formatPoints(r.chargedPoints) },
    { id: "first", header: "First", accessorFn: (r) => r.firstAt ?? "", width: 120, mobileHidden: true, cell: (r) => dayOnly(r.firstAt) },
    { id: "last", header: "Last", accessorFn: (r) => r.lastAt ?? "", width: 120, mobileHidden: true, cell: (r) => dayOnly(r.lastAt) },
  ], [level, admin, open]);

  const crumbs: { label: string; onClick: () => void }[] = [
    { label: "All activity", onClick: () => setDrill(NO_DRILL) },
    ...(drill.feature ? [{ label: drill.feature.label, onClick: () => setDrill({ feature: drill.feature, activity: null, day: null }) }] : []),
    ...(drill.activity ? [{ label: drill.activity.label, onClick: () => undefined }] : []),
    ...(drill.day ? [{ label: drill.day.slice(0, 10), onClick: () => undefined }] : []),
  ];
  const periodLabel = period.key === "custom" ? "Custom range" : PERIODS.find((p) => p.key === period.key)?.label ?? "";

  return (
    <SettingsSection title="What your activity has cost">
      {error ? (
        <p className="flex items-center gap-1 type-body text-muted-foreground">
          We couldn’t load your costs.
          <ErrorAlchemyMenu error={error} operation="load my costs" />
          <Button className="ml-2" variant="outline" onClick={() => { setError(null); setRetry((v) => v + 1); }}>Try again</Button>
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2" aria-label="Summary">
        {([["all", "All time"], ["month", "This month"], ["today", "Today"]] as const).map(([k, label]) => {
          const t = sumRows(summary[k]);
          const active = period.key === k;
          return (
            <button key={k} type="button" onClick={() => choosePeriod(periodFor(k))}
              className={`rounded-md border p-2 text-left sm:p-3 ${active ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="type-secondary text-muted-foreground">{label}</div>
              {summary[k] ? (
                <>
                  <div className="text-base font-semibold sm:text-xl"><Money usd={t.usd} points={t.points} big /></div>
                  <div className="type-secondary text-muted-foreground">{t.calls.toLocaleString()} charges</div>
                </>
              ) : <Skeleton className="mt-1 h-8 w-full" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Period and organization">
        {PERIODS.map((p) => (
          <Button key={p.key} variant={period.key === p.key ? "primary" : "outline"} onClick={() => choosePeriod(periodFor(p.key))}>{p.label}</Button>
        ))}
        <label className="flex items-center gap-1.5 type-secondary text-muted-foreground">
          From
          <Input type="date" aria-label="From date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} width="md" />
        </label>
        <label className="flex items-center gap-1.5 type-secondary text-muted-foreground">
          To
          <Input type="date" aria-label="To date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} width="md" />
        </label>
        <Button variant={period.key === "custom" ? "primary" : "outline"} disabled={!customFrom && !customTo} onClick={applyCustom}>Custom range</Button>
        <Select value={orgId ?? ALL_ORGS} onValueChange={(v) => { setOrg(v === ALL_ORGS ? null : { id: v, label: orgOptions.find((o) => o.key === v)?.label ?? "" }); setDrill(NO_DRILL); }}>
          <SelectTrigger aria-label="Organization filter" width="md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ORGS}>All organizations</SelectItem>
            {orgOptions.filter((o) => o.key !== "").map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Break down by">
        {TABS.map((g) => (
          <Button key={g.key} variant={tab === g.key ? "primary" : "outline"} onClick={() => { setTab(g.key); setDrill(NO_DRILL); }}>{g.label}</Button>
        ))}
        <span className="type-secondary text-muted-foreground">{periodLabel}{org ? ` · ${org.label}` : ""}: <Money usd={total.usd} points={total.points} /> · {total.calls.toLocaleString()} charges</span>
      </div>

      {tab === "feature" && (drill.feature || drill.activity) ? (
        <nav className="mt-2 flex flex-wrap items-center gap-1 type-secondary" aria-label="Where you are">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <span className="text-muted-foreground">›</span> : null}
              {i < crumbs.length - 1 ? <button type="button" className="underline-offset-2 hover:underline" onClick={c.onClick}>{c.label}</button> : <span className="font-medium">{c.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}

      {showUnattr ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border p-2 sm:p-3" aria-label="Unattributed">
          <div>
            <div className="type-secondary text-muted-foreground">Unattributed · {periodLabel}</div>
            <div className="font-semibold"><Money usd={sumRows(unattr).usd} points={sumRows(unattr).points} /> <span className="type-secondary font-normal text-muted-foreground">{sumRows(unattr).calls.toLocaleString()} charges</span></div>
          </div>
          <Button variant={unattributedOn ? "primary" : "outline"} onClick={() => setUnattributed((v) => !v)}>{unattributedOn ? "Back to my costs" : "See records"}</Button>
        </div>
      ) : null}

      {!drill.activity && !drill.day && !unattributedOn ? (
        <div className="mt-2">
          {!rows ? <Skeleton className="h-40 w-full rounded-md" aria-label="Loading your costs" /> : (
            <MatrxDataTable
              tableId={`my-cost-${level}`}
              data={rows}
              columns={columns}
              getRowId={(r) => r.key}
              density="condensed"
              pageSize={50}
              defaultSort={{ id: level === "day" ? "label" : "cost", direction: "desc" }}
              mobileCardsBreakpoint="md"
              mobileCards={(r) => (
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="min-w-0"><div className="truncate font-medium">{r.label}</div><button type="button" className="type-secondary text-muted-foreground underline-offset-2 hover:underline" onClick={() => open(r)}>{r.calls.toLocaleString()} charges</button></div>
                  <div className="shrink-0 text-right"><Money usd={r.costUsd} points={r.points} /></div>
                </div>
              )}
              coverage={{ noun: "group", answeredBy: "client", loaded: rows.length, total: rows.length }}
              emptyState={{ title: "No costs here", description: "Nothing you ran in this period had a cost." }}
            />
          )}
        </div>
      ) : null}
      <MyCostRecords period={period} orgId={orgId} drill={drill} admin={admin} unattributed={unattributedOn} knownTotal={knownTotal} />
    </SettingsSection>
  );
}

function MyCostRecords({ period, orgId, drill, admin, unattributed, knownTotal }: { period: MyCostPeriod; orgId: string | null; drill: MyCostDrill; admin: boolean; unattributed: boolean; knownTotal: number | null }) {
  const [records, setRecords] = useState<MyCostRecord[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const effective = useMemo<MyCostPeriod>(() => {
    if (drill.day) return { key: "custom", ...dayWindow(drill.day) };
    return period;
  }, [drill.day, period]);

  const load = useCallback(async (before: MyCostRecord | null) => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchMyCostRecords(effective, {
        feature: drill.feature?.key ?? null,
        activity: drill.activity?.key ?? null,
        organizationId: unattributed ? null : orgId,
        scope: unattributed ? "unattributed" : "mine",
        before: before ? { at: before.createdAt, id: before.id } : null,
      });
      setRecords((prev) => (before ? [...prev, ...page] : page));
      setMore(page.length === MY_COST_RECORDS_PAGE);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [effective, drill.feature, drill.activity, orgId, unattributed]);

  useEffect(() => { void load(null); }, [load]);

  const columns = useMemo<MatrxColumnDef<MyCostRecord>[]>(() => [
    { id: "at", header: "When", accessorFn: (r) => r.createdAt, filter: "date", width: 170, cell: (r) => when(r.createdAt) },
    { id: "activity", header: "Activity", accessorFn: (r) => r.featureLabel, filter: "select", width: 150, mobileHidden: true },
    { id: "detail", header: "What it was for", accessorFn: (r) => r.detail, width: 200 },
    { id: "org", header: "Organization", accessorFn: (r) => r.organizationName ?? "—", filter: "select", width: 170, mobileHidden: true },
    { id: "cost", header: admin ? "Cost" : "Points used", accessorFn: (r) => r.costUsd ?? r.points, filter: "number", width: 190, align: "right", cell: (r) => <Money usd={r.costUsd} points={r.points} /> },
    { id: "charged", header: "Counted against plan", accessorFn: (r) => r.chargedPoints, filter: "number", width: 150, align: "right", mobileHidden: true, cell: (r) => formatPoints(r.chargedPoints) },
    { id: "open", header: "", accessorFn: (r) => chargeLink(r)?.href ?? "", width: 90, cell: (r) => { const link = chargeLink(r); return link ? <Link className="underline-offset-2 hover:underline" href={link.href} title={link.hint}>{link.label}</Link> : null; } },
  ], [admin]);

  const title = unattributed ? "Unattributed charges (no person on them)" : drill.activity ? `Charges: ${drill.activity.label}` : drill.feature ? `Charges: ${drill.feature.label}` : drill.day ? `Charges on ${drill.day}` : "Every charge, newest first";
  return (
    <div className="mt-4">
      <div className="mb-1 type-secondary font-medium text-muted-foreground">{title}</div>
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
          mobileCardsBreakpoint="md"
          mobileCards={(r) => {
            const link = chargeLink(r);
            return (
              <div className="py-1">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-medium">{r.detail}</div><div className="type-secondary text-muted-foreground">{when(r.createdAt)}{r.organizationName ? ` · ${r.organizationName}` : ""}</div></div><div className="shrink-0 text-right"><Money usd={r.costUsd} points={r.points} /></div></div>
                {link ? <Link className="type-secondary underline-offset-2 hover:underline" href={link.href} title={link.hint}>{link.label}</Link> : null}
              </div>
            );
          }}
          coverage={{ noun: "charge", answeredBy: "client", loaded: records.length, total: knownTotal ?? (more ? undefined : records.length) }}
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
