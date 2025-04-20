import { useState, useRef } from "react";
import { useInitializeSocket } from "@/lib/redux/socket/useInitializeSocket";
import { SocketManager } from "@/lib/redux/socket/SocketManager";
import { StreamingResponses, RecipeTaskData } from "./types";

export const useCockpitSocket = (getTasks: () => Promise<RecipeTaskData[]>) => {
    useInitializeSocket();
    const socketManager = SocketManager.getInstance();
    const responseRef = useRef<HTMLDivElement | null>(null);

    const [streamingResponses, setStreamingResponses] = useState<StreamingResponses>({});
    const [isResponseActive, setIsResponseActive] = useState(false);

    const handleSend = async () => {
        setStreamingResponses({});
        setIsResponseActive(true);

        const tasks = await getTasks();
        const payload = tasks.map((taskData) => ({
            task: "run_recipe",
            taskData,
        }));

        socketManager.startStreamingTasks("simple_recipe", payload, (index, data) => {
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

    return {
        streamingResponses,
        responseRef,
        handleSend,
        handleClear,
        isResponseActive,
    };
};

export type CockpitSocketHook = ReturnType<typeof useCockpitSocket>;
