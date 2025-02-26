// lib\redux\socket\hooks\task-socket-hooks\useScraperSocket.ts

"use client";
import { SOCKET_TASKS } from "@/constants/socket-constants";
import { useSocket, TaskData } from "@/lib/redux/socket/hooks/useSocket";
import { useEffect, useCallback, useMemo } from "react";

export const useScraperSocket = () => {
    const socketHook = useSocket();
    const { setNamespace, setService, setTaskType, setTaskData, handleSend, handleClear } = socketHook;
    
    // Run only once on mount, no dependencies
    useEffect(() => {
        setNamespace("UserSession");
        setService("scrape_service");
        setTaskType("quick_scrape");
    }, []); // Empty dependencies is correct here as we want this to run once
    
    // Memoize the schema to prevent it from causing rerenders
    const taskSchema = useMemo(() => SOCKET_TASKS.quick_scrape, []);
    
    // Memoize handlers to prevent them from being recreated on rerender
    const handleChange = useCallback((data: TaskData): void => {
        setTaskData(data);
    }, [setTaskData]);
    
    const handleSubmit = useCallback((data: TaskData): void => {
        setTaskData(data);
        handleSend();
    }, [setTaskData, handleSend]);
    
    return useMemo(() => ({
        handleChange,
        handleSubmit,
        clearResults: handleClear,
        socketHook,
        taskSchema,
    }), [handleChange, handleSubmit, handleClear, socketHook, taskSchema]);
};

export type ScraperSocketHook = ReturnType<typeof useScraperSocket>;