"use client";

import { Building2, FolderKanban, ListTodo, X, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { useHierarchySelection } from "./useHierarchySelection";
import type { HierarchySelectionProps, HierarchyLevel, HierarchyOption } from "./types";

const LEVEL_ICONS: Record<HierarchyLevel, React.ComponentType<{ className?: string }>> = {
  organization: Building2,
  project: FolderKanban,
  task: ListTodo,
};

const PILL_COLORS: Record<HierarchyLevel, { active: string; idle: string }> = {
  organization: {
    active: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
    idle: "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
  },
  project: {
    active: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    idle: "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
  },
  task: {
    active: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    idle: "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
  },
};

interface HierarchyPillsProps extends HierarchySelectionProps {
  size?: "sm" | "md";
}

export function HierarchyPills({
  levels = ["organization", "project"],
  value,
  onChange,
  disabled,
  className,
  size = "sm",
}: HierarchyPillsProps) {
  const ctx = useHierarchySelection({
    levels,
    controlled: { value, onChange },
  });

  if (ctx.isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const pillConfig: {
    level: HierarchyLevel;
    options: HierarchyOption[];
    selectedId: string | null;
    selectedName: string | null;
    onSelect: (id: string | null) => void;
    show: boolean;
  }[] = [
    {
      level: "organization",
      options: ctx.orgs,
      selectedId: value.organizationId,
      selectedName: value.organizationName,
      onSelect: ctx.setOrg,
      show: levels.includes("organization"),
    },
    {
      level: "project",
      options: ctx.projects,
      selectedId: value.projectId,
      selectedName: value.projectName,
      onSelect: ctx.setProject,
      show: levels.includes("project") && !!value.organizationId,
    },
    {
      level: "task",
      options: ctx.tasks,
      selectedId: value.taskId,
      selectedName: value.taskName,
      onSelect: ctx.setTask,
      show: levels.includes("task") && !!value.projectId,
    },
  ];

  const h = size === "sm" ? "h-6" : "h-7";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {pillConfig.map(
        ({ level, options, selectedId, selectedName, onSelect, show }) => {
          if (!show) return null;
          const Icon = LEVEL_ICONS[level];
          const colors = selectedId ? PILL_COLORS[level].active : PILL_COLORS[level].idle;

          return (
            <DropdownMenu key={level}>
              <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                  className={cn(
                    "flex items-center gap-1 px-2 rounded-full border transition-colors cursor-pointer",
                    h,
                    textSize,
                    colors,
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[120px]">
                    {selectedName ?? `All ${level === "organization" ? "Orgs" : level === "project" ? "Projects" : "Tasks"}`}
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  className={cn(textSize, !selectedId && "font-semibold")}
                  onClick={() => onSelect(null)}
                >
                  All
                </DropdownMenuItem>
                {options.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    className={cn(textSize, selectedId === opt.id && "font-semibold text-primary")}
                    onClick={() => onSelect(opt.id)}
                  >
                    {opt.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      )}

      {(value.organizationId || value.projectId || value.taskId) && (
        <button
          className={cn(
            "flex items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-colors",
            size === "sm" ? "h-5 w-5" : "h-6 w-6",
          )}
          onClick={() => ctx.clear()}
          title="Clear filters"
          disabled={disabled}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
