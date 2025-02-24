import { useState, useRef } from "react";
import { useInitializeSocket } from "@/lib/redux/socket/useInitializeSocket";
import { SocketManager } from "@/lib/redux/socket/manager";
import { StreamingResponses } from "./types";

export const useSimpleSocketTask = ({ eventName, taskName, tasksList }) => {
    useInitializeSocket();
    const socketManager = SocketManager.getInstance();
    const responseRef = useRef<HTMLDivElement | null>(null);

    const [streamingResponses, setStreamingResponses] = useState<StreamingResponses>({});
    const [isResponseActive, setIsResponseActive] = useState(false);

    const handleSend = async () => {
        setStreamingResponses({});
        setIsResponseActive(true);

        const payload = tasksList.map((taskData) => ({
            task: taskName,
            taskData,
        }));

        socketManager.startStreamingTasks(eventName, payload, (index, data) => {
            setStreamingResponses((prev) => ({
                ...prev,
                [index]: (prev[index] || "") + data,
            }));
        });
    };

    const handleClear = () => {
        setStreamingResponses({});
        setIsResponseActive(false);
    };

    console.log("useSimpleSocketTask streamingResponses", streamingResponses[0]);

    return {
        streamingResponses,
        responseRef,
        handleSend,
        handleClear,
        isResponseActive,
    };
};

export type SimpleSocketTaskHook = ReturnType<typeof useSimpleSocketTask>;
