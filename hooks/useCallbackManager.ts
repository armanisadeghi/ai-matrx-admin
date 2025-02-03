import { callbackManager } from '@/utils/callbackManager';
import { useState, useEffect } from 'react';

interface CallbackData {
    result: any;
}

interface CustomPromise extends Promise<any> {
    callbackId?: string;
}

export function useCallbackManager() {
    const [callbackId, setCallbackId] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (callbackId) {
                callbackManager.remove(callbackId);
            }
        };
    }, [callbackId]);

    const createCallback = () => {
        let id: string;
        
        const promise = new Promise((resolve, reject) => {
            id = callbackManager.registerWithContext((data: CallbackData, context: any) => {
                if (context?.progress?.status === 'error') {
                    reject(context.progress.error);
                } else if (context?.progress?.status === 'completed') {
                    resolve(data.result);
                }
            });

            setCallbackId(id);
        }) as CustomPromise;

        promise.callbackId = id!;
        return promise;
    };

    return createCallback;
}