import { useAppDispatch, useEntityTools } from "@/lib/redux";
import { EntityAnyFieldKey, EntityData, EntityKeys } from "@/types";
import { useCallback } from "react";


export const useMoveDown = (entityName: EntityKeys,selectField: EntityAnyFieldKey<EntityKeys>) => {
    const dispatch = useAppDispatch();
    const { actions, selectors, store } = useEntityTools(entityName);

    return useCallback(
        (data: Record<string, unknown>, selectValue: any) => {
            const state = store.getState();
            const recipeMessageKey = selectors.selectRecordKeyByFieldValue(state, selectField, selectValue);

            const payload = {
                matrxRecordId: recipeMessageKey,
                data,
            };

            dispatch(actions.directUpdateRecord(payload));
        },
        [dispatch, actions]
    );
};
