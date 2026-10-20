"use client";

// features/launchpad/widgets/bodies/TasksWidget.tsx — the person's open tasks, overdue first, through the tasks
// feature's own list service (`getUserTasks("all")`: every organization the person reaches, RLS the
// ceiling; never the active organization). Shown: assigned to them, or theirs and unassigned.
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Circle } from "lucide-react";
import { getUserTasks } from "@/features/tasks/services/taskService";
import { isOpenStatus } from "@/features/tasks/constants/status";
import type { DatabaseTask } from "@/features/tasks/types/database";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { configText, type LaunchpadWidgetBodyProps } from "../types";
import { WidgetList } from "../frame";
import { usePageInput, usePageOutput } from "../../bus/react";
import type { PageRecordValue } from "../../bus/ports";

type TaskLike = Pick<DatabaseTask, "id" | "title" | "status" | "due_date" | "assignee_id" | "created_by">;

/** Open tasks that are this person's, overdue first, then by due date, then undated. */
export function pickStartTasks<T extends TaskLike>(tasks: readonly T[], userId: string, today: string): (T & { overdue: boolean })[] {
  return tasks
    .filter((t) => isOpenStatus(t.status))
    .filter((t) => t.assignee_id === userId || (!t.assignee_id && t.created_by === userId))
    .map((t) => ({ ...t, overdue: Boolean(t.due_date && t.due_date.slice(0, 10) < today) }))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
}

/** Tasks whose title holds every word of `filter` (case-insensitive); an empty filter keeps all. */
export function filterTasksByText<T extends { title: string | null }>(tasks: readonly T[], filter: string): T[] {
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...tasks];
  return tasks.filter((t) => {
    const title = (t.title ?? "").toLowerCase();
    return words.every((w) => title.includes(w));
  });
}

function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dueLabel(due: string | null, overdue: boolean): string | null {
  if (!due) return null;
  const day = due.slice(0, 10);
  if (day === localDay()) return "Today";
  const label = new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return overdue ? `Overdue ${label}` : label;
}

export function TasksWidget({ capacity }: LaunchpadWidgetBodyProps) {
  const userId = useAppSelector(selectUserId);
  const query = useQuery({
    queryKey: ["start-tasks", userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: () => getUserTasks("all"),
  });
  const info = tryGetEntityInfo("task");
  // Page bus: a connected "Filter" narrows by title; a connected "Selected task" makes rows pick.
  const filter = usePageInput("filter", "text")?.trim() ?? "";
  const selected = usePageOutput<PageRecordValue>("selected");
  const rows = userId ? filterTasksByText(pickStartTasks(query.data ?? [], userId, localDay()), filter) : [];
  return (
    <WidgetList
      capacity={capacity}
      loading={query.isLoading || !userId}
      error={query.error ? query.error.message : null}
      empty={filter ? `No open tasks match "${filter}"` : "No open tasks"}
      rows={rows.map((t) => {
        const title = t.title || "Untitled task";
        const href = info?.hrefFor?.(t.id) ?? null;
        const picked = selected.value?.id === t.id;
        return {
          key: t.id,
          title,
          href,
          meta: dueLabel(t.due_date, t.overdue),
          icon: t.overdue ? CircleAlert : Circle,
          tone: t.overdue ? ("warning" as const) : ("default" as const),
          ...(selected.connected
            ? { selected: picked, onSelect: () => selected.publish(picked ? null : { token: "task", id: t.id, label: title, ...(href ? { href } : {}) }) }
            : {}),
        };
      })}
    />
  );
}
