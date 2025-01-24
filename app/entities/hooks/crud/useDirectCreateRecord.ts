import { useCallback } from 'react';
import { createRecordKey, useAppDispatch, useAppSelector, useEntityToasts, useEntityTools } from '@/lib/redux';
import { EntityData, EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager } from '@/utils/callbackManager';
import { v4 as uuidv4 } from 'uuid';
import { useCallbackManager } from '@/hooks/useCallbackManager';
import { useDispatch } from 'react-redux';

interface UseDirectCreateRecordOptions {
    entityKey: EntityKeys;
    onSuccess?: (recordId: string) => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
}

export const useDirectCreateRecord = ({ 
    entityKey, 
    onSuccess, 
    onError,
    showToast = true 
}: UseDirectCreateRecordOptions) => {
    const { actions, dispatch, selectors } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);
    const createCallback = useCallbackManager();
    const primaryKeyMetadata = useAppSelector(selectors.selectPrimaryKeyMetadata);

    return useCallback(
        async ({ data }: { data: Record<string, unknown> }) => {
            try {
                const recordId = uuidv4();
                const primaryKeyField = primaryKeyMetadata?.fields[0];

                if (!primaryKeyField) {
                    throw new Error('Primary key field not found');
                }

                const dataWithId = {
                    ...data,
                    [primaryKeyField]: recordId
                };

                const matrxRecordId = createRecordKey(primaryKeyMetadata, dataWithId);
                const callbackPromise = createCallback() as CustomPromise;

                dispatch(
                    actions.directCreateRecord({
                        matrxRecordId,
                        data: dataWithId,
                        callbackId: callbackPromise.callbackId,
                    })
                );

                await callbackPromise;

                if (showToast) {
                    entityToasts.handleCreateSuccess();
                }
                onSuccess?.(recordId);

                return recordId;
            } catch (error) {
                if (showToast) {
                    entityToasts.handleError(error as Error, 'create');
                }
                onError?.(error as Error);
                throw error;
            }
        },
        [
            dispatch,
            actions,
            primaryKeyMetadata,
            createCallback,
            entityToasts,
            onSuccess,
            onError,
            showToast
        ]
    );
};


interface CreateRecordResult {
    matrxRecordId: MatrxRecordId;
    coreId: string;
}

interface UseCreateAndGetIdOptions {
    entityKey: EntityKeys;
    onSuccess?: (recordId: string) => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
}

export const useCreateAndGetId = ({ 
    entityKey, 
    onSuccess, 
    onError,
    showToast = true 
}: UseCreateAndGetIdOptions) => {
    const { actions, dispatch, selectors } = useEntityTools(entityKey);
    const entityToasts = useEntityToasts(entityKey);
    const createCallback = useCallbackManager();
    const primaryKeyMetadata = useAppSelector(selectors.selectPrimaryKeyMetadata);

    return useCallback(
        async ({ data }: { data: Record<string, unknown> }): Promise<CreateRecordResult> => {
            try {
                const coreId = uuidv4();
                const primaryKeyField = primaryKeyMetadata?.fields[0];

                if (!primaryKeyField) {
                    throw new Error('Primary key field not found');
                }

                const dataWithId = {
                    ...data,
                    [primaryKeyField]: coreId
                };

                const matrxRecordId = createRecordKey(primaryKeyMetadata, dataWithId);
                const callbackPromise = createCallback() as CustomPromise;

                dispatch(
                    actions.directCreateRecord({
                        matrxRecordId,
                        data: dataWithId,
                        callbackId: callbackPromise.callbackId,
                    })
                );

                await callbackPromise;

                if (showToast) {
                    entityToasts.handleCreateSuccess();
                }
                onSuccess?.(coreId);

                return { matrxRecordId, coreId };
            } catch (error) {
                if (showToast) {
                    entityToasts.handleError(error as Error, 'create');
                }
                onError?.(error as Error);
                throw error;
            }
        },
        [
            dispatch,
            actions,
            primaryKeyMetadata,
            createCallback,
            entityToasts,
            onSuccess,
            onError,
            showToast
        ]
    );
};


interface CreateWithIdOptions {
    entityKey: EntityKeys;
    onSuccess?: (result: EntityData<EntityKeys>) => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
}

interface DirectCreateRecordResult {
    result: EntityData<EntityKeys>;
}

interface CustomPromise extends Promise<any> {
    callbackId?: string;
}

export const useCreateWithId = ({ entityKey, onSuccess, onError, showToast = true }: CreateWithIdOptions) => {
    const dispatch = useAppDispatch();
    const { actions } = useEntityTools(entityKey);
    const createCallback = useCallbackManager();
    const entityToasts = useEntityToasts(entityKey);

    return useCallback(
        async ({ data, matrxRecordId }: { data: Record<string, unknown>; matrxRecordId: MatrxRecordId }): Promise<DirectCreateRecordResult> => {
            try {
                const callbackPromise = createCallback() as CustomPromise;

                dispatch(
                    actions.directCreateRecord({
                        matrxRecordId,
                        data,
                        callbackId: callbackPromise.callbackId,
                    })
                );

                const result = await callbackPromise;
                if (showToast) {
                    entityToasts.handleCreateSuccess();
                }
                onSuccess?.(result);
                return { result };
            } catch (error) {
                if (showToast) {
                    entityToasts.handleError(error as Error, 'create');
                }
                onError?.(error as Error);
                throw error;
            }
        },
        [dispatch, actions, createCallback, onSuccess, onError, showToast, entityToasts]
    );
};

