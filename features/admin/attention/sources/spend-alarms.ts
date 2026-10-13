/**
 * Spend alarms as attention items — the PURE half of the spend-alarm source.
 *
 * THE DEFECT THIS EXISTS FOR (Arman, 2026-10-10): spend alarms had grown their own in-app rail —
 * a loud modal of notification rows with its own Snooze 24h and "Remind me later" — beside this
 * dock, which already had per-item mutes with a note, a whole-dock snooze and a review page. "I need
 * this thing to be on the proper admin notification system so I can snooze it." So every
 * unresolved `billing.spend_alarm` record is a row here, and nowhere else in the app:
 *
 *   severity        the record's level (critical / warning / info)
 *   record door     the alarm's own page, `/administration/billing/alarms/<id>`
 *   state           "1,388 times · last 4:51 PM"
 *   sentence        what happened, ids swapped for names (never a bare uuid)
 *   Where it shows  the blocked records (task, approval, agent, mandate, Source…) as doors
 *   evidence        the latest occurrence
 *   fix             what to do, or the fix already shipped in code
 *   actions         Approve / Reject (a held approval), Pause / Resume / Run once now (a task),
 *                   Resolve — each with its consequence stated first, through the record page's
 *                   own write paths
 *   mute            a FACT ABOUT THE RECORD: `spend_alarm_set_status('snoozed', until, note)`,
 *                   seen by every super admin; Unmute reopens it
 *   copy            the record page's "Copy for AI" payload
 *
 * Pure: the writes are injected, so the record → row mapping is proven offline against fixtures
 * shaped like `billing.spend_alarms_for_attention`.
 */

import { formatCount } from "@ai-matrx/kit/format";
import { formatSpendUsd } from "@/components/cost/formatAdminCost";
import {
  alarmActions,
  alarmAgentData,
  alarmControls,
  alarmCostLine,
  alarmHeadline,
  alarmSentence,
  alarmTitle,
  audienceOf,
  fetchSpendAlarmOccurrences,
  fixFor,
  KIND_LABEL,
  readable,
  refLinks,
  SPEND_ALARMS_PATH,
  spendAlarmHref,
  spendAlarmsByAudienceHref,
  whose,
  type SpendAlarmAttentionRow,
} from "@/features/admin/spend-alarms/spendAlarms";
import type { CostlyWorkflow } from "@/features/admin/spend-alarms/ciPause";
import { humanizeRelative } from "@/features/scheduling/utils/triggerHumanize";
import { HELD_RUN_ALARM_KINDS, heldRunHref } from "@/features/admin/held-runs/heldRuns";
import type { AttentionAction, AttentionItem } from "../types";
import { openOutbound } from "@ai-matrx/kit/outbound";

export const SPEND_ALARM_SOURCE_ID = "spend-alarms";
export const SPEND_ALARM_SOURCE_LABEL = "Spend alarms";
export const SPEND_ALARM_REVIEW_HREF = SPEND_ALARMS_PATH;

export interface SpendAlarmDeps {
  setStatus: (
    id: string,
    status: "open" | "snoozed" | "resolved",
    options: { snoozedUntil?: string; note?: string | null },
  ) => Promise<void>;
  decideApproval: (approvalId: string, decision: "approve" | "reject") => Promise<void>;
  setTaskEnabled: (taskId: string, enabled: boolean) => Promise<void>;
  /** Starts one run now and opens the task's page to watch it. */
  runTaskNow: (taskId: string) => Promise<void>;
  /** CI spend alarm: pause the workflows the server names (it refuses the release path), or resume them. */
  pauseCiWorkflows?: (alarmId: string) => Promise<void>;
  resumeCiWorkflows?: (alarmId: string) => Promise<void>;
  /** The costly workflows the server reports per CI alarm id (with $/day); absent until read. */
  ciCostly?: Readonly<Record<string, readonly CostlyWorkflow[]>>;
  now?: number;
  /** Prefix for absolute links in copied text (the page's origin); empty in tests. */
  origin?: string;
  /** The occurrences Copy for AI hands over (tests inject; the dock reads them on press). */
  fetchOccurrences?: (alarmId: string) => Promise<import("@/features/admin/spend-alarms/spendAlarms").SpendAlarmOccurrence[]>;
}

function lastSeen(iso: string, now: number): string {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) return "";
  const today = new Date(now);
  const sameDay =
    at.getFullYear() === today.getFullYear() &&
    at.getMonth() === today.getMonth() &&
    at.getDate() === today.getDate();
  return sameDay
    ? at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : humanizeRelative(iso);
}

