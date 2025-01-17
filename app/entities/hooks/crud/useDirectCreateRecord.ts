import { useCallback } from 'react';
import { useEntityToasts, useEntityTools } from '@/lib/redux';
import { EntityKeys } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { v4 as uuidv4 } from 'uuid';

interface UseDirectCreateRecordOptions {
    entityKey: EntityKeys;
    onSuccess?: (recordId: string) => void;
    onError?: (error: Error) => void;
}

export const useDirectCreateRecord = ({ entityKey, onSuccess, onError }: UseDirectCreateRecordOptions) => {
    const { actions, dispatch, store, selectors } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);

    return useCallback(
        async ({ data }: { data: Record<string, unknown> }) => {
            let tempId: string;

            try {
                tempId = 'new-record-' + uuidv4();

                dispatch(actions.startRecordCreationWithData({ tempId, initialData: data }));
                const createPayload = selectors.selectCreatePayload(store.getState(), tempId);
                dispatch(actions.addPendingOperation(tempId));

                dispatch(
                    actions.createRecord({
                        ...createPayload,
                        callbackId: callbackManager.register(({ success, error }) => {
                            dispatch(actions.removePendingOperation(tempId));
                            if (success) {
                                entityToasts.handleCreateSuccess();
                                onSuccess?.(tempId);
                            } else {
                                entityToasts.handleError(error, 'create');
                                onError?.(error);
                            }
                        }),
                    })
                );

                return tempId;
            } catch (error) {
                if (tempId!) {
                    dispatch(actions.removePendingOperation(tempId));
                }
                entityToasts.handleError(error as Error, 'create');
                onError?.(error as Error);
                throw error;
            }
        },
        [dispatch, actions, selectors, store, entityToasts, onSuccess, onError]
    );
};

interface CreateRecordResult {
    tempId: string;
    coreId: string;
}

export const useCreateAndGetId = ({ entityKey, onSuccess, onError }: UseDirectCreateRecordOptions) => {
    const { actions, dispatch, store, selectors } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);

    return useCallback(
        async ({ data }: { data: Record<string, unknown> }): Promise<CreateRecordResult> => {
            let tempId: string;
            const coreId = uuidv4();

            try {
                tempId = 'new-record-' + coreId;

                dispatch(actions.startRecordCreationWithData({ tempId, initialData: data }));
                const createPayload = selectors.selectCreatePayload(store.getState(), tempId);
                dispatch(actions.addPendingOperation(tempId));

                dispatch(
                    actions.createRecord({
                        ...createPayload,
                        callbackId: callbackManager.register(({ success, error }) => {
                            dispatch(actions.removePendingOperation(tempId));
                            if (success) {
                                entityToasts.handleCreateSuccess();
                                onSuccess?.(tempId);
                            } else {
                                entityToasts.handleError(error, 'create');
                                onError?.(error);
                            }
                        }),
                    })
                );

                return { tempId, coreId };
            } catch (error) {
                if (tempId!) {
                    dispatch(actions.removePendingOperation(tempId));
                }
                entityToasts.handleError(error as Error, 'create');
                onError?.(error as Error);
                throw error;
            }
        },
        [dispatch, actions, selectors, store, entityToasts, onSuccess, onError]
    );
};
