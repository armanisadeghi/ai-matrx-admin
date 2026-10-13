"use client";

// The ONE page for one spend alarm (Arman, 2026-10-10): what happened, what was blocked (each id
// opens its exact record), whose it is, the cost, the rule, every occurrence, and actions that act
// on the blocked thing through existing doors. Every alarm surface links here.

import { formatCount } from "@ai-matrx/kit/format";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CopyForAiAction } from "@/features/admin/attention/CopyForAiAction";
import {
  BellOff,
  Bell,
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
import { MuteDialog } from "@/features/admin/attention/MuteDialog";
import { muteLabel } from "@/features/admin/attention/item-mute";
import { AlarmSourcesList } from "./AlarmSourcesList";
import { HeldRunsSection } from "@/features/admin/held-runs/HeldRunsSection";
import { Button } from "@ai-matrx/design-system/controls";
import {
  SPEND_ALARMS_PATH,
  alarmActions,
  alarmAgentData,
  alarmControls,
  alarmSentence,
  alarmTitle,
  alarmSourceHref,
  collapseGoneSources,
  fetchMandateLabels,
  occurrenceSourceTitle,
  refName,
  fetchSpendAlarm,
  LEVEL_LABEL,
  migratedNote,
  costLabel,
  fixFor,
  isMigrated,
  isRinging,
  whose,
  fetchSpendAlarmOccurrences,
  fetchTaskState,
  refHref,
  refLinks,
  setSpendAlarmStatus,
  spendAlarmHref,
  type AlarmActionId,
  type AlarmLevel,
  type SpendAlarmOccurrence,
  type SpendAlarmAttentionRow,
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
  return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}

function RefList({ record, names }: { record: SpendAlarmRecord; names: ReadonlyMap<string, string> }) {
  // A ref with no name and no page says nothing to a person ("Recorded"); it stays in Copy for AI.
  const links = refLinks(record.refs).filter(
    (l) => l.href || names.has(l.value) || refName(l.key, l.value, record) || l.key === "driver" || l.key === "mandate_key" || l.key === "operation" || l.key === "scope",
  );
  if (links.length === 0) return <p className="text-sm text-muted-foreground">Not recorded</p>;
  return (
    <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-sm">
      {links.map((l) => {
        const shown =
          names.get(l.value) ??
          refName(l.key, l.value, record) ??
          (l.key === "handler" || l.key === "driver" || l.key === "mandate_key" || l.key === "provider" || l.key === "operation" || l.key === "scope"
              ? l.value.replace(/^mandate(_candidate)?:/, "").replace(/[_]+/g, " ")
              : l.href
                ? `Open ${l.label.toLowerCase()}`
                : "");
        return (
          <div key={l.key} className="contents">
            <dt className="text-muted-foreground">{l.label}</dt>
            <dd className="min-w-0 truncate leading-5">
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
  const queryClient = useQueryClient();
  const [record, setRecord] = useState<SpendAlarmAttentionRow | null>(null);
  const [muteOpen, setMuteOpen] = useState(false);
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

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const rec = await fetchSpendAlarm(id);
        // A record merged into one-per-decision opens the record it became.
        if (rec?.merged_into) {
          router.replace(spendAlarmHref(rec.merged_into));
          return;
        }
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
        // Every mandate an occurrence names, by its display name (the sentence already uses names).
        const mandateLabels = await fetchMandateLabels([rec?.refs.mandate_key ?? "", ...occ.map((o) => o.refs.mandate_key ?? "")]).catch(() => new Map<string, string>());
        if (!alive) return;
        setRecord(rec);
        setOccurrences(occ);
        setTask(t);
        setApprovalStatus(approval);
        if (rec?.refs.user_id && (rec.person || rec.subject_name)) resolved.set(rec.refs.user_id, rec.person ?? rec.subject_name!.split(" · ")[0]!);
        if (rec?.subject_type === "source") resolved.set(rec.subject_id, rec.subject_name ?? "the Source");
        for (const [key, label] of mandateLabels) if (!resolved.has(key)) resolved.set(key, label);
        if (rec?.refs.agent_id && rec.subject_name && rec.subject_type === "agent") resolved.set(rec.refs.agent_id, rec.subject_name);
        if (t?.title && rec?.refs.task_id) resolved.set(rec.refs.task_id, t.title);
        for (const [rid, n] of Object.entries(rec?.names ?? {})) if (!resolved.has(rid)) resolved.set(rid, n);
        // Each occurrence's organization by name (a refusal can come from several).
        const orgIds = [...new Set(occ.map((o) => o.refs.organization_id).filter((v): v is string => !!v && !resolved.has(v)))];
        if (orgIds.length) {
          const { data: orgs } = await supabase.schema("iam").from("organizations").select("id, name").in("id", orgIds);
          for (const o of (orgs ?? []) as { id: string; name: string | null }[]) if (o.name) resolved.set(o.id, o.name);
        }
        setNames(resolved);
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
      // The dock and the alarm list read the same records: refresh them now, not on the next poll.
      void queryClient.invalidateQueries({ queryKey: ["admin-attention"] });
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
      if (record.status === "snoozed" && !isRinging(record)) {
        headerActions.push({
          label: "Unmute",
          icon: Bell,
          showLabel: true,
          disabled: busy,
          onPress: () => act(() => setSpendAlarmStatus(id, "open"), "Unmuted"),
        });
        headerActions.push({ label: "Change mute", icon: BellOff, showLabel: true, disabled: busy, onPress: () => setMuteOpen(true) });
      } else {
        headerActions.push({ label: "Mute", icon: BellOff, showLabel: true, disabled: busy, onPress: () => setMuteOpen(true) });
      }
      headerActions.push({ label: "Resolve", icon: CheckCircle2, primary: true, onPress: () => setPending({ kind: "resolve" }) });
    }
  }

  const statusLabel = record
    ? record.status === "open" || (record.status === "snoozed" && isRinging(record))
      ? record.watching
        ? "Fixed, watching"
        : LEVEL_LABEL[record.level]
      : record.status === "snoozed"
        ? "Muted"
        : "Resolved"
    : "";

  const agentPayload = () => ({
    kind: "spend-alarm",
    location: spendAlarmHref(id),
    description: "One spend alarm with its ids and occurrences.",
    attributes: { level: record?.level ?? "", status: record?.status ?? "", count: String(record?.occurrence_count ?? 0) },
    data: record ? alarmAgentData({ ...record, names: record.names }, occurrences, typeof window === "undefined" ? "" : window.location.origin) : null,
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
        if (o.refs.mandate_key) return names.get(o.refs.mandate_key) ?? o.refs.mandate_key.replace(/[._]+/g, " ");
        if (isMigrated(o) && !o.refs.source_id && !o.refs.operation) return <span className="text-muted-foreground">{migratedNote()}</span>;
        if (o.refs.operation) return o.refs.operation;
        if (!o.refs.source_id) return <span className="text-muted-foreground">—</span>;
        const href = o.source && !o.collapsed ? alarmSourceHref({ ...o.source, id: o.refs.source_id, source_kind: o.refs.source_kind ?? "source", times: 1, last_at: o.occurred_at }) : null;
        const text = occurrenceSourceTitle(o) ?? "Not recorded";
        return href ? (
          <Link href={href} className="text-primary hover:underline">
            {text}
          </Link>
        ) : (
          text
        );
      },
    },
    { id: "organization", header: "Organization", accessorFn: (o) => (o.refs.organization_id ? names.get(o.refs.organization_id) ?? "" : "") },
    { id: "cost_usd", accessorKey: "cost_usd", header: "Cost", cell: (o) => (o.cost_usd == null ? "—" : formatAdminUsd(o.cost_usd)) },
    {
      id: "cost_avoided_usd",
      header: "Avoided (est.)",
      accessorFn: (o) => o.cost_avoided_usd ?? "",
      cell: (o) => (o.cost_avoided_usd == null ? "—" : formatAdminUsd(o.cost_avoided_usd)),
    },
  ];

  const shippedFix = record ? fixFor(record) : null;
  const fixAt = shippedFix?.at ? Date.parse(shippedFix.at) : null;
  const afterFix = fixAt
    ? occurrences.filter((o) => !isMigrated(o) && Date.parse(o.occurred_at) > fixAt).reduce((n, o) => n + o.repeat_count, 0)
    : 0;
  const visibleColumns = columns.filter((c) => {
    if (c.id === "occurred_at" || c.id === "served") return true;
    // Times counts every row, the migrated one included, so the rows add up to the record's count.
    if (c.id === "repeat_count") return occurrences.some((o) => o.repeat_count > 1);
    // Hide a column no occurrence fills (a repeat count of 1 says nothing).
    return occurrences.some((o) => {
      if (isMigrated(o)) return false;
      const v = c.accessorFn ? c.accessorFn(o) : (o as unknown as Record<string, unknown>)[c.accessorKey ?? ""];
      return v !== null && v !== undefined && v !== "" && v !== 1;
    });
  });

  const subjectName = record ? (record.subject_name ?? (record.refs.agent_id ? names.get(record.refs.agent_id) : null) ?? whose(record)) : "this subject";
  const consequence: Record<Exclude<NonNullable<Pending>["kind"], "resolve">, string> = {
    run_now: `Runs ${taskName} once now, as you, and spends what one run costs. You land on its page to watch.`,
    pause: `Stops ${taskName} from firing until someone resumes it. Runs already going finish.`,
    approve: `Lets ${subjectName} run again without asking, at its current cost.`,
    reject: `Holds every automated run of ${subjectName} until someone approves it.`,
  };

  return (
    <>
      <RecordPageHeader
        backHref={SPEND_ALARMS_PATH}
        parents={[
          { label: "Billing", href: "/administration/billing" },
          { label: "Alarms", href: SPEND_ALARMS_PATH },
        ]}
        record={{ name: record ? alarmTitle(record) : loading ? "Alarm" : "Alarm not found" }}
        status={record ? { label: statusLabel, tone: record.status === "open" ? LEVEL_TONE[record.level] : "neutral" } : undefined}
        actions={headerActions}
      />
      <div className="h-full overflow-y-auto px-4 pt-4 sm:px-6" data-matrx-page-scroll="" data-testid="spend-alarm-record">
        {error ? (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
            <ErrorAlchemyMenu error={error} />
          </div>
        ) : null}
        {record ? (
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <section className="group/x relative rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-end gap-1 sm:absolute sm:right-2 sm:top-2 sm:mb-0">
                <CopyButtons
                  size="icon"
                  label="Spend alarm"
                  hide={["ai"]}
                  human={() => `${alarmTitle(record)}\n${alarmSentence(record)}\nRule: ${record.rule ?? "—"}\n${window.location.origin}${spendAlarmHref(id)}`}
                />
                <CopyForAiAction label="Spend alarm" agent={agentPayload} />
              </div>
              <p className="text-sm sm:pr-44 font-medium text-foreground">{alarmSentence({ ...record, names: Object.fromEntries(names) })}</p>
              {record.status === "snoozed" && !isRinging(record) ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm" data-testid="alarm-muted">
                  <BellOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    {`Muted until ${when(record.snoozed_until)}${record.snoozed_by ? ` by ${record.snoozed_by}` : ""}${record.snooze_note ? `: ${record.snooze_note}` : ""}`}
                  </span>
                  <Button variant="outline" disabled={busy} onClick={() => void act(() => setSpendAlarmStatus(id, "open"), "Unmuted")}>
                    Unmute
                  </Button>
                  <Button variant="quiet" disabled={busy} onClick={() => setMuteOpen(true)}>
                    Change
                  </Button>
                </div>
              ) : null}
              {record.watching ? (
                <p className="mt-2 text-sm text-muted-foreground" data-testid="alarm-watching">
                  Fixed, watching: critical again if it recurs
                </p>
              ) : null}
              {shippedFix ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span className="text-foreground">
                    {`Fixed in code on ${fixDate(shippedFix.on)} (${shippedFix.commit}): ${shippedFix.what}.`}
                    {record.kind === shippedFix.related_kind
                      ? ""
                      : afterFix > 0
                      ? ` Occurrences after the fix: ${afterFix.toLocaleString()} (the fix is not on the live server yet).`
                      : " No occurrence since the fix; it resolves itself after 24 quiet hours."}
                  </span>
                </div>
              ) : record.fix ? (
                <p className="mt-1 text-sm text-muted-foreground">{record.fix}</p>
              ) : null}
              <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Rule</dt>
                <dd>{record.rule ?? "—"}</dd>
                {alarmControls(record).length > 0 ? (
                  <>
                    <dt className="text-muted-foreground">Change the limit</dt>
                    <dd className="flex flex-wrap gap-x-3" data-testid="alarm-controls">
                      {alarmControls(record).map((control) => (
                        <Link key={control.href} href={control.href} className="text-primary hover:underline">
                          {control.label}
                        </Link>
                      ))}
                    </dd>
                  </>
                ) : null}
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
              <KpiTile label="Times" value={formatCount(record.occurrence_count)} tone={record.level === "critical" ? "bad" : "neutral"} hint={record.reopened_count ? `Reopened ${record.reopened_count}x` : undefined} />
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
              <RefList record={record} names={names} />
              {task ? (
                <p className="mt-2 text-sm">
                  <Link href={adminScheduleHref(record.refs.task_id as string)} className="text-primary hover:underline">
                    {task.title}
                  </Link>
                  <span className="text-muted-foreground">{task.enabled ? " — enabled" : " — paused"}</span>
                </p>
              ) : null}
            </section>

            <AlarmSourcesList alarmId={id} heading={
                record.kind === "source_intelligence_skipped"
                  ? "Skipped Sources"
                  : shippedFix?.related_kind
                    ? "Sources skipped instead"
                    : "Sources"
              } />

            <HeldRunsSection alarmId={id} />

            <div className="h-[28rem] min-h-0" id="occurrences">
              <MatrxDataTable
                data={collapseGoneSources(occurrences)}
                columns={visibleColumns}
                getRowId={(o) => o.id}
                isLoading={loading}
                tableId="spend-alarm-occurrences"
                read={readOf({ loading, error }, { what: "occurrences" })}
                emptyState={{ title: "No occurrences recorded" }}
                toolbar={{ title: `Occurrences · ${formatCount(record.occurrence_count)} ${record.occurrence_count === 1 ? "time" : "times"}`, search: true }}
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

      <MuteDialog
        open={muteOpen}
        onOpenChange={setMuteOpen}
        subject={record ? alarmTitle(record) : "this alarm"}
        scope="server"
        initialNote={record?.snooze_note ?? null}
        onConfirm={async (choice, muteNote) => {
          await act(
            () => setSpendAlarmStatus(id, "snoozed", { snoozedUntil: new Date(Date.now() + choice.ms).toISOString(), note: muteNote }),
            `Muted for ${muteLabel(choice.ms)}`,
          );
        }}
      />
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
                ? `Approve spend for ${subjectName}`
                : `Reject spend for ${subjectName}`
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
