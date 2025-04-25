"use client";

import React from "react";
import { ServiceSelector } from "./ServiceSelector";
import { TaskSelector } from "./TaskSelector";
import { Button } from "@/components/ui";
import { Play } from "lucide-react";
import { formatText } from "@/utils/text-case-converter";
import { useAppDispatch } from "@/lib/redux";
import { createTask } from "@/lib/redux/socket-io/thunks/createTaskThunk";

interface ServiceTaskSelectorProps {
    connectionId: string;
    onTaskCreate?: (taskId: string) => void;
    compact?: boolean;
    inline?: boolean;
}

export function ServiceTaskSelector({ 
    connectionId, 
    onTaskCreate, 
    compact = false, 
    inline = false 
}: ServiceTaskSelectorProps) {
    const dispatch = useAppDispatch();
    const [service, setService] = React.useState("");
    const [taskName, setTaskName] = React.useState("");

    const formattedService = formatText(service).replace("Service", "").trim();
    const formattedTaskName = formatText(taskName);

    // Handle service change
    const handleServiceChange = (selectedService: string) => {
        setService(selectedService);
        setTaskName(""); // Reset task when service changes
    };

    // Handle task change
    const handleTaskChange = (selectedTask: string) => {
        setTaskName(selectedTask);
    };

    // Create a task
    const handleCreateTask = async () => {
        if (!service || !taskName) return;
        const result = await dispatch(createTask({ service, taskName, initialData: {}, connectionId }));
        
        if (onTaskCreate && result.payload) {
            onTaskCreate(result.payload as string);
        }
    };

    const canCreateTask = !!service && !!taskName;

    // Inline compact mode for the header (single row)
    if (inline && compact) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1 min-w-[120px]">
                    <ServiceSelector onServiceChange={handleServiceChange} compact />
                </div>
                
                <div className="flex-1 min-w-[120px]">
                    <TaskSelector service={service} onTaskChange={handleTaskChange} compact />
                </div>
                
                <Button
                    onClick={handleCreateTask}
                    disabled={!canCreateTask}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800 h-8 px-3 rounded-xl flex items-center justify-center"
                    title={service && taskName ? `${formattedService} -> ${formattedTaskName}` : "Create Task"}
                >
                    <Play className="h-3.5 w-3.5" />
                </Button>
            </div>
        );
    }

    // Regular compact mode (stacked)
    if (compact) {
        return (
            <div className="flex gap-2 items-center justify-between">
                <div className="flex-1">
                    <ServiceSelector onServiceChange={handleServiceChange} compact />
                </div>
                
                <div className="flex-1">
                    <TaskSelector service={service} onTaskChange={handleTaskChange} compact />
                </div>
                
                <Button
                    onClick={handleCreateTask}
                    disabled={!canCreateTask}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800 h-8 px-3 rounded-xl flex items-center justify-center"
                    title={service && taskName ? `${formattedService} -> ${formattedTaskName}` : "Create Task"}
                >
                    <Play className="h-3.5 w-3.5" />
                </Button>
            </div>
        );
    }

    // Full mode (grid layout)
    return (
        <div className="grid md:grid-cols-3 gap-3">
            <div>
                <ServiceSelector onServiceChange={handleServiceChange} />
            </div>

            <div>
                <TaskSelector service={service} onTaskChange={handleTaskChange} />
            </div>
            <div>
                <Button
                    onClick={handleCreateTask}
                    disabled={!canCreateTask}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800 h-10 rounded-3xl flex items-center justify-center"
                    title={service && taskName ? `${formattedService} -> ${formattedTaskName}` : "Create Task"}
                >
                    <Play className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate overflow-hidden">
                        {service && taskName ? `${formattedService} -> ${formattedTaskName}` : "Create Task"}
                    </span>
                </Button>
            </div>
        </div>
    );
}
