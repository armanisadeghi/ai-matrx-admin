import { createClient } from "@/utils/supabase/client";

/** What the cost doors group by. */
export type MyCostGroup = "feature" | "organization" | "day";
export type MyCostPeriodKey = "today" | "week" | "month" | "all" | "custom";

export interface MyCostPeriod {
  key: MyCostPeriodKey;
  /** ISO instant, inclusive; null = no lower bound. */
  from: string | null;
  /** ISO instant, exclusive; null = no upper bound. */
  to: string | null;
}

export interface MyCostGroupRow {
  key: string;
  label: string;
  calls: number;
  /** Dollars: present only for a platform admin (the door withholds it from everyone else). */
  costUsd: number | null;
  /** What the cost is worth in points (20,000 points = $1). */
  points: number;
  /** Points actually charged to the plan (the ledger), which can be less than `points`. */
  chargedPoints: number;
  firstAt: string | null;
  lastAt: string | null;
}

export interface MyCostRecord {
  id: string;
  createdAt: string;
  feature: string;
  featureLabel: string;
  detail: string;
  status: string | null;
  organizationId: string | null;
  organizationName: string | null;
  costUsd: number | null;
  points: number;
  chargedPoints: number;
}

export const MY_COST_RECORDS_PAGE = 100;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Periods in the person's own time zone (a week starts on Monday). */
export function periodFor(key: Exclude<MyCostPeriodKey, "custom">, now: Date = new Date()): MyCostPeriod {
  const today = startOfDay(now);
  if (key === "all") return { key, from: null, to: null };
  if (key === "today") return { key, from: today.toISOString(), to: null };
  if (key === "week") {
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return { key, from: monday.toISOString(), to: null };
  }
  return { key, from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: null };
}

/** The two cost doors post-date the generated database types; this is their only call surface. */
function billingRpc(name: "my_cost_breakdown" | "my_cost_records", args: Record<string, unknown>) {
  const client = createClient().schema("billing") as unknown as {
    rpc: (fn: string, a: Record<string, unknown>) => PromiseLike<{ data: unknown; error: Error | null }>;
  };
  return client.rpc(name, args);
}

const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const nn = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

type Row = Record<string, unknown>;

export async function fetchMyCostBreakdown(period: MyCostPeriod, group: MyCostGroup): Promise<MyCostGroupRow[]> {
  const { data, error } = await billingRpc("my_cost_breakdown", { p_from: period.from ?? undefined, p_to: period.to ?? undefined, p_group: group });
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    key: String(r.group_key ?? ""),
    label: String(r.group_label ?? ""),
    calls: n(r.calls),
    costUsd: nn(r.cost_usd),
    points: n(r.points),
    chargedPoints: n(r.charged_points),
    firstAt: (r.first_at as string | null) ?? null,
    lastAt: (r.last_at as string | null) ?? null,
  }));
}

export interface MyCostRecordsFilter {
  feature?: string | null;
  organizationId?: string | null;
  before?: { at: string; id: string } | null;
}

export async function fetchMyCostRecords(period: MyCostPeriod, filter: MyCostRecordsFilter): Promise<MyCostRecord[]> {
  const { data, error } = await billingRpc("my_cost_records", {
      p_from: period.from ?? undefined,
      p_to: period.to ?? undefined,
      p_feature: filter.feature ?? undefined,
      p_organization: filter.organizationId ?? undefined,
      p_limit: MY_COST_RECORDS_PAGE,
      p_before_at: filter.before?.at ?? undefined,
      p_before_id: filter.before?.id ?? undefined,
  });
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    id: String(r.id),
    createdAt: String(r.created_at),
    feature: String(r.feature ?? ""),
    featureLabel: String(r.feature_label ?? ""),
    detail: String(r.detail ?? ""),
    status: (r.status as string | null) ?? null,
    organizationId: (r.organization_id as string | null) ?? null,
    organizationName: (r.organization_name as string | null) ?? null,
    costUsd: nn(r.cost_usd),
    points: n(r.points),
    chargedPoints: n(r.charged_points),
  }));
}
