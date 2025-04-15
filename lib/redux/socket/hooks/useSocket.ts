// File: lib/redux/socket/hooks/useSocket.ts
"use client";

import { useState, useRef, useEffect } from "react";
import { useSocketConnection } from "../useSocketConnection";

export interface TaskData {
    [key: string]: any;
}

export interface SocketTask {
    task: string;
    index: number;
    stream: boolean;
    taskData: TaskData;
}

export const useSocket = () => {
    const {
        socketManager,
        isConnected,
        isAuthenticated,
        getAvailableServers,
        connectToServer,
        overrideNamespace,
        clearServerOverride,
        currentServer,
        currentNamespace,
    } = useSocketConnection();

    const [service, setService] = useState("");
    const [taskType, setTaskType] = useState("");
    const [streamEnabled, setStreamEnabled] = useState(true);
    const [isResponseActive, setIsResponseActive] = useState(false);

    const [tasks, setTasks] = useState<SocketTask[]>([
        {
            task: "",
            index: 0,
            stream: streamEnabled,
            taskData: {},
        },
    ]);

    const [streamingResponse, setStreamingResponse] = useState("");
    const [responses, setResponses] = useState<any[]>([]);
    const responseRef = useRef<HTMLDivElement | null>(null);
    const lastResponseTypeRef = useRef<string | null>(null);

    useEffect(() => {
        setTasks((tasks) =>
            tasks.map((task) => ({
                ...task,
                stream: streamEnabled,
            }))
        );
    }, [streamEnabled]);

    const setTaskData = (taskData: TaskData | TaskData[]) => {
        const taskArray = Array.isArray(taskData) ? taskData : [taskData];
        setTasks(
            taskArray.map((data, index) => ({
                task: taskType,
                index,
                stream: streamEnabled,
                taskData: data,
            }))
        );
    };

    const handleSend = () => {
        if (!service || !taskType) {
            return;
        }

        setStreamingResponse("");
        setResponses([]);
        setIsResponseActive(true);
        lastResponseTypeRef.current = null;

        const payload = tasks.map((task) => ({
            task: task.task,
            index: task.index,
            stream: task.stream,
            taskData: task.taskData,
        }));

        const payloadCustomEvent = tasks.map((task, customEventIndex) => ({
            task: task.task,
            index: task.index,
            stream: task.stream,
            taskData: task.taskData,
            customEventIndex: customEventIndex,
        }));

        socketManager.startTask(service, payload, (response) => {
            try {
                const currentType = typeof response;

                if (lastResponseTypeRef.current !== currentType) {
                    lastResponseTypeRef.current = currentType;
                }

                if (currentType === "string") {
                    setStreamingResponse((prev) => prev + response);
                } else if (currentType === "object") {
                    setResponses((prev) => [...prev, response]);

                    try {
                        const jsonString = JSON.stringify(response, null, 2);
                        setStreamingResponse((prev) => prev + (prev ? "\n\n" : "") + jsonString);
                    } catch (err) {
                        console.error("Failed to stringify object response:", err);
                        setStreamingResponse((prev) => prev + "\n[Complex object received - see console for details]");
                    }
                } else {
                    console.warn(`Unexpected response type: ${currentType}`);
                    setResponses((prev) => [...prev, response]);
                    setStreamingResponse((prev) => prev + `\n[Received data of type: ${currentType}]`);
                }
            } catch (err) {
                console.error("Error handling socket response:", err);
                setStreamingResponse((prev) => prev + "\n[Error processing response - see console for details]");
            }
        });
    };

    const handleClear = () => {
        setStreamingResponse("");
        setResponses([]);
        setIsResponseActive(false);
        lastResponseTypeRef.current = null;
    };

    return {
        // Core selection state
        namespace: currentNamespace,
        overrideNamespace,
        service,
        setService,
        taskType,
        setTaskType,
        getAvailableServers,
        connectToServer,
        clearServerOverride,
        currentServer,
        // Stream and connection state
        streamEnabled,
        setStreamEnabled,
        isResponseActive,
        isConnected,
        isAuthenticated,
        // Task state and handlers
        tasks,
        setTaskData,
        // Response state
        streamingResponse,
        responses,
        responseRef,
        // Action handlers
        handleSend,
        handleClear,
    };
};

export type SocketHook = ReturnType<typeof useSocket>;
