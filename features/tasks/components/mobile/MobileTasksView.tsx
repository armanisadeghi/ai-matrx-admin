"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFilteredTasks } from "@/features/tasks/redux/selectors";
import MobileTasksList from "./MobileTasksList";
import MobileTaskDetails from "./MobileTaskDetails";

type MobileView = "tasks" | "details";

export default function MobileTasksView() {
  const filteredTasks = useAppSelector(selectFilteredTasks);
  const [currentView, setCurrentView] = useState<MobileView>("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = selectedTaskId
    ? filteredTasks.find((t) => t.id === selectedTaskId)
    : null;

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCurrentView("details");
  };

  const handleBack = () => {
    setCurrentView("tasks");
    setSelectedTaskId(null);
  };

  return (
    <div className="h-full w-full bg-background overflow-hidden relative touch-pan-y">
      {/* Tasks List View */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-in-out overflow-hidden ${
          currentView === "tasks" ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <MobileTasksList onTaskSelect={handleTaskSelect} />
      </div>

      {/* Task Details View */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-in-out overflow-hidden ${
          currentView === "details" ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedTask && (
          <MobileTaskDetails task={selectedTask} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
