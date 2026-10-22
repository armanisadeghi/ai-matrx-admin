"use client";

// The Activity timeline's door for the two record kinds with no admin record page: a background
// agent job (chat.agent_run — podcast, content plan, video jobs) and an error log row (ops.app_log).
// Census 2026-10-21: the only page that opens an agent_run by id is the Podcast Studio run
// (/podcast/studio/run/<id>, kind "podcast"); /administration/chat/cx-dashboard/requests,
// mandate runs and LiveRunWindow open chat requests / conversations, never an agent_run; no page or
// peek opens an app_log row by id. So the row opens THE Peek (click), reading the one row on open;
// a podcast job also links its Studio run page.

import { formatAdminCost } from "@/components/cost/formatAdminCost";
import { currentPointsRate } from "@/components/cost/pointsRate";
import { useEffect, useState, type ReactElement } from "react";
import { CircleAlert, Workflow } from "lucide-react";
import { Peek, PeekPopover, type PeekBlock, type PeekRecord } from "@ai-matrx/design-system";
import { createClient } from "@/utils/supabase/client";
import type { Database, Json } from "@/types/database.types";
import { isJsonObject } from "@/types/json";
import { adminOrganizationHref } from "./UserOrganizationsTab";
import type { DoorRecordType } from "./userActivity";


type AgentRunRow = Pick<
  Database["chat"]["Tables"]["agent_run"]["Row"],
  "id" | "kind" | "status" | "created_at" | "updated_at" | "total_cost" | "error" | "organization_id" | "episode_id" | "last_heartbeat_at"
>;
type AppLogRow = Pick<
  Database["ops"]["Tables"]["app_log"]["Row"],
  "id" | "ts" | "level" | "logger_name" | "feature" | "route" | "message" | "exc_type" | "traceback" | "request_id" | "host_role" | "conversation_id"
>;

/** The one page that shows an agent job, by kind (null = no page; the peek is its door). */
export function agentRunPageHref(kind: string, id: string): string | null {
  return kind === "podcast" ? `/podcast/studio/run/${id}` : null;
}

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";
}

function errorText(error: Json | null): string | null {
  if (error === null || error === undefined) return null;
  if (typeof error === "string") return error;
  if (isJsonObject(error)) {
    const m = error.message ?? error.error ?? error.detail;
    if (typeof m === "string") return m;
  }
  return JSON.stringify(error);
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  completed: "success",
  complete: "success",
  succeeded: "success",
  running: "warning",
  queued: "warning",
  pending: "warning",
  failed: "danger",
  error: "danger",
  cancelled: "neutral",
};

export function agentRunPeekRecord(r: AgentRunRow): PeekRecord {
  const err = errorText(r.error);
  const body: PeekBlock[] = [
    { section: "Status", rows: [{ text: r.status, tone: STATUS_TONE[r.status] ?? "neutral" }] },
    ...(err ? [{ section: "Error", tone: "danger" as const, text: err, clamp: 6 as const }] : []),
    { property: "Kind", value: r.kind.replace(/[_.]/g, " ") },
    { property: "Cost", value: formatAdminCost(Number(r.total_cost ?? 0), { rate: currentPointsRate() }) },
    { property: "Started", value: when(r.created_at) },
    { property: "Updated", value: when(r.updated_at) },
    ...(r.last_heartbeat_at ? [{ property: "Last heartbeat", value: when(r.last_heartbeat_at) }] : []),
    ...(r.organization_id ? [{ property: "Organization", value: "Open", href: adminOrganizationHref(r.organization_id) }] : []),
  ];
  const href = agentRunPageHref(r.kind, r.id);
  return { kind: "Agent job", id: r.id, title: r.kind.replace(/[_.]/g, " "), glyph: Workflow, body, ...(href ? { href } : {}), copyData: r };
}

export function appLogPeekRecord(r: AppLogRow): PeekRecord {
  const body: PeekBlock[] = [
    { section: "Message", tone: "danger", text: r.message || "(no message)", clamp: 6 },
    ...(r.traceback ? [{ section: "Traceback", code: { text: r.traceback, language: "Python" } }] : []),
    { property: "Level", value: r.level },
    { property: "When", value: when(r.ts) },
    { property: "Route", value: r.route ?? "", missing: "None" },
    { property: "Logger", value: r.logger_name ?? "", missing: "None" },
    { property: "Server", value: r.host_role ?? "", missing: "None" },
    ...(r.request_id ? [{ section: "Request", token: r.request_id }] : []),
  ];
  return {
    kind: "Error log",
    id: r.id,
    title: [r.exc_type || "Error", r.feature].filter(Boolean).join(" · "),
    glyph: CircleAlert,
    body,
    copyData: r,
  };
}

async function loadRecord(type: DoorRecordType, id: string): Promise<PeekRecord | null> {
  const supabase = createClient();
  if (type === "agent_run") {
    const { data, error } = await supabase
      .schema("chat")
      .from("agent_run")
      .select("id,kind,status,created_at,updated_at,total_cost,error,organization_id,episode_id,last_heartbeat_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? agentRunPeekRecord(data) : null;
  }
  const { data, error } = await supabase
    .schema("ops")
    .from("app_log")
    .select("id,ts,level,logger_name,feature,route,message,exc_type,traceback,request_id,host_role,conversation_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? appLogPeekRecord(data) : null;
}

const KIND_WORD: Record<DoorRecordType, string> = { agent_run: "Agent job", app_log: "Error log" };

function DoorCard({ type, id }: { type: DoorRecordType; id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; record: PeekRecord | null; error: unknown } | null>(null);
  const key = `${type}:${id}:${attempt}`;
  useEffect(() => {
    let live = true;
    loadRecord(type, id).then(
      (record) => live && setState({ key, record, error: null }),
      (error: unknown) => live && setState({ key, record: null, error }),
    );
    return () => {
      live = false;
    };
  }, [type, id, key]);
  const settled = state?.key === key ? state : null;
  if (!settled) return <Peek frame="surface" loading record={{ kind: KIND_WORD[type], id, title: KIND_WORD[type], copyData: false }} />;
  if (settled.error || !settled.record) {
    return (
      <Peek
        frame="surface"
        record={{
          kind: KIND_WORD[type],
          id,
          title: KIND_WORD[type],
          copyData: false,
          failure: {
            what: KIND_WORD[type].toLowerCase(),
            error: settled.error ?? undefined,
            ...(settled.error ? {} : { message: "This record no longer exists." }),
            onRetry: () => setAttempt((n) => n + 1),
          },
        }}
      />
    );
  }
  return <Peek frame="surface" record={settled.record} />;
}

/** Wraps an activity row's title so a click opens that record's peek. */
export function ActivityRecordDoor({ type, id, trigger }: { type: DoorRecordType; id: string; trigger: ReactElement }) {
  return (
    <PeekPopover trigger={trigger} label={KIND_WORD[type]} side="bottom" align="start">
      <DoorCard type={type} id={id} />
    </PeekPopover>
  );
}
