import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { EntityAnyFieldKey, EntityKeys } from '@/types';
import { useCallback } from 'react';

export const useDirectUpdateRecord = (entityName: EntityKeys, selectField: EntityAnyFieldKey<EntityKeys>) => {
    const dispatch = useAppDispatch();
    const { actions, selectors, store } = useEntityTools(entityName);

    return useCallback(
        (data: Record<string, unknown>, selectValue: any) => {
            const state = store.getState();
            const recipeMessageKey = selectors.selectRecordKeysByFieldValue(state, selectField, selectValue);

            const payload = {
                matrxRecordId: recipeMessageKey[0],
                data,
            };

            dispatch(actions.directUpdateRecord(payload));
        },
        [dispatch, actions]
    );
};