function stateOf(row: SpendAlarmAttentionRow, now: number): string {
  const n = row.occurrence_count;
  const times = `${formatCount(n, { locale: "en-US" })} ${n === 1 ? "time" : "times"}`;
  const last = lastSeen(row.last_seen_at, now);
  const head = row.watching ? "Fixed, watching · " : "";
  return `${head}${last ? `${times} · last ${last}` : times}`;
}

/** ids → names the record already carries, so no sentence shows a uuid. */
function namesOf(row: SpendAlarmAttentionRow): Map<string, string> {
  const names = new Map<string, string>();
  if (row.subject_id && row.subject_name) names.set(row.subject_id, row.subject_name);
  if (row.refs.task_id && row.task_title) names.set(row.refs.task_id, row.task_title);
  if (row.refs.user_id && row.person) names.set(row.refs.user_id, row.person);
  for (const [id, name] of Object.entries(row.names ?? {})) if (!names.has(id)) names.set(id, name);
  return names;
}

export const GITHUB_BILLING_URL = "https://github.com/enterprises/ai-matrx/settings/billing";

/** "ai-matrx Deploy (12.50/day)": repo owner dropped. */
export function costlyLine(w: Pick<CostlyWorkflow, "repo" | "workflow" | "usd_per_day">): string {
  return `${w.repo.split("/").pop()} ${w.workflow} (${formatSpendUsd(w.usd_per_day)}/day)`;
}

/**
 * The CI spend card's button is real or absent. Pause: only the workflows the server says it may
 * pause, named with their $/day in the confirm. Once paused: Resume, and the card says what is paused.
 */
function ciActions(row: SpendAlarmAttentionRow, deps: SpendAlarmDeps): AttentionAction[] {
  const paused = row.ci_pause?.paused ?? [];
  if (paused.length > 0) {
    if (!deps.resumeCiWorkflows) return [];
    const resume = deps.resumeCiWorkflows;
    return [
      {
        id: "resume_ci_workflows",
        label: "Resume the paused workflows",
        variant: "outline",
        confirm: {
          title: "Turn the paused workflows back on?",
          description: `${paused.map((p) => costlyLine({ repo: p.repo, workflow: p.workflow, usd_per_day: p.usd_per_day ?? 0 })).join("; ")} run on every push again and bill again.`,
          confirmLabel: "Resume them",
        },
        run: () => resume(row.id),
      },
    ];
  }
  const pausable = (deps.ciCostly?.[row.id] ?? []).filter((w) => w.pausable);
  if (!deps.pauseCiWorkflows || pausable.length === 0) return [];
  const pause = deps.pauseCiWorkflows;
  const total = pausable.reduce((sum, w) => sum + w.usd_per_day, 0);
  return [
    {
      id: "pause_ci_workflows",
      label: "Pause the costly workflows",
      variant: "outline",
      confirm: {
        title: pausable.length === 1 ? "Pause this workflow on GitHub?" : `Pause these ${pausable.length} workflows on GitHub?`,
        description: `${pausable.map(costlyLine).join("; ")}. About ${formatSpendUsd(total)} a day stops billing. They stop running until you resume them; deploys and package publishing are never paused.`,
        confirmLabel: "Pause them",
        variant: "destructive",
      },
      run: () => pause(row.id),
    },
  ];
}

function pausedLine(row: SpendAlarmAttentionRow): string | null {
  const paused = row.ci_pause?.paused ?? [];
  if (paused.length === 0) return null;
  return `Paused on GitHub: ${paused.map((p) => costlyLine({ repo: p.repo, workflow: p.workflow, usd_per_day: p.usd_per_day ?? 0 })).join("; ")}.`;
}

