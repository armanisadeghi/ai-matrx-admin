// lib\redux\socket\hooks\task-socket-hooks\useScraperSocket.ts

"use client";

import { getTaskSchema } from "@/constants/socket-schema";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createTask, submitTask, createAndSubmitTask } from "@/lib/redux/socket-io/thunks";
import { setTaskFields, deleteTask } from "@/lib/redux/socket-io/slices/socketTasksSlice";

export type TaskData = Record<string, any>;

export const useScraperSocket = () => {
    const dispatch = useAppDispatch();
    const [taskId, setTaskId] = useState<string>("");
    const [service, setService] = useState<string>("scraper_service_v2");
    const [taskType, setTaskType] = useState<string>("quick_scrape");
    const [taskData, setTaskDataState] = useState<TaskData>({});
    
    useEffect(() => {
        const initTask = async () => {
            try {
                // Create task and get taskId from the returned value
                const newTaskId = await dispatch(createTask({
                    service: service,
                    taskName: taskType
                })).unwrap();
                
                setTaskId(newTaskId);
            } catch (error) {
                console.error("Failed to create task:", error);
            }
        };
        
        initTask();
        
        return () => {
            // Clean up the task when the component unmounts
            if (taskId) {
                dispatch(deleteTask(taskId));
            }
        };
    }, [dispatch, service, taskType]);
    
    // Memoize the schema to prevent it from causing rerenders
    const taskSchema = useMemo(() => getTaskSchema(taskType), [taskType]);
    
    // Update task data in Redux
    const setTaskData = useCallback((data: TaskData): void => {
        setTaskDataState(data);
        
        if (taskId) {
            dispatch(setTaskFields({
                taskId,
                fields: data
            }));
        }
    }, [dispatch, taskId]);
    
    // Handle task submission
    const handleSend = useCallback((): void => {
        if (taskId) {
            dispatch(submitTask({ taskId }));
        }
    }, [dispatch, taskId]);
    
    // Clear the task
    const handleClear = useCallback(async (): Promise<void> => {
        if (taskId) {
            // Delete the current task
            dispatch(deleteTask(taskId));
            
            try {
                // Create a new task and get the new taskId
                const newTaskId = await dispatch(createTask({
                    service: service,
                    taskName: taskType
                })).unwrap();
                
                setTaskId(newTaskId);
                setTaskDataState({});
            } catch (error) {
                console.error("Failed to create new task:", error);
            }
        }
    }, [dispatch, service, taskType, taskId]);
    
    // Memoize handlers to prevent them from being recreated on rerender
    const handleChange = useCallback((data: TaskData): void => {
        setTaskData(data);
    }, [setTaskData]);
    
    const handleSubmit = useCallback((data: TaskData): void => {
        setTaskData(data);
        handleSend();
    }, [setTaskData, handleSend]);
    
    // Quick scrape method for single URL with predefined settings
    const quickScrapeUrl = useCallback(async (url: string): Promise<string> => {
        const scraperData = {
            anchor_size: 100,
            get_content_filter_removal_details: true,
            get_links: true,
            get_main_image: true,
            get_organized_data: true,
            get_overview: true,
            get_structured_data: true,
            get_text_data: true,
            include_anchors: true,
            include_highlighting_markers: true,
            include_media: true,
            include_media_description: true,
            include_media_links: true,
            urls: [url],
            use_cache: false
        };

        try {
            const result = await dispatch(createAndSubmitTask({
                service: "scraper_service_v2",
                taskName: "quick_scrape",
                taskData: scraperData
            })).unwrap();
            
            return result.taskId;
        } catch (error) {
            console.error("Failed to quick scrape URL:", error);
            throw error;
        }
    }, [dispatch]);

    // Create a socketHook object to maintain API compatibility
    const socketHook = useMemo(() => ({
        taskId,
        service,
        taskType,
        taskData,
        setService,
        setTaskType,
        setTaskData,
        handleSend,
        handleClear
    }), [taskId, service, taskType, taskData, setTaskData, handleSend, handleClear]);
    
    return useMemo(() => ({
        handleChange,
        handleSubmit,
        clearResults: handleClear,
        socketHook,
        taskSchema,
        quickScrapeUrl,
    }), [handleChange, handleSubmit, handleClear, socketHook, taskSchema, quickScrapeUrl]);
};

export type ScraperSocketHook = ReturnType<typeof useScraperSocket>;