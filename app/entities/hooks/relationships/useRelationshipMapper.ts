import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { EntityKeys } from '@/types';
import { useMemo } from 'react';
import { RelationshipMapper } from './relationshipDefinitions';

export function useRelationshipMapper(entityName: EntityKeys, parentEntity: EntityKeys) {
    const selectors = createEntitySelectors(entityName);
    const parentSelectors = createEntitySelectors(parentEntity);
    const records = useAppSelector(selectors.selectAllRecords);
    const activeParentRecordId = useAppSelector(parentSelectors.selectActiveRecordId);

    const mapper = useMemo(() => {
        const m = new RelationshipMapper(entityName);
        m.setParentEntity(parentEntity);
        m.setData(records);
        m.setParentRecordId(activeParentRecordId);
        return m;
    }, [entityName, parentEntity, records, activeParentRecordId]);

    return mapper;
}