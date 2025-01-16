'use client';

import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { useRelationshipCreate } from '@/app/entities/hooks/unsaved-records/useDirectCreate';
import { useAppStore, useEntityTools } from '@/lib/redux';
import { toMatrxIdFromValue, toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { useCallback, useMemo } from 'react';

export interface AddMessagePayload {
    content: string;
    order: number;
    role: 'user' | 'system' | 'assistant';
    type: 'other' | 'text' | 'base64_image' | 'blob' | 'image_url';
}

export function useAddMessage() {
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
    const { actions, dispatch } = useEntityTools('messageTemplate');
    const { updateRecord } = useUpdateRecord('messageTemplate');

    const getRecordId = useMemo(() => (id: string) => toMatrxIdFromValue('messageTemplate', id), []);

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
