"use client";

// Billing › Free allowance: what visitors and free accounts used today, against the daily free budget, and
// every counted use with its decision — "over" rows are what enforcement refuses (or, in watch-only mode,
// would have refused). aidream GET /billing/free-allowance/report (FREE-ALLOWANCE.md).
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { RecordId, readOf } from "@ai-matrx/design-system";
import { getJson } from "@/lib/python-client";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";

interface Use {
  id: string;
  createdAt: string;
  userId: string;
  feature: string;
  tier: string;
  verdict: string;
  reason: string;
  estPoints: number | null;
}

interface TierState {
  budget_points: number;
  fleet_spent_points: number;
  share_points: number | null;
  committed_points: number;
  left_points: number | null;
}

interface Report {
  uses: Use[];
  spend: { guest_points: number; free_points: number; guest_people: number; free_people: number; resets_at?: string };
  process: { enabled: boolean; enforced: boolean; model_ceiling_enabled: boolean; guest_model_ceiling_enabled: boolean;
    tiers: Record<"guest" | "free", TierState>; would_refuse: Record<string, number> };
}

const POINTS_PER_USD = 20_000;

function parse(raw: unknown): Report {
  const r = (raw ?? {}) as Record<string, unknown>;
  const uses = Array.isArray(r.uses) ? r.uses : [];
  return {
    uses: uses.map((u, i) => {
      const o = u as Record<string, unknown>;
      return {
        id: `${String(o.created_at ?? "")}-${i}`,
        createdAt: String(o.created_at ?? ""),
        userId: String(o.user_id ?? ""),
        feature: String(o.feature ?? ""),
        tier: String(o.tier ?? ""),
        verdict: String(o.verdict ?? ""),
        reason: String(o.reason ?? "—"),
        estPoints: typeof o.est_points === "number" ? o.est_points : o.est_points != null ? Number(o.est_points) : null,
      };
    }),
    spend: (r.spend ?? {}) as Report["spend"],
    process: (r.process ?? { tiers: {} }) as Report["process"],
  };
}

const COLUMNS: MatrxColumnDef<Use>[] = [
  { id: "createdAt", accessorKey: "createdAt", header: "When", width: 170, filter: "date", format: { id: "datetime" } },
  { id: "userId", accessorKey: "userId", header: "Person", width: 150, cell: (r) => <RecordId value={r.userId} label="Person" token="user" /> },
  { id: "feature", accessorKey: "feature", header: "Feature", width: 160, filter: "select" },
  { id: "tier", accessorKey: "tier", header: "Tier", width: 90, filter: "select" },
  {
    id: "verdict", accessorKey: "verdict", header: "Decision", width: 100, filter: "select",
    kpi: [{ op: "count", id: "over", label: "Over", countWhere: (r) => r.verdict === "over", tone: (v) => (v > 0 ? "warning" : undefined) }],
  },
  { id: "reason", accessorKey: "reason", header: "Reason", width: 150, filter: "select" },
  {
    id: "estPoints", accessorKey: "estPoints", header: "Est. points", width: 110, align: "right",
    kpi: [{ op: "count", id: "uses", label: "Uses", countWhere: () => true }, { op: "sum", id: "estPoints", label: "Est. points" }],
  },
];

function BudgetTile({ label, t }: { label: string; t: TierState | undefined }) {
  if (!t) return null;
  const pct = t.budget_points > 0 ? Math.round((t.fleet_spent_points / t.budget_points) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="type-secondary text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-foreground">
        {formatAdminUsd(t.fleet_spent_points / POINTS_PER_USD)} <span className="text-muted-foreground">/ {formatAdminUsd(t.budget_points / POINTS_PER_USD)}</span>
      </div>
      <div className="type-secondary tabular-nums text-muted-foreground">{pct}% · {t.fleet_spent_points.toLocaleString("en-US")} pts</div>
    </div>
  );
}

export function FreeAllowanceBoard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["free-allowance-report"],
    queryFn: async ({ signal }) => parse((await getJson<unknown>("/billing/free-allowance/report?limit=1000", { signal })).data),
    refetchInterval: 60_000,
  });
  const rows = useMemo(() => data?.uses ?? [], [data]);
  const p = data?.process;
  const mode = !p ? "—" : !p.enabled ? "Off" : p.enforced ? "Enforced" : "Watch only";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="type-secondary text-muted-foreground">Mode</div>
          <div className="text-lg font-semibold text-foreground">{mode}</div>
          <div className="type-secondary text-muted-foreground">
            Model ceiling: visitors {p?.guest_model_ceiling_enabled ? "on" : "off"} · free {p?.model_ceiling_enabled ? "on" : "off"}
          </div>
        </div>
        <BudgetTile label={`Visitors today (${data?.spend.guest_people ?? 0})`} t={p?.tiers?.guest} />
        <BudgetTile label={`Free accounts today (${data?.spend.free_people ?? 0})`} t={p?.tiers?.free} />
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="type-secondary text-muted-foreground">Would refuse (this server)</div>
          <div className="text-lg font-semibold tabular-nums text-foreground">
            {Object.values(p?.would_refuse ?? {}).reduce((a, b) => a + b, 0)}
          </div>
          <div className="type-secondary truncate text-muted-foreground">
            {Object.entries(p?.would_refuse ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "None"}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <MatrxDataTable
          data={rows}
          columns={COLUMNS}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          tableId="free-allowance-decisions-admin"
          read={readOf({ loading: isLoading, error: error ? String(error) : null }, { what: "free-allowance decisions" })}
          emptyState={{ title: "No counted free uses today" }}
          toolbar={{ title: "Decisions today", search: true, searchPlaceholder: "Search features, reasons…" }}
        />
      </div>
    </div>
  );
}
