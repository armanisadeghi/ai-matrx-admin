"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectAllTasksArray, selectRunningTasksCount, selectCompletedTasksCount, selectErrorTasksCount } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Clock, Play } from "lucide-react";

type TaskStatus = "building" | "ready" | "submitted" | "completed" | "error";

interface SocketTask {
    taskId: string;
    service: string;
    taskName: string;
    taskData: Record<string, any>;
    isValid: boolean;
    validationErrors: string[];
    status: TaskStatus;
    listenerIds: string[];
    connectionId: string;
    isStreaming: boolean;
}

interface TaskSidebarProps {
    selectedTaskId: string | null;
    onTaskSelect: (taskId: string) => void;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({
    selectedTaskId,
    onTaskSelect
}) => {
    const taskEntries = useAppSelector(selectAllTasksArray);
    const runningCount = useAppSelector(selectRunningTasksCount);
    const completedCount = useAppSelector(selectCompletedTasksCount);
    const errorCount = useAppSelector(selectErrorTasksCount);

    const getTaskIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-3 h-3 text-green-500" />;
            case 'error':
            case 'failed':
                return <XCircle className="w-3 h-3 text-red-500" />;
            case 'running':
            case 'executing':
                return <Play className="w-3 h-3 text-blue-500" />;
            default:
                return <Clock className="w-3 h-3 text-gray-500" />;
        }
    };

    const getTaskStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
            case 'error':
            case 'failed':
                return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
            case 'running':
            case 'executing':
                return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
            default:
                return 'border-l-gray-300 bg-gray-50 dark:bg-gray-950/20';
        }
    };

    return (
        <div className="w-80 border-r bg-muted/30 flex flex-col h-full">
            {/* Summary Stats */}
            <div className="p-4 border-b bg-card">
                <h3 className="font-semibold mb-3 text-sm">Task Overview</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                            Total: {taskEntries.length}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Running: {runningCount}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Complete: {completedCount}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px]">
                            Errors: {errorCount}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {taskEntries.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No tasks available</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {taskEntries.map((task) => (
                                <div
                                    key={task.taskId}
                                    onClick={() => onTaskSelect(task.taskId)}
                                    className={`
                                        p-3 rounded-md border-l-2 cursor-pointer transition-all
                                        ${selectedTaskId === task.taskId 
                                            ? 'bg-primary/10 border-l-primary ring-1 ring-primary/20' 
                                            : `${getTaskStatusColor(task.status)} hover:bg-muted/60`
                                        }
                                    `}
                                >
                                    <div className="flex items-start gap-2">
                                        {getTaskIcon(task.status)}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {task.taskName || "Unnamed Task"}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {task.taskId}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {task.status}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}; 