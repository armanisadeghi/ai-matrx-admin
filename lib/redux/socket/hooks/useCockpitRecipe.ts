import { useCallback, useState } from "react";
import { RecipeToChatTaskData } from "@/components/playground/hooks/recipes/recipe-task-utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { createTask } from "../../socket-io/thunks/createTaskThunk";
import { submitTask } from "../../socket-io/thunks";

export const useCockpitSocket = (getTasks: () => Promise<RecipeToChatTaskData[]>) => {
    const dispatch = useAppDispatch();
    const [taskIds, setTaskIds] = useState<string[]>([]);
    const [neededBrokerIds, setNeededBrokerIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSetTasks = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const tasks = await getTasks();
            const newTaskIds: string[] = [];
            
            // Create each task individually
            for (const taskData of tasks) {
                try {
                    const newTaskId = await dispatch(
                        createTask({
                            service: "ai_chat_service",
                            taskName: "run_recipe_to_chat",
                            initialData: taskData,
                        })
                    ).unwrap();
                    
                    newTaskIds.push(newTaskId);
                } catch (err: any) {
                    console.error("Failed to create task:", err);
                    setError((prev) => prev || err.message);
                }
            }
            
            setTaskIds(newTaskIds);
            return newTaskIds;
        } catch (err: any) {
            const errorMessage = err.message || "Failed to set tasks";
            setError(errorMessage);
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // First create all tasks and get their IDs
            const createdTaskIds = await handleSetTasks();
            
            if (createdTaskIds.length === 0) {
                setError("No tasks were created to submit");
                setIsLoading(false);
                return;
            }
            
            // Submit each task
            const submissionPromises = createdTaskIds.map(taskId => 
                dispatch(submitTask({ taskId })).unwrap()
                    .catch(error => {
                        console.error(`Failed to submit task ${taskId}:`, error);
                        throw error;
                    })
            );
            
            await Promise.all(submissionPromises);
            
        } catch (error: any) {
            console.error("Error in task submission process:", error);
            setError("Failed to process one or more requests.");
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, handleSetTasks]);

    return {
        taskIds,
        neededBrokerIds,
        isLoading,
        error,
        handleSetTasks,
        handleSend,
    };
};

export type UseCockpitSocketHook = ReturnType<typeof useCockpitSocket>;