function actionsOf(row: SpendAlarmAttentionRow, deps: SpendAlarmDeps): AttentionAction[] {
  const refs = row.refs;
  const taskName = row.task_title ?? "this automation";
  const subject = row.subject_name ?? (row.refs.agent_id ? row.names?.[row.refs.agent_id] : null) ?? whose(row);
  const ids = alarmActions(row, {
    task: row.task_enabled === null ? null : { enabled: row.task_enabled },
    approvalStatus: row.approval_status,
  });
  const out: AttentionAction[] = [];
  for (const id of ids) {
    if (id === "approve" && refs.approval_id) {
      const approvalId = refs.approval_id;
      out.push({
        id,
        label: "Approve",
        variant: "default",
        confirm: {
          title: `Approve spend for ${subject}?`,
          description: `Lets ${subject} run again without asking, at its current cost.`,
          confirmLabel: "Approve",
        },
        run: () => deps.decideApproval(approvalId, "approve"),
      });
    } else if (id === "reject" && refs.approval_id) {
      const approvalId = refs.approval_id;
      out.push({
        id,
        label: "Reject",
        variant: "outline",
        confirm: {
          title: `Reject spend for ${subject}?`,
          description: `Holds every automated run of ${subject} until someone approves it.`,
          confirmLabel: "Reject",
          variant: "destructive",
        },
        run: () => deps.decideApproval(approvalId, "reject"),
      });
    } else if (id === "pause" && refs.task_id) {
      const taskId = refs.task_id;
      out.push({
        id,
        label: "Pause",
        variant: "outline",
        confirm: {
          title: `Pause ${taskName}?`,
          description: `Stops ${taskName} from firing until someone resumes it. Runs already going finish.`,
          confirmLabel: "Pause",
          variant: "destructive",
        },
        run: () => deps.setTaskEnabled(taskId, false),
      });
    } else if (id === "resume" && refs.task_id) {
      const taskId = refs.task_id;
      out.push({
        id,
        label: "Resume",
        variant: "outline",
        confirm: {
          title: `Resume ${taskName}?`,
          description: `${taskName} fires on its schedule again and spends what each run costs.`,
          confirmLabel: "Resume",
        },
        run: () => deps.setTaskEnabled(taskId, true),
      });
    } else if (id === "run_now" && refs.task_id) {
      const taskId = refs.task_id;
      out.push({
        id,
        label: "Run once now",
        variant: "outline",
        confirm: {
          title: `Run ${taskName} once now?`,
          description: `Runs ${taskName} once now, as you, and spends what one run costs. Its page opens in a new tab to watch.`,
          confirmLabel: "Run and watch",
        },
        run: () => deps.runTaskNow(taskId),
      });
    }
    // open_agent / open_mandate / open_source are doors ("Where it shows"), not actions.
  }
  if (HELD_RUN_ALARM_KINDS.has(row.kind)) {
    // The run this alarm stopped, kept frozen: watch it, edit, replay (features/admin/held-runs).
    out.push({
      id: "open_held_run",
      label: "Open the run",
      variant: "outline",
      confirm: {
        title: "Open the run this alarm stopped?",
        description: "Shows its inputs and prompt. Nothing runs until you press Replay there.",
        confirmLabel: "Open the run",
      },
      run: async () => {
        if (typeof window !== "undefined") window.location.assign(heldRunHref(row.id));
      },
    });
  }
  if (row.kind === "ci_spend_off_track") out.push(...ciActions(row, deps));
  if (row.kind === "ci_billing_block") {
    // Only Arman can fix GitHub billing: the one button opens GitHub's billing page.
    out.push({
      id: "fix_github_billing",
      label: "Fix GitHub billing",
      variant: "outline",
      confirm: {
        title: "Open GitHub billing?",
        description: "No deploys or package releases run until billing is fixed. Opens GitHub's billing settings in a new tab.",
        confirmLabel: "Fix GitHub billing",
      },
      run: async () => {
        if (typeof window !== "undefined") openOutbound(GITHUB_BILLING_URL, "_blank", "noopener");
      },
    });
  }
  out.push({
    id: "resolve",
    label: "Resolve",
    variant: "outline",
    confirm: {
      title: "Resolve this alarm for everyone?",
      description:
        "Closes it for every super admin. It reopens by itself the next time it happens, and its history stays on the record.",
      confirmLabel: "Resolve",
    },
    run: () => deps.setStatus(row.id, "resolved", {}),
  });
  return out;
}

/**
 * The agent-fix line: unresolved `agent_fix` records, being fixed by agents through the work queue.
 * Muted ones are not counted (the owner already chose not to hear about them).
 */
export function delegatedSpendAlarms(
  rows: readonly SpendAlarmAttentionRow[],
  now: number = Date.now(),
): { count: number; href: string } | null {
  const count = rows.filter(
    (r) => audienceOf(r) === "agent_fix" && r.status !== "resolved" && !(r.status === "snoozed" && r.snoozed_until && Date.parse(r.snoozed_until) > now),
  ).length;
  return count > 0 ? { count, href: spendAlarmsByAudienceHref("agent_fix") } : null;
}

