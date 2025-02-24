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
    const [tasks, setTasks] = useState<SocketTask[]>([
        {
            task: "",
            index: 0,
            stream: true,
            taskData: {},
        },
    ]);

    // Base state
    const [event, setEvent] = useState("");
    const [streamEnabled, setStreamEnabled] = useState(true);
    const [isResponseActive, setIsResponseActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Response state
    const [streamingResponse, setStreamingResponse] = useState("");
    const [responses, setResponses] = useState<any[]>([]);
    const responseRef = useRef<HTMLDivElement | null>(null);

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

    useEffect(() => {
        if (responseRef.current) {
            responseRef.current.scrollTop = responseRef.current.scrollHeight;
        }
    }, [streamingResponse]);

    const setTaskData = (taskData: TaskData | TaskData[]) => {
        console.log("Setting task data:", taskData);
        const taskArray = Array.isArray(taskData) ? taskData : [taskData];
        console.log("Task array:", taskArray);
        setTasks(
            taskArray.map((data, index) => ({
                task: event,
                index,
                stream: true,
                taskData: data,
            }))
        );
    };

    const handleSend = () => {
        setStreamingResponse("");
        setResponses([]);
        setIsResponseActive(true);

        const payload = tasks.map((task) => ({
            task: task.task,
            index: task.index,
            stream: task.stream,
            taskData: task.taskData,
        }));

        console.log("Payload:", payload);

        socketManager.startTask(event, payload, (response) => {
            if (response && typeof response === "object" && "data" in response) {
                setStreamingResponse((prev) => prev + response.data);
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
        namespace,
        setNamespace,
        event,
        setEvent,
        streamEnabled,
        setStreamEnabled,
        tasks,
        setTaskData,
        streamingResponse,
        responses,
        responseRef,
        handleSend,
        handleClear,
        isResponseActive,
        isConnected,
        isAuthenticated,
    };
};

export type SocketHook = ReturnType<typeof useSocket>;
