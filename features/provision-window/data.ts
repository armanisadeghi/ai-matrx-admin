/**
 * Provision window — data. A call point (registered on the server) is captured into a
 * `mandate.provision_snapshot` row: every value available at that exact point, full, with size and
 * source. Capture needs the server (it reads stored captures); reading saved snapshots is direct.
 * Server: aidream/services/provision_window. FEATURE: ./FEATURE.md.
 */
import { callApi } from "@/lib/api/call-api";
import type { AppDispatch } from "@/lib/redux/store";
import { supabase } from "@/utils/supabase/client";
import type { Json } from "@/types/database.types";

export interface ProvisionValue {
  name: string;
  label: string;
  kind: string;
  description: string;
  present: boolean;
  chars: number;
  items: number | null;
  value: Json | null;
  source: string;
  missing_reason: string | null;
}

export interface ProvisionSnapshot {
  id: string;
  pointKey: string;
  pointLabel: string;
  codeLocation: string | null;
  subjectId: string | null;
  subjectLabel: string;
  values: ProvisionValue[];
  coverage: Record<string, Json>;
  totalChars: number;
  createdAt: string | null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseValue(raw: unknown): ProvisionValue {
  const r = record(raw);
  return {
    name: String(r.name ?? ""),
    label: String(r.label ?? r.name ?? ""),
    kind: String(r.kind ?? "text"),
    description: String(r.description ?? ""),
    present: r.present === true,
    chars: typeof r.chars === "number" ? r.chars : 0,
    items: typeof r.items === "number" ? r.items : null,
    value: (r.value ?? null) as Json | null,
    source: String(r.source ?? ""),
    missing_reason: typeof r.missing_reason === "string" ? r.missing_reason : null,
  };
}

function parseSnapshot(raw: unknown, subjectLabel?: string): ProvisionSnapshot {
  const r = record(raw);
  const coverage = record(r.coverage) as Record<string, Json>;
  const values = Array.isArray(r.provision_values) ? r.provision_values : Array.isArray(r.values) ? r.values : [];
  return {
    id: String(r.id ?? ""),
    pointKey: String(r.point_key ?? ""),
    pointLabel: String(r.point_label ?? ""),
    codeLocation: typeof r.code_location === "string" ? r.code_location : null,
    subjectId: typeof r.subject_id === "string" ? r.subject_id : null,
    subjectLabel: subjectLabel ?? (typeof coverage.subject_label === "string" ? coverage.subject_label : ""),
    values: values.map(parseValue),
    coverage,
    totalChars: typeof r.total_chars === "number" ? r.total_chars : 0,
    createdAt: typeof r.created_at === "string" ? r.created_at : null,
  };
}

/** Capture the values at a registered call point for one subject; returns the saved snapshot. */
export async function captureProvision(
  dispatch: AppDispatch,
  pointKey: string,
  subjectId: string,
  organizationId: string,
): Promise<ProvisionSnapshot> {
  const result = await dispatch(
    callApi({
      // Not in the published api-types yet (new door 2026-10-12); the path is the server's.
      path: "/provision-window/{point_key}/capture" as never,
      method: "POST",
      pathParams: { point_key: pointKey } as never,
      scopeOverrides: { organization_id: organizationId },
      body: { subject_id: subjectId } as never,
    }),
  );
  if (result.error) throw new Error(result.error.message || "The provision could not be captured.");
  return parseSnapshot(result.data);
}

const COLUMNS =
  "id, point_key, point_label, code_location, subject_id, provision_values, coverage, total_chars, created_at";

export async function loadProvisionSnapshot(id: string): Promise<ProvisionSnapshot> {
  const { data, error } = await supabase.schema("mandate").from("provision_snapshot").select(COLUMNS).eq("id", id).single();
  if (error) throw new Error(error.message);
  return parseSnapshot(data);
}

/** Every snapshot of one call point for one subject, newest first (id + time only). */
export async function listProvisionSnapshots(
  pointKey: string,
  subjectId: string,
): Promise<{ id: string; createdAt: string; totalChars: number }[]> {
  const { data, error } = await supabase
    .schema("mandate")
    .from("provision_snapshot")
    .select("id, created_at, total_chars")
    .eq("point_key", pointKey)
    .eq("subject_id", subjectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, createdAt: r.created_at, totalChars: r.total_chars }));
}

export function valueText(value: Json | null): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return (value as string[]).join("\n");
  return JSON.stringify(value, null, 2);
}

/** Every present value by name — paste-ready as an agent sample. */
export function snapshotJson(s: ProvisionSnapshot): string {
  return JSON.stringify(Object.fromEntries(s.values.filter((v) => v.present).map((v) => [v.name, v.value])), null, 2);
}

export function snapshotMarkdown(s: ProvisionSnapshot): string {
  const lines = [`# ${s.pointLabel} — ${s.subjectLabel}`, ""];
  for (const v of s.values) {
    lines.push(`## ${v.label} (\`${v.name}\`)`);
    lines.push(v.present ? valueText(v.value) : `_Missing: ${v.missing_reason ?? "not available here"}_`);
    lines.push("");
  }
  return lines.join("\n");
}
