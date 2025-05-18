import { useAppSelector } from "@/lib/redux";
import { selectAppletRuntimeDataSourceConfig } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { addToArrayField, setArrayField } from "@/lib/redux/socket-io/slices/socketTasksSlice";
import { createTask } from "@/lib/redux/socket-io/thunks/createTaskThunk";
import { submitTask } from "@/lib/redux/socket-io/thunks/submitTaskThunk";
import { useEffect, useState, useCallback } from "react";
import { selectTaskDataById, selectTaskValidationState } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { brokerSelectors } from "@/lib/redux/brokerSlice";

export interface NeededBroker {
    id: string;
    name: string;
    required: boolean;
    dataType: string;
    defaultValue: string;
}

interface RecipeSourceConfig {
    id: string;
    compiledId: string;
    version: number;
    neededBrokers: NeededBroker[];
}

interface AppletSourceConfig {
    sourceType?: "recipe" | "workflow" | "api" | "database" | "other" | string;
    config?: RecipeSourceConfig;
}

interface BrokerValue {
    id: string;
    value: string;
    ready: boolean;
    name?: string;
}

interface UseAppletRecipeProps {
    appletId: string;
}

export function useAppletRecipe({ appletId }: UseAppletRecipeProps) {
    const dispatch = useAppDispatch();
    const sourceConfig = useAppSelector((state) => selectAppletRuntimeDataSourceConfig(state, appletId));
    const [taskId, setTaskId] = useState<string | null>(null);
    const [neededBrokerIds, setNeededBrokerIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const taskData = useAppSelector((state) => (taskId ? selectTaskDataById(state, taskId) : null));
    const taskValidationState = useAppSelector((state) =>
        taskId ? selectTaskValidationState(state, taskId) : { isValid: false, validationErrors: {} }
    );

    // Get the raw broker values from Redux state
    const rawBrokerValues = useAppSelector((state) => brokerSelectors.selectMultipleValues(state, neededBrokerIds || []));

    // Transform raw broker values into the structure expected by the task
    const brokerValues = Object.entries(rawBrokerValues || {}).reduce<Record<string, any>>((acc, [id, value]) => {
        acc[id] = value;
        return acc;
    }, {});

    // Create properly structured broker values for task submission
    const structuredBrokerValues = Object.entries(rawBrokerValues || {}).map(([id, value]) => ({
        id,
        value: value ?? "",
        ready: true,
        name: sourceConfig?.config?.neededBrokers.find((broker) => broker.id === id)?.name,
    }));

    // Extract validation state
    const isTaskValid = taskValidationState.isValid;
    const validationErrors = taskValidationState.validationErrors;

    // Calculate not-ready brokers
    const notReadyBrokers = (taskData?.broker_values || []).filter((broker: BrokerValue) => !broker.ready);

    // Initialize the task and brokers
    useEffect(() => {
        if (taskId || !sourceConfig || sourceConfig.sourceType !== "recipe" || !sourceConfig.config) {
            return;
        }

        setIsLoading(true);

        // Extract needed broker IDs from the config
        const configBrokerIds = sourceConfig.config.neededBrokers.map((broker) => broker.id);
        setNeededBrokerIds(configBrokerIds);

        // Create the task
        dispatch(
            createTask({
                service: "ai_chat_service",
                taskName: "run_recipe_to_chat",
                initialData: {
                    chat_config: {
                        recipe_id: sourceConfig.config.id,
                        version: "latest", // Temporary fix for recipe version (There is a python bug that is converting it to a string)
                        prepare_for_next_call: true,
                        save_new_conversation: true,
                        include_classified_output: true,
                        tools_override: [],
                        allow_default_values: false,
                        allow_removal_of_unmatched: false,
                    },
                    broker_values: [], // Start with empty broker values
                },
            })
        )
            .unwrap()
            .then((newTaskId) => {
                setTaskId(newTaskId);

                // Initialize brokers AFTER task is created
                configBrokerIds.forEach((brokerId) => {
                    dispatch(
                        addToArrayField({
                            taskId: newTaskId,
                            field: "broker_values",
                            item: {
                                id: brokerId,
                                value: "",
                                ready: true,
                                name: sourceConfig.config?.neededBrokers.find((b) => b.id === brokerId)?.name,
                            },
                        })
                    );
                });

                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Failed to create task:", error);
                setError("Failed to initialize the applet recipe.");
                setIsLoading(false);
            });
    }, [sourceConfig, taskId, dispatch]);

    // Handle submission with properly structured broker values
    const submitRecipe = useCallback(() => {
        if (!taskId) return;

        setIsLoading(true);

        dispatch(
            setArrayField({
                taskId,
                field: "broker_values",
                items: structuredBrokerValues,
            })
        );

        dispatch(submitTask({ taskId }))
            .unwrap()
            .then(() => {
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Failed to submit task:", error);
                setError("Failed to process the request.");
                setIsLoading(false);
            });
    }, [dispatch, taskId, structuredBrokerValues]);

    return {
        taskId,
        isLoading,
        error,
        isTaskValid,
        validationErrors,
        submitRecipe,
        notReadyBrokers,
        brokerValues,
    };
}

export default useAppletRecipe;
