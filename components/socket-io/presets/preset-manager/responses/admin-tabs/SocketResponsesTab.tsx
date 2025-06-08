"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/lib/redux";
import {
  selectTaskResults,
  selectPrimaryResponseTextByTaskId,
  selectPrimaryResponseDataByTaskId,
  selectPrimaryResponseInfoByTaskId,
  selectPrimaryResponseErrorsByTaskId,
} from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { selectTaskById } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import BasicMarkdownContent from "@/components/mardown-display/chat-markdown/BasicMarkdownContent";
import { 
  FileText, 
  Database, 
  Info, 
  AlertTriangle,
  Eye,
  Hash
} from "lucide-react";

interface SocketResponsesTabProps {
  taskId: string | null;
  isExecuting?: boolean;
  error?: string | null;
}

type ResponseType = "text" | "data" | "info" | "errors";

/**
 * Responses tab showing all response data with type selection and appropriate viewers
 */
export const SocketResponsesTab: React.FC<SocketResponsesTabProps> = ({
  taskId,
  isExecuting = false,
  error,
}) => {
  const [selectedResponseType, setSelectedResponseType] = useState<ResponseType>("text");

  // Get task and response data
  const task = useAppSelector((state) => 
    taskId ? selectTaskById(state, taskId) : null
  );
  const taskResults = useAppSelector((state) => 
    taskId ? selectTaskResults(taskId)(state) : null
  );
  const textResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(state) : ""
  );
  const dataResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseDataByTaskId(taskId)(state) : []
  );
  const infoResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseInfoByTaskId(taskId)(state) : []
  );
  const errorsResponse = useAppSelector((state) => 
    taskId ? selectPrimaryResponseErrorsByTaskId(taskId)(state) : []
  );

  // Get counts for badges
  const getCounts = () => {
    if (!taskResults) {
      return { text: 0, data: 0, info: 0, errors: 0 };
    }
    return {
      text: textResponse.length,
      data: dataResponse.length,
      info: infoResponse.length,
      errors: errorsResponse.length,
    };
  };

  const counts = getCounts();

  const getResponseTypeIcon = (type: ResponseType) => {
    switch (type) {
      case "text":
        return <FileText className="w-4 h-4" />;
      case "data":
        return <Database className="w-4 h-4" />;
      case "info":
        return <Info className="w-4 h-4" />;
      case "errors":
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getResponseData = () => {
    switch (selectedResponseType) {
      case "text":
        return textResponse;
      case "data":
        return dataResponse;
      case "info":
        return infoResponse;
      case "errors":
        return errorsResponse;
      default:
        return null;
    }
  };

  const renderResponseContent = () => {
    const data = getResponseData();

    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === "string" && data.length === 0)) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No {selectedResponseType} response data available</p>
        </div>
      );
    }

    // Text responses use markdown display
    if (selectedResponseType === "text" && typeof data === "string") {
      return (
        <div className="p-4">
          <BasicMarkdownContent 
            content={data} 
            isStreamActive={isExecuting}
            showCopyButton={true}
          />
        </div>
      );
    }

    // All other response types use JSON explorer
    return (
      <div className="h-full">
        <RawJsonExplorer pageData={data} />
      </div>
    );
  };

  if (!taskId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No task selected</p>
          <p className="text-sm">Select a task from the Tasks tab to view responses</p>
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

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Response Type Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-gray-800 dark:text-gray-200">
            Response Data Explorer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Response Type
                </label>
                <Select value={selectedResponseType} onValueChange={(value: ResponseType) => setSelectedResponseType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Text</span>
                        <Badge variant="outline" className="ml-2">
                          {counts.text > 0 ? `${counts.text} chars` : "0"}
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="data">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <span>Data</span>
                        <Badge variant="outline" className="ml-2">
                          {counts.data}
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="info">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <span>Info</span>
                        <Badge variant="outline" className="ml-2">
                          {counts.info}
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="errors">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Errors</span>
                        <Badge variant="outline" className="ml-2">
                          {counts.errors}
                        </Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Task Info */}
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Task: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{taskId}</code>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Name: <span className="font-medium">{task.taskName}</span>
              </div>
              {task.listenerIds && task.listenerIds.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Listeners: <span className="font-medium">{task.listenerIds.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Response Type Info */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              {getResponseTypeIcon(selectedResponseType)}
              <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                {selectedResponseType} Response
              </span>
              {selectedResponseType === "text" && counts.text > 0 && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  Streaming Text
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedResponseType === "text" && "Streaming text content displayed as markdown"}
              {selectedResponseType === "data" && "Structured data objects for exploration"}
              {selectedResponseType === "info" && "Informational messages and metadata"}
              {selectedResponseType === "errors" && "Error messages and debugging information"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Response Content */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0 overflow-hidden">
          {renderResponseContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocketResponsesTab; 