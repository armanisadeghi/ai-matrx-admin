// features/admin/spend-alarms/spendAlarms.ts
//
// THE spend alarm record (Arman, 2026-10-10): every alarm is ONE durable row in
// `billing.spend_alarm` (one per kind + subject, shared by every super admin), with an
// occurrence row per write in `billing.spend_alarm_occurrence`. aidream's
// `services/billing/spend_alarm.py` is the only writer (through `billing.spend_alarm_raise`);
// the panel, the list and the record page all open `/administration/billing/alarms/<id>`.
//
// `refs` carries the blocked thing's own ids. `refLinks` turns each into the exact record's
// door, `alarmActions` decides which actions apply. Both are pure so the guard tests can
// prove every kind opens something real.

import { formatCount } from "@ai-matrx/kit/format";
import { formatSpendUsd } from "@/components/cost/formatAdminCost";
import { supabase } from "@/utils/supabase/client";
import { pgErrorToError } from "@ai-matrx/data";
import { adminScheduleHref } from "@/features/scheduling/constants/routes";
import { ciPauseOf, type CiPauseRecord } from "./ciPause";
import { documentHref } from "@/features/scopes/registry/entityRegistry";
import { knobHref } from "@/features/admin/limits/knobHref";

export type AlarmLevel = "critical" | "warning" | "info";
export type AlarmStatus = "open" | "snoozed" | "resolved";

export const SPEND_ALARMS_PATH = "/administration/billing/alarms";
export const spendAlarmHref = (id: string) => `${SPEND_ALARMS_PATH}/${id}`;

/**
 * Who an alarm is FOR (aidream services/billing/alarm_audience.py, Arman 2026-10-11): the owner's
 * card shows only `owner_decision`; `agent_fix` is filed into the agent work queue and resolves with
 * it; `info_only` is a protection that worked as designed (list only).
 */
export type AlarmAudience = "owner_decision" | "agent_fix" | "info_only";
export const ALARM_AUDIENCES: readonly AlarmAudience[] = ["owner_decision", "agent_fix", "info_only"];
export const AUDIENCE_LABEL: Record<AlarmAudience, string> = {
  owner_decision: "Your decision",
  agent_fix: "Agents fixing",
  info_only: "Worked as designed",
};
export const spendAlarmsByAudienceHref = (audience: AlarmAudience) => `${SPEND_ALARMS_PATH}?audience=${audience}`;
/** The agent work item an `agent_fix` alarm is filed as (users.user_feedback, the feedback console deep link). */
export const workItemHref = (id: string) => `/administration/users/feedback?feedback=${encodeURIComponent(id)}`;
export function audienceOf(r: { audience?: AlarmAudience | null }): AlarmAudience {
  return r.audience && ALARM_AUDIENCES.includes(r.audience) ? r.audience : "owner_decision";
}

/** Every ref key the writer may send (aidream `REF_KEYS`). */
export type AlarmRefs = Partial<
  Record<
    | "task_id"
    | "run_id"
    | "trigger_id"
    | "workflow_run_id"
    | "execution_id"
    | "agent_id"
    | "mandate_key"
    | "user_id"
    | "organization_id"
    | "approval_id"
    | "source_kind"
    | "source_id"
    | "document_id"
    | "file_id"
    | "batch_id"
    | "handler"
    | "driver"
    | "actor"
    | "sms_message_id"
    | "provider"
    | "operation"
    | "knob"
    | "conversation_id"
    | "request_id"
    | "scope"
    | "window"
    | "subject_kind"
    | "subject_ref",
    string
  >
>;

export interface SpendAlarmRecord {
  id: string;
  kind: string;
  level: AlarmLevel;
  title: string;
  detail: string;
  rule: string | null;
  fix: string | null;
  subject_type: string;
  subject_id: string;
  subject_name: string | null;
  refs: AlarmRefs;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  cost_usd: number | null;
  cost_avoided_usd: number | null;
  status: AlarmStatus;
  snoozed_until: string | null;
  /** Why it was muted (the attention dock's Mute note); null when not snoozed or no note. */
  snooze_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  reopened_count: number;
  /** The gate refused before any money moved. */
  refused: boolean;
  /** A fix already shipped for this kind (aidream ALARM_KINDS.code_fix). */
  code_fix: CodeFix | null;
  /** The person behind the alarm as "Name (email)", resolved by the writer. */
  person: string | null;
  /** The table's grade; `level` is the EFFECTIVE level (a watched fix reads info). */
  graded_level?: AlarmLevel;
  /** Its fix has shipped and it has not happened since: "Fixed, watching" (critical again if it recurs). */
  watching?: boolean;
  /** Every ref id the record carries, by name (org, agent, mandate label, person, task). */
  names?: Record<string, string>;
  /** Who muted it (name or email). */
  snoozed_by?: string | null;
  /** How many occurrence rows are recorded (each carries a times count). */
  recorded_rows?: number;
  /** Who the alarm is for; absent on rows read before the column existed (= owner_decision). */
  audience?: AlarmAudience;
  /** Why an agent_fix alarm came back to the owner: what the agent tried. */
  audience_note?: string | null;
  /** The agent work item (users.user_feedback) an agent_fix alarm is filed as. */
  work_item_id?: string | null;
  work_item_status?: string | null;
  /** The record this one was merged into (one record per decision). */
  merged_into?: string | null;
}

export interface CodeFix {
  on: string;
  /** When the fix landed (ISO); occurrences after it mean it is not deployed yet. */
  at?: string;
  commit: string;
  what: string;
  related_kind?: string;
  /** The fix covers only records whose handler is this one. */
  handler?: string;
}

