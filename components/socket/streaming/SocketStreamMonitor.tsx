"use client";

import { useState, useEffect } from "react";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
import AccordionWrapper from "@/components/matrx/matrx-collapsible/AccordionWrapper";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import StreamMonitorPanel from "./StreamMonitorPanel";
import ActiveEventsPanel from "./ActiveEventsPanel";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";

// Define stream data interfaces
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

interface SocketStreamMonitorProps {
  socketHook: SocketHook;
}

export const SocketStreamMonitor = ({ socketHook }: SocketStreamMonitorProps) => {
  // State for tracking event IDs
  const [activeEventIds, setActiveEventIds] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [customEventId, setCustomEventId] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  
  // Select all streaming states to find active streams
  const streamingState = useSelector((state: RootState) => state.streaming as StreamingState);
  
  // Effect to detect active event IDs from the Redux store
  useEffect(() => {
    if (streamingState) {
      const eventIds = Object.keys(streamingState);
      setActiveEventIds(eventIds);
      
      // Auto-select the first event ID if we have one and none is selected
      if (eventIds.length > 0 && !selectedEventId) {
        setSelectedEventId(eventIds[0]);
      }
    }
  }, [streamingState, selectedEventId]);

  // The event ID to use for displaying data
  const displayEventId = isCustomMode ? customEventId : selectedEventId;

  // Toggle between custom and detected event IDs
  const toggleCustomMode = () => {
    setIsCustomMode(!isCustomMode);
    if (isCustomMode && activeEventIds.length > 0) {
      setSelectedEventId(activeEventIds[0]);
    }
  };
  
  // Handle selecting an event ID from the active events panel
  const handleSelectEvent = (eventId: string) => {
    setIsCustomMode(false);
    setSelectedEventId(eventId);
  };

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-4 shadow-sm">
      <AccordionWrapper
        title="Stream Monitor"
        value="stream-monitor"
        defaultOpen={true}
      >
        <div className="space-y-6 pt-4">
          <Tabs defaultValue="monitor" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="events">Active Events</TabsTrigger>
              <TabsTrigger value="monitor">Stream Monitor</TabsTrigger>
            </TabsList>
            
            <TabsContent value="events" className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This panel shows all active socket events. Click on an event to monitor its data streams.
              </p>
              
              <ActiveEventsPanel 
                onSelectEvent={handleSelectEvent} 
                selectedEventId={selectedEventId}
              />
            </TabsContent>
            
            <TabsContent value="monitor" className="space-y-4">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Event ID Selection
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleCustomMode}
                    className="text-xs h-8 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
                  >
                    {isCustomMode ? "Use Detected Events" : "Use Custom Event ID"}
                  </Button>
                </div>
                
                {isCustomMode ? (
                  // Custom event ID input
                  <div className="flex flex-col space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Enter a custom event ID:
                    </div>
                    <Input 
                      type="text"
                      placeholder="Enter event ID"
                      value={customEventId}
                      onChange={(e) => setCustomEventId(e.target.value)}
                      className="max-w-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                ) : (
                  // Dropdown for detected event IDs
                  <div className="flex flex-col space-y-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {activeEventIds.length > 0 
                        ? "Select an active event stream:" 
                        : "No active event streams detected. Submit a task to generate events."}
                    </div>
                    <Select
                      value={selectedEventId}
                      onValueChange={setSelectedEventId}
                      disabled={activeEventIds.length === 0}
                    >
                      <SelectTrigger className="max-w-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Select an event ID" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEventIds.map((eventId) => (
                          <SelectItem key={eventId} value={eventId}>
                            {eventId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {displayEventId ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Monitoring event ID: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{displayEventId}</code>
                  </div>
                ) : (
                  <div className="text-xs text-red-500 dark:text-red-400">
                    No event ID selected. Monitor will not display any data.
                  </div>
                )}
              </div>
              
              {displayEventId && (
                <StreamMonitorPanel 
                  socketHook={socketHook} 
                  eventId={displayEventId} 
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AccordionWrapper>
    </div>
  );
};

export default SocketStreamMonitor; 