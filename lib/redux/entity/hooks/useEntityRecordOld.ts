/*
// hooks/useEntityRecord.ts
import { useState, useEffect } from 'react';
import { useEntity } from '@/lib/redux/entity/useEntity';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { EntityError, MatrxRecordId } from '@/lib/redux/entity/types';
import { createRecordKey } from '@/lib/redux/entity/utils';

interface UseEntityRecordResult {
    entity: ReturnType<typeof useEntity>;
    error: EntityError | null;
    isLoading: boolean;
}

export function useEntityRecordOld(
    entityName: EntityKeys,
    primaryKeyField: string,
    primaryKeyValue: string
): UseEntityRecordResult {
    const entity = useEntity(entityName);
    const [error, setError] = useState<EntityError | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        if (isInitialLoad) {
            const primaryKeyValues = {
                [primaryKeyField]: primaryKeyValue
            } as Record<string, MatrxRecordId>;

            entity.fetchOne(primaryKeyValues);
            setIsInitialLoad(false);
        }
    }, [entity.entityMetadata, isInitialLoad]);

    useEffect(() => {

        const primaryKeyValues = {
            [primaryKeyField]: primaryKeyValue
        } as Record<string, MatrxRecordId>;

        const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
        const record = entity.allRecords[recordKey];

        if (record && !entity.loadingState.loading) {
            entity.setSelection([record], 'single');
            setError(null);
        } else if (!entity.loadingState.loading && !record) {
            setError({
                message: 'Record not found',
                details: `No record found for ${primaryKeyField}: ${primaryKeyValue}`,
                lastOperation: 'fetch'
            });
        }
    }, [entity.allRecords, entity.loadingState.loading, entity.entityMetadata]);

    return {
        entity,
        error,
        isLoading: !entity.entityMetadata || entity.loadingState.loading
    };
}
*/
