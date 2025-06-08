"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { 
  selectTaskById,
  selectTaskListenerIds
} from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskSidebar } from "./components/TaskSidebar";

interface SocketTasksTabProps {
  currentTaskId: string | null;
  onTaskIdChange: (taskId: string | null) => void;
  isExecuting?: boolean;
  error?: string | null;
}

export const SocketTasksTab: React.FC<SocketTasksTabProps> = ({
  currentTaskId,
  onTaskIdChange,
  isExecuting = false,
  error
}) => {
  const selectedTask = useAppSelector((state) => 
    currentTaskId ? selectTaskById(state, currentTaskId) : null
  );
  const taskListenerIds = useAppSelector((state) => 
    currentTaskId ? selectTaskListenerIds(state, currentTaskId) : []
  );

  return (
    <div className="h-full flex">
      {/* Left Sidebar */}
      <TaskSidebar
        selectedTaskId={currentTaskId}
        onTaskSelect={onTaskIdChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 min-w-0">
        {/* Error display */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3">
            <p className="text-red-700 dark:text-red-300 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Selected Task Details */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedTask ? "Task Details" : "No Task Selected"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {selectedTask ? (
                <div className="h-full">
                  <RawJsonExplorer 
                    pageData={selectedTask} 
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>Select a task from the sidebar to view its details</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Listeners */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Task Listeners</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total: {taskListenerIds?.length || 0}
              </p>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {taskListenerIds && taskListenerIds.length > 0 ? (
                <div className="h-full">
                  <RawJsonExplorer 
                    pageData={taskListenerIds}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>{currentTaskId ? "No listeners for this task" : "Select a task to view listeners"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 