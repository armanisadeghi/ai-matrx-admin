"use client";

import React from "react";
import { SocketPanelResponse } from "@/components/socket/response/SocketPanelResponse";
import { SocketPresetResponseProps } from "../SocketPresetManager";
import { Play, AlertCircle, CheckCircle } from "lucide-react";

/**
 * A wrapper for SocketPanelResponse that implements the SocketPresetResponseProps interface
 */
export const SocketPanelResponseWrapper: React.FC<SocketPresetResponseProps> = ({
  taskId,
  isExecuting = false,
  error,
}) => {
  // If there's an error, show error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Execution Failed</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // If we have a task ID, show the response panel
  if (taskId) {
    return (
      <div className="border-border rounded-lg bg-textured">
        <div className="p-3 border-b border-border bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Task Results
            </span>
            <code className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
              {taskId}
            </code>
          </div>
        </div>
        <div className="overflow-hidden">
          <SocketPanelResponse taskId={taskId} />
        </div>
      </div>
    );
  }

  // Empty state - waiting for execution
  return (
    <div className="border-border rounded-lg bg-gray-50 dark:bg-gray-800/50 p-8">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <Play className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>
          {isExecuting 
            ? "Executing task..." 
            : "Execute to see results"
          }
        </p>
      </div>
    </div>
  );
};

export default SocketPanelResponseWrapper; 