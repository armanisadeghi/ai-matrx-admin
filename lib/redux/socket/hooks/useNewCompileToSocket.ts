import { useEffect } from "react";
import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
import { CompiledRecipeEntry } from "@/hooks/run-recipe/types";
import { createEnhancedRecipePayload } from "@/components/playground/hooks/recipes/recipe-task-utils";
import { BrokerValueRecordWithKey } from "@/types";
import { useEntityTools, useAppSelector } from "@/lib/redux";

interface CompiledToSocketProps {
    compiledRecipe: CompiledRecipeEntry;
}

export const useCompiledToSocket = ({ compiledRecipe }: CompiledToSocketProps) => {
    const socketHook = useSocket();
    const { 
        responseRef, 
        responses, 
        streamingResponse, 
        handleSend: baseHandleSend, 
        handleClear,
        isResponseActive,
        setService, 
        setTaskType,
        setTaskData
    } = socketHook;
    
    const { selectors } = useEntityTools("brokerValue");
    const allBrokerValueRecords = useAppSelector((state) => 
        selectors.selectAllEffectiveRecordsArray(state)) as BrokerValueRecordWithKey[];
    
    useEffect(() => {
        setService("recipe_service"); 
        setTaskType("run_recipe");
    }, [setService, setTaskType]);
    
    const handleSend = async () => {
        const payload = createEnhancedRecipePayload(
            "run_recipe", 
            compiledRecipe, 
            allBrokerValueRecords
        );
        
        setTaskData(payload);
        baseHandleSend();
    };
    
    const streamingResponses = {
        0: streamingResponse
    };
    
    return {
        streamingResponses,
        responseRef,
        handleSend,
        handleClear,
        isResponseActive,
                socketHook
    };
};

export type CompiledToSocketHook = ReturnType<typeof useCompiledToSocket>;