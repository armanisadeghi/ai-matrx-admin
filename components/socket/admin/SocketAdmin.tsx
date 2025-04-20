// File: components/socket/admin/SocketAdmin.tsx
"use client";
import { Card, CardContent } from "@/components/ui";
import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
import { FIELD_OVERRIDES } from "@/constants/socket-constants";
import DynamicForm from "../form-builder/DynamicForm";
import AccordionWrapper from "../../matrx/matrx-collapsible/AccordionWrapper";
import { cn } from "@/lib/utils";
import { SocketHeader } from "@/components/socket/headers/SocketHeader";
import { SocketAccordionResponse } from "@/components/socket/response/SocketAccordionResponse";
import SocketDebugPanel from "../SocketDebugPanel";
import { SocketTaskBuilder } from "../SocketTaskBuilder";
import { useState } from "react";
import SocketStreamMonitor from "../streaming/SocketStreamMonitor";

interface SocketAdminProps {
    className?: string;
}

export const SocketAdmin = ({ className }: SocketAdminProps) => {
    const socketHook = useSocket();
    const { taskType, tasks, setTaskData, handleSend } = socketHook;
    const [testMode, setTestMode] = useState(false);

    const handleChange = (data: any) => {
        setTaskData(data);
    };

    const handleSubmit = (data: any) => {
        setTaskData(data);
        handleSend();
    };

    const handleConfigChange = (config: any) => {
        setTaskData(config);
    };

    const handleTestModeChange = (testMode: boolean) => {
        setTestMode(testMode);
    };

    return (
        <div className={cn("w-full h-full py-4 px-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-2xl", className)}>
            <Card className="bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <CardContent className="space-y-8">
                    <div className="space-y-6">
                        <SocketHeader socketHook={socketHook} testMode={testMode} onTestModeChange={handleTestModeChange} />
                        <div className="space-y-6">
                            {tasks.map((task, taskIndex) => (
                                <div
                                    key={taskIndex}
                                    className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-4 shadow-sm"
                                >
                                    <AccordionWrapper
                                        title={`Task ${taskIndex + 1}: ${taskType || "Select a task"}`}
                                        value={`task-${taskIndex}`}
                                        defaultOpen={taskIndex === 0}
                                    >
                                        <div className="space-y-6 pt-4">
                                            {taskType ? (
                                                <DynamicForm
                                                    taskType={taskType}
                                                    onChange={handleChange}
                                                    onSubmit={handleSubmit}
                                                    fieldOverrides={FIELD_OVERRIDES}
                                                    testMode={testMode}
                                                />
                                            ) : (
                                                <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                                                    Please select a task type from the header
                                                </div>
                                            )}
                                        </div>
                                    </AccordionWrapper>
                                </div>
                            ))}
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-4 shadow-sm">
                                <AccordionWrapper
                                    title={`Config Builder for ${taskType || "Selected Task"}`}
                                    value="config-builder"
                                    defaultOpen={false}
                                >
                                    <div className="space-y-6 pt-4">
                                        <SocketTaskBuilder
                                            socketHook={socketHook}
                                            onConfigChange={handleConfigChange}
                                            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                                        />
                                    </div>
                                </AccordionWrapper>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            {/* Stream Monitor Panel */}
            <div className="mt-8">
                <SocketStreamMonitor socketHook={socketHook} />
            </div>
            <div className="mt-8 px-2">
                <SocketAccordionResponse socketHook={socketHook} />
            </div>


            {/* Debug Panel */}
            <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 shadow-sm">
                <AccordionWrapper title="Socket Debug Panel" value="socket-debug" defaultOpen={false}>
                    <div className="pt-4">
                        <SocketDebugPanel socketHook={socketHook} />
                    </div>
                </AccordionWrapper>
            </div>
        </div>
    );
};

export default SocketAdmin;