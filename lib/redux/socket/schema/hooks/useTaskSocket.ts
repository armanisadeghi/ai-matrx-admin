// hooks/useTaskSocket.ts - Base reusable hook
import { useState, useRef, useEffect, useCallback } from "react";
import { SchemaTaskManager, SchemaTaskBuilder } from "@/lib/redux/socket/schema/SchemaTaskManager";

interface UseTaskSocketOptions<T, O = Record<string, any>> {
    onResponse?: (response: string) => void;
    onError?: (error: string) => void;
    taskManager: SchemaTaskManager;
    configureTask: (builder: SchemaTaskBuilder, payload: T, options?: O) => void;
}

export function useTaskSocket<T, O = Record<string, any>>({ onResponse, onError, taskManager, configureTask }: UseTaskSocketOptions<T, O>) {
    const [streamingResponse, setStreamingResponse] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);

    const cleanupRef = useRef<(() => void) | null>(null);
    const onResponseRef = useRef(onResponse);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onResponseRef.current = onResponse;
        onErrorRef.current = onError;
    }, [onResponse, onError]);

    useEffect(() => {
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
            }
        };
    }, []);

    const handleUpdate = useCallback((_, fullText: string) => {
        setStreamingResponse(fullText);
        onResponseRef.current?.(fullText);
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
        setIsStreaming(false);
    }, []);

    const handleComplete = useCallback(() => {
        setIsStreaming(false);
    }, []);

    const submitTask = useCallback(
        async (payload: T, options?: O) => {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }

            setIsLoading(true);
            setStreamingResponse("");
            setError(null);
            setIsStreaming(true);

            try {
                const taskBuilder = taskManager.createTask();
                configureTask(taskBuilder, payload, options);

                const [cleanup, getCurrentResponse] = taskBuilder.stream({
                    onUpdate: handleUpdate,
                    onError: handleError,
                    onComplete: handleComplete,
                });

                cleanupRef.current = cleanup;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An error occurred";
                setError(errorMessage);
                onErrorRef.current?.(errorMessage);
                setIsStreaming(false);
            } finally {
                setIsLoading(false);
            }

            return () => {
                if (cleanupRef.current) {
                    cleanupRef.current();
                    cleanupRef.current = null;
                    setIsStreaming(false);
                }
            };
        },
        [taskManager, configureTask, handleUpdate, handleError, handleComplete]
    );

    const cancelStream = useCallback(() => {
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
            setIsStreaming(false);
        }
    }, []);

    return {
        submitTask,
        streamingResponse,
        error,
        isLoading,
        isStreaming,
        cancelStream,
    };
}

export type UseTaskSocketResult<T, O = Record<string, any>> = ReturnType<typeof useTaskSocket<T, O>>;
