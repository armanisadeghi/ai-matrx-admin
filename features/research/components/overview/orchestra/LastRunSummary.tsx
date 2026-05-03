"use client";

import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Globe,
  FileText,
  Brain,
  Layers,
  ArrowRight,
  Clock,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ResearchProgress, TopicCostSummary } from "../../../types";

interface Props {
  topicId: string;
  progress: ResearchProgress | null;
  costSummary: TopicCostSummary | null | undefined;
  /** ISO date string of the last completed run, if known. */
  finishedAt?: string | null;
  /** When set, this is the receipt for the just-completed run; otherwise it's a cold-load summary. */
  variant?: "fresh" | "cold";
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface LineProps {
  icon: typeof Search;
  label: string;
  value: string | number;
  href?: string;
  warning?: string;
  /** When true, render dimmed (no progress on this line). */
  dim?: boolean;
}

function Line({ icon: Icon, label, value, href, warning, dim }: LineProps) {
  const content = (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md",
        href && "hover:bg-accent/40 transition-colors",
        dim && "opacity-60",
      )}
    >
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground flex-1 truncate">
        {label}
      </span>
      {warning && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
          <AlertTriangle className="h-2.5 w-2.5" />
          {warning}
        </span>
      )}
      <span className="text-xs font-semibold tabular-nums">{value}</span>
      {href && (
        <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

/**
 * Persistent receipt of the topic's current state. Replaces the empty-after-run
 * void with a tidy, scannable summary so users who weren't watching the live
 * stream still see what was produced.
 *
 *  - `variant="fresh"` is shown immediately after a stream completes (slight
 *    celebratory tint).
 *  - `variant="cold"` is shown on a fresh page load when prior work exists.
 */
export function LastRunSummary({
  topicId,
  progress,
  costSummary,
  finishedAt,
  variant = "cold",
}: Props) {
  const base = `/research/topics/${topicId}`;
  const totalCost = costSummary?.total_estimated_cost_usd ?? 0;
  const totalCalls = costSummary?.total_llm_calls ?? 0;
  const when = relativeTime(finishedAt);

  // Compose status line at the top: green check if fully done, amber if partial.
  const hasReport = (progress?.project_syntheses ?? 0) > 0;
  const failures =
    (progress?.failed_analyses ?? 0) +
    (progress?.failed_keyword_syntheses ?? 0) +
    (progress?.failed_project_syntheses ?? 0);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden",
        variant === "fresh" && "ring-1 ring-emerald-500/30",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20">
        {failures > 0 ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        ) : hasReport ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold">
          {variant === "fresh"
            ? "Run complete"
            : hasReport
              ? "Latest results"
              : "Work in progress"}
        </span>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          {when && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {when}
            </span>
          )}
          {totalCost > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <DollarSign className="h-2.5 w-2.5" />
              {formatCost(totalCost)}
              {totalCalls > 0 && (
                <span className="text-muted-foreground">
                  · {totalCalls} call{totalCalls === 1 ? "" : "s"}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="p-1 space-y-px">
        <Line
          icon={Search}
          label="Keywords"
          value={progress?.total_keywords ?? 0}
          href={`${base}/keywords`}
          dim={(progress?.total_keywords ?? 0) === 0}
        />
        <Line
          icon={Globe}
          label="Sources discovered"
          value={`${progress?.included_sources ?? 0} / ${progress?.total_sources ?? 0}`}
          href={`${base}/sources`}
          dim={(progress?.total_sources ?? 0) === 0}
        />
        <Line
          icon={FileText}
          label="Pages scraped"
          value={progress?.total_content ?? 0}
          href={`${base}/content`}
          dim={(progress?.total_content ?? 0) === 0}
        />
        <Line
          icon={Brain}
          label="Pages analyzed"
          value={`${progress?.total_analyses ?? 0} / ${progress?.total_eligible_for_analysis ?? 0}`}
          href={`${base}/analysis`}
          warning={
            (progress?.failed_analyses ?? 0) > 0
              ? `${progress?.failed_analyses} failed`
              : undefined
          }
          dim={(progress?.total_analyses ?? 0) === 0}
        />
        <Line
          icon={Layers}
          label="Keyword syntheses"
          value={`${progress?.keyword_syntheses ?? 0} / ${progress?.total_keywords ?? 0}`}
          href={`${base}/synthesis`}
          warning={
            (progress?.failed_keyword_syntheses ?? 0) > 0
              ? `${progress?.failed_keyword_syntheses} failed`
              : undefined
          }
          dim={(progress?.keyword_syntheses ?? 0) === 0}
        />
        <Line
          icon={FileText}
          label="Project report"
          value={hasReport ? "Generated" : "Not yet"}
          href={hasReport ? `${base}/synthesis` : undefined}
          dim={!hasReport}
        />
      </div>
    </div>
  );
}
