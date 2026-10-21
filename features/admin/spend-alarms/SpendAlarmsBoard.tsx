"use client";

// Billing › Alarms: every spend alarm record, ringing ones first, on the canonical MatrxDataTable
// (views, KPIs, tones). Each row opens its record page; ?id=<alarm> highlights that row.

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, BellOff, Check, CheckCircle2, ExternalLink, Loader2, Play, RefreshCw, RotateCcw, X } from "lucide-react";
import { Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { MuteDialog } from "@/features/admin/attention/MuteDialog";
import { MUTE_CHOICES, muteLabel } from "@/features/admin/attention/item-mute";
import { decideSpendApproval } from "@/features/admin/spend-approvals/spendApprovals";
import { patchSystemTask } from "@/features/scheduling/service/schedulerClient";
import { toast } from "@/lib/toast";
import { useListViewPrefs } from "@/lib/list-views/useListViewPrefs";
import { useAttentionTriage } from "@/features/admin/attention/sources/useAttentionTriage";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import {
  ALARM_AUDIENCES,
  AUDIENCE_LABEL,
  LEVEL_LABEL,
  audienceAsTheCardRoutes,
  type CardRoute,
  workItemHref,
  type AlarmAudience,
  SPEND_ALARMS_PATH,
  alarmTitle,
  costLabel,
  spendAlarmCounts,
  fixFor,
  refHref,
  whose,
  fetchSpendAlarms,
  setSpendAlarmStatus,
  isRinging,
  spendAlarmHref,
  type SpendAlarmAttentionRow as SpendAlarmRecord,
} from "./spendAlarms";

type StatusFilter = "ringing" | "snoozed" | "resolved" | "all";
type AudienceFilter = AlarmAudience | "any";

const LEVEL_RANK = { critical: 0, warning: 1, info: 2 } as const;

export function SpendAlarmsBoard() {
  // Under the dock's query prefix: a mute anywhere (dock, record page) refreshes this list at once.
  const query = useQuery({ queryKey: ["admin-attention", "spend-alarm-list"], queryFn: fetchSpendAlarms, refetchOnWindowFocus: true });
  const rows: SpendAlarmRecord[] = query.data ?? [];
  // One answer to "what is mine" (review 4, F5): the dock's own routing decides each row's audience.
  const triage = useAttentionTriage(true).triage;
  const routes = useMemo(
    () => (triage ? new Map<string, CardRoute>([...triage.verdicts].map(([key, v]) => [key, v.routedTo])) : null),
    [triage],
  );
  const audienceOf = (r: SpendAlarmRecord) => audienceAsTheCardRoutes(r, routes);
  const loading = query.isFetching && !query.data;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;
  const { prefs: viewPrefs, setPrefs: setViewPrefs } = useListViewPrefs("spend-alarms-admin");
  const params = useSearchParams();
  const focusId = params.get("id");
  const router = useRouter();
  // ?kind=<kind> narrows the list to one kind (the record page's "Open the skipped Sources").
  const kindFilter = params.get("kind");
  const [status, setStatus] = useState<StatusFilter>("ringing");
  // Who it is for (Arman 2026-10-11): the list opens on the owner's decisions, like his dock.
  // ?audience=agent_fix is the dock's "N being fixed by agents" door; info_only = "Worked as designed".
  const audienceParam = params.get("audience");
  const fromParam = (v: string | null): AudienceFilter =>
    v === "any" || ALARM_AUDIENCES.includes(v as AlarmAudience) ? (v as AudienceFilter) : "owner_decision";
  const [audience, setAudience] = useState<AudienceFilter>(fromParam(audienceParam));
  // The dock's door lands here by client navigation on the same page: follow the address when it changes.
  const [seenParam, setSeenParam] = useState(audienceParam);
  if (seenParam !== audienceParam) {
    setSeenParam(audienceParam);
    setAudience(fromParam(audienceParam));
  }
  const inScope = (r: SpendAlarmRecord) => (!kindFilter || r.kind === kindFilter) && (audience === "any" || audienceOf(r) === audience);
  const ringingOf = (a: AlarmAudience) => rows.filter((r) => audienceOf(r) === a && (!kindFilter || r.kind === kindFilter) && isRinging(r)).length;

  const visible = rows
    .filter(inScope)
    .filter((r) =>
      status === "all" ? true : status === "ringing" ? isRinging(r) : status === "snoozed" ? r.status === "snoozed" && !isRinging(r) : r.status === "resolved",
    )
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || b.last_seen_at.localeCompare(a.last_seen_at));

  // Every row read (never a capped page): the tab labels carry the same counts the dock shows.
  const counts = spendAlarmCounts(rows.filter(inScope));
  const ringing = counts.critical + counts.warning + counts.info;
  const resolvedCount = rows.filter((r) => r.status === "resolved" && inScope(r)).length;

  // ── The verbs: ONE declaration feeds the row icons and the bulk bar (the bulk twin rule). ──
  const queryClient = useQueryClient();
  const reload = async () => {
    await query.refetch();
    void queryClient.invalidateQueries({ queryKey: ["admin-attention"] });
  };
  type RowDialog = { verb: "resolve" | "approve" | "reject" | "resume"; row: SpendAlarmRecord } | { verb: "mute"; row: SpendAlarmRecord } | null;
  const [dialog, setDialog] = useState<RowDialog>(null);
  const [dialogNote, setDialogNote] = useState("");
  const [dialogBusy, setDialogBusy] = useState(false);
  const open = (r: SpendAlarmRecord) => r.status === "open" || (r.status === "snoozed" && isRinging(r));
  const muted = (r: SpendAlarmRecord) => r.status === "snoozed" && !isRinging(r);
  const approvalOpen = (r: SpendAlarmRecord, want: "approved" | "rejected") => !!r.refs.approval_id && r.approval_status !== want;
  const canResume = (r: SpendAlarmRecord) => !!r.refs.task_id && r.task_enabled === false;
  const alarmLabel = (r: SpendAlarmRecord) => alarmTitle(r);
  const runResolve = (id: string, _row: SpendAlarmRecord | undefined, input: { reason?: string }) => setSpendAlarmStatus(id, "resolved", { note: input.reason });
  const runApproval = (decision: "approve" | "reject") => (_id: string, row: SpendAlarmRecord | undefined) =>
    decideSpendApproval(String(row?.refs.approval_id), decision, row?.approval_status ? { expectedStatus: row.approval_status } : {});
  const runResume = (_id: string, row: SpendAlarmRecord | undefined) => patchSystemTask(String(row?.refs.task_id), { enabled: true }).then(() => undefined);
  const { rowActionDefs, bulkActions } = defineRowVerbs<SpendAlarmRecord>(
    [
      {
        id: "resolve", icon: CheckCircle2, label: "Resolve", tone: "success",
        appliesTo: (r) => r.status !== "resolved", unavailableTooltip: "Already resolved",
        onClick: (r) => setDialog({ verb: "resolve", row: r }),
        bulk: {
          done: "Resolved",
          confirm: (t) => ({
            title: `Resolve ${t.ids.length} ${t.ids.length === 1 ? "alarm" : "alarms"}?`,
            description: "Marks each resolved for everyone; each reopens if it happens again.",
            confirmLabel: "Resolve",
            reason: { placeholder: "Note (optional)", optional: true },
          }),
          runOne: (id, row, input) => runResolve(id, row, input),
        },
      },
      {
        id: "reopen", icon: RotateCcw, label: "Reopen",
        appliesTo: (r) => r.status === "resolved", unavailableTooltip: "Not resolved",
        onClick: (r) => void act(() => setSpendAlarmStatus(r.id, "open"), "Alarm reopened"),
        bulk: { done: "Reopened", runOne: (id) => setSpendAlarmStatus(id, "open") },
      },
      {
        id: "mute", icon: BellOff, label: "Mute",
        appliesTo: (r) => r.status !== "resolved", unavailableTooltip: "Already resolved",
        onClick: (r) => setDialog({ verb: "mute", row: r }),
        bulk: {
          done: "Muted",
          confirm: (t) => ({
            title: `Mute ${t.ids.length} ${t.ids.length === 1 ? "alarm" : "alarms"}?`,
            description: "Muted for every super admin until the time is up.",
            confirmLabel: "Mute",
            ask: { kind: "choice", label: "Mute for", options: MUTE_CHOICES.map((c) => ({ value: String(c.ms), label: c.label })), defaultValue: String(MUTE_CHOICES[2].ms) },
          }),
          runOne: (id, _row, input) =>
            setSpendAlarmStatus(id, "snoozed", { snoozedUntil: new Date(Date.now() + Number(input.value)).toISOString() }),
        },
      },
      {
        id: "unmute", icon: Bell, label: "Unmute",
        appliesTo: muted, unavailableTooltip: "Not muted",
        onClick: (r) => void act(() => setSpendAlarmStatus(r.id, "open"), "Unmuted"),
        bulk: { done: "Unmuted", runOne: (id) => setSpendAlarmStatus(id, "open") },
      },
      {
        id: "approve", icon: Check, label: "Approve spend", tone: "success",
        appliesTo: (r) => approvalOpen(r, "approved"), unavailableTooltip: "No approval to approve",
        onClick: (r) => setDialog({ verb: "approve", row: r }),
        bulk: {
          done: "Approved",
          confirm: (t) => ({ title: `Approve spend for ${t.ids.length} ${t.ids.length === 1 ? "alarm" : "alarms"}?`, description: "Each alarm's spend approval is approved.", confirmLabel: "Approve" }),
          runOne: runApproval("approve"),
        },
      },
      {
        id: "reject", icon: X, label: "Reject spend", tone: "destructive",
        appliesTo: (r) => approvalOpen(r, "rejected"), unavailableTooltip: "No approval to reject",
        onClick: (r) => setDialog({ verb: "reject", row: r }),
        bulk: {
          done: "Rejected",
          confirm: (t) => ({ title: `Reject spend for ${t.ids.length} ${t.ids.length === 1 ? "alarm" : "alarms"}?`, description: "Each alarm's spend approval is rejected; the work stays blocked.", confirmLabel: "Reject", variant: "destructive" }),
          runOne: runApproval("reject"),
        },
      },
      {
        id: "resume", icon: Play, label: "Resume automation",
        appliesTo: canResume, unavailableTooltip: "Automation is not paused",
        onClick: (r) => setDialog({ verb: "resume", row: r }),
        bulk: {
          done: "Resumed",
          confirm: (t) => ({ title: `Resume automation for ${t.ids.length} ${t.ids.length === 1 ? "alarm" : "alarms"}?`, description: "Each paused automation runs on its schedule again.", confirmLabel: "Resume" }),
          runOne: runResume,
        },
      },
      { id: "open", icon: ExternalLink, label: "Open alarm", onClick: (r) => router.push(spendAlarmHref(r.id)), bulk: false, noBulk: "open" },
    ],
    { noun: "alarm", getRowId: (r) => r.id, getRowName: alarmLabel },
  );
  const bulk = useTableBulkSelection<SpendAlarmRecord>({
    noun: "alarm",
    rows: visible,
    getRowId: (r) => r.id,
    getRowName: alarmLabel,
    actions: bulkActions,
    onRefresh: reload,
  });
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setDialogBusy(true);
    try {
      await fn();
      toast.success(done);
      setDialog(null);
      setDialogNote("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDialogBusy(false);
    }
  };
  const dialogRow = dialog?.row;
  const dialogCopy = {
    resolve: { title: "Resolve this alarm", description: "Marks it resolved for everyone; it reopens if it happens again.", confirmLabel: "Resolve" },
    approve: { title: "Approve spend", description: "The spend approval this alarm names is approved.", confirmLabel: "Approve" },
    reject: { title: "Reject spend", description: "The spend approval this alarm names is rejected; the work stays blocked.", confirmLabel: "Reject" },
    resume: { title: "Resume automation", description: "The paused automation runs on its schedule again.", confirmLabel: "Resume" },
  } as const;
  const runDialog = () => {
    if (!dialog || dialog.verb === "mute") return;
    const row = dialog.row;
    const done = { resolve: "Alarm resolved", approve: "Approved", reject: "Rejected", resume: "Automation resumed" }[dialog.verb];
    const call =
      dialog.verb === "resolve" ? runResolve(row.id, row, { reason: dialogNote })
      : dialog.verb === "resume" ? runResume(row.id, row)
      : runApproval(dialog.verb)(row.id, row);
    void act(() => call, done);
  };

  const columns: MatrxColumnDef<SpendAlarmRecord>[] = [
    {
      id: "level",
      accessorKey: "level",
      header: "Level",
      filter: "select",
      tone: (r) => (r.level === "critical" ? "danger" : r.level === "warning" ? "warning" : "muted"),
      sortValue: (r) => LEVEL_RANK[r.level],
      cell: (r) => LEVEL_LABEL[r.level],
      // The SAME rule the attention dock counts by (spendAlarmCounts: ringing, by effective level), over every row read.
      kpi: [
        { op: "count", id: "critical", label: "Critical", countWhere: (r) => r.level === "critical" && isRinging(r), tone: (v) => (v > 0 ? "danger" : undefined) },
        { op: "count", id: "warning", label: "To decide", countWhere: (r) => r.level === "warning" && isRinging(r), tone: (v) => (v > 0 ? "warning" : undefined) },
      ],
    },
    {
      id: "title",
      accessorFn: (r) => alarmTitle(r),
      header: "Alarm",
      href: (r) => spendAlarmHref(r.id),
      width: 420,
      // The column's href makes the cell the link; a Link inside it would nest <a> in <a>.
    },
    {
      id: "audience",
      header: "For",
      width: 170,
      filter: "select",
      tone: (r) => (audienceOf(r) === "owner_decision" ? "warning" : audienceOf(r) === "agent_fix" ? undefined : "muted"),
      accessorFn: (r) => AUDIENCE_LABEL[audienceOf(r)],
      href: (r) => (audienceOf(r) === "agent_fix" && r.work_item_id ? workItemHref(r.work_item_id) : undefined),
      cell: (r) =>
        audienceOf(r) === "agent_fix" && r.work_item_status
          ? `${AUDIENCE_LABEL.agent_fix} · ${r.work_item_status.replace(/_/g, " ")}`
          : r.audience_note
            ? `${AUDIENCE_LABEL[audienceOf(r)]} · ${r.audience_note}`
            : AUDIENCE_LABEL[audienceOf(r)],
    },
    {
      id: "subject",
      header: "Whose",
      width: 240,
      accessorFn: (r) => whose(r),
      href: (r) => (r.refs.user_id && !r.subject_type.startsWith("source") ? refHref("user_id", r.refs.user_id) ?? undefined : undefined),
    },
    {
      id: "occurrence_count",
      accessorKey: "occurrence_count",
      header: "Count",
      width: 90,
      tone: (r) => (r.occurrence_count >= 100 ? "danger" : undefined),
      kpi: { op: "sum", label: "Occurrences" },
    },
    {
      id: "cost",
      header: "Cost",
      width: 130,
      accessorFn: (r) => costLabel(r, formatAdminUsd),
      sortValue: (r) => r.cost_usd ?? 0,
      kpi: { op: "count", id: "refused", label: "Refused before spending", countWhere: (r) => r.refused && r.cost_usd == null },
    },
    {
      id: "fix",
      header: "What to do",
      width: 260,
      accessorFn: (r) => (r.watching ? "Fixed, watching" : fixFor(r) ? "Fixed in code; resolve it" : r.fix ?? ""),

    },
    { id: "last_seen_at", accessorKey: "last_seen_at", header: "Last seen", format: { id: "datetime" }, cell: (r) => new Date(r.last_seen_at).toLocaleString() },
    {
      id: "status",
      header: "Status",
      width: 260,
      filter: "select",
      tone: (r) => (r.status === "resolved" ? "success" : r.status === "snoozed" ? "muted" : undefined),
      accessorFn: (r) =>
        r.status === "snoozed" && !isRinging(r)
          ? `Muted until ${new Date(r.snoozed_until as string).toLocaleString()}${r.snoozed_by ? ` by ${r.snoozed_by}` : ""}${r.snooze_note ? `: ${r.snooze_note}` : ""}`
          : r.status === "resolved"
            ? "Resolved"
            : r.watching
              ? "Fixed, watching"
              : "Open",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
          <ErrorAlchemyMenu error={error} />
        </div>
      ) : null}
      {kindFilter ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing</span>
          <span className="font-medium">{kindFilter.replace(/[._]/g, " ")}</span>
          <Button variant="quiet" onClick={() => router.push(SPEND_ALARMS_PATH)} aria-label="Show all alarms" title="Show all alarms">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <MatrxDataTable
          data={visible}
          columns={columns}
          getRowId={(r) => r.id}
          rowActionDefs={rowActionDefs}
          selection={bulk.selection}
          isLoading={loading}
          tableId="spend-alarms-admin"
          viewTabsStore={{ views: viewPrefs.savedViews ?? [], onChange: (savedViews) => setViewPrefs({ savedViews }) }}
          focusRowId={focusId}
          headerWrap="two-lines"
          // A phone reads each alarm as a card: title, level, whose, count, cost.
          mobileCardsBreakpoint="sm"
          mobileCards={(r) => (
            <Link href={spendAlarmHref(r.id)} className="flex flex-col gap-0.5 px-3 py-2" data-testid="spend-alarm-card">
              <span className="line-clamp-2 text-sm font-medium text-foreground">{alarmTitle(r)}</span>
              <span className="text-xs text-muted-foreground">
                <span className={r.level === "critical" ? "text-destructive" : r.level === "warning" ? "text-warning" : undefined}>{r.watching ? "Fixed, watching" : LEVEL_LABEL[r.level]}</span>
                {` · ${whose(r)} · ${r.occurrence_count.toLocaleString()}× · ${costLabel(r, formatAdminUsd)}`}
              </span>
            </Link>
          )}
          cellLines="two"
          read={readOf({ loading, error }, { what: "spend alarms" })}
          emptyState={{ title: status === "ringing" ? (audience === "owner_decision" ? "Nothing needs you" : "No alarms ringing") : "No alarms" }}
          toolbar={{
            title: "Spend alarms",
            search: true,
            searchPlaceholder: "Search alarms, kinds, subjects…",
            actions: (
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl<AudienceFilter>
                  aria-label="Who it is for"
                  value={audience}
                  onValueChange={setAudience}
                  data={[
                    { value: "owner_decision", label: `${AUDIENCE_LABEL.owner_decision} ${ringingOf("owner_decision")}` },
                    { value: "agent_fix", label: `${AUDIENCE_LABEL.agent_fix} ${ringingOf("agent_fix")}` },
                    { value: "info_only", label: `${AUDIENCE_LABEL.info_only} ${ringingOf("info_only")}` },
                    { value: "any", label: "Everyone" },
                  ]}
                />
                <SegmentedControl<StatusFilter>
                  aria-label="Status"
                  value={status}
                  onValueChange={setStatus}
                  data={[
                    { value: "ringing", label: `Open ${ringing}` },
                    { value: "snoozed", label: `Muted ${counts.snoozed}` },
                    { value: "resolved", label: `Resolved ${resolvedCount}` },
                    { value: "all", label: "All" },
                  ]}
                />
                <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh">
                  {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            ),
          }}
          copy={{
            label: "Spend alarm",
            listLabel: "Spend alarms (this view)",
            location: SPEND_ALARMS_PATH,
            rowKind: "spend-alarm",
            listKind: "spend-alarm",
            humanRow: (r) => `${r.level} · ${alarmTitle(r)} · x${r.occurrence_count} · ${spendAlarmHref(r.id)}`,
            agentRow: (r) => ({ ...r, page: spendAlarmHref(r.id) }),
          }}
        />
      </div>
      <ConfirmDialog
        open={!!dialog && dialog.verb !== "mute"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog && dialog.verb !== "mute" ? dialogCopy[dialog.verb].title : ""}
        description={dialog && dialog.verb !== "mute" ? dialogCopy[dialog.verb].description : undefined}
        confirmLabel={dialog && dialog.verb !== "mute" ? dialogCopy[dialog.verb].confirmLabel : "Confirm"}
        variant={dialog?.verb === "reject" ? "destructive" : "default"}
        busy={dialogBusy}
        onConfirm={runDialog}
        content={
          dialog?.verb === "resolve" ? (
            <ProTextarea value={dialogNote} onChange={(e) => setDialogNote(e.target.value)} placeholder="Note (optional)" surfaceName="spend-alarm-board-resolve" />
          ) : undefined
        }
      />
      <MuteDialog
        open={dialog?.verb === "mute"}
        onOpenChange={(o) => !o && setDialog(null)}
        subject={dialogRow ? alarmTitle(dialogRow) : "this alarm"}
        scope="server"
        initialNote={dialogRow?.snooze_note ?? null}
        onConfirm={async (choice, muteNote) => {
          if (!dialogRow) return;
          await act(
            () => setSpendAlarmStatus(dialogRow.id, "snoozed", { snoozedUntil: new Date(Date.now() + choice.ms).toISOString(), note: muteNote }),
            `Muted for ${muteLabel(choice.ms)}`,
          );
        }}
      />
    </div>
  );
}
