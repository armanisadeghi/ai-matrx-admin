"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import {
    selectAllTasksArray,
    selectRunningTasksCount,
    selectCompletedTasksCount,
    selectErrorTasksCount,
} from "@/lib/redux/socket-io/selectors/socket-task-selectors";
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

export const TaskSidebar: React.FC<TaskSidebarProps> = ({ selectedTaskId, onTaskSelect }) => {
    const taskEntries = useAppSelector(selectAllTasksArray);
    const runningCount = useAppSelector(selectRunningTasksCount);
    const completedCount = useAppSelector(selectCompletedTasksCount);
    const errorCount = useAppSelector(selectErrorTasksCount);

    const getPrettyTaskName = (taskName: string): string => {
        const nameMap: Record<string, string> = {
            start_workflow_with_structure: "Run Workflow",
            execute_single_step: "Test Step",
        };

        return nameMap[taskName] || taskName || "Unnamed Task";
    };

    const getTaskIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="w-3 h-3 text-green-500" />;
            case "error":
            case "failed":
                return <XCircle className="w-3 h-3 text-red-500" />;
            case "running":
            case "executing":
                return <Play className="w-3 h-3 text-blue-500" />;
            default:
                return <Clock className="w-3 h-3 text-gray-500" />;
        }
    };

    const getTaskStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
            case "error":
            case "failed":
                return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
            case "running":
            case "executing":
                return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
            default:
                return "border-l-gray-300 bg-gray-50 dark:bg-gray-950/20";
        }
    };

    return (
        <div className="w-full border-r bg-muted/30 flex flex-col h-full">
            {/* Summary Stats */}
            <div className="p-2 border-b bg-card">
                <h3 className="font-medium mb-2 text-sm">Tasks</h3>
                <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {taskEntries.length}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Running</span>
                        <Badge
                            variant="default"
                            className="text-[10px] px-1 py-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                            {runningCount}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Complete</span>
                        <Badge
                            variant="default"
                            className="text-[10px] px-1 py-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                            {completedCount}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Errors</span>
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                            {errorCount}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <ScrollArea className="flex-1">
                <div className="p-1">
                    {taskEntries.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No tasks</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {taskEntries.map((task) => (
                                <div
                                    key={task.taskId}
                                    onClick={() => onTaskSelect(task.taskId)}
                                    className={`
                                        p-2 rounded-md border-l-2 cursor-pointer transition-all duration-200
                                        ${
                                            selectedTaskId === task.taskId
                                                ? "bg-primary text-primary-foreground border-l-primary-foreground ring-2 ring-primary/50 shadow-md"
                                                : `${getTaskStatusColor(
                                                      task.status
                                                  )} hover:bg-muted/80 dark:hover:bg-muted/60 hover:shadow-sm hover:scale-[1.01] hover:border-l-4`
                                        }
                                    `}
                                >
                                    <div className="space-y-1">
                                        {/* Task Name - Full Width */}
                                        <div className="font-medium text-xs truncate leading-tight">{getPrettyTaskName(task.taskName)}</div>

                                        {/* Task ID */}
                                        <div
                                            className={`text-[10px] truncate ${
                                                selectedTaskId === task.taskId ? "text-primary-foreground/80" : "text-muted-foreground"
                                            }`}
                                        >
                                            {task.taskId}
                                        </div>

                                        {/* Icon + Status Row */}
                                        <div className="flex items-center gap-1.5">
                                            {getTaskIcon(task.status)}
                                            <div
                                                className={`text-[10px] capitalize ${
                                                    selectedTaskId === task.taskId ? "text-primary-foreground/90" : "text-muted-foreground"
                                                }`}
                                            >
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