export interface SpendAlarmOccurrence {
  id: string;
  /** The Source this occurrence was about, resolved by title (`billing.spend_alarm_occurrence_rows`). */
  source?: Omit<AlarmSourceItem, "id" | "source_kind" | "times" | "last_at"> | null;
  /** Collapsed rows: how many Sources this one line stands for. */
  collapsed?: number;
  occurred_at: string;
  repeat_count: number;
  run_id: string | null;
  execution_id: string | null;
  refs: AlarmRefs;
  detail: string | null;
  cost_usd: number | null;
  /** What this refusal would have cost, from its held run's estimate; null when none was captured. */
  cost_avoided_usd?: number | null;
}

const RECORD_COLUMNS =
  "id, kind, level, title, detail, rule, fix, subject_type, subject_id, subject_name, refs, occurrence_count, first_seen_at, last_seen_at, cost_usd, cost_avoided_usd, status, snoozed_until, snooze_note, resolved_at, resolved_by, resolution_note, reopened_count, metadata";

function asRefs(value: unknown): AlarmRefs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v) out[k] = v;
  }
  return out as AlarmRefs;
}

function toRecord(row: Record<string, unknown>): SpendAlarmRecord {
  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  const fix = meta.code_fix && typeof meta.code_fix === "object" ? (meta.code_fix as CodeFix) : null;
  return {
    ...(row as unknown as SpendAlarmRecord),
    refused: meta.refused === true,
    person: typeof meta.person === "string" && meta.person ? meta.person : null,
    code_fix: fix && typeof fix.what === "string" ? fix : null,
    refs: asRefs(row.refs),
    cost_usd: row.cost_usd == null ? null : Number(row.cost_usd),
    cost_avoided_usd: row.cost_avoided_usd == null ? null : Number(row.cost_avoided_usd),
  };
}

function billing() {
  // billing.spend_alarm* are read through the platform-admin lane (RLS platform_admin_read).
  return supabase.schema("billing");
}

/** One row of `billing.spend_alarm_rows` — THE read the dock and the list share. */
function fromRowsDoor(raw: Record<string, unknown>): SpendAlarmAttentionRow {
  const meta = (raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {}) as Record<string, unknown>;
  const names: Record<string, string> = {};
  if (raw.names && typeof raw.names === "object") {
    for (const [k, v] of Object.entries(raw.names as Record<string, unknown>)) if (typeof v === "string" && v) names[k] = v;
  }
  return {
    ...toRecord(raw),
    resolved_by: strOrNull(raw.resolved_by),
    snooze_note: strOrNull(raw.snooze_note),
    snoozed_by: strOrNull(raw.snoozed_by),
    graded_level: (raw.graded_level as AlarmLevel | undefined) ?? (raw.level as AlarmLevel),
    watching: raw.watching === true,
    names,
    recorded_rows: typeof raw.recorded_rows === "number" ? raw.recorded_rows : undefined,
    merged_into: typeof meta.merged_into === "string" ? meta.merged_into : null,
    latest_occurrence_at: strOrNull(raw.latest_occurrence_at),
    latest_occurrence_detail: strOrNull(raw.latest_occurrence_detail),
    task_enabled: typeof raw.task_enabled === "boolean" ? raw.task_enabled : null,
    task_title: strOrNull(raw.task_title),
    approval_status: strOrNull(raw.approval_status),
    ci_pause: ciPauseOf(meta),
    audience: audienceOf({ audience: raw.audience as AlarmAudience | null }),
    audience_note: strOrNull(raw.audience_note),
    work_item_id: strOrNull(raw.work_item_id),
    work_item_status: strOrNull(raw.work_item_status),
  };
}

/** PostgREST answers at most 1,000 rows per request; the reader pages until the door is empty. */
export const ROWS_PAGE = 1000;

/**
 * Every spend alarm record (or just `id`) through `billing.spend_alarm_rows`, all pages. The dock
 * reads the unresolved ones, the list reads everything — the SAME door, so their counts agree.
 */
export async function fetchSpendAlarmRows(
  options: { id?: string; includeResolved?: boolean } = {},
): Promise<SpendAlarmAttentionRow[]> {
  const out: SpendAlarmAttentionRow[] = [];
  for (let from = 0; ; from += ROWS_PAGE) {
    const { data, error } = await billing()
      .rpc("spend_alarm_rows", { p_id: options.id ?? null, p_include_resolved: options.includeResolved ?? true } as never)
      .range(from, from + ROWS_PAGE - 1);
    if (error) throw pgErrorToError(error);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    out.push(...rows.map(fromRowsDoor));
    if (rows.length < ROWS_PAGE) return out;
  }
}

export async function fetchSpendAlarm(id: string): Promise<SpendAlarmAttentionRow | null> {
  const rows = await fetchSpendAlarmRows({ id });
  return rows[0] ?? null;
}

export async function fetchSpendAlarms(): Promise<SpendAlarmAttentionRow[]> {
  return fetchSpendAlarmRows({ includeResolved: true });
}

