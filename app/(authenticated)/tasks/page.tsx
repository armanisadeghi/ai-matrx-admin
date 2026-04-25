"use client";

import React, { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectSelectedTaskId,
  setSelectedTaskId,
} from "@/features/tasks/redux/taskUiSlice";
import TasksContextSidebar from "@/features/tasks/components/TasksContextSidebar";
import TaskListPane from "@/features/tasks/components/TaskListPane";
import TaskEditor from "@/features/tasks/components/TaskEditor";
import MobileTasksView from "@/features/tasks/components/mobile/MobileTasksView";

/**
 * Tasks — 3-column layout inspired by macOS Notes.
 *
 * ┌─ TasksContextSidebar ─┬─ TaskListPane ─┬─ TaskEditor ─┐
 * │  search / filters     │  grouped task  │  full CRUD   │
 * │  context + scopes     │  preview list  │  w/ Redux    │
 * │  group / sort / view  │                │  draft       │
 * └───────────────────────┴────────────────┴──────────────┘
 *
 * Data hydration is shared via `useNavTree()` — idempotent across the app.
 */
export default function TasksPage() {
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  useNavTree();

  // Hydrate selected-task from ?task= URL param on mount
  useEffect(() => {
    const param = searchParams.get("task");
    if (param && param !== selectedTaskId) {
      dispatch(setSelectedTaskId(param));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep ?task= in sync with selected task for reload survival + cmd+click
  useEffect(() => {
    const current = searchParams.get("task");
    if (selectedTaskId === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (selectedTaskId) params.set("task", selectedTaskId);
    else params.delete("task");
    const qs = params.toString();
    router.replace(qs ? `/tasks?${qs}` : "/tasks", { scroll: false });
  }, [selectedTaskId, searchParams, router]);

  if (isMobile) {
    return <MobileTasksView />;
  }

  return (
    <div className="flex w-full h-page min-h-0">
      {/* Column 1 — Context + filters */}
      <aside className="w-[260px] shrink-0 border-r border-border flex flex-col min-h-0">
        <TasksContextSidebar />
      </aside>

      {/* Column 2 — Task list preview */}
      <section className="w-[360px] shrink-0 border-r border-border flex flex-col min-h-0">
        <TaskListPane />
      </section>

      {/* Column 3 — Task editor */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <TaskEditor />
      </main>
    </div>
  );
}
