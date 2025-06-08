"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryResponseDataByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { selectTaskById } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { TaskSelector } from "./components/TaskSelector";
import { Database, Eye } from "lucide-react";

interface SocketDataResponseTabProps {
  taskId: string | null;
  onTaskIdChange: (taskId: string | null) => void;
  isExecuting?: boolean;
  error?: string | null;
  selectedDataType?: any;
  selectedIndex?: number;
}

/**
 * Dedicated tab for data response data
 */
export const SocketDataResponseTab: React.FC<SocketDataResponseTabProps> = ({
  taskId,
  onTaskIdChange,
  isExecuting = false,
  error,
  selectedDataType,
  selectedIndex
}) => {
  const task = useAppSelector((state) => 
    taskId ? selectTaskById(state, taskId) : null
  );
  const dataResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseDataByTaskId(taskId)(state) : []
  );

  
  if (!taskId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No task selected</p>
          <p className="text-sm">Select a task from the Tasks tab to view data responses</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Task not found</p>
          <p className="text-sm">The selected task ID does not exist</p>
        </div>
      </div>
    );
  }

  const hasDataResponse = dataResponse && dataResponse.length > 0;

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Data Response</h2>
        </div>
        <TaskSelector
          selectedTaskId={taskId}
          onTaskChange={onTaskIdChange}
          placeholder="Select task..."
        />
      </div>

      {/* Content */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0 overflow-hidden">
          {hasDataResponse ? (
            <div className="h-full">
              <RawJsonExplorer pageData={dataResponse} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No data response available</p>
                {isExecuting && <p className="text-sm">Waiting for data...</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocketDataResponseTab; 