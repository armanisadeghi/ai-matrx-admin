"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
import {
  selectStreamText,
  selectStreamData,
  selectStreamMessage,
  selectStreamInfo,
  selectStreamError,
  selectStreamEnd,
  selectIsStreaming,
  selectAllStreamInfo,
  selectStreamTextContent
} from "@/lib/redux/socket/streamingSlice";
import { Card, CardContent, CardHeader, CardTitle, ScrollArea } from "@/components/ui";
import StreamTextDisplay from "./StreamTextDisplay";
import StreamObjectDisplay from "./StreamObjectDisplay";
import StreamBooleanDisplay from "./StreamBooleanDisplay";

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

interface StreamingState {
  [eventId: string]: StreamData;
}

interface StreamMonitorPanelProps {
  socketHook: SocketHook;
  eventId: string;
}

export const StreamMonitorPanel = ({ socketHook, eventId }: StreamMonitorPanelProps) => {
  // Get the streaming state from Redux to check if this event ID exists
  // Safely handle potentially null/undefined state
  const streamingState = useSelector<RootState, StreamingState>((state) => 
    (state.streaming || {}) as StreamingState
  );
  const eventExists = eventId && streamingState && !!streamingState[eventId];
  
  if (!eventId) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Please select or enter an event ID to monitor.</p>
      </div>
    );
  }
  
  if (!eventExists) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No data found for event ID: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{eventId}</code>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          This event ID may not exist or hasn't received any data yet.
        </p>
      </div>
    );
  }
  
  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Text Stream */}
        <StreamTextDisplay 
          title="Stream Text" 
          selector={(state: RootState) => selectStreamText(state, eventId) || ""} 
        />
        
        {/* Message Stream */}
        <StreamTextDisplay 
          title="Stream Message" 
          selector={(state: RootState) => selectStreamMessage(state, eventId) || ""} 
        />
        
        {/* Info Stream */}
        <StreamTextDisplay 
          title="Stream Info" 
          selector={(state: RootState) => selectStreamInfo(state, eventId) || ""} 
        />
        
        {/* Error Stream */}
        <StreamTextDisplay 
          title="Stream Error" 
          selector={(state: RootState) => selectStreamError(state, eventId) || ""} 
          errorDisplay={true}
        />
        
        {/* Is Streaming Status */}
        <StreamBooleanDisplay 
          title="Is Streaming" 
          selector={(state: RootState) => !!selectIsStreaming(state, eventId)} 
        />
        
        {/* Stream End Status */}
        <StreamBooleanDisplay 
          title="Stream End" 
          selector={(state: RootState) => !!selectStreamEnd(state, eventId)} 
        />
        
        {/* Stream Data */}
        <div className="md:col-span-3">
          <StreamObjectDisplay 
            title="Stream Data" 
            selector={(state: RootState) => selectStreamData(state, eventId) || []}
          />
        </div>
        
        {/* All Stream Info */}
        <div className="md:col-span-3">
          <StreamObjectDisplay 
            title="All Stream Info" 
            selector={(state: RootState) => selectAllStreamInfo(state, eventId) || {}}
          />
        </div>
        
        {/* Stream Text Content */}
        <div className="md:col-span-3">
          <StreamObjectDisplay 
            title="Stream Text Content" 
            selector={(state: RootState) => selectStreamTextContent(state, eventId) || {}}
          />
        </div>
      </div>
    </div>
  );
};

export default StreamMonitorPanel; 