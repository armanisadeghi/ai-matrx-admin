"use client";
import { Card, CardContent } from "@/components/ui";
import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
import { FIELD_OVERRIDES, SOCKET_TASKS } from "@/constants/socket-constants";
import DynamicForm from "../form-builder/DynamicForm";
import { cn } from "@/lib/utils";
import { SocketHeader } from "@/components/socket/headers/SocketHeader";
import { SocketAccordionResponse } from "../response/SocketAccordionResponse";

interface SocketUserProps {
    className?: string;
}

export const SocketUser = ({ className }: SocketUserProps) => {
    const socketHook = useSocket();
    const { taskType, setTaskData, handleSend } = socketHook;

    const handleChange = (data: any) => {
        setTaskData(data);
    };

    const handleSubmit = (data: any) => {
        setTaskData(data);
        handleSend();
    };

    return (
        <div className={cn("w-full h-full py-4 px-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-2xl", className)}>
            <Card className="bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <CardContent className="space-y-8">
                    {/* Header with task selection */}
                    <SocketHeader socketHook={socketHook} />

                    {/* Dynamic Form based on selected task */}
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-4 shadow-sm">
                        {taskType ? (
                            <DynamicForm
                                taskType={taskType}
                                onChange={handleChange}
                                onSubmit={handleSubmit}
                                fieldOverrides={FIELD_OVERRIDES}
                            />
                        ) : (
                            <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                                Please select a task type from the header
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Response Section */}
            <div className="mt-8">
                <SocketAccordionResponse socketHook={socketHook} />
            </div>
        </div>
    );
};

export default SocketUser;
