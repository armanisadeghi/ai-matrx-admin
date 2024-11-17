// hooks/useActionError.ts
import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import {ErrorConfig} from "@/components/matrx/Entity/field-actions/types";

export const useActionError = (errorConfig?: Partial<ErrorConfig>) => {
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const handleError = useCallback(
        (err: Error) => {
            setError(err);

            const config: ErrorConfig = {
                level: 'error',
                action: 'retry',
                ...errorConfig
            };

            // Show error toast
            toast({
                title: config.message || err.message,
                variant: config.level === 'error' ? 'destructive' : 'default',
                action: config.action === 'retry' ? {
                    //@ts-ignore
                    label: 'Retry',
                    onClick: () => {
                        setRetryCount(count => count + 1);
                    }
                } : undefined
            });

            // Handle custom action
            if (config.action === 'custom' && config.customAction) {
                config.customAction();
            }
        },
        [errorConfig]
    );

    return {
        error,
        setError,
        handleError,
        retryCount,
        clearError: () => setError(null)
    };
};

