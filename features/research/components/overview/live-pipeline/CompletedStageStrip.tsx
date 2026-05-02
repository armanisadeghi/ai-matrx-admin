"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Search,
  Download,
  Brain,
  Layers,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  StageState,
  StageKind,
} from "../../../hooks/usePipelineProgress";

const ICON: Record<StageKind, typeof Search> = {
  search: Search,
  scrape: Download,
  analyze: Brain,
  synthesize: Layers,
  report: FileText,
};

const LABEL: Record<StageKind, string> = {
  search: "Search",
  scrape: "Scrape",
  analyze: "Analyze",
  synthesize: "Synthesize",
  report: "Report",
};

function durationOf(stage: StageState): string | null {
  if (stage.startedAt == null || stage.completedAt == null) return null;
  const sec = Math.max(1, Math.round((stage.completedAt - stage.startedAt) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function summarize(stage: StageState): string {
  switch (stage.kind) {
    case "search": {
      const total = stage.totals.target ?? stage.totals.succeeded;
      return `${stage.itemOrder.length} keywords • ${total} sources discovered`;
    }
    case "scrape": {
      const success = stage.totals.succeeded;
      const failed = stage.totals.failed;
      const total = stage.itemOrder.length;
      return `${total} attempted • ${success} good • ${failed} failed`;
    }
    case "analyze": {
      const success = stage.totals.succeeded;
      const failed = stage.totals.failed;
      const target = stage.totals.target;
      return `${success}${target ? `/${target}` : ""} analyses${failed > 0 ? ` • ${failed} failed` : ""}`;
    }
    case "synthesize": {
      const items = Object.values(stage.items);
      const kw = items.filter((i) => i.metadata.scope === "keyword").length;
      const proj = items.filter((i) => i.metadata.scope === "project").length;
      return `${kw} keyword ${kw === 1 ? "synthesis" : "syntheses"}${
        proj > 0 ? ` • ${proj} project ${proj === 1 ? "report" : "reports"}` : ""
      }`;
    }
    case "report": {
      const items = Object.values(stage.items);
      const tagCount = items.filter((i) => i.id.startsWith("tag:")).length;
      const hasDoc = items.some((i) => i.id === "document");
      const parts: string[] = [];
      if (tagCount > 0) parts.push(`${tagCount} tag consolidations`);
      if (hasDoc) parts.push("document generated");
      return parts.join(" • ") || "Reporting complete";
    }
  }
}

interface Props {
  stage: StageState;
  defaultOpen?: boolean;
}

export function CompletedStageStrip({ stage, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = ICON[stage.kind];
  const duration = durationOf(stage);

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
        <Icon className="h-3 w-3 shrink-0 text-foreground/70" />
        <span className="text-xs font-semibold shrink-0">{LABEL[stage.kind]}</span>
        <span className="text-[11px] text-muted-foreground truncate">
          {summarize(stage)}
        </span>
        {duration && (
          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto shrink-0">
            {duration}
          </span>
        )}
      </button>
      {open && (
        <div
          className={cn(
            "px-3 py-2 border-t border-border/30 text-[11px] text-muted-foreground space-y-0.5",
          )}
        >
          {stage.itemOrder.slice(0, 12).map((id) => {
            const item = stage.items[id];
            if (!item) return null;
            return (
              <div key={id} className="flex items-center gap-1.5 truncate">
                <span
                  className={cn(
                    "shrink-0 inline-block h-1.5 w-1.5 rounded-full",
                    item.status === "success" && "bg-green-500",
                    item.status === "failed" && "bg-red-500",
                    item.status === "partial" && "bg-amber-500",
                    !["success", "failed", "partial"].includes(item.status) &&
                      "bg-muted-foreground/40",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
          {stage.itemOrder.length > 12 && (
            <div className="text-[10px] italic">
              +{stage.itemOrder.length - 12} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
