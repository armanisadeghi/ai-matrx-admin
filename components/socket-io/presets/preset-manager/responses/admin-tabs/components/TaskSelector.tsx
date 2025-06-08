"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector } from "@/lib/redux";
import { selectAllTasksArray } from "@/lib/redux/socket-io/selectors/socket-task-selectors";

interface TaskSelectorProps {
    selectedTaskId: string | null;
    onTaskChange: (taskId: string | null) => void;
    placeholder?: string;
}

export const TaskSelector: React.FC<TaskSelectorProps> = ({
    selectedTaskId,
    onTaskChange,
    placeholder = "Select task..."
}) => {
    const allTasks = useAppSelector(selectAllTasksArray)

    if (allTasks.length === 0) {
        return (
            <Select disabled>
                <SelectTrigger className="w-64">
                    <SelectValue placeholder="No tasks available" />
                </SelectTrigger>
            </Select>
        );
    }

    return (
        <Select
            value={selectedTaskId || ""}
            onValueChange={(value) => onTaskChange(value || null)}
        >
            <SelectTrigger className="w-[600px]">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {allTasks.map((task) => (
                    <SelectItem key={task.taskId} value={task.taskId}>
                        <div className="flex flex-col text-left">
                            <span className="font-medium">
                                {task.taskName || "Unnamed Task"} Task ID: {task.taskId}
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};