import React, { useEffect } from "react";
import Sidebar from "@/features/tasks/components/Sidebar";
import TaskContentNew from "@/features/tasks/components/TaskContentNew";
import { useTaskContext } from "@/features/tasks/context/TaskContext";

export default function TaskApp() {
  const { initialize } = useTaskContext();
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="flex h-full w-full bg-textured text-foreground">
      <Sidebar />
      <TaskContentNew />
    </div>
  );
}
