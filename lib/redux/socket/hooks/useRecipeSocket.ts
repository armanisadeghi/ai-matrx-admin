'use client';

import { useState, useRef, useEffect } from 'react';
import { useInitializeSocket } from '@/lib/redux/socket/useInitializeSocket';
import { SocketManager } from '@/lib/redux/socket/manager';
import { RECIPE_DATABASE } from "../constants/recipe-data";


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


export interface BrokerDefinitions {
    id: string;
    official_name: string;
    name?: string;
    data_type: string;
    required: boolean;
    default_value?: unknown;
    ready?: string;
}

export interface BrokerValue {
    id: string;
    official_name: string;
    data_type: string;
    value: unknown;
    ready: string;
    [key: string]: unknown;
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


export const useRecipeSocket = () => {
    useInitializeSocket();
    const socketManager = SocketManager.getInstance();

    // Base state
    const [namespace, setNamespace] = useState('UserSession');
    const [event, setEvent] = useState('simple_recipe');
    const [streamEnabled, setStreamEnabled] = useState(true);
    const [isResponseActive, setIsResponseActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Task state
    const [tasks, setTasks] = useState<RecipeSocketTask[]>([{
        task: 'run_recipe',
        index: 0,
        stream: true,
        taskData: {
            recipe_id: '',
            broker_values: [],
            overrides: {
                model_override: '',
                processor_overrides: {},
                other_overrides: {}
            }
        }
    }]);

    // Response state
    const [streamingResponse, setStreamingResponse] = useState('');
    const [responses, setResponses] = useState<any[]>([]);
    const responseRef = useRef<HTMLDivElement | null>(null);

    // Connection monitoring
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

        checkInterval = setInterval(checkConnection, 1000);

        return () => {
            mounted = false;
            if (checkInterval) {
                clearInterval(checkInterval);
            }
        };
    }, []);

    // Auto-scroll for streaming response
    useEffect(() => {
        if (responseRef.current) {
            responseRef.current.scrollTop = responseRef.current.scrollHeight;
        }
    }, [streamingResponse]);

    const loadRecipeData = (taskIndex: number, recipeId: string) => {
        const recipe = RECIPE_DATABASE[recipeId];
        if (!recipe) return;

        setTasks(prev => prev.map((task, i) => {
            if (i === taskIndex) {
                return {
                    ...task,
                    taskData: {
                        recipe_id: recipeId,
                        broker_values: recipe.brokers.map(broker => ({
                            ...broker,
                            value: broker.default_value
                        })),
                        overrides: recipe.default_overrides
                    }
                };
            }
            return task;
        }));
    };

    const addTask = () => {
        setTasks(prev => [...prev, {
            task: 'run_recipe',
            index: prev.length,
            stream: true,
            taskData: {
                recipe_id: '',
                broker_values: [],
                overrides: {
                    model_override: '',
                    processor_overrides: {},
                    other_overrides: {}
                }
            }
        }]);
    };

    const removeTask = (index: number) => {
        setTasks(prev => {
            const newTasks = prev.filter((_, i) => i !== index);
            return newTasks.map((task, i) => ({
                ...task,
                index: i
            }));
        });
    };

    const updateTask = (taskIndex: number, field: keyof SocketTask, value: unknown) => {
        setTasks(prev => prev.map((task, i) => {
            if (i === taskIndex) {
                return { ...task, [field]: value };
            }
            return task;
        }));
    };

    const updateTaskData = (taskIndex: number, field: keyof RecipeTaskData, value: unknown) => {
        setTasks(prev => prev.map((task, i) => {
            if (i === taskIndex) {
                return {
                    ...task,
                    taskData: {
                        ...task.taskData,
                        [field]: value
                    }
                };
            }
            return task;
        }));
    };

    const updateBroker = (taskIndex: number, brokerId: string, field: string, value: unknown) => {
        setTasks(prev => prev.map((task, i) => {
            if (i === taskIndex) {
                const newBrokers = task.taskData.broker_values.map(broker => {
                    if (broker.id === brokerId) {
                        return { ...broker, [field]: value };
                    }
                    return broker;
                });
                return {
                    ...task,
                    taskData: {
                        ...task.taskData,
                        broker_values: newBrokers
                    }
                };
            }
            return task;
        }));
    };

    const handleSend = () => {
        setStreamingResponse('');
        setResponses([]);
        setIsResponseActive(true);

        const payload = tasks.map(task => ({
            ...task,
            stream: streamEnabled,
            taskData: {
                ...task.taskData,
                overrides: {
                    model_override: task.taskData.overrides.model_override,
                    processor_overrides:
                        typeof task.taskData.overrides.processor_overrides === 'string'
                        ? JSON.parse(task.taskData.overrides.processor_overrides)
                        : task.taskData.overrides.processor_overrides,
                    other_overrides:
                        typeof task.taskData.overrides.other_overrides === 'string'
                        ? JSON.parse(task.taskData.overrides.other_overrides)
                        : task.taskData.overrides.other_overrides
                }
            }
        }));

        socketManager.startTask(event, payload, (response) => {
            if (response && typeof response === 'object' && 'data' in response) {
                setStreamingResponse(prev => prev + response.data);
            } else if (typeof response === 'string') {
                setStreamingResponse(prev => prev + response);
            } else {
                setResponses(prev => [...prev, response]);
            }
        });
    };

    const handleClear = () => {
        setStreamingResponse('');
        setResponses([]);
        setIsResponseActive(false);
    };

    return {
        namespace,
        setNamespace,
        event,
        setEvent,
        streamEnabled,
        setStreamEnabled,
        tasks,
        streamingResponse,
        responses,
        responseRef,
        loadRecipeData,
        addTask,
        removeTask,
        updateTask,
        updateTaskData,
        updateBroker,
        handleSend,
        handleClear,
        isResponseActive,
        isConnected,
        isAuthenticated,
    };
};
