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

    // Stream and response state
    const [streamEnabled, setStreamEnabled] = useState(true);
    const [isResponseActive, setIsResponseActive] = useState(false);

    // Task data state
    const [tasks, setTasks] = useState<SocketTask[]>([
        {
            task: "",
            index: 0,
            stream: streamEnabled,
            taskData: {},
        },
    ]);

    // Response state
    const [streamingResponse, setStreamingResponse] = useState("");
    const [responses, setResponses] = useState<any[]>([]);
    const responseRef = useRef<HTMLDivElement | null>(null);
    const lastResponseTypeRef = useRef<string | null>(null);

    // Update tasks when streamEnabled changes
    useEffect(() => {
        console.log("--> DEBUG: streamEnabled", streamEnabled);
        setTasks((tasks) =>
            tasks.map((task) => ({
                ...task,
                stream: streamEnabled,
            }))
        );
    }, [streamEnabled]);

    const setTaskData = (taskData: TaskData | TaskData[]) => {
        console.log("--> DEBUG: setTaskData", taskData);
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
            console.log("current service", service);
            console.log("current taskType", taskType);
            console.error("Service and task type must be selected");
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

                console.log("--> DEBUG: currentType", currentType);

                if (lastResponseTypeRef.current !== currentType) {
                    console.log(`--> Received response of type: ${currentType}`);
                    lastResponseTypeRef.current = currentType;
                }

                // Case 1: String chunks (typically from LLM streams)
                if (currentType === "string") {
                    setStreamingResponse((prev) => prev + response);
                }
                // Case 2: Object (e.g., results from scrape)
                else if (currentType === "object") {
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