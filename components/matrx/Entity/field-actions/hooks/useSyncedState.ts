// hooks/useSyncedState.ts
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash/debounce';
import {SyncConfig} from "@/components/matrx/Entity/field-actions/types";

export const useSyncedState = <T>(
    initialValue: T,
    syncConfig: SyncConfig
) => {
    const dispatch = useDispatch();
    const [localValue, setLocalValue] = useState<T>(initialValue);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Get dependencies from Redux state
    const dependencies = useSelector(state =>
        syncConfig.dependencies?.map(dep => state[dep])
    );

    // Create debounced sync function
    const syncToServer = useRef(
        debounce(async (value: T) => {
            try {
                setSyncing(true);
                dispatch({
                    type: 'SYNC_STATE',
                    payload: {
                        key: syncConfig.key,
                        value,
                        optimistic: syncConfig.optimistic
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Sync failed'));
                if (syncConfig.retryConfig) {
                    // Implement retry logic
                }
            } finally {
                setSyncing(false);
            }
        }, syncConfig.debounceMs || 500)
    ).current;

    // Sync when local value or dependencies change
    useEffect(() => {
        syncToServer(localValue);
    }, [localValue, ...(dependencies || [])]);

    return {
        value: localValue,
        setValue: setLocalValue,
        syncing,
        error,
        retry: () => syncToServer(localValue)
    };
};
