"use client";

import { Card, CardContent } from "@/components/ui";
import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
import { SOCKET_TASKS } from "../constants";
import DynamicForm from "./DynamicForm";
import AccordionWrapper from "./AccordionWrapper";
import { cn } from "@/lib/utils";
import { SocketHeader } from "@/components/socket/SocketHeader";
import { SocketAccordionResponse } from "@/components/socket/response/SocketAccordionResponse";
import SocketDebugPanel from "./SocketDebugPanel";
import { FieldOverrides } from "./DynamicForm";
interface SocketAdminProps {
    className?: string;
}


const FIELD_OVERRIDES: FieldOverrides = {
    "raw_markdown": {
        type: "textarea",
        props: {
            rows: 10,
        },
    },
};

export const SocketAdmin = ({ className }: SocketAdminProps) => {
    const socketHook = useSocket();

    const {
        taskType,
        tasks,
        setTaskData,
        handleSend,
    } = socketHook;


    const handleChange = (data: any) => {
        setTaskData(data);
    };

    const handleSubmit = (data: any) => {
        setTaskData(data);
        handleSend();
    };

    return (
        <div className={cn("w-full h-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-2xl", className)}>
            <Card className="bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <CardContent className="space-y-8">
                    <div className="space-y-6">
                        <SocketHeader socketHook={socketHook} />

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
                                            {taskType && SOCKET_TASKS[taskType] ? (
                                                <DynamicForm schema={SOCKET_TASKS[taskType]} onChange={handleChange} onSubmit={handleSubmit} fieldOverrides={FIELD_OVERRIDES} />
                                            ) : (
                                                <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                                                    Please select a task type from the header
                                                </div>
                                            )}
                                        </div>
                                    </AccordionWrapper>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8">
                <SocketAccordionResponse socketHook={socketHook} />
            </div>
            
            {/* Debug Panel */}
            <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 shadow-sm">
                <AccordionWrapper
                    title="Socket Debug Panel"
                    value="socket-debug"
                    defaultOpen={false}
                >
                    <div className="pt-4">
                        <SocketDebugPanel socketHook={socketHook} />
                    </div>
                </AccordionWrapper>
            </div>
        </div>
    );
};

export default SocketAdmin;
