import { useCallback, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { createTask } from "../thunks/createTaskThunk";
import { submitTask } from "../thunks";

interface UseSimpleSocketTaskProps {
    initialService?: string;
    initialTask?: string;
    initialTaskData?: any[];
}

export const useSimpleSocketTask = ({ initialService, initialTask, initialTaskData }: UseSimpleSocketTaskProps) => {
    const dispatch = useAppDispatch();
    const [service, setService] = useState<string>(initialService || "");
    const [taskName, setTaskName] = useState<string>(initialTask || "");
    const [taskDataList, setTaskDataList] = useState<any[]>(initialTaskData || []);
    const [taskIds, setTaskIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addTaskData = (taskData: any) => {
        setTaskDataList([...taskDataList, taskData]);
    };

    const removeTaskData = (index: number) => {
        setTaskDataList(taskDataList.filter((_, i) => i !== index));
    };

    const clearTaskData = () => {
        setTaskDataList([]);
    };

    const handleSetTasks = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const newTaskIds: string[] = [];

            // Create each task individually
            for (const taskData of taskDataList) {
                try {
                    const newTaskId = await dispatch(
                        createTask({
                            service,
                            taskName,
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
            const createdTaskIds = await handleSetTasks();

            if (createdTaskIds.length === 0) {
                setError("No tasks were created to submit");
                setIsLoading(false);
                return;
            }

            const submissionPromises = createdTaskIds.map((taskId) =>
                dispatch(submitTask({ taskId }))
                    .unwrap()
                    .catch((error) => {
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
        isLoading,
        error,
        handleSetTasks,
        handleSend,
        setService,
        setTaskName,
        setTaskDataList,
        addTaskData,
        removeTaskData,
        clearTaskData,
    };
};

export type UseSimpleSocketTaskReturn = ReturnType<typeof useSimpleSocketTask>;
