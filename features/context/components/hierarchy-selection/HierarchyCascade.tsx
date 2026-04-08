"use client";

import {
  Building2,
  FolderKanban,
  ListTodo,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { useHierarchySelection } from "./useHierarchySelection";
import type { HierarchySelectionProps, HierarchyLevel } from "./types";

const LEVEL_ICONS: Record<HierarchyLevel, React.ComponentType<{ className?: string }>> = {
  organization: Building2,
  project: FolderKanban,
  task: ListTodo,
};

interface HierarchyCascadeProps extends HierarchySelectionProps {
  layout?: "horizontal" | "vertical";
  showSeparators?: boolean;
  requireProject?: boolean;
}

export function HierarchyCascade({
  levels = ["organization", "project"],
  value,
  onChange,
  disabled,
  className,
  layout = "horizontal",
  showSeparators = true,
  requireProject = false,
}: HierarchyCascadeProps) {
  const ctx = useHierarchySelection({
    levels,
    controlled: { value, onChange },
  });

  const isVertical = layout === "vertical";
  const missingProject = requireProject && levels.includes("project") && !value.projectId;

  if (ctx.isLoading) {
    return (
      <div className={cn("flex items-center gap-2 py-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        isVertical ? "flex flex-col gap-1.5" : "flex items-center gap-2 flex-wrap",
        className,
      )}
    >
      {levels.includes("organization") && (
        <LevelSelect
          level="organization"
          options={ctx.orgs}
          selectedId={value.organizationId}
          onSelect={ctx.setOrg}
          disabled={disabled || ctx.orgs.length === 0}
          placeholder="Select organization"
        />
      )}

      {levels.includes("project") && value.organizationId && (
        <>
          {showSeparators && !isVertical && (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <LevelSelect
            level="project"
            options={ctx.projects}
            selectedId={value.projectId}
            onSelect={ctx.setProject}
            disabled={disabled || ctx.projects.length === 0}
            placeholder="Select project"
            error={missingProject}
          />
        </>
      )}

      {levels.includes("task") && value.projectId && (
        <>
          {showSeparators && !isVertical && (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <LevelSelect
            level="task"
            options={ctx.tasks}
            selectedId={value.taskId}
            onSelect={ctx.setTask}
            disabled={disabled || ctx.tasks.length === 0}
            placeholder="Select task"
          />
        </>
      )}

      {missingProject && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          <span>Select a project</span>
        </div>
      )}
    </div>
  );
}

function LevelSelect({
  level,
  options,
  selectedId,
  onSelect,
  disabled,
  placeholder,
  error,
}: {
  level: HierarchyLevel;
  options: { id: string; name: string; isPersonal?: boolean }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  placeholder: string;
  error?: boolean;
}) {
  const Icon = LEVEL_ICONS[level];
  const selectedName = options.find((o) => o.id === selectedId)?.name;

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", error ? "text-destructive" : "text-muted-foreground")} />
      <Select
        value={selectedId ?? ""}
        onValueChange={(v) => onSelect(v || null)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-7 text-xs border-dashed min-w-[120px] max-w-[200px]",
            error && "border-destructive text-destructive",
          )}
        >
          <SelectValue placeholder={placeholder}>{selectedName ?? placeholder}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id} className="text-xs">
              {opt.name}
              {opt.isPersonal && <span className="ml-1 text-muted-foreground">(personal)</span>}
            </SelectItem>
          ))}
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">None available</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
