"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryResponseInfoByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { selectTaskById } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { Info, Eye } from "lucide-react";

interface SocketInfoResponseTabProps {
  taskId: string | null;
  isExecuting?: boolean;
  error?: string | null;
  selectedDataType?: any;
  selectedIndex?: number;
}

/**
 * Dedicated tab for info response data
 */
export const SocketInfoResponseTab: React.FC<SocketInfoResponseTabProps> = ({
  taskId,
  isExecuting = false,
  error,
  selectedDataType,
  selectedIndex
}) => {
  const task = useAppSelector((state) => 
    taskId ? selectTaskById(state, taskId) : null
  );
  const infoResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseInfoByTaskId(taskId)(state) : []
  );

  if (!taskId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Info className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No task selected</p>
          <p className="text-sm">Select a task from the Tasks tab to view info responses</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Info className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Task not found</p>
          <p className="text-sm">The selected task ID does not exist</p>
        </div>
      </div>
    );
  }

  const hasInfoResponse = infoResponse && infoResponse.length > 0;

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Info Response
            </CardTitle>
            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
              <div>Task: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{taskId}</code></div>
              <div>Name: <span className="font-medium">{task.taskName}</span></div>
              {hasInfoResponse && (
                <div>Items: <span className="font-medium">{infoResponse.length}</span></div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0 overflow-hidden">
          {hasInfoResponse ? (
            <div className="h-full">
              <RawJsonExplorer pageData={infoResponse} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No info response available</p>
                {isExecuting && <p className="text-sm">Waiting for info data...</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocketInfoResponseTab; 