"use client";

// The ONE page for one spend alarm (Arman, 2026-10-10): what happened, what was blocked (each id
// opens its exact record), whose it is, the cost, the rule, every occurrence, and actions that act
// on the blocked thing through existing doors. Every alarm surface links here.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellOff,
  Bot,
  Check,
  CheckCircle2,
  FileText,
  Pause,
  Play,
  RotateCcw,
  Scale,
  X,
} from "lucide-react";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { RecordPageHeader, type RecordPageAction } from "@/features/shell/components/header/templates/RecordPageHeader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { KpiTile } from "@/components/official/kpi/KpiTile";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { toast } from "@/lib/toast";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { fetchUserDisplayNames } from "@/features/mandates/notes";
import { adminScheduleHref } from "@/features/scheduling/constants/routes";
import { patchSystemTask, runSystemTaskNow } from "@/features/scheduling/service/schedulerClient";
import { decideSpendApproval } from "@/features/admin/spend-approvals/spendApprovals";
import { supabase } from "@/utils/supabase/client";
import {
  SPEND_ALARMS_PATH,
  alarmActions,
  alarmAgentData,
  alarmHeadline,
  fetchSpendAlarm,
  LEVEL_LABEL,
  KIND_LABEL,
  MIGRATED_NOTE,
  costLabel,
  fetchItemTitles,
  fetchSpendAlarmsOfKind,
  fixFor,
  isMigrated,
  readable,
  whose,
  type ItemLabel,
  fetchSpendAlarmOccurrences,
  fetchTaskState,
  refHref,
  refLinks,
  setSpendAlarmStatus,
  spendAlarmHref,
  type AlarmActionId,
  type AlarmLevel,
  type SpendAlarmOccurrence,
  type SpendAlarmRecord,
} from "./spendAlarms";

const LEVEL_TONE: Record<AlarmLevel, "destructive" | "warning" | "info"> = {
  critical: "destructive",
  warning: "warning",
  info: "info",
};

type Pending =
  | { kind: "resolve" }
  | { kind: "run_now" }
  | { kind: "pause" }
  | { kind: "approve" }
  | { kind: "reject" }
  | null;

function fixDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function when(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function RefList({ record, names }: { record: SpendAlarmRecord; names: ReadonlyMap<string, string> }) {
  const links = refLinks(record.refs);
  if (links.length === 0) return <p className="text-sm text-muted-foreground">No ids recorded</p>;
  return (
    <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-sm">
      {links.map((l) => {
        const shown = names.get(l.value) ?? (l.key === "approval_id" ? "Open in spend approvals" : l.value);
        return (
          <div key={l.key} className="contents">
            <dt className="text-muted-foreground">{l.label}</dt>
            <dd className="min-w-0 truncate font-mono text-xs leading-5">
              {l.href ? (
                <Link href={l.href} className="text-primary hover:underline">
                  {shown}
                </Link>
              ) : (
                shown
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function SpendAlarmRecordPage({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<SpendAlarmRecord | null>(null);
  const [occurrences, setOccurrences] = useState<SpendAlarmOccurrence[]>([]);
  const [task, setTask] = useState<{ enabled: boolean; title: string; user_id: string } | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [itemTitles, setItemTitles] = useState<ReadonlyMap<string, ItemLabel>>(new Map());
  const [skipped, setSkipped] = useState<{ id: string; title: string; href: string | null }[] | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const rec = await fetchSpendAlarm(id);
        const occ = rec ? await fetchSpendAlarmOccurrences(id) : [];
        const t = rec?.refs.task_id ? await fetchTaskState(rec.refs.task_id).catch(() => null) : null;
        let approval: string | null = null;
        if (rec?.refs.approval_id) {
          const { data } = await supabase
            .schema("billing")
            .from("run_approval")
            .select("status")
            .eq("id", rec.refs.approval_id)
            .maybeSingle();
          approval = (data as { status?: string } | null)?.status ?? null;
        }
        const people = [rec?.refs.user_id, rec?.resolved_by, t?.user_id].filter((v): v is string => !!v);
        const fetched = people.length ? await fetchUserDisplayNames(people).catch(() => new Map<string, string>()) : new Map<string, string>();
        // A generic "User" placeholder is never a name.
        const resolved = new Map([...fetched].filter(([, n]) => n && n.trim().toLowerCase() !== "user"));
        const fix = rec ? fixFor(rec) : null;
        // The skipped Sources themselves (each skip alarm's subject IS the Source), listed on this page.
        const relatedRecords = fix?.related_kind ? await fetchSpendAlarmsOfKind(fix.related_kind).catch(() => []) : [];
        const served = [
          ...occ.filter((o) => o.refs.source_id).map((o) => ({ kind: o.refs.source_kind, id: o.refs.source_id as string })),
          ...relatedRecords.map((r) => ({ id: r.subject_id })),
          ...(rec?.subject_type === "source" ? [{ id: rec.subject_id }] : []),
        ];
        const titles = await fetchItemTitles(served).catch(() => new Map<string, ItemLabel>());
        const related = relatedRecords.map((r) => ({
          id: r.id,
          title: titles.get(r.subject_id)?.title ?? r.subject_name ?? "Source (not found)",
          href: titles.get(r.subject_id)?.href ?? null,
        }));
        if (!alive) return;
        setRecord(rec);
        setOccurrences(occ);
        setTask(t);
        setApprovalStatus(approval);
        if (rec?.refs.user_id && (rec.person || rec.subject_name)) resolved.set(rec.refs.user_id, rec.person ?? rec.subject_name!.split(" · ")[0]!);
        if (rec?.subject_type === "source") resolved.set(rec.subject_id, titles.get(rec.subject_id)?.title ?? rec.subject_name ?? "the Source");
        for (const [docId, label] of titles) if (!resolved.has(docId)) resolved.set(docId, label.title);
        if (rec?.refs.agent_id && rec.subject_name && rec.subject_type === "agent") resolved.set(rec.refs.agent_id, rec.subject_name);
        if (t?.title && rec?.refs.task_id) resolved.set(rec.refs.task_id, t.title);
        setNames(resolved);
        setItemTitles(titles);
        setSkipped(fix?.related_kind ? related : null);
        setError(rec ? null : "This alarm does not exist");
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, version]);

  const reload = () => setVersion((v) => v + 1);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      setPending(null);
      setNote("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const actions = record ? alarmActions(record, { task, approvalStatus }) : [];
  const has = (a: AlarmActionId) => actions.includes(a);
  const refs = record?.refs ?? {};
  const taskName = task?.title ?? "this automation";

  const runNow = () =>
    act(async () => {
      const { run_id } = await runSystemTaskNow(refs.task_id as string);
      router.push(`${adminScheduleHref(refs.task_id as string)}?run=${encodeURIComponent(run_id)}`);
    }, "Run started");

  const headerActions: RecordPageAction[] = [];
  if (record) {
    if (has("open_agent") && refs.agent_id)
      headerActions.push({ label: "Open agent", icon: Bot, href: refHref("agent_id", refs.agent_id) ?? undefined, showLabel: true });
    if (has("open_mandate") && refs.mandate_key)
      headerActions.push({ label: "Open mandate", icon: Scale, href: refHref("mandate_key", refs.mandate_key) ?? undefined, showLabel: true });
    if (has("open_source") && refs.source_id)
      headerActions.push({ label: "Open source", icon: FileText, href: refHref("source_id", refs.source_id, refs) ?? undefined, showLabel: true });
    if (has("pause")) headerActions.push({ label: "Pause automation", icon: Pause, onPress: () => setPending({ kind: "pause" }), showLabel: true });
    if (has("resume"))
      headerActions.push({
        label: "Resume automation",
        icon: Play,
        disabled: busy,
        showLabel: true,
        onPress: () => act(() => patchSystemTask(refs.task_id as string, { enabled: true }), "Automation resumed"),
      });
    if (has("run_now")) headerActions.push({ label: "Run once now", icon: Play, onPress: () => setPending({ kind: "run_now" }), showLabel: true });
    if (has("reject")) headerActions.push({ label: "Reject", icon: X, onPress: () => setPending({ kind: "reject" }), showLabel: true });
    if (has("approve")) headerActions.push({ label: "Approve", icon: Check, onPress: () => setPending({ kind: "approve" }), showLabel: true });
    if (record.status === "resolved") {
      headerActions.push({ label: "Reopen", icon: RotateCcw, showLabel: true, onPress: () => act(() => setSpendAlarmStatus(id, "open"), "Alarm reopened") });
    } else {
      headerActions.push({
        label: "Snooze 24h",
        icon: BellOff,
        showLabel: true,
        disabled: busy,
        onPress: () => act(() => setSpendAlarmStatus(id, "snoozed", { snoozeHours: 24 }), "Snoozed for 24 hours"),
      });
      headerActions.push({ label: "Resolve", icon: CheckCircle2, primary: true, onPress: () => setPending({ kind: "resolve" }) });
    }
  }

  const statusLabel = record
    ? record.status === "open"
      ? LEVEL_LABEL[record.level]
      : record.status === "snoozed"
        ? `Snoozed until ${when(record.snoozed_until)}${record.snooze_note ? ` — ${record.snooze_note}` : ""}`
        : "Resolved"
    : "";

  const agentPayload = () => ({
    kind: "spend-alarm",
    location: spendAlarmHref(id),
    description: "One spend alarm with its ids and occurrences.",
    attributes: { level: record?.level ?? "", status: record?.status ?? "", count: String(record?.occurrence_count ?? 0) },
    data: record ? alarmAgentData(record, occurrences, typeof window === "undefined" ? "" : window.location.origin) : null,
  });

  const columns: MatrxColumnDef<SpendAlarmOccurrence>[] = [
    { id: "occurred_at", accessorKey: "occurred_at", header: "When", cell: (o) => when(o.occurred_at), sortValue: (o) => o.occurred_at },
    { id: "repeat_count", accessorKey: "repeat_count", header: "Times" },
    {
      id: "run",
      header: "Run",
      accessorFn: (o) => o.run_id ?? o.refs.workflow_run_id ?? o.execution_id ?? "",
      cell: (o) => {
        const key = o.run_id ? "run_id" : o.refs.workflow_run_id ? "workflow_run_id" : o.execution_id ? "execution_id" : null;
        if (!key) return <span className="text-muted-foreground">—</span>;
        const value = (key === "run_id" ? o.run_id : key === "execution_id" ? o.execution_id : o.refs.workflow_run_id) as string;
        const href = refHref(key, value, { ...record?.refs, ...o.refs });
        return href ? (
          <Link href={href} className="font-mono text-xs text-primary hover:underline">
            {value.slice(0, 8)}
          </Link>
        ) : (
          <span className="font-mono text-xs">{value.slice(0, 8)}</span>
        );
      },
    },
    {
      id: "served",
      header: "Item",
      accessorFn: (o) => [o.refs.source_kind, o.refs.source_id].filter(Boolean).join(" "),
      cell: (o) => {
        if (isMigrated(o)) return <span className="text-muted-foreground">{MIGRATED_NOTE}</span>;
        if (!o.refs.source_id) return <span className="text-muted-foreground">—</span>;
        const href = itemHref(o);
        const text = itemTitle(o) ?? "Source (not found)";
        return href ? (
          <Link href={href} className="text-primary hover:underline">
            {text}
          </Link>
        ) : (
          text
        );
      },
    },
    { id: "handler", header: "Handler", accessorFn: (o) => o.refs.handler ?? "" },
    { id: "request", header: "Request", accessorFn: (o) => o.refs.request_id ?? "", cellKind: "uuid" },
    { id: "cost_usd", accessorKey: "cost_usd", header: "Cost", cell: (o) => (o.cost_usd == null ? "—" : formatAdminUsd(o.cost_usd)) },
  ];

  const shippedFix = record ? fixFor(record) : null;
  const migratedCount = occurrences.filter(isMigrated).reduce((n, o) => n + o.repeat_count, 0);
  const itemTitle = (o: SpendAlarmOccurrence) =>
    o.refs.source_id ? itemTitles.get(o.refs.source_id)?.title ?? "Source (not found)" : null;
  const itemHref = (o: SpendAlarmOccurrence) => (o.refs.source_id ? itemTitles.get(o.refs.source_id)?.href ?? null : null);
  const fixAt = shippedFix?.at ? Date.parse(shippedFix.at) : null;
  const afterFix = fixAt
    ? occurrences.filter((o) => !isMigrated(o) && Date.parse(o.occurred_at) > fixAt).reduce((n, o) => n + o.repeat_count, 0)
    : 0;
  const servedItems = [
    ...new Map(
      occurrences
        .filter((o) => o.refs.source_id)
        .map((o) => [o.refs.source_id as string, { id: o.refs.source_id as string, title: itemTitle(o) as string, href: itemHref(o) }]),
    ).values(),
  ];
  const visibleColumns = columns.filter((c) => {
    if (c.id === "occurred_at" || c.id === "served") return true;
    // Hide a column no occurrence fills (a repeat count of 1 says nothing).
    return occurrences.some((o) => {
      if (isMigrated(o)) return false;
      const v = c.accessorFn ? c.accessorFn(o) : (o as unknown as Record<string, unknown>)[c.accessorKey ?? ""];
      return v !== null && v !== undefined && v !== "" && v !== 1;
    });
  });

  const consequence: Record<Exclude<NonNullable<Pending>["kind"], "resolve">, string> = {
    run_now: `Runs ${taskName} once now, as you, and spends what one run costs. You land on its page to watch.`,
    pause: `Stops ${taskName} from firing until someone resumes it. Runs already going finish.`,
    approve: "Lets this subject run again without asking, at its current cost.",
    reject: "Holds every automated run of this subject until someone approves it.",
  };

  return (
    <>
      <RecordPageHeader
        backHref={SPEND_ALARMS_PATH}
        parents={[
          { label: "Billing", href: "/administration/billing" },
          { label: "Alarms", href: SPEND_ALARMS_PATH },
        ]}
        record={{ name: record ? KIND_LABEL[record.kind] ?? alarmHeadline(record.title, record.subject_id, record.subject_name) : loading ? "Alarm" : "Alarm not found" }}
        status={record ? { label: statusLabel, tone: record.status === "open" ? LEVEL_TONE[record.level] : "neutral" } : undefined}
        actions={headerActions}
      />
      <div className="h-full overflow-y-auto px-4 pb-16 pt-4 sm:px-6" data-testid="spend-alarm-record">
        {error ? (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
            <ErrorAlchemyMenu error={error} />
          </div>
        ) : null}
        {record ? (
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <section className="group/x relative rounded-lg border border-border bg-card p-4">
              <CopyButtons
                size="icon"
                label="Spend alarm"
                className="absolute right-2 top-2"
                human={() => `${record.title}\n${record.detail}\nRule: ${record.rule ?? "—"}\n${window.location.origin}${spendAlarmHref(id)}`}
                agent={agentPayload}
              />
              <p className="pr-20 text-sm font-medium text-foreground">{readable(record.detail, names)}</p>
              {shippedFix ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span className="text-foreground">
                    {`Fixed in code on ${fixDate(shippedFix.on)} (${shippedFix.commit}): ${shippedFix.what}.`}
                    {afterFix > 0
                      ? ` Occurrences after the fix: ${afterFix.toLocaleString()} (the fix is not on the live server yet).`
                      : " No occurrence since the fix; it resolves itself after 24 quiet hours."}
                  </span>
                </div>
              ) : record.fix ? (
                <p className="mt-1 text-sm text-muted-foreground">{record.fix}</p>
              ) : null}
              {skipped && skipped.length > 0 ? (
                <div className="mt-2 text-sm" data-testid="skipped-sources">
                  <span className="text-muted-foreground">{`Skipped Sources (${skipped.length}): `}</span>
                  {skipped.map((it, i) => (
                    <span key={it.id}>
                      {i > 0 ? ", " : ""}
                      {it.href ? (
                        <Link href={it.href} className="text-primary hover:underline">
                          {it.title}
                        </Link>
                      ) : (
                        <Link href={spendAlarmHref(it.id)} className="text-muted-foreground hover:underline">
                          {it.title}
                        </Link>
                      )}
                    </span>
                  ))}
                </div>
              ) : null}
              <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Rule</dt>
                <dd>{record.rule ?? "—"}</dd>
                <dt className="text-muted-foreground">Whose</dt>
                <dd>
                  {record.refs.user_id ? (
                    <Link href={refHref("user_id", record.refs.user_id) ?? "#"} className="text-primary hover:underline">
                      {names.get(record.refs.user_id) ?? "Owner not recorded"}
                    </Link>
                  ) : (
                    whose(record)
                  )}
                </dd>
                {record.status === "resolved" ? (
                  <>
                    <dt className="text-muted-foreground">Resolved</dt>
                    <dd>
                      {`${when(record.resolved_at)}${record.resolved_by ? ` by ${names.get(record.resolved_by) ?? record.resolved_by}` : ""}${record.resolution_note ? ` — ${record.resolution_note}` : ""}`}
                    </dd>
                  </>
                ) : null}
              </dl>
            </section>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiTile label="Times" value={record.occurrence_count.toLocaleString()} tone={record.level === "critical" ? "bad" : "neutral"} hint={record.reopened_count ? `Reopened ${record.reopened_count}x` : undefined} />
              <KpiTile label="First seen" value={when(record.first_seen_at)} />
              <KpiTile label="Last seen" value={when(record.last_seen_at)} />
              <KpiTile
                label="Cost"
                value={costLabel(record, formatAdminUsd)}
                tone={record.cost_usd ? "bad" : "neutral"}
              />
            </div>

            <section className="group/x relative rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">What was blocked</h2>
              <CopyButtons
                size="xs"
                label="Blocked ids"
                className="absolute right-2 top-2"
                human={() => refLinks(record.refs).map((l) => `${l.label}: ${l.value}`).join("\n")}
                agent={agentPayload}
              />
              <RefList record={record} names={names} />
              {servedItems.length > 0 ? (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">{`Documents (${servedItems.length}): `}</span>
                  {servedItems.map((it, i) => (
                    <span key={it.id}>
                      {i > 0 ? ", " : ""}
                      {it.href ? (
                        <Link href={it.href} className="text-primary hover:underline">
                          {it.title}
                        </Link>
                      ) : (
                        it.title
                      )}
                    </span>
                  ))}
                </div>
              ) : null}
              {occurrences.some(isMigrated) ? <p className="mt-2 text-sm text-muted-foreground">{`${migratedCount.toLocaleString()} earlier times: ${MIGRATED_NOTE}`}</p> : null}
              {task ? (
                <p className="mt-2 text-sm">
                  <Link href={adminScheduleHref(record.refs.task_id as string)} className="text-primary hover:underline">
                    {task.title}
                  </Link>
                  <span className="text-muted-foreground">{task.enabled ? " — enabled" : " — paused"}</span>
                </p>
              ) : null}
            </section>

            <div className="h-[28rem] min-h-0">
              <MatrxDataTable
                data={occurrences}
                columns={visibleColumns}
                getRowId={(o) => o.id}
                isLoading={loading}
                tableId="spend-alarm-occurrences"
                read={readOf({ loading, error }, { what: "occurrences" })}
                emptyState={{ title: "No occurrences recorded" }}
                toolbar={{ title: "Occurrences", search: true }}
                copy={{
                  label: "Occurrence",
                  listLabel: "Alarm occurrences",
                  location: spendAlarmHref(id),
                  rowKind: "spend-alarm-occurrence",
                  listKind: "spend-alarm-occurrences",
                  humanRow: (o) => `${when(o.occurred_at)} · x${o.repeat_count} · ${o.run_id ?? o.execution_id ?? o.refs.source_id ?? ""}`,
                  agentRow: (o) => ({ ...o, links: refLinks({ ...record.refs, ...o.refs }).filter((l) => l.href) }),
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={pending?.kind === "resolve"}
        onOpenChange={(o) => !o && setPending(null)}
        title="Resolve this alarm"
        description="Marks it resolved for everyone; it reopens if it happens again."
        confirmLabel="Resolve"
        busy={busy}
        onConfirm={() => act(() => setSpendAlarmStatus(id, "resolved", { note }), "Alarm resolved")}
        content={
          <ProTextarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" surfaceName="spend-alarm-resolve" />
        }
      />
      <ConfirmDialog
        open={!!pending && pending.kind !== "resolve"}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.kind === "run_now"
            ? "Run once now"
            : pending?.kind === "pause"
              ? "Pause automation"
              : pending?.kind === "approve"
                ? "Approve"
                : "Reject"
        }
        description={pending && pending.kind !== "resolve" ? consequence[pending.kind] : undefined}
        variant={pending?.kind === "pause" || pending?.kind === "reject" ? "destructive" : "default"}
        confirmLabel={pending?.kind === "run_now" ? "Run and watch" : pending?.kind === "pause" ? "Pause" : pending?.kind === "approve" ? "Approve" : "Reject"}
        busy={busy}
        onConfirm={() => {
          if (pending?.kind === "run_now") return void runNow();
          if (pending?.kind === "pause")
            return void act(() => patchSystemTask(refs.task_id as string, { enabled: false }), "Automation paused");
          if (pending?.kind === "approve")
            return void act(() => decideSpendApproval(refs.approval_id as string, "approve"), "Approved");
          if (pending?.kind === "reject") return void act(() => decideSpendApproval(refs.approval_id as string, "reject"), "Rejected");
        }}
      />
    </>
  );
}
