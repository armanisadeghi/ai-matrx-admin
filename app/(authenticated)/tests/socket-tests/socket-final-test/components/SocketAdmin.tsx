"use client";

import { Card, CardContent } from "@/components/ui";
import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
import { SOCKET_TASKS } from "../constants";
import DynamicForm from "./DynamicForm";
import AccordionWrapper from "./AccordionWrapper";
import { cn } from "@/lib/utils";
import { SocketHeader } from "@/components/socket/SocketHeader";
import { SocketAccordionResponse } from "@/components/socket/response/SocketAccordionResponse";
interface SocketAdminProps {
    className?: string;
}

export const SocketAdmin = ({ className }: SocketAdminProps) => {
    const socketHook = useSocket();

    const { event, setEvent, tasks, setTaskData, handleSend } = socketHook;

    const availableTasks = Object.keys(SOCKET_TASKS);

    const handleEventTaskChange = (eventName: string) => {
        setEvent(eventName);
        // You might want to add additional logic here if needed
    };

    const handleChange = (data: any) => {
        console.log("Form data changed:", data);
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
                                        title={`Task ${taskIndex + 1}: ${event || "Select a task"}`}
                                        value={`task-${taskIndex}`}
                                        defaultOpen={taskIndex === 0}
                                    >
                                        <div className="space-y-6 pt-4">
                                            {event && SOCKET_TASKS[event] ? (
                                                <DynamicForm schema={SOCKET_TASKS[event]} onChange={handleChange} onSubmit={handleSubmit} />
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
        </div>
    );
};
export default SocketAdmin;
