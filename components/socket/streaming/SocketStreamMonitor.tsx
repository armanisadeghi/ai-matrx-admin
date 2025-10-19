"use client";
import { useState } from "react";
import AccordionWrapper from "@/components/matrx/matrx-collapsible/AccordionWrapper";
import {
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Button,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui";
import StreamMonitorPanel from "./StreamMonitorPanel";
import ActiveEventsPanel from "./ActiveEventsPanel";
import EventStatusIndicator from "./EventStatusIndicator";
import { useAppSelector } from "@/lib/redux";
import { selectTaskFirstListenerId, selectAllResponses, selectTaskResponsesByTaskId, selectAllTasks } from "@/lib/redux/socket-io";

export const SocketStreamMonitor = ({ taskId }: { taskId: string }) => {
    const allTasks = useAppSelector(selectAllTasks);
    const allResponses = useAppSelector(selectAllResponses);
    const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
    const socketResponse = useAppSelector(selectTaskResponsesByTaskId(taskId));

    const [selectedListenerId, setSelectedListenerId] = useState<string>(firstListenerId);

    return (
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-4 shadow-sm">
            <AccordionWrapper title="Stream Monitor" value="stream-monitor" defaultOpen={true}>
                <div className="space-y-2 pt-4">
                    <Tabs defaultValue="monitor" className="w-full">
                        <TabsList className="mb-4 space-x-2 bg-gray-100 dark:bg-gray-800">
                            <TabsTrigger className="border border-gray-300 dark:border-gray-500 rounded-xl" value="monitor">
                                Response Monitor
                            </TabsTrigger>
                            <TabsTrigger className="border border-gray-300 dark:border-gray-500 rounded-xl" value="events">
                                Active Events
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="events" className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                This panel shows all active socket events. Click on an event to monitor its data streams.
                            </p>
                            <ActiveEventsPanel onSelectEvent={setSelectedListenerId} selectedListenerId={selectedListenerId} />
                        </TabsContent>

                        <TabsContent value="monitor" className="space-y-4">
                            <div className="flex flex-col space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col space-y-2">
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {Object.keys(allResponses).length > 0
                                                ? "Select an active event stream:"
                                                : "No active event streams detected. Submit a task to generate events."}
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <Select
                                                value={selectedListenerId}
                                                onValueChange={setSelectedListenerId}
                                                disabled={Object.keys(allResponses).length === 0}
                                            >
                                                <SelectTrigger className="max-w-md bg-textured text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">
                                                    <SelectValue placeholder="Select an event ID" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(allResponses).map((listenerId) => (
                                                        <SelectItem key={listenerId} value={listenerId}>
                                                            {listenerId}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {selectedListenerId && <EventStatusIndicator listenerId={selectedListenerId} />}
                                        </div>
                                    </div>
                                </div>

                                {selectedListenerId && <StreamMonitorPanel listenerId={selectedListenerId} />}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </AccordionWrapper>
        </div>
    );
};

export default SocketStreamMonitor;
