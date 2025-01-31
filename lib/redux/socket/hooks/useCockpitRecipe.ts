import { useState, useRef, useCallback, useEffect } from 'react';
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

export const useCockpitSocket = (getCompiledData: () => CompiledData) => {
    useInitializeSocket();
    const socketManager = SocketManager.getInstance();
    const responseRef = useRef<HTMLDivElement | null>(null);

    const [namespace] = useState('UserSession');
    const [event] = useState('simple_recipe');
    const [streamEnabled] = useState(true);
    const [streamingResponses, setStreamingResponses] = useState<StreamingResponses>({});
    const [isResponseActive, setIsResponseActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Keep connection alive
    useEffect(() => {
        let mounted = true;
        let checkInterval: NodeJS.Timeout;

        const checkConnection = () => {
            try {
                const socket = socketManager.getSocket();
                if (mounted && socket) {
                    setIsConnected(socket.connected);
                    setIsAuthenticated(socket.connected);
                }
            } catch (error) {
                if (mounted) {
                    setIsConnected(false);
                    setIsAuthenticated(false);
                }
            }
        };

        checkConnection();
        checkInterval = setInterval(checkConnection, 3000);

        return () => {
            mounted = false;
            if (checkInterval) {
                clearInterval(checkInterval);
            }
        };
    }, []);

    const handleSend = () => {
        setStreamingResponses({});
        setIsResponseActive(true);

        const compiledData = getCompiledData();
        console.log('Starting tasks with count:', compiledData.tasks.length);

        const payload = compiledData.tasks.map((taskData, index) => ({
            task: 'run_recipe',
            index,
            stream: streamEnabled,
            taskData: {
                ...taskData,
                overrides: {
                    model_override: taskData.overrides.model_override,
                    processor_overrides:
                        typeof taskData.overrides.processor_overrides === 'string'
                        ? JSON.parse(taskData.overrides.processor_overrides)
                        : taskData.overrides.processor_overrides,
                    other_overrides:
                        typeof taskData.overrides.other_overrides === 'string'
                        ? JSON.parse(taskData.overrides.other_overrides)
                        : taskData.overrides.other_overrides
                }
            }
        }));

        // Start each task individually to ensure proper event listener registration
        payload.forEach((task, index) => {
            const singleTaskPayload = [task];  // Wrap in array as socketManager expects
            console.log(`Starting task ${index}`);
            
            socketManager.startTask(event, singleTaskPayload, (response) => {
                if (!response) return;
                
                console.log(`Received response for task ${index}`);
                
                if (response && typeof response === 'object' && 'data' in response) {
                    setStreamingResponses(prev => ({
                        ...prev,
                        [index]: (prev[index] || '') + response.data
                    }));
                } else if (typeof response === 'string') {
                    setStreamingResponses(prev => ({
                        ...prev,
                        [index]: (prev[index] || '') + response
                    }));
                }
            });
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
        namespace,
        event
    };
};

export type CockpitSocketHook = ReturnType<typeof useCockpitSocket>;