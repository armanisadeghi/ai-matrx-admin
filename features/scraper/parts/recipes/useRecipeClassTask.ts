'use client'
// lib/redux/socket/hooks/useRecipeTask.ts
import { useState, useEffect } from "react";
import { RecipeTaskData } from "@/lib/redux/socket/recipe-class/RecipeTaskData";
import { RecipeTaskManager } from "@/lib/redux/socket/recipe-class/RecipeTaskManager";

export const useRecipeTask = (recipeId: string) => {
    const [streamingResponse, setStreamingResponse] = useState<string>("");
    const taskManager = new RecipeTaskManager(); // Singleton could be used here if needed
    const taskData = new RecipeTaskData(recipeId, 0); // Single task with index 0

    useEffect(() => {
        taskManager.connect();
        return () => {
            taskManager.disconnect(); // Cleanup on unmount
        };
    }, [taskManager]);

    const setModelOverride = (modelOverride: string) => {
        taskData.setModelOverride(modelOverride);
    };

    const addBrokerValue = (id: string, value: string, name?: string) => {
        taskData.addBroker({ id, value, name });
    };

    const runTask = async () => {
        const subscriptions = await taskManager.runRecipeTasks([taskData]);
        subscriptions.forEach(({ eventName, unsubscribe }) => {
            taskManager.subscribeToEvent(eventName, (response: any) => {
                if (response?.data) {
                    setStreamingResponse(response.data); // Update UI with streaming response
                }
                // Uncomment if one-time response is needed: unsubscribe();
            });
        });
    };

    return {
        streamingResponse,
        setModelOverride,
        addBrokerValue,
        runTask,
    };
};