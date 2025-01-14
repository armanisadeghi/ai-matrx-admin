'use client';

import { useRelationshipCreate } from '@/app/entities/hooks/unsaved-records/useDirectCreate';
import { useAppStore, useEntityTools } from '@/lib/redux';
import { toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { MessageTemplateDataOptional, MatrxRecordId } from '@/types';
import { useCallback, useMemo } from 'react';

interface MessageOperationState {
    recipeStatus: 'initializing' | 'loading' | 'idle';
    mode: 'existingRecipe' | 'newRecipe' | null;
}

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

interface UseAddMessageResult {
    addMessage: (message: MessageTemplateDataOptional, order: number) => MatrxRecordId | null;
}

interface UseUpdateMessageResult {
    updateMessageContent: (recordId: MatrxRecordId, content: string) => void;
    saveMessageContent: (recordId: MatrxRecordId) => void;
    updateRecipeMessageOrder: (recordId: MatrxRecordId, order: number) => void;
    saveRecipeMessage: (recordId: MatrxRecordId) => void;
}
