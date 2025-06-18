import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createTask, submitTask } from "@/lib/redux/socket-io/thunks";
import { setTaskFields } from "@/lib/redux/socket-io/slices/socketTasksSlice";
import { 
    selectTaskFirstListenerId,
    selectResponseDataByListenerId,
    selectPrimaryResponseEndedByTaskId,
    selectTaskStatus,
    selectResponseTextByListenerId
} from "@/lib/redux/socket-io";

interface BrokerValue {
    id: string;
    name: string;
    value: string;
}

interface UseRunRecipeOptions {
    recipeId: string;
    brokerValues: BrokerValue[];
}

export const useRunQuickRecipe = () => {
    const dispatch = useAppDispatch();
    const [taskId, setTaskId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    // Redux selectors
    const taskStatus = useAppSelector(state => taskId ? selectTaskStatus(state, taskId) : null);
    const isTaskCompleted = useAppSelector(state => taskId ? selectPrimaryResponseEndedByTaskId(taskId)(state) : false);
    const firstListenerId = useAppSelector(state => taskId ? selectTaskFirstListenerId(state, taskId) : "");
    const responseData = useAppSelector(selectResponseDataByListenerId(firstListenerId || ""));
    const streamingResponse = useAppSelector(selectResponseTextByListenerId(firstListenerId || ""));

    const isLoading = taskStatus === "submitted" && !isTaskCompleted;

    const runRecipe = useCallback(async ({ recipeId, brokerValues }: UseRunRecipeOptions) => {
        setError(null);

        try {
            const newTaskId = await dispatch(createTask({
                service: "ai_chat_service",
                taskName: "run_recipe_to_chat"
            })).unwrap();

            setTaskId(newTaskId);

            const taskData = {
                chat_config: {
                    recipe_id: recipeId,
                    prepare_for_next_call: false,
                    save_new_conversation: false,
                    include_classified_output: false,
                },
                broker_values: brokerValues
            };

            dispatch(setTaskFields({
                taskId: newTaskId,
                fields: taskData
            }));

            dispatch(submitTask({ taskId: newTaskId }));

        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
            console.error("[useRunQuickRecipe] Task failed:", err);
        }
    }, [dispatch]);

    return {
        runRecipe,
        isLoading,
        error,
        responseData,
        streamingResponse,
        isCompleted: isTaskCompleted
    };
};
