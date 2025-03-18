// hooks/useSystemResponseHandler.ts
import { useCallback, useRef, useState, useEffect } from "react";

// Response type based on the Python structure
export interface SystemResponse {
    status: "update" | "confirm" | "completed" | "retry";
    message: string;
    data: any;
    request_details: {
        event_name: string;
        sid: string;
        namespace: string;
    };
}

export type ResponseHandler = (response: SystemResponse) => void;

export interface SystemResponseHandlers {
    onUpdate?: ResponseHandler;
    onConfirm?: ResponseHandler;
    onCompleted?: ResponseHandler;
    onRetry?: ResponseHandler;
    onInvalid?: (response: string) => void;
}

export interface UseSystemResponseHandlerProps extends SystemResponseHandlers {
    onRetryAttempt?: (count: number, maxRetries: number) => void;
    maxRetries?: number;
    retryDelay?: number;
}

export interface SystemResponseHandlerResult {
    handleResponse: (responseText: string) => void;
    retryCount: number;
    resetRetryCount: () => void;
    triggerRetry: () => void;
}

export function useSystemResponseHandler({
    onUpdate,
    onConfirm,
    onCompleted,
    onRetry,
    onInvalid,
    onRetryAttempt,
    maxRetries = 3,
    retryDelay = 3000,
}: UseSystemResponseHandlerProps): SystemResponseHandlerResult {
    const [retryCount, setRetryCount] = useState(0);

    // Parse the response to get the structured system response
    const parseResponse = useCallback((responseText: string): SystemResponse | null => {
        try {
            return JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse response:", e);
            return null;
        }
    }, []);

    const resetRetryCount = useCallback(() => {
        setRetryCount(0);
    }, []);

    const triggerRetry = useCallback(() => {
        if (retryCount < maxRetries) {
            setRetryCount((prev) => prev + 1);
            onRetryAttempt?.(retryCount + 1, maxRetries);
        } else {
            console.error(`Maximum retries (${maxRetries}) reached`);
        }
    }, [retryCount, maxRetries, onRetryAttempt]);

    // Handle the structured response based on status
    const handleResponse = useCallback(
        (responseText: string) => {
            const response = parseResponse(responseText);

            if (!response) {
                onInvalid?.(responseText);
                return;
            }

            switch (response.status) {
                case "update":
                    onUpdate?.(response);
                    break;

                case "confirm":
                    onConfirm?.(response);
                    break;

                case "completed":
                    onCompleted?.(response);
                    break;

                case "retry":
                    onRetry?.(response);
                    if (retryCount < maxRetries) {
                        setTimeout(() => {
                            triggerRetry();
                        }, retryDelay);
                    }
                    break;

                default:
                    onInvalid?.(responseText);
            }
        },
        [parseResponse, onUpdate, onConfirm, onCompleted, onRetry, onInvalid, retryCount, maxRetries, retryDelay, triggerRetry]
    );

    return {
        handleResponse,
        retryCount,
        resetRetryCount,
        triggerRetry,
    };
}
