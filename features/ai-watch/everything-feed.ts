/**
 * WATCH AI · EVERYTHING — a live feed of recent AI runs platform-wide, for platform admins
 * (Arman, 2026-10-17: "full visibility into every single AI integration, even when it happens in the
 * background"). Background AI no tab started — schedules, patrols, server-run mandates, workflows,
 * other people's runs — has no client stream, so the tab's registry cannot know it. Its durable
 * record always exists: `chat.user_request`. This reads that table, newest first, with server-side
 * filters and keyset paging; a row opens in the same Watch AI detail by its `user_request` id.
 * Loaded only when the person switches Watch AI to "Everything" (nothing is read before).
 */

import { supabase } from "@/utils/supabase/client";

export interface EverythingFilters {
  /** `chat.user_request.created_by` */
  personId: string | null;
  /** `chat.user_request.organization_id` */
  organizationId: string | null;
  /** The door: `chat.user_request.origin_class` */
  originClass: string | null;
  /** Mandate key, from the row's own metadata. */
  mandateKey: string | null;
  /** `chat.user_request.agent_id` */
  agentId: string | null;
  /** Only runs started by no person in a tab (everything except origin_class `human`). */
  backgroundOnly: boolean;
}

export const NO_FILTERS: EverythingFilters = {
  personId: null,
  organizationId: null,
  originClass: null,
  mandateKey: null,
  agentId: null,
  backgroundOnly: false,
};

export interface EverythingRow {
  userRequestId: string;
  label: string;
  status: string | null;
  createdAt: string;
  originClass: string | null;
  personId: string | null;
  organizationId: string | null;
  agentId: string | null;
  agentName: string | null;
  mandateKey: string | null;
  conversationId: string | null;
  workflowRunId: string | null;
  sourceFeature: string | null;
  totalCost: number | null;
}

export const EVERYTHING_PAGE_SIZE = 40;

const COLUMNS =
  "id, status, source_feature, agent_id, conversation_id, workflow_run_id, origin_class, created_by, organization_id, total_cost, created_at, metadata";

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Pure: one stored run as a feed row (label = the mandate, else the agent, else the feature that made it). */
export function everythingRow(row: Row): EverythingRow {
  const metadata = obj(row.metadata) ?? {};
  const holder = obj(metadata.mandate_holder);
  const watch = obj(metadata.mandate_watch);
  const mandateKey = str(watch?.mandate_key) ?? str(metadata.mandate_key);
  const cost = typeof row.total_cost === "number" ? row.total_cost : typeof row.total_cost === "string" ? Number(row.total_cost) : null;
  return {
    userRequestId: String(row.id),
    label: str(holder?.name) ?? mandateKey ?? str(metadata.agent_name) ?? str(row.source_feature) ?? "AI run",
    status: str(row.status),
    createdAt: String(row.created_at ?? ""),
    originClass: str(row.origin_class),
    personId: str(row.created_by),
    organizationId: str(row.organization_id),
    agentId: str(row.agent_id),
    agentName: str(metadata.agent_name),
    mandateKey,
    conversationId: str(row.conversation_id),
    workflowRunId: str(row.workflow_run_id),
    sourceFeature: str(row.source_feature),
    totalCost: cost !== null && Number.isFinite(cost) ? cost : null,
  };
}

/** Commas, quotes and parens end a PostgREST `or(...)` term: a mandate key never carries them, so refuse rather than escape. */
const SAFE_KEY = /^[A-Za-z0-9_.:\-]+$/;

/**
 * One page of the feed, newest first. `before` is the `created_at` of the last row already shown
 * (keyset paging: stable while new runs keep arriving at the top).
 */
export async function fetchEverythingPage(
  filters: EverythingFilters,
  before: string | null,
  pageSize = EVERYTHING_PAGE_SIZE,
): Promise<EverythingRow[]> {
  let q = supabase.schema("chat").from("user_request").select(COLUMNS).is("deleted_at", null);
  if (filters.personId) q = q.eq("created_by", filters.personId);
  if (filters.organizationId) q = q.eq("organization_id", filters.organizationId);
  if (filters.originClass) q = q.eq("origin_class", filters.originClass);
  else if (filters.backgroundOnly) q = q.neq("origin_class", "human");
  if (filters.agentId) q = q.eq("agent_id", filters.agentId);
  if (filters.mandateKey) {
    if (!SAFE_KEY.test(filters.mandateKey)) throw new Error("That mandate key has characters a key never has.");
    q = q.or(`metadata->>mandate_key.eq.${filters.mandateKey},metadata->mandate_watch->>mandate_key.eq.${filters.mandateKey}`);
  }
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(pageSize);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(everythingRow);
}

/** Pure: new rows merged over the old by id, newest first (a refresh never drops older pages). */
export function mergeEverything(current: readonly EverythingRow[], incoming: readonly EverythingRow[]): EverythingRow[] {
  const byId = new Map<string, EverythingRow>();
  for (const r of current) byId.set(r.userRequestId, r);
  for (const r of incoming) byId.set(r.userRequestId, r);
  return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/** Names for the people and organizations a page of the feed mentions (ids stay the filter value). */
export async function fetchEverythingNames(
  personIds: readonly string[],
  organizationIds: readonly string[],
): Promise<{ people: Record<string, string>; organizations: Record<string, string> }> {
  const people: Record<string, string> = {};
  const organizations: Record<string, string> = {};
  const [p, o] = await Promise.all([
    personIds.length
      ? supabase.schema("users").from("profiles").select("id, display_name").in("id", [...personIds])
      : Promise.resolve({ data: [] as Row[], error: null }),
    organizationIds.length
      ? supabase.schema("iam").from("organizations").select("id, name").in("id", [...organizationIds])
      : Promise.resolve({ data: [] as Row[], error: null }),
  ]);
  for (const r of (p.data ?? []) as Row[]) if (str(r.id) && str(r.display_name)) people[String(r.id)] = String(r.display_name);
  for (const r of (o.data ?? []) as Row[]) if (str(r.id) && str(r.name)) organizations[String(r.id)] = String(r.name);
  return { people, organizations };
}