export async function fetchSpendAlarmsOfKind(kind: string): Promise<SpendAlarmRecord[]> {
  const { data, error } = await billing()
    .from("spend_alarm")
    .select(RECORD_COLUMNS)
    .eq("kind", kind)
    .is("deleted_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(200);
  if (error) throw pgErrorToError(error);
  return (data ?? []).map((r) => toRecord(r as Record<string, unknown>));
}

/** Status of the records behind the panel's alarms: resolved and snoozed ones stay quiet. */
export async function fetchSpendAlarmStatuses(
  ids: string[],
): Promise<Map<string, Pick<SpendAlarmRecord, "status" | "snoozed_until">>> {
  const out = new Map<string, Pick<SpendAlarmRecord, "status" | "snoozed_until">>();
  if (ids.length === 0) return out;
  const { data, error } = await billing().from("spend_alarm").select("id, status, snoozed_until").in("id", ids);
  if (error) throw pgErrorToError(error);
  for (const r of data ?? []) {
    const row = r as { id: string; status: AlarmStatus; snoozed_until: string | null };
    out.set(row.id, { status: row.status, snoozed_until: row.snoozed_until });
  }
  return out;
}

export async function fetchSpendAlarmOccurrences(alarmId: string): Promise<SpendAlarmOccurrence[]> {
  // Every occurrence, all pages (a skip record has hundreds), each with its Source by title.
  const out: SpendAlarmOccurrence[] = [];
  for (let from = 0; ; from += ROWS_PAGE) {
    // The installed @ai-matrx/data types predate this door (added 2026-10-10, live); they gain it on
    // the next package publish, and this cast goes then.
    const rpc = billing().rpc as unknown as (fn: string, args: Record<string, unknown>) => ReturnType<ReturnType<typeof billing>["rpc"]>;
    const { data, error } = await rpc.call(billing(), "spend_alarm_occurrence_rows", { p_alarm_id: alarmId }).range(from, from + ROWS_PAGE - 1);
    if (error) throw pgErrorToError(error);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    for (const row of rows) {
      out.push({
        ...(row as unknown as SpendAlarmOccurrence),
        refs: asRefs(row.refs),
        cost_usd: row.cost_usd == null ? null : Number(row.cost_usd),
        cost_avoided_usd: row.cost_avoided_usd == null ? null : Number(row.cost_avoided_usd),
        source: row.source && typeof row.source === "object" ? (row.source as SpendAlarmOccurrence["source"]) : null,
      });
    }
    if (rows.length < ROWS_PAGE) return out;
  }
}

/** Occurrences about Sources that no longer exist read as ONE line per type, with a count. */
export function collapseGoneSources(occ: readonly SpendAlarmOccurrence[]): SpendAlarmOccurrence[] {
  const out: SpendAlarmOccurrence[] = [];
  const gone = new Map<string, SpendAlarmOccurrence & { ids: Set<string> }>();
  for (const o of occ) {
    if (!o.source?.missing || !o.refs.source_id) {
      out.push(o);
      continue;
    }
    const kind = o.source.kind;
    const g = gone.get(kind);
    if (!g) {
      gone.set(kind, { ...o, ids: new Set([o.refs.source_id]) });
    } else {
      g.repeat_count += o.repeat_count;
      g.ids.add(o.refs.source_id);
      if (o.occurred_at > g.occurred_at) g.occurred_at = o.occurred_at;
    }
  }
  for (const g of gone.values()) {
    const { ids, ...row } = g;
    out.push({ ...row, id: `gone:${row.source?.kind}`, collapsed: ids.size });
  }
  return out.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

/** An occurrence's Source as a line: its title, or "3 messages that no longer exist (deleted)". */
export function occurrenceSourceTitle(o: SpendAlarmOccurrence): string | null {
  if (!o.refs.source_id || !o.source) return null;
  if (o.collapsed) {
    const kind = o.source.kind === "source" ? "Source" : o.source.kind;
    return o.collapsed === 1 ? `1 ${kind} that no longer exists (deleted)` : `${formatCount(o.collapsed)} ${kind}s that no longer exist (deleted)`;
  }
  return alarmSourceTitle({ ...o.source, id: o.refs.source_id, source_kind: o.refs.source_kind ?? "source", times: o.repeat_count, last_at: o.occurred_at });
}

/** Mandate display names by key (one read), for every place a mandate is named. */
export async function fetchMandateLabels(keys: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const want = [...new Set(keys.filter(Boolean))];
  if (!want.length) return out;
  const { data } = await supabase.schema("mandate").from("definition").select("mandate_key, label").in("mandate_key", want).is("deleted_at", null);
  for (const d of (data ?? []) as { mandate_key: string; label: string | null }[]) if (d.label) out.set(d.mandate_key, d.label);
  return out;
}

/**
 * Resolve (for everyone; it reopens if it happens again), snooze, or reopen. A snooze is a fact
 * about the record: until when (`snoozedUntil`, else `snoozeHours` from now), why (`note`) and who
 * (the caller) — the attention dock's Mute writes exactly this, so every super admin sees it.
 */
export async function setSpendAlarmStatus(
  id: string,
  status: AlarmStatus,
  options: { note?: string | null; snoozeHours?: number; snoozedUntil?: string } = {},
): Promise<void> {
  const { error } = await billing().rpc("spend_alarm_set_status", {
    p_id: id,
    p_status: status,
    p_note: options.note || undefined,
    p_snooze_hours: options.snoozeHours ?? 24,
    p_snoozed_until: options.snoozedUntil,
  });
  if (error) throw pgErrorToError(error);
}

// ── The attention dock's read ──────────────────────────────────────────────

/**
 * One unresolved alarm as the super-admin attention dock reads it
 * (`billing.spend_alarms_for_attention`, a super-admin door that works on every page, not only
 * inside the admin lane): the record, its snooze (until, note, who), its latest occurrence, and the
 * live task/approval state its actions depend on.
 */
export interface SpendAlarmAttentionRow extends SpendAlarmRecord {
  /** The snoozer's email. */
  snoozed_by: string | null;
  latest_occurrence_at: string | null;
  latest_occurrence_detail: string | null;
  /** The named scheduled task's state; null when the record names none or it is gone. */
  task_enabled: boolean | null;
  task_title: string | null;
  approval_status: string | null;
  /** CI spend alarms: the workflows paused from the dock (server-recorded), null when none. */
  ci_pause?: CiPauseRecord | null;
}

const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export async function fetchSpendAlarmsForAttention(): Promise<SpendAlarmAttentionRow[]> {
  return fetchSpendAlarmRows({ includeResolved: false });
}

// ── One count, two surfaces ────────────────────────────────────────────────

export interface AlarmCounts {
  critical: number;
  warning: number;
  info: number;
  snoozed: number;
}

/**
 * THE count of spend alarms, used by the attention dock's spend section AND the list's KPI tiles:
 * ringing records by effective level, plus how many are muted. Same rows, same function, same
 * numbers (guard: spendAlarms.test.ts "list and dock agree").
 */
export function spendAlarmCounts(
  rows: readonly Pick<SpendAlarmRecord, "level" | "status" | "snoozed_until">[],
  now: number = Date.now(),
): AlarmCounts {
  const out: AlarmCounts = { critical: 0, warning: 0, info: 0, snoozed: 0 };
  for (const r of rows) {
    if (r.status === "resolved") continue;
    if (!isRinging(r, now)) {
      out.snoozed += 1;
      continue;
    }
    out[r.level] += 1;
  }
  return out;
}

// ── The Sources an alarm is about ──────────────────────────────────────────

export interface AlarmSourceItem {
  id: string;
  /** Resolved type: note, document, space, task, message, source. */
  kind: string;
  /** The raw kind the writer recorded (the group key). */
  source_kind: string;
  title: string | null;
  deleted?: boolean;
  missing?: boolean;
  parent_id?: string;
  format?: string | null;
  times: number;
  last_at: string;
}

export interface AlarmSourceGroup {
  kind: string;
  total: number;
  items: AlarmSourceItem[];
}

export async function fetchAlarmSources(
  alarmId: string,
  options: { kind?: string; offset?: number; limit?: number } = {},
): Promise<{ total: number; groups: AlarmSourceGroup[] }> {
  const { data, error } = await billing().rpc("spend_alarm_sources", {
    p_alarm_id: alarmId,
    p_kind: options.kind ?? null,
    p_offset: options.offset ?? 0,
    p_limit: options.limit ?? 10,
  } as never);
  if (error) throw pgErrorToError(error);
  const v = (data ?? { total: 0, groups: [] }) as { total: number; groups: AlarmSourceGroup[] };
  return { total: v.total ?? 0, groups: v.groups ?? [] };
}

const SOURCE_GROUP_LABEL: Record<string, string> = {
  note: "Notes",
  document: "Documents",
  task: "Tasks",
  cx_message: "Chat messages",
  source: "Other Sources",
};

export function sourceGroupLabel(kind: string): string {
  return SOURCE_GROUP_LABEL[kind] ?? kind.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** A Source's own page; null when it is gone. */
export function alarmSourceHref(item: AlarmSourceItem): string | null {
  if (item.deleted || item.missing) return null;
  switch (item.kind) {
    case "note":
      return `/notes/${item.id}`;
    case "task":
      return `/tasks/${item.id}`;
    case "message":
      return item.parent_id ? `/chat/${item.parent_id}` : null;
    case "space":
    case "document":
      return documentHref(item.id, item.format ?? (item.kind === "space" ? "spaces" : null));
    default:
      return null;
  }
}

/** "Potential Common Apps", "(deleted)", or "A note that no longer exists". */
export function alarmSourceTitle(item: AlarmSourceItem): string {
  if (item.missing || !item.title) return `${item.kind === "message" ? "A message" : `A ${item.kind}`} that no longer exists (deleted)`;
  return item.deleted ? `${item.title} (deleted)` : item.title;
}

/** Whether a record should ring now: open, or snoozed past its time. */
export function isRinging(r: Pick<SpendAlarmRecord, "status" | "snoozed_until">, now: number = Date.now()): boolean {
  if (r.status === "open") return true;
  if (r.status === "snoozed") return !r.snoozed_until || Date.parse(r.snoozed_until) <= now;
  return false;
}

// ── Doors: each ref opens the exact record ─────────────────────────────────

export interface RefLink {
  key: keyof AlarmRefs;
  label: string;
  value: string;
  /** The exact record's page; null only for ids with no page anywhere (they stay copyable). */
  href: string | null;
  /** Registry token for an EntityRef, when one fits. */
  token?: string;
}

const SOURCE_KIND_HREF: Record<string, (id: string) => string> = {
  note: (id) => `/notes/${id}`,
  document: (id) => `/documents/${id}`,
  cx_message: (id) => `/chat/${id}`,
};

const REF_LABEL: Record<keyof AlarmRefs, string> = {
  task_id: "Scheduled task",
  run_id: "Run",
  trigger_id: "Workflow trigger",
  workflow_run_id: "Workflow run",
  execution_id: "Execution",
  agent_id: "Agent",
  mandate_key: "Mandate",
  user_id: "Account",
  organization_id: "Organization",
  approval_id: "Spend approval",
  source_kind: "Source kind",
  source_id: "Source",
  document_id: "Document",
  file_id: "File",
  batch_id: "Batch",
  handler: "Handler",
  driver: "Started by",
  actor: "Actor",
  sms_message_id: "SMS",
  provider: "Provider",
  operation: "Operation",
  knob: "Price knob",
  conversation_id: "Conversation",
  request_id: "Request",
  scope: "Scope",
  window: "Window",
  subject_kind: "Subject kind",
  subject_ref: "Subject",
};

/** The page each ref opens. Values are the blocked thing's own ids. */
export function refHref(key: keyof AlarmRefs, value: string, refs: AlarmRefs = {}): string | null {
  switch (key) {
    case "task_id":
      return adminScheduleHref(value);
    case "run_id":
      // A scheduled run has no page of its own: its task's page lists its runs live.
      return refs.task_id ? adminScheduleHref(refs.task_id) : null;
    case "workflow_run_id":
      return `/workflows/runs/${value}`;
    case "execution_id":
      return `/administration/usage?def=ai_usage_executions&f.execution=${encodeURIComponent(value)}`;
    case "agent_id":
      return `/administration/agents/system-agents/agents/${value}/build`;
    case "mandate_key":
      return `/administration/intelligence/mandates/${encodeURIComponent(value)}`;
    case "user_id":
      return `/administration/users/usage?user=${encodeURIComponent(value)}`;
    case "organization_id":
      return `/administration/scopes-context/organizations/${value}`;
    case "approval_id":
      return `/administration/billing/approvals?id=${encodeURIComponent(value)}`;
    case "source_id": {
      const build = refs.source_kind ? SOURCE_KIND_HREF[refs.source_kind] : undefined;
      return build ? build(value) : null;
    }
    case "conversation_id":
      return `/chat/${value}`;
    case "knob":
      return knobHref(value);
    default:
      return null;
  }
}

/** Ordered: the blocked thing first, then who and where, then the carriers. */
const REF_ORDER: (keyof AlarmRefs)[] = [
  "task_id",
  "run_id",
  "trigger_id",
  "workflow_run_id",
  "execution_id",
  "approval_id",
  "agent_id",
  "mandate_key",
  "source_id",
  "source_kind",
  "document_id",
  "file_id",
  "batch_id",
  "handler",
  "driver",
  "actor",
  "user_id",
  "organization_id",
  "sms_message_id",
  "provider",
  "operation",
  "knob",
  "conversation_id",
  "request_id",
  "scope",
  "window",
  "subject_kind",
  "subject_ref",
];

export function refLinks(refs: AlarmRefs): RefLink[] {
  const out: RefLink[] = [];
  for (const key of REF_ORDER) {
    const value = refs[key];
    if (!value) continue;
    out.push({ key, label: REF_LABEL[key], value, href: refHref(key, value, refs) });
  }
  return out;
}

// ── Controls: where the limit that rang this alarm is changed ───────────────

/**
 * Every alarm that rings at a threshold names the setting that sets it (Arman, 2026-10-13: "when we
 * have pages like this or the notification for them, they always link to the place where I can
 * control them"). The value is a knob key or feature prefix; `knobHref` opens the Limits & Knobs
 * page filtered to it. A kind absent here rings on a rule, not a number (a protected account, an
 * unpriced call's own `knob` ref), and shows no control.
 */
const KIND_CONTROL: Record<string, { label: string; knob: string }> = {
  ci_spend_off_track: { label: "GitHub Actions caps", knob: "billing.ci_spend" },
  ci_workflow_cost: { label: "GitHub Actions caps", knob: "billing.ci_spend" },
  spend_spike_platform_hourly: { label: "Spend spike settings", knob: "billing.spend_alarm" },
  spend_spike_platform_daily: { label: "Spend spike settings", knob: "billing.spend_alarm" },
  spend_spike_account_daily: { label: "Spend spike settings", knob: "billing.spend_alarm" },
  automated_run_expensive: { label: "Run cost alarm", knob: "billing.spend_alarm.run_" },
  spend_approval_hold: { label: "Approval threshold", knob: "billing.run_approval" },
  spend_approval_opened: { label: "Approval threshold", knob: "billing.run_approval" },
  spend_approval_expiring: { label: "Approval settings", knob: "billing.run_approval" },
  spend_approval_expired: { label: "Approval settings", knob: "billing.run_approval" },
  "reconcile.llm_drift": { label: "Drift tolerance", knob: "billing.llm_reconciliation" },
  "guardrail.check_failed": { label: "Automation guardrails", knob: "automation.guardrails" },
  "guardrail.max_runtime": { label: "Max time per run", knob: "automation.guardrails.max_runtime" },
  "guardrail.max_turns": { label: "Max turns per run", knob: "automation.guardrails.max_turns" },
  "guardrail.kill_switch": { label: "Pause all automation", knob: "automation.kill_switch" },
};

export interface AlarmControl {
  label: string;
  href: string;
}

/** The settings that decide when this alarm rings: its kind's knobs, then a knob it names itself. */
export function alarmControls(record: Pick<SpendAlarmRecord, "kind" | "refs">): AlarmControl[] {
  const out: AlarmControl[] = [];
  const byKind = KIND_CONTROL[record.kind] ?? (record.kind.startsWith("guardrail.") ? KIND_CONTROL["guardrail.check_failed"] : undefined);
  if (byKind) out.push({ label: byKind.label, href: knobHref(byKind.knob) });
  if (record.refs.knob) out.push({ label: REF_LABEL.knob, href: knobHref(record.refs.knob) });
  return out;
}

// ── Actions: shown only when they apply ─────────────────────────────────────

export type AlarmActionId =
  | "run_now"
  | "pause"
  | "resume"
  | "approve"
  | "reject"
  | "open_agent"
  | "open_mandate"
  | "open_source";

export interface AlarmActionContext {
  /** The scheduled task's live state, when the record names one (null = unreadable/missing). */
  task?: { enabled: boolean } | null;
  /** The spend approval's live status, when the record names one. */
  approvalStatus?: string | null;
}

export function alarmActions(record: Pick<SpendAlarmRecord, "refs">, ctx: AlarmActionContext = {}): AlarmActionId[] {
  const r = record.refs;
  const out: AlarmActionId[] = [];
  if (r.task_id && ctx.task) {
    out.push("run_now");
    out.push(ctx.task.enabled ? "pause" : "resume");
  }
  if (r.approval_id) {
    if (ctx.approvalStatus !== "approved") out.push("approve");
    if (ctx.approvalStatus !== "rejected") out.push("reject");
  }
  if (r.agent_id) out.push("open_agent");
  if (r.mandate_key) out.push("open_mandate");
  if (r.source_id && refHref("source_id", r.source_id, r)) out.push("open_source");
  return out;
}

export async function fetchTaskState(taskId: string): Promise<{ enabled: boolean; title: string; user_id: string } | null> {
  const { data, error } = await supabase
    .schema("scheduler")
    .from("sch_task")
    .select("enabled, title, user_id")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw pgErrorToError(error);
  return (data as { enabled: boolean; title: string; user_id: string } | null) ?? null;
}

// ── Copy for AI: everything an agent needs to investigate ──────────────────

export function alarmAgentData(record: SpendAlarmRecord, occurrences: SpendAlarmOccurrence[] = [], origin = "") {
  return {
    alarm: {
      id: record.id,
      page: `${origin}${spendAlarmHref(record.id)}`,
      kind: record.kind,
      level: record.level,
      status: record.status,
      snoozed_until: record.snoozed_until,
      title: alarmTitle(record),
      what_happened: alarmSentence(record),
      rule: record.rule,
      fix: record.fix,
      change_the_limit: alarmControls(record).map((c) => ({ setting: c.label, link: `${origin}${c.href}` })),
      subject: { type: record.subject_type, id: record.subject_id, name: record.subject_name },
      count: record.occurrence_count,
      first_seen_at: record.first_seen_at,
      last_seen_at: record.last_seen_at,
      // A refusal spent nothing: 0, never null. What it kept back is the estimate when one was measured.
      cost_usd: record.cost_usd ?? (record.refused ? 0 : null),
      cost_avoided_usd: record.cost_avoided_usd ?? (record.refused ? 0 : null),
      cost_avoided_measured: record.cost_avoided_usd != null,
      cost: costLabel(record, (n) => formatSpendUsd(n)),
      watching: record.watching ?? false,
      muted: record.status === "snoozed" ? { until: record.snoozed_until, by: record.snoozed_by ?? null, note: record.snooze_note } : null,
      resolved: record.resolved_at ? { at: record.resolved_at, by: record.resolved_by, note: record.resolution_note } : null,
    },
    blocked: refLinks(record.refs).map((l) => ({
      what: l.label,
      id: l.value,
      name: record.names?.[l.value] ?? refName(l.key, l.value, record),
      link: l.href ? `${origin}${l.href}` : null,
    })),
    recorded_occurrences: occurrences.length,
    occurrences: occurrences.map((o) => ({
      at: o.occurred_at,
      repeats: o.repeat_count,
      run_id: o.run_id,
      execution_id: o.execution_id,
      refs: o.refs,
      links: refLinks(o.refs)
        .filter((l) => l.href)
        .map((l) => ({ what: l.label, id: l.value, link: `${origin}${l.href}` })),
      cost_usd: o.cost_usd,
      cost_avoided_usd: o.cost_avoided_usd ?? null,
    })),
  };
}

/** A ref's name when the record carries no lookup for it (a spend approval is named by its subject). */
export function refName(key: keyof AlarmRefs, value: string, r: Pick<SpendAlarmRecord, "subject_name" | "refs"> & { names?: Record<string, string> }): string | null {
  if (key === "approval_id") {
    const subject = r.subject_name ?? (r.refs.agent_id ? r.names?.[r.refs.agent_id] : null);
    return subject ? `Spend approval for ${subject}` : "Spend approval";
  }
  if (key === "handler") return value.replace(/^mandate(_candidate)?:/, "").replace(/[_]+/g, " ");
  if (key === "provider") return providerLabel(value);
  return null;
}

// ── Display: no raw ids in a headline ──────────────────────────────────────

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export const LEVEL_LABEL: Record<AlarmLevel, string> = { critical: "Critical", warning: "Needs a decision", info: "Info" };

/** The title with the subject's id swapped for its name, and any other raw id dropped. */
export function alarmHeadline(title: string, subjectId?: string | null, subjectName?: string | null): string {
  let out = title;
  if (subjectId && subjectName) out = out.split(subjectId).join(subjectName);
  out = out.replace(/\s*\(?\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b\)?/gi, "");
  return out.replace(/[:\s]+$/, "").replace(/\s{2,}/g, " ").trim();
}

export function hasRawId(text: string): boolean {
  return new RegExp(UUID_RE.source, "i").test(text);
}

/** What it cost, or would have cost, in one short phrase; null when nothing was measured. */
export function alarmCostLine(cost: number | null | undefined, avoided: number | null | undefined, fmt: (n: number) => string): string | null {
  if (cost != null) return `${fmt(cost)} spent`;
  if (avoided != null) return `${fmt(avoided)} avoided (est.)`;
  return null;
}

// ── Facts the record page leads with ──────────────────────────────────────

/** When per-run detail started being recorded (the record migration, 2026-10-10 23:00 UTC). */
export const MIGRATED_AT = "2026-10-10T23:00:00Z";

/** Occurrence rows moved from the old per-person announcements carry no per-run detail. Viewer's timezone. */
export function migratedNote(): string {
  return `Detail not recorded before ${new Date(MIGRATED_AT).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`;
}
export const isMigrated = (o: Pick<SpendAlarmOccurrence, "refs">) => "migrated" in (o.refs as Record<string, unknown>);

/** The shipped fix that covers THIS record (a handler-scoped fix covers only that handler). */
export function fixFor(r: Pick<SpendAlarmRecord, "code_fix" | "refs">): CodeFix | null {
  const fix = r.code_fix;
  if (!fix) return null;
  return !fix.handler || fix.handler === r.refs.handler ? fix : null;
}

/** "$x spent", "$0 — refused before spending", or "Not measured". */
export function costLabel(
  r: Pick<SpendAlarmRecord, "cost_usd" | "cost_avoided_usd" | "refused">,
  fmt: (n: number) => string,
): string {
  if (r.cost_usd != null) return `${fmt(r.cost_usd)} spent`;
  // The estimate the held run captured at the refusal (billing.held_run.estimated_cost_usd).
  if (r.cost_avoided_usd != null) return `${fmt(r.cost_avoided_usd)} avoided (est.)`;
  if (r.refused) return `${fmt(0)} · refused`;
  return "Not measured";
}

export async function countAlarmsOfKind(kind: string): Promise<number> {
  const { count, error } = await billing()
    .from("spend_alarm")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .is("deleted_at", null);
  if (error) throw pgErrorToError(error);
  return count ?? 0;
}

export const kindListHref = (kind: string) => `${SPEND_ALARMS_PATH}?kind=${encodeURIComponent(kind)}`;

export interface ItemLabel {
  title: string;
  /** The item's own editor; null for a deleted item (it no longer opens). */
  href: string | null;
}

/** The served items (documents and Spaces) by id: title and the door to their own editor. */
export async function fetchItemTitles(items: { kind?: string; id: string }[]): Promise<Map<string, ItemLabel>> {
  const out = new Map<string, ItemLabel>();
  const ids = [...new Set(items.filter((i) => !i.kind || i.kind === "document").map((i) => i.id))].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length) {
    const { data } = await supabase.schema("content").from("document").select("id, title, format, deleted_at").in("id", ids);
    for (const d of (data ?? []) as { id: string; title: string | null; format: string | null; deleted_at: string | null }[]) {
      const base = d.title?.trim() || (d.format === "spaces" ? "Untitled Space" : "Untitled document");
      out.set(d.id, { title: d.deleted_at ? `${base} (deleted)` : base, href: d.deleted_at ? null : documentHref(d.id, d.format) });
    }
  }
  return out;
}

/** Short names for the record header (the full sentence is in the body). */
export const KIND_LABEL: Record<string, string> = {
  protected_account_refusal: "Protected account billed",
  source_intelligence_skipped: "Source skipped",
  spend_approval_hold: "Run held for approval",
  spend_approval_opened: "Approval waiting",
  spend_approval_expiring: "Approval expiring",
  spend_approval_expired: "Approval expired",
  "reconcile.llm_drift": "Provider bill mismatch",
  ci_billing_block: "GitHub billing is blocking CI",
  search_allowance_exhausted: "Google search is out of searches",
  search_allowance_low: "Google search is running low",
  spend_spike_platform_hourly: "Spend spike",
  spend_spike_platform_daily: "Spend spike",
  spend_spike_account_daily: "Spend spike",
  origin_unknown: "Spend with no owner",
  external_spend_gate_refused: "Paid call refused",
  external_call_unpriced: "Paid call with no price",
  readiness_not_ready: "Mandate not ready",
  sms_sent_ungated: "SMS sent without the gate",
  "guardrail.check_failed": "Guardrail check failing",
  top_tier_model_refused: "Top-tier call refused",
  automation_enabled: "New automation enabled",
  automated_run_expensive: "Expensive automated run",
  unpriced_calls: "Unpriced calls",
};

const PROVIDER_LABEL: Record<string, string> = {
  scrapecreators: "ScrapeCreators",
  grok_x: "Grok (X)",
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  twilio: "Twilio",
};

export function providerLabel(p: string): string {
  return PROVIDER_LABEL[p] ?? p.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Whose alarm it is, by name: a person, a record's title, or a service. Never an id or a type slug. */
export function whose(r: Pick<SpendAlarmRecord, "subject_name" | "subject_type" | "refs" | "person" | "kind">): string {
  if (r.subject_type === "source") return r.subject_name ?? "Source (not found)";
  // A refusal's subject_name is "person · handler code"; the person is the answer.
  if (r.kind === "protected_account_refusal" && r.subject_type === "protected_account") return r.person ?? r.subject_name?.split(" · ")[0] ?? "A protected account";
  if (r.subject_name) return r.subject_name;
  if (r.refs.provider) return `${providerLabel(r.refs.provider)}${r.refs.operation ? ` ${r.refs.operation}` : ""}`;
  if (r.refs.mandate_key) return r.refs.mandate_key;
  if (r.person) return r.person;
  if (r.kind === "sms_sent_ungated") return "SMS with no origin stamp";
  if (r.subject_type === "sch_task" || r.subject_type === "automation") return "Scheduled task (not found)";
  return "Platform";
}

/** A sentence: ids swapped for names (or dropped), first letter capitalised. */
export function readable(text: string, names: ReadonlyMap<string, string>): string {
  let out = text;
  for (const [id, name] of names) out = out.split(id).join(name);
  out = out.replace(/\s*\(?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)?/gi, "").replace(/\s{2,}/g, " ").trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// ── The sentence: what happened, in words — never a code, an id or a terminal colour ──

const ANSI_RE = /\u001b\[[0-9;]*[A-Za-z]/g;

/** Terminal colour codes and ORM banners out; the first meaningful line of an error in. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

/** What ran, by name, from a refusal's handler ("mandate:hindsight.replay_judge" → the mandate's name). */
export function handlerPhrase(handler: string | undefined, names: Readonly<Record<string, string>>, refs: AlarmRefs): string {
  if (!handler) return "An automated run";
  const [head, ...rest] = handler.split(":");
  const key = rest.join(":");
  if (head === "mandate" || head === "mandate_candidate") {
    const label = names[refs.mandate_key ?? key] ?? names[key];
    const plain = (refs.mandate_key ?? key).replace(/[._]+/g, " ").replace(/\s+\d{6,}$/, "").trim();
    const what = label ? `Mandate: ${label}` : plain ? `Mandate: ${plain}` : "a mandate";
    return head === "mandate_candidate" ? `A trial run of ${what}` : `A run of ${what}`;
  }
  const known: Record<string, string> = {
    auto_ingest: "Auto-ingest",
    source_intelligence: "Source intelligence",
    "agent-app": "A scheduled agent app run",
    "agent-mail": "An agent mail run",
  };
  return known[handler] ?? `An automated ${handler.replace(/[_-]+/g, " ")} run`;
}

/** The record's one sentence for a person. Kind-specific where the stored text leaks codes. */
export function alarmSentence(
  r: Pick<SpendAlarmRecord, "kind" | "detail" | "title" | "refs" | "subject_name" | "person"> & { names?: Record<string, string> },
): string {
  const names = r.names ?? {};
  const person = (r.refs.user_id && names[r.refs.user_id]) || r.person || null;
  if (r.kind === "protected_account_refusal") {
    return `${handlerPhrase(r.refs.handler, names, r.refs)} would have run as, and billed, ${person ?? "a protected account"}, a protected test account. It was refused before it ran, so nothing was billed.`;
  }
  if (r.kind === "external_spend_gate_refused") {
    const who = person ?? "this account";
    const what = `${providerLabel(r.refs.provider ?? "a provider")} ${r.refs.operation ?? "call"}`;
    const m = /cap reached(?: \(([^)]+)\))?/.exec(r.detail);
    if (m || /usage limit|upgrade your plan/i.test(r.detail)) {
      const period = /(\w+) cap reached/.exec(r.detail)?.[1];
      return `Refused by the usage gate for ${who}: ${period && period !== "the" ? `${period} ` : ""}cap reached${m?.[1] ? ` (${m[1]})` : ""}. The ${what} call did not run and nothing was spent.`;
    }
  }
  if (r.kind === "guardrail.check_failed") {
    const m = /^The (.+?) could not run/.exec(stripAnsi(r.detail));
    const what = m?.[1] ?? "guardrail check";
    const timedOut = /timed? ?out|timeout/i.test(r.detail);
    return `The ${what} could not run${timedOut ? ": its database query timed out" : ""}. Until it runs, protection for this automation reads stale data.`;
  }
  let text = stripAnsi(r.detail || r.title);
  // "Limit: None; observed: None" says nothing.
  text = text.replace(/\s*Limit: None; observed: None\.?/g, "");
  // key=value pairs read as "Label: name".
  text = text.replace(/\(?\b([a-z]+(?:_[a-z]+)+)=([\w.:-]+)\)?/g, (_m, key: string, value: string) => {
    const label = REF_LABEL[key as keyof AlarmRefs] ?? key.replace(/_/g, " ");
    return `${label}: ${names[value] ?? value}`;
  });
  // A bare (snake_case_code) parenthetical is a code, not a word.
  text = text.replace(/\s*\((?:[a-z0-9]+[_.])+[a-z0-9]+\)/g, "");
  // Dotted code paths (module.function) are for engineers, not this sentence.
  text = text.replace(/\b(?:[a-z_]+\.){2,}[a-z_]+\b/g, "the origin stamp");
  const idNames = new Map(Object.entries(names));
  if (r.refs.user_id && person) idNames.set(r.refs.user_id, person);
  return readable(text.replace(/\n+/g, " "), idNames);
}

/** The record's headline, by name: no ids, and the five protected-account refusals told apart. */
export function alarmTitle(
  r: Pick<SpendAlarmRecord, "kind" | "title" | "refs" | "subject_id" | "subject_name" | "person"> & { names?: Record<string, string> },
): string {
  const names = r.names ?? {};
  if (r.kind === "protected_account_refusal") {
    const person = (r.refs.user_id && names[r.refs.user_id]) || r.person || "a protected account";
    return `${handlerPhrase(r.refs.handler, names, r.refs)} tried to bill ${person}`;
  }
  if (r.kind === "external_spend_gate_refused") {
    return `${providerLabel(r.refs.provider ?? "Paid")} ${r.refs.operation ?? ""} call refused by the usage gate`.replace(/\s+/g, " ");
  }
  let title = r.title;
  for (const [id, name] of Object.entries(names)) title = title.split(id).join(name);
  // Only an id-shaped subject is swapped for its name ("mandates" is a word, not an id).
  const idShaped = /[0-9]/.test(r.subject_id) || r.subject_id.includes(":");
  return alarmHeadline(title, idShaped ? r.subject_id : null, idShaped ? r.subject_name : null) || KIND_LABEL[r.kind] || "Spend alarm";
}
