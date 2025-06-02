// File: components/socket/admin/SocketAdmin.tsx
"use client";
import { Card, CardContent } from "@/components/ui";
import DynamicForm from "@/components/socket-io/form-builder/DynamicForm";
import AccordionWrapper from "../../matrx/matrx-collapsible/AccordionWrapper";
import { cn } from "@/lib/utils";
import { SocketAccordionResponse } from "@/components/socket/response/SocketAccordionResponse";
import { SocketTaskBuilder } from "../SocketTaskBuilder";
import { useState } from "react";
import SocketStreamMonitor from "../streaming/SocketStreamMonitor";
import { ResponsiveSocketHeader } from "@/components/socket-io/headers/ResponsiveSocketHeader";
import { useAppSelector } from "@/lib/redux";
import { selectAllTasks, selectTaskById } from "@/lib/redux/socket-io";
import TaskDebugDisplay from "@/components/socket-io/form-builder/TaskDebugDisplay";

interface SocketAdminProps {
    className?: string;
}

export const SocketAdmin = ({ className }: SocketAdminProps) => {
    const [testMode, setTestMode] = useState(false);
    const [taskId, setTaskId] = useState<string>("");
    const [debugMode, setDebugMode] = useState(true); // Enable debug mode by default

    const tasks = useAppSelector(selectAllTasks);
    const taskState = useAppSelector((state) => selectTaskById(state, taskId));
    const taskName = taskState?.taskName || "";

    const handleTestModeChange = (testMode: boolean) => {
        setTestMode(testMode);
    };

    const handleTaskCreate = (taskId: string) => {
        setTaskId(taskId);
    };

    console.log("Socket Admin Debug Mode:", debugMode);

    return (
        <div className={cn("w-full h-full flex flex-col bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-2xl", className)}>
            {/* Sticky header outside of card content */}
            <div className="sticky top-0 z-50 bg-gray-100 dark:bg-gray-800 pt-0 px-2 pb-2">
                <ResponsiveSocketHeader 
                    onTestModeChange={handleTestModeChange} 
                    onTaskCreate={handleTaskCreate} 
                    debugMode={debugMode} 
                />
            </div>
            
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
                <Card className="bg-gray-100 dark:bg-gray-800 rounded-2xl mb-8">
                    <CardContent className="space-y-8 pt-6">
                        <div className="space-y-6">
                            {Object.values(tasks).map((task, taskIndex) => (
                                <div
                                    key={taskIndex}
                                    className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-4 shadow-sm"
                                >
                                    <AccordionWrapper
                                        title={`Config Builder for ${taskName || "Selected Task"}`}
                                        value="config-builder"
                                        defaultOpen={true}
                                    >
                                        <div
                                            className="w-1/2 overflow-y-auto pr-4 h-full scrollbar-none"
                                        >
                                            <DynamicForm taskId={taskId} showDebug={false} />
                                        </div>
                                    </AccordionWrapper>
                                </div>
                            ))}
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-4 shadow-sm">
                                <AccordionWrapper
                                    title={`Config Builder for ${taskName || "Selected Task"}`}
                                    value="config-builder"
                                    defaultOpen={false}
                                >
                                    <div className="space-y-6 pt-4">
                                        <SocketTaskBuilder
                                            taskId={taskId}
                                            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                                        />
                                    </div>
                                </AccordionWrapper>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Stream Monitor Panel */}
                <div className="mb-8">
                    <SocketStreamMonitor taskId={taskId} />
                </div>
                
                {/* Response Panel */}
                <div className="px-2 mb-4">
                    <SocketAccordionResponse taskId={taskId} />
                </div>
                
                {/* Debug Panel - Only show when debug mode is enabled */}
                {debugMode && taskId && (
                    <div className="px-2 mb-4">
                        <AccordionWrapper
                            title="Real-time Task Debug Info"
                            value="debug-info"
                            defaultOpen={false}
                        >
                            <div className="pt-4">
                                <TaskDebugDisplay taskId={taskId} />
                            </div>
                        </AccordionWrapper>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocketAdmin;
