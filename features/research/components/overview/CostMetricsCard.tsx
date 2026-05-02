"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Brain,
  Layers,
  FileText,
  Tags,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  TopicCostSummary,
  CostBreakdownItem,
} from "../../types";

interface Props {
  costSummary: TopicCostSummary | null | undefined;
  className?: string;
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

const PHASE_LABELS: Array<{
  key: keyof Pick<
    TopicCostSummary,
    | "page_analyses"
    | "keyword_syntheses"
    | "project_syntheses"
    | "tag_consolidations"
    | "document_assembly"
  >;
  icon: typeof Brain;
}> = [
  { key: "page_analyses", icon: Brain },
  { key: "keyword_syntheses", icon: Layers },
  { key: "project_syntheses", icon: FileText },
  { key: "tag_consolidations", icon: Tags },
  { key: "document_assembly", icon: Wand2 },
];

function BreakdownRow({
  label,
  icon: Icon,
  item,
}: {
  label: string;
  icon: typeof Brain;
  item: CostBreakdownItem;
}) {
  const greyed = item.calls === 0;
  return (
    <tr
      className={cn(
        "border-t border-border/30",
        greyed && "opacity-50",
      )}
    >
      <td className="py-1.5 px-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs">{label}</span>
        </div>
      </td>
      <td className="py-1.5 px-2 text-right text-xs tabular-nums">
        {item.calls}
      </td>
      <td className="py-1.5 px-2 text-right text-xs tabular-nums text-muted-foreground hidden sm:table-cell">
        {formatTokens(item.input_tokens)}
      </td>
      <td className="py-1.5 px-2 text-right text-xs tabular-nums text-muted-foreground hidden sm:table-cell">
        {formatTokens(item.output_tokens)}
      </td>
      <td className="py-1.5 px-2 text-right text-xs tabular-nums font-medium">
        {formatCost(item.estimated_cost_usd)}
      </td>
    </tr>
  );
}

/**
 * Renders the topic's `cost_summary` (per QUOTA_LADDER.md). Always-visible
 * total + collapsible per-phase breakdown. Hidden entirely when no cost
 * data has been recorded yet (e.g., topic just created).
 */
export function CostMetricsCard({ costSummary, className }: Props) {
  const [open, setOpen] = useState(false);

  if (!costSummary || costSummary.total_llm_calls === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden",
        className,
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <DollarSign className="h-3.5 w-3.5 shrink-0 text-green-500" />
        <span className="text-xs font-semibold shrink-0">Cost Summary</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {costSummary.total_llm_calls} calls •{" "}
          {formatTokens(costSummary.total_input_tokens)} in /{" "}
          {formatTokens(costSummary.total_output_tokens)} out
        </span>
        <span className="ml-auto text-sm font-bold tabular-nums text-foreground">
          {formatCost(costSummary.total_estimated_cost_usd)}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/40 bg-muted/10">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                <th className="text-left py-1.5 px-2 font-normal">Phase</th>
                <th className="text-right py-1.5 px-2 font-normal">Calls</th>
                <th className="text-right py-1.5 px-2 font-normal hidden sm:table-cell">
                  Input
                </th>
                <th className="text-right py-1.5 px-2 font-normal hidden sm:table-cell">
                  Output
                </th>
                <th className="text-right py-1.5 px-2 font-normal">Cost</th>
              </tr>
            </thead>
            <tbody>
              {PHASE_LABELS.map(({ key, icon }) => (
                <BreakdownRow
                  key={key}
                  label={costSummary[key].label}
                  icon={icon}
                  item={costSummary[key]}
                />
              ))}
              <tr className="border-t-2 border-border/60 bg-muted/30 font-semibold">
                <td className="py-1.5 px-2 text-xs">Total</td>
                <td className="py-1.5 px-2 text-right text-xs tabular-nums">
                  {costSummary.total_llm_calls}
                </td>
                <td className="py-1.5 px-2 text-right text-xs tabular-nums hidden sm:table-cell">
                  {formatTokens(costSummary.total_input_tokens)}
                </td>
                <td className="py-1.5 px-2 text-right text-xs tabular-nums hidden sm:table-cell">
                  {formatTokens(costSummary.total_output_tokens)}
                </td>
                <td className="py-1.5 px-2 text-right text-xs tabular-nums">
                  {formatCost(costSummary.total_estimated_cost_usd)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
