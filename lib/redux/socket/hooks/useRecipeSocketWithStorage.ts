import { useCallback, useState } from "react";
import { useInitializeSocket } from "../useInitializeSocket";
import { SocketManager } from "../manager";
import { useRef } from "react";
import { RecipeTaskData, StreamingResponses } from "./types";

interface StoredResult {
    responses: StreamingResponses;
    timestamp: number;
}

export const useRecipeSocketWithStorage = (getTasks: () => Promise<RecipeTaskData[]>) => {
    useInitializeSocket();
    const socketManager = SocketManager.getInstance();
    const responseRef = useRef<HTMLDivElement | null>(null);

    const [streamingResponses, setStreamingResponses] = useState<StreamingResponses>({});
    const [completedResults, setCompletedResults] = useState<StoredResult[]>([]);
    const [isResponseActive, setIsResponseActive] = useState(false);

    const storeCurrentResult = useCallback(() => {
        if (Object.keys(streamingResponses).length > 0) {
            setCompletedResults(prev => [...prev, {
                responses: { ...streamingResponses },
                timestamp: Date.now()
            }]);
        }
    }, [streamingResponses]);

    const handleSend = async () => {
        // Store previous result before clearing
        storeCurrentResult();
        
        setStreamingResponses({});
        setIsResponseActive(true);

        const tasks = await getTasks();
        const payload = tasks.map((taskData) => ({
            task: 'run_recipe',
            taskData,
        }));

        socketManager.startStreamingTasks('simple_recipe', payload, (index, data) => {
            setStreamingResponses((prev) => ({
                ...prev,
                [index]: (prev[index] || '') + data,
            }));
        });
    };

    const handleClear = () => {
        storeCurrentResult();
        setStreamingResponses({});
        setIsResponseActive(false);
    };

    const clearHistory = () => {
        setCompletedResults([]);
    };

    return {
        streamingResponses,
        completedResults,
        responseRef,
        handleSend,
        handleClear,
        clearHistory,
        isResponseActive,
        storeCurrentResult, // Expose this if you want to manually store results
    };
};

export type RecipeSocketWithStorageHook = ReturnType<typeof useRecipeSocketWithStorage>;
