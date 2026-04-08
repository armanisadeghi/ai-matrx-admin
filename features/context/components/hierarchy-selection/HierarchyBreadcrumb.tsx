"use client";

import { Building2, FolderKanban, ListTodo, ChevronRight, X, User } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { HierarchySelectionProps, HierarchyLevel } from "./types";
import { EMPTY_SELECTION } from "./types";

const LEVEL_ICONS: Record<HierarchyLevel, React.ComponentType<{ className?: string }>> = {
  organization: Building2,
  project: FolderKanban,
  task: ListTodo,
};

const LEVEL_ACCENT: Record<HierarchyLevel, string> = {
  organization: "text-violet-500",
  project: "text-amber-500",
  task: "text-sky-500",
};

interface HierarchyBreadcrumbProps extends HierarchySelectionProps {
  rootLabel?: string;
  showClear?: boolean;
  onCrumbClick?: (level: HierarchyLevel) => void;
}

export function HierarchyBreadcrumb({
  levels = ["organization", "project", "task"],
  value,
  onChange,
  className,
  rootLabel = "Context",
  showClear = true,
  onCrumbClick,
}: HierarchyBreadcrumbProps) {
  const crumbs: { level: HierarchyLevel; id: string; name: string }[] = [];

  if (levels.includes("organization") && value.organizationId && value.organizationName) {
    crumbs.push({
      level: "organization",
      id: value.organizationId,
      name: value.organizationName,
    });
  }
  if (levels.includes("project") && value.projectId && value.projectName) {
    crumbs.push({
      level: "project",
      id: value.projectId,
      name: value.projectName,
    });
  }
  if (levels.includes("task") && value.taskId && value.taskName) {
    crumbs.push({
      level: "task",
      id: value.taskId,
      name: value.taskName,
    });
  }

  const handleCrumbClick = (level: HierarchyLevel) => {
    if (onCrumbClick) {
      onCrumbClick(level);
      return;
    }
    if (level === "organization") {
      onChange({
        ...value,
        projectId: null,
        projectName: null,
        taskId: null,
        taskName: null,
      });
    } else if (level === "project") {
      onChange({ ...value, taskId: null, taskName: null });
    }
  };

  const hasContext = crumbs.length > 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              onClick={() => onChange(EMPTY_SELECTION)}
            >
              <User className="h-3 w-3" />
              {rootLabel}
            </button>
          </BreadcrumbItem>

          {crumbs.map((crumb, idx) => {
            const Icon = LEVEL_ICONS[crumb.level];
            const accent = LEVEL_ACCENT[crumb.level];
            const isLast = idx === crumbs.length - 1;

            return (
              <span key={`${crumb.level}-${crumb.id}`} className="contents">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3 w-3" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-xs flex items-center gap-1">
                      <Icon className={cn("h-3 w-3", accent)} />
                      <span className="font-medium">{crumb.name}</span>
                    </BreadcrumbPage>
                  ) : (
                    <button
                      className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => handleCrumbClick(crumb.level)}
                    >
                      <Icon className={cn("h-3 w-3", accent)} />
                      {crumb.name}
                    </button>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {showClear && hasContext && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => onChange(EMPTY_SELECTION)}
          title="Clear context"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
