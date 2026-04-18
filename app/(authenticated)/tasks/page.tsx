"use client";

import React, { Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import Sidebar from "@/features/tasks/components/Sidebar";
import TaskContentNew from "@/features/tasks/components/TaskContentNew";
import MobileTasksView from "@/features/tasks/components/mobile/MobileTasksView";

/**
 * Tasks Page - Main task management interface
 *
 * Route: /tasks
 *
 * Data hydration is shared via `useNavTree()` — fires the hierarchy RPC only
 * when status === 'idle'. If the sidebar or window panels have already
 * fetched, this returns cached data instantly.
 */
export default function TasksPage() {
  const isMobile = useIsMobile();
  useNavTree();

  if (isMobile) {
    return <MobileTasksView />;
  }

  return (
    <div className="flex w-full h-page">
      <Sidebar />
      <Suspense>
        <TaskContentNew />
      </Suspense>
    </div>
  );
}
