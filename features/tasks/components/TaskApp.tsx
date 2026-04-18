"use client";

import React from "react";
import Sidebar from "@/features/tasks/components/Sidebar";
import TaskContentNew from "@/features/tasks/components/TaskContentNew";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";

export default function TaskApp() {
  // Idempotent: fires the hierarchy RPC only if status === 'idle'.
  // Every other consumer (sidebar, pickers) shares the same cache.
  useNavTree();

  return (
    <div className="flex h-full w-full bg-textured text-foreground">
      <Sidebar />
      <TaskContentNew />
    </div>
  );
}