export function spendAlarmItems(
  rows: readonly SpendAlarmAttentionRow[],
  deps: SpendAlarmDeps,
): AttentionItem[] {
  const now = deps.now ?? Date.now();
  const origin = deps.origin ?? "";
  // The owner's card shows only what needs him (Arman 2026-10-11): agent_fix is a count line,
  // info_only lives on the list under "Worked as designed".
  return rows.filter((row) => audienceOf(row) === "owner_decision").map((row) => {
    const names = namesOf(row);
    const href = spendAlarmHref(row.id);
    const title = alarmTitle({ ...row, names: Object.fromEntries(names) });

    const doors: AttentionItem["doors"] = [];
    for (const link of refLinks(row.refs)) {
      if (!link.href) continue;
      doors.push({
        kind: "impact",
        href: link.href,
        label: names.get(link.value) ?? link.label,
        what: link.label,
      });
    }
    for (const control of alarmControls(row)) {
      doors.push({ kind: "control", href: control.href, label: control.label });
    }
    if (row.latest_occurrence_at) {
      doors.push({
        kind: "evidence",
        href: `${href}#occurrences`,
        label: "Latest occurrence",
        what: row.latest_occurrence_detail
          ? alarmSentence({ ...row, detail: row.latest_occurrence_detail, names: Object.fromEntries(names) })
          : undefined,
      });
    }

    const shipped = fixFor(row);
    const baseFix = shipped ? `Fixed in code (${shipped.commit}): ${shipped.what}` : row.fix;
    const fix = [pausedLine(row), baseFix].filter(Boolean).join(" ") || null;
    const cost = alarmCostLine(row.cost_usd, row.cost_avoided_usd, (n) => formatSpendUsd(n));

    const untilMs = row.snoozed_until ? Date.parse(row.snoozed_until) : NaN;
    const current =
      row.status === "snoozed" && Number.isFinite(untilMs) && untilMs > now
        ? { until: row.snoozed_until as string, reason: row.snooze_note, by: row.snoozed_by }
        : null;

    const sentence = alarmSentence({ ...row, names: Object.fromEntries(names) });

    return {
      key: `${SPEND_ALARM_SOURCE_ID}:${row.id}`,
      sourceId: SPEND_ALARM_SOURCE_ID,
      id: row.id,
      severity: row.level,
      title,
      state: stateOf(row, now),
      sentence,
      about: [row.audience_note, whose(row), cost].filter(Boolean).join(" · ") || null,
      audience: "owner_decision",
      fix: fix ?? null,
      record: { token: "spend_alarm", id: row.id, href },
      doors,
      impactDeclared: doors.some((d) => d.kind === "impact") ? true : null,
      actions: actionsOf(row, deps),
      mute: {
        scope: "server",
        current,
        apply: (until, note) =>
          deps.setStatus(row.id, "snoozed", { snoozedUntil: new Date(until).toISOString(), note }),
        clear: () => deps.setStatus(row.id, "open", {}),
      },
      copy: {
        label: "Spend alarm",
        human: () => [title, sentence, fix ? `What to do: ${fix}` : "", `${origin}${href}`].filter(Boolean).join("\n"),
        // The real occurrences and cost, read when Copy for AI is pressed (never an empty list).
        agent: async () => ({
          kind: "spend-alarm",
          location: href,
          description: "One spend alarm with its ids, its occurrences and the records it blocked.",
          attributes: { level: row.level, status: row.status, count: row.occurrence_count },
          data: alarmAgentData(row, await (deps.fetchOccurrences ?? fetchSpendAlarmOccurrences)(row.id), origin),
        }),
      },
    };
  });
}

/** "Spend alarms: 2 critical, 1 needs a decision, 1 for your information." */
export function summarizeSpendAlarms(items: readonly AttentionItem[]): string | null {
  if (items.length === 0) return null;
  const critical = items.filter((i) => i.severity === "critical").length;
  const warning = items.filter((i) => i.severity === "warning").length;
  const info = items.length - critical - warning;
  const parts = [
    critical > 0 ? `${critical} critical` : "",
    warning > 0 ? `${warning} ${warning === 1 ? "needs" : "need"} a decision` : "",
    info > 0 ? `${info} for your information` : "",
  ].filter(Boolean);
  return `Spend alarms: ${parts.join(", ")}.`;
}
