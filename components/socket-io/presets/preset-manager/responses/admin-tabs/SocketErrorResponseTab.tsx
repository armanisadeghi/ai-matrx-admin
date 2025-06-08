"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryResponseErrorsByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { selectTaskById } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { AlertTriangle, Eye } from "lucide-react";

interface SocketErrorResponseTabProps {
  taskId: string | null;
  isExecuting?: boolean;
  error?: string | null;
  selectedDataType?: any;
  selectedIndex?: number;
}

/**
 * Dedicated tab for error response data
 */
export const SocketErrorResponseTab: React.FC<SocketErrorResponseTabProps> = ({
  taskId,
  isExecuting = false,
  error,
  selectedDataType,
  selectedIndex
}) => {
  const task = useAppSelector((state) => 
    taskId ? selectTaskById(state, taskId) : null
  );
  const errorsResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseErrorsByTaskId(taskId)(state) : []
  );

  if (!taskId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No task selected</p>
          <p className="text-sm">Select a task from the Tasks tab to view error responses</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Task not found</p>
          <p className="text-sm">The selected task ID does not exist</p>
        </div>
      </div>
    );
  }

  const hasErrorsResponse = errorsResponse && errorsResponse.length > 0;

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Error Response
            </CardTitle>
            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
              <div>Task: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{taskId}</code></div>
              <div>Name: <span className="font-medium">{task.taskName}</span></div>
              {hasErrorsResponse && (
                <div>Items: <span className="font-medium">{errorsResponse.length}</span></div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0 overflow-hidden">
          {hasErrorsResponse ? (
            <div className="h-full">
              <RawJsonExplorer pageData={errorsResponse} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No error response available</p>
                {!isExecuting && <p className="text-sm text-green-600 dark:text-green-400">Good news - no errors!</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocketErrorResponseTab; 