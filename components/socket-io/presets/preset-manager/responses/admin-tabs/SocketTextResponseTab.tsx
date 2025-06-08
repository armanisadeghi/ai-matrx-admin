"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryResponseTextByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { selectTaskById } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BasicMarkdownContent from "@/components/mardown-display/chat-markdown/BasicMarkdownContent";
import { TaskSelector } from "./components/TaskSelector";
import { FileText, Eye } from "lucide-react";

interface SocketTextResponseTabProps {
  taskId: string | null;
  onTaskIdChange: (taskId: string | null) => void;
  isExecuting?: boolean;
  error?: string | null;
  selectedDataType?: any;
  selectedIndex?: number;
}

/**
 * Dedicated tab for text response data
 */
export const SocketTextResponseTab: React.FC<SocketTextResponseTabProps> = ({
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
  const textResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(state) : ""
  );

  if (!taskId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No task selected</p>
          <p className="text-sm">Select a task from the Tasks tab to view text responses</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Task not found</p>
          <p className="text-sm">The selected task ID does not exist</p>
        </div>
      </div>
    );
  }

  const hasTextResponse = textResponse && textResponse.length > 0;

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Text Response</h2>
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
          {hasTextResponse ? (
            <div className="h-full overflow-y-auto p-6">
              <BasicMarkdownContent 
                content={textResponse} 
                isStreamActive={isExecuting}
                showCopyButton={true}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No text response data available</p>
                {isExecuting && <p className="text-sm">Waiting for streaming text...</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocketTextResponseTab; 