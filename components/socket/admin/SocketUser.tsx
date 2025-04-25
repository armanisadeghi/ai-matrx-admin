"use client";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import DynamicForm from "@/components/socket-io/form-builder/DynamicForm";
import { SocketAccordionResponse } from "@/components/socket/response/SocketAccordionResponse";
import { SocketHeaderFull } from "@/components/socket-io/headers/SocketHeaderFull";
import { useState } from "react";
import { useAppSelector } from "@/lib/redux";
import { selectAllTasks, selectTaskById } from "@/lib/redux/socket-io";
import SocketStreamMonitor from "../streaming/SocketStreamMonitor";

interface SocketUserProps {
    className?: string;
}

export const SocketUser = ({ className }: SocketUserProps) => {
    const [testMode, setTestMode] = useState(false);
    const [taskId, setTaskId] = useState<string>("");

    const tasks = useAppSelector(selectAllTasks);
    const taskState = useAppSelector((state) => selectTaskById(state, taskId));
    const taskName = taskState?.taskName || "";

    const handleTestModeChange = (testMode: boolean) => {
        setTestMode(testMode);
    };

    const handleTaskCreate = (taskId: string) => {
        setTaskId(taskId);
    };

    return (
        <div className={cn("w-full h-full py-4 px-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-2xl", className)}>
            <Card className="bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <CardContent className="space-y-8">
                    <div className="space-y-6">
                        <div className="sticky top-0 z-50 bg-inherit text-inherit">
                            <SocketHeaderFull onTestModeChange={handleTestModeChange} onTaskCreate={handleTaskCreate} debugMode={false} />
                        </div>
                        
                        {/* Only render dynamic form when a task is selected */}
                        {taskId && (
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-4 shadow-sm">
                                <DynamicForm taskId={taskId} showDebug={false} />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            
            {/* Stream Monitor Panel */}
            {taskId && (
                <div className="mt-8">
                    <SocketStreamMonitor taskId={taskId} />
                </div>
            )}
            
            {/* Response Section */}
            {taskId && (
                <div className="mt-8 px-2">
                    <SocketAccordionResponse taskId={taskId} />
                </div>
            )}
        </div>
    );
};

export default SocketUser;
