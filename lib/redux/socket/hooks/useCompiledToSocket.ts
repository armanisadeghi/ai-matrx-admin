import { useState, useRef } from "react";
import { useInitializeSocket } from "@/lib/redux/socket/useInitializeSocket";
import { SocketManager } from "@/lib/redux/socket/SocketManager";
import { StreamingResponses } from "./types";
import { CompiledRecipeEntry } from "@/hooks/run-recipe/types";
import { createEnhancedRecipePayload } from "@/components/playground/hooks/recipes/recipe-task-utils";
import { BrokerValueRecordWithKey } from "@/types";
import { useEntityTools, useAppSelector } from "@/lib/redux";
interface CompiledToSocketProps {
    compiledRecipe: CompiledRecipeEntry;
}

export const useCompiledToSocket = ({ compiledRecipe }: CompiledToSocketProps) => {
    useInitializeSocket();
    const socketManager = SocketManager.getInstance();
    const responseRef = useRef<HTMLDivElement | null>(null);
    const [streamingResponses, setStreamingResponses] = useState<StreamingResponses>({});
    const [isResponseActive, setIsResponseActive] = useState(false);

    const { selectors } = useEntityTools("brokerValue");

    const allBrokerValueRecords = useAppSelector((state) => selectors.selectAllEffectiveRecordsArray(state)) as BrokerValueRecordWithKey[];

    const handleSend = async () => {
        setStreamingResponses({});
        setIsResponseActive(true);

        const payload = createEnhancedRecipePayload("run_recipe", compiledRecipe, allBrokerValueRecords);

        console.log("payload", payload);

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

export type CompiledToSocketHook = ReturnType<typeof useCompiledToSocket>;
