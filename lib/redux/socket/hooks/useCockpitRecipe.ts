import { useState, useRef } from 'react';
import { useInitializeSocket } from '@/lib/redux/socket/useInitializeSocket';
import { SocketManager } from '@/lib/redux/socket/manager';
import { CompiledRecipe } from '@/components/playground/hooks/recipes/useCompileRecipe';

export interface RecipeOverrides {
    model_override: string;
    processor_overrides: Record<string, unknown>;
    other_overrides: Record<string, unknown>;
}

export interface RecipeTaskData {
    recipe_id: string;
    broker_values: BrokerValue[];
    overrides: RecipeOverrides;
}

export interface BrokerValue {
    id: string;
    official_name: string;
    data_type: string;
    value: unknown;
    ready: boolean;
    [key: string]: unknown;
}

interface CompiledData {
    recipeId: string;
    recipe: CompiledRecipe;
    brokers: BrokerValue[];
    overrides: RecipeOverrides[];
    tasks: RecipeTaskData[];
}

interface StreamingResponses {
    [taskIndex: number]: string;
}

export interface SocketTask {
    task: string;
    index: number;
    stream: boolean;
    taskData: any;
}

export interface RecipeSocketTask extends SocketTask {
    taskData: RecipeTaskData;
}

export const useCockpitSocket = (getTasks: () => RecipeTaskData[]) => {
    useInitializeSocket();
    const socketManager = SocketManager.getInstance();
    const responseRef = useRef<HTMLDivElement | null>(null);

    const [streamingResponses, setStreamingResponses] = useState<StreamingResponses>({});
    const [isResponseActive, setIsResponseActive] = useState(false);

    const handleSend = () => {
        setStreamingResponses({});
        setIsResponseActive(true);

        const tasks = getTasks();
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
