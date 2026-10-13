"use client";

/**
 * The window's sidebar: the run as a numbered story, in order. Row 0 is what the person typed;
 * each run heads a section; each step and each external call inside it is one row with its exact
 * query or URL, status, time and cost. Steps that did nothing are greyed with their reason.
 */

import {
  Database,
  FileSearch,
  Globe,
  Image as ImageIcon,
  Keyboard,
  ListChecks,
  MapPin,
  Newspaper,
  Search,
  Share2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { msText } from "../requests";
import type { StoryRow } from "../story";

const ICONS: Record<string, LucideIcon> = {
  keyboard: Keyboard,
  workflow: Workflow,
  globe: Globe,
  "file-search": FileSearch,
  image: ImageIcon,
  "share-2": Share2,
  search: Search,
  newspaper: Newspaper,
  "map-pin": MapPin,
  "list-checks": ListChecks,
  database: Database,
};

export function storyIcon(name: string | null): LucideIcon | null {
  return name ? ICONS[name] ?? null : null;
}

const STATUS_DOT: Record<string, string> = {
  done: "bg-emerald-500",
  failed: "bg-destructive",
  running: "bg-sky-500 animate-pulse",
  waiting: "bg-muted-foreground/40",
  skipped: "bg-muted-foreground/40",
};

export function BuilderStorySidebar({
  rows,
  selectedId,
  onSelect,
}: {
  rows: StoryRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { format } = useCostDisplay();
  return (
    <nav aria-label="Run story" className="flex h-full min-h-0 flex-col overflow-y-auto py-1">
      {rows.map((row) => {
        const selected = row.id === selectedId;
        if (row.kind === "run") {
          const Icon = storyIcon(row.icon) ?? Workflow;
          return (
            <button
              key={row.id}
              type="button"
              data-clickable
              onClick={() => onSelect(row.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "mt-2 flex w-full min-w-0 items-center gap-1.5 border-t border-border px-3 pb-1 pt-2 text-left hover:bg-accent/60",
                selected && "bg-accent",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{row.title}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {[row.ms !== null ? msText(row.ms) : null, row.costUsd ? format(row.costUsd) : null].filter(Boolean).join(" · ")}
              </span>
            </button>
          );
        }
        const idle = row.status === "skipped" || row.status === "waiting";
        const Icon = row.kind === "call" ? null : storyIcon(row.icon);
        return (
          <button
            key={row.id}
            type="button"
            data-clickable
            onClick={() => onSelect(row.id)}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "flex w-full min-w-0 items-start gap-1.5 py-1 pr-3 text-left hover:bg-accent/60",
              row.kind === "call" ? "pl-8" : "pl-3",
              selected && "bg-accent",
              idle && "opacity-55",
            )}
          >
            <span className="w-6 shrink-0 pt-px text-right font-mono text-[10px] tabular-nums text-muted-foreground">{row.number}</span>
            {Icon ? <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                {row.status ? <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[row.status])} aria-label={row.status} /> : null}
                <span className="truncate text-xs font-medium">{row.title}</span>
                <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {[row.ms !== null && !idle ? msText(row.ms) : null, row.costUsd ? format(row.costUsd) : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {row.reason ? (
                <span className="truncate text-[11px] italic text-muted-foreground">{row.reason}</span>
              ) : row.detail ? (
                <span className="truncate font-mono text-[11px] text-muted-foreground" title={row.detail}>
                  {row.detail}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
