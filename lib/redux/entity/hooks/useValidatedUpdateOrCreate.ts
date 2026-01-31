// lib/redux/entity/hooks/useValidatedUpdateOrCreate.ts

import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { createEntitySlice } from '@/lib/redux/entity/slice';
import { EntityData, EntityKeys } from '@/types/entityTypes';
import { MatrxRecordId, EntityError } from '@/lib/redux/entity/types/stateTypes';

interface UseValidatedUpdateOrCreateResult<TEntity extends EntityKeys> {
    validatedUpdateRecord: (
        primaryKeyValues: Record<string, MatrxRecordId>,
        data: Partial<EntityData<TEntity>>
    ) => void;
    validatedCreateRecord: (record: EntityData<TEntity>) => void;
}

export function useValidatedUpdateOrCreate<TEntity extends EntityKeys>(
    entityKey: TEntity
): UseValidatedUpdateOrCreateResult<TEntity> {
    const dispatch = useAppDispatch();

    // Initialize selectors and actions specific to the entity
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { actions } = useMemo(() => createEntitySlice(entityKey, {} as any), [entityKey]);

    // Selector to check if validation is completed
    const isValidated = useAppSelector(selectors.selectIsValidated);

    // Validated Update Function
    const validatedUpdateRecord = useCallback(
        (primaryKeyValues: Record<string, MatrxRecordId>, data: Partial<EntityData<TEntity>>) => {
            if (isValidated) {
                // @ts-ignore - primaryKeyValues is used internally, data is the main parameter
                dispatch(actions.updateRecord({ primaryKeyValues, data }));
            } else {
                console.warn('Validation has not been completed.');
            }
        },
        [dispatch, actions, isValidated]
    );

    // Validated Create Function
    const validatedCreateRecord = useCallback(
        (record: EntityData<TEntity>) => {
            if (isValidated) {
                // @ts-ignore - COMPLEX: EntityData<TEntity> missing required 'entityNameAnyFormat' property - requires type conversion or API refactor
                dispatch(actions.createRecord(record));
            } else {
                console.warn('Validation has not been completed.');
            }
        },
        [dispatch, actions, isValidated]
    );

    return { validatedUpdateRecord, validatedCreateRecord };
}
