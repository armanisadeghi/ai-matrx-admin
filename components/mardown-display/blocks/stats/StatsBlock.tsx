"use client";

/**
 * StatsBlock — the in-chat render block for ```stats fences.
 *
 * A small JSON spec of headline metrics renders as a grid of KPI cards (big
 * value, label, colored up/down delta). Light — no chart lib — so it's the
 * fast way to surface "the numbers" (charts are for trends; stats are for the
 * headline figures). Streaming → skeleton; invalid JSON → contained error.
 */

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import React, { useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Check, Copy, TriangleAlert } from "lucide-react";

import { Skeleton } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";
import { soleFence } from "@/lib/markdown/code-ranges";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useCanvasFit } from "@ai-matrx/rich-content/display/blocks/canvas-fit";
import { Button } from "@ai-matrx/design-system/controls";
import { useBlockHostSlot, useBlockTypeLabelSlot } from "@ai-matrx/rich-content/display/block-host";
import { BlockTypeLabel } from "@ai-matrx/rich-content/display/block-type-label";
import { useBlockEdit } from "@ai-matrx/rich-content/display/block-controls/block-edit";
import { BlockControlsButton, InlineControlText, InlineRowPopover, useBlockControls } from "@ai-matrx/rich-content/display/block-controls/BlockControls";

interface StatItem {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "flat";
  hint?: string;
}
interface StatsSpec {
  title?: string;
  stats: StatItem[];
}

export interface StatsBlockProps {
  content?: string;
  isStreamActive?: boolean;
  className?: string;
}

function parseStats(raw: string): StatsSpec | { error: string } {
  let s = raw.trim();
  // A wrapping fence by THE one code-range rule.
  const fenced = soleFence(s);
  if (fenced && ["", "json", "stats"].includes(fenced.lang.toLowerCase())) s = fenced.body.trim();
  let obj: unknown;
  try {
    obj = JSON.parse(s);
  } catch {
    try {
      obj = JSON.parse(s.replace(/,(\s*[}\]])/g, "$1"));
    } catch {
      return { error: "Stats needs a JSON object with a `stats` array." };
    }
  }
  const arr = Array.isArray(obj) ? obj : Array.isArray((obj as { stats?: unknown }).stats) ? (obj as { stats: unknown[] }).stats : null;
  if (!arr || arr.length === 0) return { error: "Stats `stats` must be a non-empty array." };
  const title = !Array.isArray(obj) && typeof (obj as { title?: unknown }).title === "string" ? (obj as { title: string }).title : undefined;
  const stats: StatItem[] = (arr as Record<string, unknown>[])
    .filter((r) => r && typeof r === "object")
    .map((r) => {
      const change = r.change != null ? String(r.change) : undefined;
      let trend = (r.trend as StatItem["trend"]) ?? undefined;
      if (!trend && change) trend = /^-|↓|▼/.test(change.trim()) ? "down" : /^\+|↑|▲/.test(change.trim()) ? "up" : undefined;
      return {
        label: String(r.label ?? r.name ?? ""),
        value: String(r.value ?? r.amount ?? r.count ?? ""),
        change,
        trend,
        hint: r.hint != null ? String(r.hint) : undefined,
      };
    });
  return { title, stats };
}

const TREND = {
  up: { cls: "text-emerald-600 dark:text-emerald-400", Icon: ArrowUpRight },
  down: { cls: "text-rose-600 dark:text-rose-400", Icon: ArrowDownRight },
  flat: { cls: "text-muted-foreground", Icon: ArrowRight },
};

export const StatsBlock: React.FC<StatsBlockProps> = ({ content = "", isStreamActive = false, className }) => {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const parsed = useMemo(() => (isStreamActive ? null : parseStats(content)), [content, isStreamActive]);
  const spec = parsed && !("error" in parsed) ? parsed : null;
  const error = parsed && "error" in parsed ? parsed.error : null;
  const [copied, setCopied] = useState(false);

  // In a narrow canvas pane the tiles stack in ONE column; a tight pane caps at
  // two. Outside the canvas (fit "outside") the grid is unchanged.
  const fit = useCanvasFit();
  const maxCols = fit === "narrow" ? 1 : fit === "tight" ? 2 : 4;
  const cols = spec ? Math.min(spec.stats.length, maxCols) : Math.min(3, maxCols);

  const host = useBlockHostSlot();
  // The kind host's type label joins this header: ONE header row (review 5, G1).
  const typeLabel = useBlockTypeLabelSlot();
  // Block Controls: shown wherever this block can be saved (Write, an editable answer).
  const controls = useBlockControls("stats", content, useBlockEdit());
  const [tileEdit, setTileEdit] = useState<{ index: number; x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const canEditTile = Boolean(controls?.inline(String(controls.model.valueKey)));
  const handleCopy = async () => {
    if (!(await copyText(content.trim()))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("my-3 overflow-hidden rounded-lg border bg-card transition-colors", host.selected ? "border-primary" : "border-border", className)}>
      <div data-block-header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b border-border bg-muted/50 px-3 py-1.5">
        <div className="flex min-w-[9rem] flex-1 items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 shrink-0 text-primary" />
          <InlineControlText controls={controls} fieldKey="title" value={spec?.title ?? ""} className="truncate text-sm font-medium text-foreground">
            {spec?.title ?? "Key metrics"}
          </InlineControlText>
          {typeLabel ? <BlockTypeLabel>{typeLabel}</BlockTypeLabel> : null}
          {isStreamActive && <span className="shrink-0 animate-pulse text-xs text-muted-foreground">…</span>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-0.5">
          {!isStreamActive && spec && (
            <Button variant="quiet" icon={copied ? <Check /> : <Copy />} aria-label={copied ? "Copied" : "Copy source"} title={copied ? "Copied" : "Copy source"} onClick={handleCopy} />
          )}
          {!isStreamActive && spec && <BlockControlsButton controls={controls} title={spec.title ?? "Key metrics"} />}
          {host.actions}
        </div>
      </div>
      <div className="p-3">
        {isStreamActive ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-muted-foreground">{error}</p>
            <ErrorAlchemyMenu error={error} />
          </div>
        ) : spec ? (
          <div ref={gridRef} className="relative grid gap-3" data-canvas-fit={fit === "outside" ? undefined : fit} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {spec.stats.map((s, i) => {
              const t = s.trend ? TREND[s.trend] : null;
              return (
                <div
                  key={i}
                  className={cn("rounded-xl border border-border bg-muted/30 p-4", canEditTile && "cursor-pointer hover:border-primary")}
                  data-stat-tile={i}
                  onClick={
                    canEditTile
                      ? (e) => {
                          const box = gridRef.current?.getBoundingClientRect();
                          if (box) setTileEdit({ index: i, x: e.clientX - box.left, y: e.clientY - box.top });
                        }
                      : undefined
                  }
                >
                  <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
                  <div className="mt-1 whitespace-nowrap text-xl font-bold tabular-nums text-foreground sm:text-2xl" data-stat-value="">{s.value}</div>
                  {s.change && (
                    <div className={cn("mt-1 flex items-center gap-0.5 text-xs font-medium", t?.cls)}>
                      {t && <t.Icon className="h-3.5 w-3.5" />}
                      {s.change}
                    </div>
                  )}
                  {s.hint && <div className="mt-1 truncate text-[11px] text-muted-foreground">{s.hint}</div>}
                </div>
              );
            })}
            {controls && tileEdit && <InlineRowPopover controls={controls} rowsKey="rows" index={tileEdit.index} at={tileEdit} onClose={() => setTileEdit(null)} />}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StatsBlock;
