"use client";

import { Badge } from "@/components/ui";
import { CheckCircleIcon, XCircleIcon, ActivityIcon, ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectAllResponses } from "@/lib/redux/socket-io";
import { useAppSelector } from "@/lib/redux";
import { ResponseState } from "@/lib/redux/socket-io/socket.types";
// Define the stream data structure to match Redux store
interface StreamData {
  text: string;
  data: any[];
  message: string;
  info: string;
  error: string;
  end: boolean;
  isStreaming: boolean;
}

interface ActiveEventsPanelProps {
  onSelectEvent?: (listenerId: string) => void;
  selectedListenerId?: string;
}

export const ActiveEventsPanel = ({ onSelectEvent, selectedListenerId }: ActiveEventsPanelProps) => {
  // Get all streaming states from Redux - safely handle null/undefined
  const allResponses = useAppSelector(selectAllResponses);



  const listenerIds  = Object.keys(allResponses);
  
  if (listenerIds.length === 0) {
    return (
      <div className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-center h-24 text-gray-500 dark:text-gray-400">
          <p>No active events. Submit a task to generate events.</p>
        </div>
      </div>
    );
  }

  // Empty stream data object with proper shape for fallback
  const emptyStreamData: ResponseState = {
    text: '',
    data: [],
    info: [],
    errors: [],
    ended: false,
    taskId: '',
};

  return (
    <div className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Active Events ({listenerIds.length})
        </div>
      </div>
      <div className="max-h-60 overflow-auto">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {listenerIds.map((listenerId) => {
            // Safely handle missing or null event data with properly typed fallback
            const eventData = allResponses[listenerId];
            const isStreaming = Boolean(eventData.ended === false);
            const isEnded = Boolean(eventData.ended === true);
            const isSelected = listenerId === selectedListenerId;
            
            // Safely handle missing data properties
            const dataLength = Array.isArray(eventData.data) ? eventData.data.length : 0;
            const textLength = typeof eventData.text === 'string' ? eventData.text.length : 0;
            const infoLength = Array.isArray(eventData.info) ? eventData.info.length : 0;
            const errorsLength = Array.isArray(eventData.errors) ? eventData.errors.length : 0;



            return (
              <li 
                key={listenerId} 
                className={cn(
                  "p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer",
                  isSelected && "bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                )}
                onClick={() => onSelectEvent && onSelectEvent(listenerId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isSelected && (
                      <ArrowRightIcon className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                    )}
                    <div className={cn(
                      "truncate font-mono text-xs",
                      isSelected 
                        ? "text-blue-600 dark:text-blue-400 font-medium" 
                        : "text-gray-800 dark:text-gray-300"
                    )}>
                      {listenerId}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isStreaming ? (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        <ActivityIcon className="h-3 w-3 mr-1 animate-pulse" />
                        Active
                      </Badge>
                    ) : null}
                    {isEnded ? (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    ) : null}
                    {!isEnded ? (
                      <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800">
                        <XCircleIcon className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {dataLength > 0 && (
                    <span className="mr-3">Data: {dataLength} items</span>
                  )}
                  {textLength > 0 && (
                    <span className="mr-3">Text: {textLength} chars</span>
                  )}
                  {infoLength > 0 && (
                    <span className="mr-3">Info: {infoLength} items</span>
                  )}
                  {errorsLength > 0 && (
                    <span className="mr-3">Errors: {errorsLength} items</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ActiveEventsPanel; 