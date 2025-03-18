// hooks/useCockpitSocket.ts
import { useCallback, useRef } from "react";
import { SchemaTaskBuilder, SchemaTaskManager } from "@/lib/redux/socket/schema/SchemaTaskManager";
import { useTaskSocket } from "./useTaskSocket";

export interface BrokerValues {
    id: string;
    value: string;
}

export interface Overrides {
    model_override?: string;
    processor_overrides?: Record<string, any>;
    other_overrides?: Record<string, any>;
}

export interface CockpitInstant {
    cockpit_id: string;
    broker_values?: BrokerValues[];
    overrides?: Overrides;
}

interface CockpitOptions {
    modelOverride?: string;
    processorOverrides?: Record<string, any>;
    otherOverrides?: Record<string, any>;
}

interface CockpitPayload {
    recipeId: string;
    brokers: BrokerValues[];
}

interface UseCockpitSocketProps {
    onResponse?: (response: string) => void;
    onError?: (error: string) => void;
}

export function useCockpitSocket({ onResponse, onError }: UseCockpitSocketProps) {
    const taskManager = useRef(new SchemaTaskManager("cockpit_service", "execute_cockpit")).current;

    const configureTask = useCallback((builder: SchemaTaskBuilder, payload: CockpitPayload, options?: CockpitOptions) => {
        builder.setArg("recipe_id", payload.recipeId).setArg("broker_values", payload.brokers);

        if (options) {
            const overrides: Overrides = {};

            if (options.modelOverride) {
                overrides.model_override = options.modelOverride;
            }

            if (options.processorOverrides) {
                overrides.processor_overrides = options.processorOverrides;
            }

            if (options.otherOverrides) {
                overrides.other_overrides = options.otherOverrides;
            }

            if (Object.keys(overrides).length > 0) {
                builder.setArg("overrides", overrides);
            }
        }
    }, []);

    const taskSocket = useTaskSocket<CockpitPayload, CockpitOptions>({
        onResponse,
        onError,
        taskManager,
        configureTask,
    });

    const submitCockpitExecution = useCallback(
        (recipeId: string, brokers: BrokerValues[], options?: CockpitOptions) => {
            if (!recipeId) {
                return;
            }

            return taskSocket.submitTask(
                {
                    recipeId,
                    brokers: brokers || [],
                },
                options
            );
        },
        [taskSocket]
    );

    return {
        submitCockpitExecution,
        streamingResponse: taskSocket.streamingResponse,
        error: taskSocket.error,
        isLoading: taskSocket.isLoading,
        isStreaming: taskSocket.isStreaming,
        cancelStream: taskSocket.cancelStream,
    };
}
