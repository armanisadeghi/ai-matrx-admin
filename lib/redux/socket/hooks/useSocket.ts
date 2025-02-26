"use client";
import { useState, useRef, useEffect } from "react";
import { useInitializeSocket } from "@/lib/redux/socket/useInitializeSocket";
import { SocketManager } from "@/lib/redux/socket/manager";

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
    useInitializeSocket();
    const socketManager = SocketManager.getInstance();
    const [namespace, setNamespace] = useState("UserSession");
    const [service, setService] = useState("");
    const [taskType, setTaskType] = useState("");

    // Stream and connection state
    const [streamEnabled, setStreamEnabled] = useState(true);
    const [isResponseActive, setIsResponseActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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

    // Connection checker
    useEffect(() => {
        let mounted = true;
        let checkInterval: NodeJS.Timeout;

        const checkConnection = () => {
            try {
                const socket = socketManager.getSocket();
                if (mounted && socket) {
                    setIsConnected(socket.connected);
                    setIsAuthenticated(socket.connected);
                }
            } catch (error) {
                if (mounted) {
                    setIsConnected(false);
                    setIsAuthenticated(false);
                }
            }
        };

        checkConnection();
        checkInterval = setInterval(checkConnection, 1000);

        return () => {
            mounted = false;
            if (checkInterval) {
                clearInterval(checkInterval);
            }
        };
    }, []);

    // Auto-scroll effect for streaming responses
    useEffect(() => {
        if (responseRef.current) {
            responseRef.current.scrollTop = responseRef.current.scrollHeight;
        }
    }, [streamingResponse]);

    // Update tasks when streamEnabled changes
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
            console.log("current service", service);
            console.log("current taskType", taskType);
            console.error("Service and task type must be selected");
            return;
        }

        setStreamingResponse("");
        setResponses([]);
        setIsResponseActive(true);

        const payload = tasks.map((task) => ({
            task: task.task,
            index: task.index,
            stream: task.stream,
            taskData: task.taskData,
        }));

        socketManager.startTask(service, payload, (response) => {
            if (response && typeof response === "object" && "data" in response) {
                if (response.data && typeof response.data === "object") {
                    setResponses((prev) => [...prev, response.data]);

                    try {
                        const jsonString = JSON.stringify(response.data, null, 2);
                        setStreamingResponse((prev) => prev + (prev ? "\n\n" : "") + jsonString);
                    } catch (err) {
                        setStreamingResponse((prev) => prev + "\n[Complex object received - see console for details]");
                    }
                } else {
                    setStreamingResponse((prev) => prev + response.data);
                }
            } else if (typeof response === "string") {
                setStreamingResponse((prev) => prev + response);
            } else {
                setResponses((prev) => [...prev, response]);
            }
        });
    };

    const handleClear = () => {
        setStreamingResponse("");
        setResponses([]);
        setIsResponseActive(false);
    };

    return {
        // Core selection state
        namespace,
        setNamespace,
        service,
        setService,
        taskType,
        setTaskType,

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
