// features/portals/PortalBlocks.tsx — A PORTAL PAGE'S BLOCKS, DRAWN (lane PORTAL-BLOCKS).
//
// Server component: every block is computed from the rows the page already read as HER
// (`hers.ts`), then drawn by the shared pieces — records-ui's one `ChartBlock` for bar / line /
// donut, and the same lead-and-badges item the plain list uses for list / cards / table. Each item
// opens the record's own page (`/r/[recordId]`), where comments, the status line and Pay live.
// The computing rules (and why a block can never read a hidden field) are in `blocks.ts`.

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ChartBlock } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { formatCount } from "@ai-matrx/kit/format";

import { blockProblem, chartResult, CHART_KINDS, kpiValue, listFields, type BlockContext, type PortalBlock } from "./blocks";
import type { TableData } from "./hers";
import type { PortalMembership } from "./service";
import { readable } from "./shown";
import { stageLabel } from "./timeline";

function isChart(block: PortalBlock): boolean {
  return (CHART_KINDS as readonly string[]).includes(block.kind);
}

export function PortalBlocks({ membership, data }: { membership: PortalMembership; data: Map<string, TableData> }) {
  const blocks = membership.blocks ?? [];
  const kpis = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.kind === "kpi");
  const rest = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.kind !== "kpi");
  const ctxOf = (block: PortalBlock): { ctx: BlockContext; d: TableData } | null => {
    const d = data.get(block.table_id);
    if (!d) return null;
    return { d, ctx: { shown: d.fields, stage: d.table.stage ?? null, rows: d.records.map((r) => ({ id: r.id, document: r.document })) } };
  };

  return (
    <div className="space-y-6" data-portal-blocks="">
      {kpis.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-portal-kpis="">
          {kpis.map(({ b, i }) => {
            const c = ctxOf(b);
            const problem = c ? blockProblem(b, c.ctx) : "This block reads a table this portal does not show.";
            const value = c && !problem ? kpiValue(b, c.ctx) : null;
            return (
              <div key={i} className="rounded-xl border border-border bg-card px-4 py-3" data-portal-block="kpi">
                <p className="truncate text-xs font-medium text-muted-foreground">{b.title || c?.d.table.name || "Total"}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {problem ? "–" : value === null ? "–" : formatCount(value)}
                </p>
                {problem ? <p className="mt-1 text-xs text-muted-foreground">{problem}</p> : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {rest.map(({ b, i }) => {
        const c = ctxOf(b);
        if (!c) {
          return (
            <p key={i} className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              This block reads a table this portal does not show.
            </p>
          );
        }
        const problem = blockProblem(b, c.ctx);
        const title = b.title || c.d.table.name;
        return (
          <section key={i} data-portal-block={b.kind}>
            {isChart(b) ? null : (
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">{c.d.records.length}</span>
              </div>
            )}
            <div className={isChart(b) ? "" : "mt-2"}>
              {problem ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{problem}</p>
              ) : isChart(b) ? (
                c.d.records.length === 0 ? (
                  <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                    No {c.d.table.name.toLowerCase()} yet.
                  </p>
                ) : (
                  // The chart chunk loads after the first paint; the slot is already as tall as the drawn
                  // chart (one number per kind), so what follows it never moves when it arrives.
                  <div className={b.kind === "donut" ? "min-h-[180px]" : "min-h-[210px]"}>
                    <ChartBlock
                      block={chartResult({ ...b, title }, c.ctx)}
                      subject={b.table_id}
                      tableName={c.d.table.name}
                      dataLabels
                      centerValue={b.kind === "donut"}
                      variant="card"
                    />
                  </div>
                )
              ) : (
                <ItemList membership={membership} block={b} d={c.d} />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** The items of a list / cards / table block; each one opens that record's page. */
function ItemList({ membership, block, d }: { membership: PortalMembership; block: PortalBlock; d: TableData }) {
  const fields = listFields(block, d.fields);
  const stageKey = d.table.stage?.field ?? null;
  const href = (id: string) => `/portal/c/${encodeURIComponent(membership.slug)}/r/${id}`;
  const say = (record: TableData["records"][number], key: string) =>
    key === stageKey ? stageLabel(d.table.stage, record.document[key]) : readable(record.document[key]);
  const lead = (record: TableData["records"][number]) => {
    const f = fields.find((x) => x.key !== stageKey && readable(record.document[x.key])) ?? fields[0];
    return (f ? say(record, f.key) : "") || `Untitled ${d.table.name.toLowerCase()}`;
  };
  if (d.records.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        No {d.table.name.toLowerCase()} yet.
      </p>
    );
  }
  if (block.kind === "table") {
    return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              {fields.map((f) => (
                <th key={f.key} className="whitespace-nowrap px-4 py-2 font-medium">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.records.map((record) => (
              <tr key={record.id} className="relative transition-colors hover:bg-accent/60">
                {fields.map((f, n) => (
                  <td key={f.key} className="max-w-[16rem] truncate px-4 py-2.5 text-foreground">
                    {n === 0 ? (
                      <Link href={href(record.id)} data-tap-target className="font-medium after:absolute after:inset-0">
                        {say(record, f.key) || "—"}
                      </Link>
                    ) : (
                      say(record, f.key) || <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const rowOf = (record: TableData["records"][number]) => {
    const rest = fields.filter((f) => say(record, f.key) && say(record, f.key) !== lead(record));
    return rest.map((f, n) =>
      n === 0 ? (
        <Badge key={f.key} variant="secondary" className="rounded-full px-2 py-0 text-[11px] font-medium">{say(record, f.key)}</Badge>
      ) : (
        <span key={f.key} className="truncate">{f.label}: {say(record, f.key)}</span>
      ),
    );
  };
  if (block.kind === "cards") {
    return (
      <ul className="grid gap-3 sm:grid-cols-2">
        {d.records.map((record) => (
          <li key={record.id}>
            <Link href={href(record.id)} data-tap-target className="flex h-full flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none">
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{lead(record)}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{rowOf(record)}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {d.records.map((record) => (
        <li key={record.id}>
          <Link href={href(record.id)} data-tap-target className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{lead(record)}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{rowOf(record)}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
