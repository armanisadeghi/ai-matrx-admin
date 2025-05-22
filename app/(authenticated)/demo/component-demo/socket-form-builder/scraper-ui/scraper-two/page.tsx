"use client";

import { useState, useEffect } from "react";
import DynamicForm from "@/components/socket/form-builder/DynamicForm";
import ScraperResults from "./ScraperResults";
import { ResponsiveSocketHeader } from "@/components/socket-io/headers/ResponsiveSocketHeader";
import { useAppDispatch } from "@/lib/redux/hooks";
import { createTask, submitTask } from "@/lib/redux/socket-io/thunks";
import { updateTaskField, setTaskFields } from "@/lib/redux/socket-io/slices/socketTasksSlice";
import { v4 as uuidv4 } from "uuid";

const SERVICE = "scrape_service";
const TASK_TYPE = "quick_scrape";

export default function Page() {
    const dispatch = useAppDispatch();
    const [taskId, setTaskId] = useState<string>("");
    const [taskData, setTaskData] = useState<Record<string, any>>({});

    useEffect(() => {
        const newTaskId = uuidv4();
        dispatch(createTask({
            taskId: newTaskId,
            service: SERVICE,
            taskName: TASK_TYPE
        }));
        setTaskId(newTaskId);
    }, [dispatch]);

    // Update task data in Redux when it changes
    const handleChange = (data: any) => {
        setTaskData(data);
        
        if (taskId) {
            // Update all fields at once in Redux
            dispatch(setTaskFields({
                taskId,
                fields: data
            }));
        }
    };

    // Handle form submission
    const handleSubmit = (data: any) => {
        // Update local state
        setTaskData(data);
        
        if (taskId) {
            // Make sure Redux has the latest data
            dispatch(setTaskFields({
                taskId,
                fields: data
            }));
            
            // Submit the task to start processing
            dispatch(submitTask({ taskId }));
        }
    };

    return (
        <div className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
            <div className="sticky top-0 z-50 bg-gray-100 dark:bg-gray-800 pt-0 px-2 pb-2">
                <ResponsiveSocketHeader 
                    debugMode={true} 
                />
            </div>
            <DynamicForm 
                taskType={TASK_TYPE} 
                onChange={handleChange} 
                onSubmit={handleSubmit} 
            />
            {taskId && <ScraperResults taskId={taskId} />}
        </div>
    );
}
