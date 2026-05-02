"use client";

import {
  Search,
  Download,
  Brain,
  Layers,
  FileText,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PipelineState,
  StageKind,
} from "../../../hooks/usePipelineProgress";

const STAGES: {
  key: StageKind;
  label: string;
  icon: typeof Search;
}[] = [
  { key: "search", label: "Search", icon: Search },
  { key: "scrape", label: "Scrape", icon: Download },
  { key: "analyze", label: "Analyze", icon: Brain },
  { key: "synthesize", label: "Synthesize", icon: Layers },
  { key: "report", label: "Report", icon: FileText },
];

interface Props {
  state: PipelineState;
}

export function PipelineRail({ state }: Props) {
  return (
    <div className="flex items-stretch gap-1 px-3 py-2 overflow-x-auto bg-muted/20 border-b border-border/30">
      {STAGES.map((s, i) => {
        const stage = state.stages[s.key];
        const isActive = stage.status === "active";
        const isComplete = stage.status === "complete";
        const isFailed = stage.status === "failed";
        const Icon = s.icon;
        const target = stage.totals.target;
        const done = stage.totals.succeeded + stage.totals.failed;
        const StatusIcon = isComplete
          ? CheckCircle2
          : isActive
            ? Loader2
            : Circle;

        return (
          <div key={s.key} className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors",
                isActive && "bg-primary text-primary-foreground shadow-sm",
                isComplete && "bg-green-500/15 text-green-700 dark:text-green-400",
                isFailed && "bg-destructive/15 text-destructive",
                !isActive &&
                  !isComplete &&
                  !isFailed &&
                  "bg-muted text-muted-foreground",
              )}
            >
              <StatusIcon
                className={cn(
                  "h-3 w-3 shrink-0",
                  isActive && "animate-spin",
                )}
              />
              <Icon className="h-3 w-3 shrink-0" />
              <span className="text-[11px] font-medium whitespace-nowrap">
                {s.label}
              </span>
              {(target || done > 0) && (
                <span className="text-[10px] tabular-nums opacity-90 ml-0.5">
                  {target ? `${done}/${target}` : done}
                </span>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "h-px w-3 sm:w-4 shrink-0",
                  isComplete ? "bg-green-500/40" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
