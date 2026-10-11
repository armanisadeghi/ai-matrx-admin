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

import { supabase } from "@/utils/supabase/client";
import { pgErrorToError } from "@ai-matrx/data";
import { adminScheduleHref } from "@/features/scheduling/constants/routes";
import { documentHref } from "@/features/scopes/registry/entityRegistry";

export type AlarmLevel = "critical" | "warning" | "info";
export type AlarmStatus = "open" | "snoozed" | "resolved";

export const SPEND_ALARMS_PATH = "/administration/billing/alarms";
export const spendAlarmHref = (id: string) => `${SPEND_ALARMS_PATH}/${id}`;

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
  occurred_at: string;
  repeat_count: number;
  run_id: string | null;
  execution_id: string | null;
  refs: AlarmRefs;
  detail: string | null;
  cost_usd: number | null;
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

export async function fetchSpendAlarm(id: string): Promise<SpendAlarmRecord | null> {
  const { data, error } = await billing().from("spend_alarm").select(RECORD_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw pgErrorToError(error);
  return data ? toRecord(data as Record<string, unknown>) : null;
}

export async function fetchSpendAlarms(): Promise<SpendAlarmRecord[]> {
  const { data, error } = await billing()
    .from("spend_alarm")
    .select(RECORD_COLUMNS)
    .is("deleted_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(1000);
  if (error) throw pgErrorToError(error);
  return (data ?? []).map((r) => toRecord(r as Record<string, unknown>));
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
  const { data, error } = await billing()
    .from("spend_alarm_occurrence")
    .select("id, occurred_at, repeat_count, run_id, execution_id, refs, detail, cost_usd")
    .eq("alarm_id", alarmId)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) throw pgErrorToError(error);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...(row as unknown as SpendAlarmOccurrence),
      refs: asRefs(row.refs),
      cost_usd: row.cost_usd == null ? null : Number(row.cost_usd),
    };
  });
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
}

const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export async function fetchSpendAlarmsForAttention(): Promise<SpendAlarmAttentionRow[]> {
  const { data, error } = await billing().rpc("spend_alarms_for_attention", { p_limit: 200 });
  if (error) throw pgErrorToError(error);
  return (data ?? []).map((raw) => {
    const row = raw as unknown as Record<string, unknown>;
    return {
      ...toRecord({ ...row, resolved_at: null, resolved_by: null, resolution_note: null }),
      snooze_note: strOrNull(row.snooze_note),
      snoozed_by: strOrNull(row.snoozed_by),
      latest_occurrence_at: strOrNull(row.latest_occurrence_at),
      latest_occurrence_detail: strOrNull(row.latest_occurrence_detail),
      task_enabled: typeof row.task_enabled === "boolean" ? row.task_enabled : null,
      task_title: strOrNull(row.task_title),
      approval_status: strOrNull(row.approval_status),
    };
  });
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
      title: record.title,
      what_happened: record.detail,
      rule: record.rule,
      fix: record.fix,
      subject: { type: record.subject_type, id: record.subject_id, name: record.subject_name },
      count: record.occurrence_count,
      first_seen_at: record.first_seen_at,
      last_seen_at: record.last_seen_at,
      cost_usd: record.cost_usd,
      cost_avoided_usd: record.cost_avoided_usd,
      resolved: record.resolved_at ? { at: record.resolved_at, by: record.resolved_by, note: record.resolution_note } : null,
    },
    blocked: refLinks(record.refs).map((l) => ({ what: l.label, id: l.value, link: l.href ? `${origin}${l.href}` : null })),
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
    })),
  };
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
  if (avoided != null) return `${fmt(avoided)} kept from spending`;
  return null;
}

// ── Facts the record page leads with ──────────────────────────────────────

/** Occurrence rows moved from the old per-person announcements carry no per-run detail. */
export const MIGRATED_NOTE = "Detail not recorded before 10 Oct 23:00";
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
  if (r.cost_avoided_usd != null) return `${fmt(r.cost_avoided_usd)} kept from spending`;
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
