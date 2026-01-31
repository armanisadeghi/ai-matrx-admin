'use client';

import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { useRelationshipCreate } from '@/app/entities/hooks/unsaved-records/useDirectCreate';
import { useAppStore, useAppDispatch, useEntityTools } from '@/lib/redux';
import { toMatrxIdFromValue, toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { EntityKeys } from '@/types/entityTypes';
import { useCallback, useMemo } from 'react';

export interface AddMessagePayload {
    content: string;
    order: number;
    role: 'user' | 'system' | 'assistant';
    type: 'other' | 'text' | 'base64_image' | 'blob' | 'image_url';
}

interface UseAddMessageOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export function useAddMessage({ onSuccess, onError }: UseAddMessageOptions = {}) {
    const store = useAppStore();
    const parentEntity = 'recipe';
    const joiningEntity = 'recipeMessage';
    const childEntity = 'messageTemplate';
    const { selectors: parentSelectors } = useEntityTools(parentEntity);

    const activeParentRecordId = parentSelectors.selectActiveRecordId(store.getState());
    const parentId = useMemo(() => toPkValue(activeParentRecordId), [activeParentRecordId]);

    const createRelationship = useRelationshipCreate(joiningEntity, childEntity, parentId);

    const addMessage = useCallback(
        (payload: AddMessagePayload) => {
            const rawPayload = {
                joining: { order: payload.order },
                child: { content: payload.content, type: payload.type, role: payload.role },
            };

            return createRelationship(rawPayload);
        },
        [createRelationship]
    );

    return { addMessage };
}

export function useUpdateMessage() {
    const entityKey = 'messageTemplate' as EntityKeys;
    const dispatch = useAppDispatch();
    const { store, actions, selectors } = useEntityTools(entityKey);
    const { updateRecord } = useUpdateRecord(entityKey);

    const getRecordId = useMemo(() => (id: string) => toMatrxIdFromValue(entityKey, id), []);

    const updateMessageContent = useCallback(
        (id: string, content: string) => {
            dispatch(
                actions.updateUnsavedField({
                    recordId: getRecordId(id),
                    field: 'content',
                    value: content,
                })
            );
        },
        [actions, dispatch, getRecordId]
    );

    const saveMessage = useCallback(
        (id: string) => {
            updateRecord(getRecordId(id));
        },
        [updateRecord, getRecordId]
    );

    return { updateMessageContent, saveMessage };
}
