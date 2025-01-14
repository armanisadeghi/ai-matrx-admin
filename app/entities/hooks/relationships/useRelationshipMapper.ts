import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { EntityKeys } from '@/types';
import { useMemo } from 'react';
import { RelationshipMapper } from './relationshipDefinitions';
import { toMatrxIdFromValue, toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';

export function useRelationshipMapper(entityName: EntityKeys, parentEntity: EntityKeys) {
    const selectors = createEntitySelectors(entityName);
    const records = useAppSelector(selectors.selectAllEffectiveRecords);

    const mapper = useMemo(() => {
        const m = new RelationshipMapper(entityName);
        m.setParentEntity(parentEntity);
        m.setData(records);
        return m;
    }, [entityName, parentEntity, records]);

    return mapper;
}

export function useParentRelationship(joinEntityname: EntityKeys, parentEntity: EntityKeys, parentId: string) {
    const selectors = createEntitySelectors(joinEntityname);
    const records = useAppSelector(selectors.selectAllEffectiveRecords);

    const mapper = useMemo(() => {
        const m = new RelationshipMapper(joinEntityname);
        m.setParentEntity(parentEntity);
        m.setData(records);
        m.setParentId(parentId);
        return m;
    }, [joinEntityname, parentEntity, records, parentId]);

    const JoiningEntityRecords = mapper.getJoinRecords();
    const joiningMatrxIds = mapper.getJoinMatrxIds();
    const childIds = mapper.getChildMatrxIds();
    const childMatrxIds = mapper.getChildMatrxIds();
    const parentMatrxid = toMatrxIdFromValue(parentEntity, parentId);

    return { mapper, JoiningEntityRecords, joiningMatrxIds, childIds, childMatrxIds, parentMatrxid, parentId };
}


export function useActiveParentRelationship(joinEntityname: EntityKeys, parentEntity: EntityKeys) {
    const selectors = createEntitySelectors(joinEntityname);
    const parentSelectors = createEntitySelectors(parentEntity);
    const records = useAppSelector(selectors.selectAllEffectiveRecords);
    const parentMatrxid = useAppSelector(parentSelectors.selectActiveRecordId);

    const mapper = useMemo(() => {
        const m = new RelationshipMapper(joinEntityname);
        m.setParentEntity(parentEntity);
        m.setData(records);
        m.setParentRecordId(parentMatrxid);
        return m;
    }, [joinEntityname, parentEntity, records, parentMatrxid]);

    const JoiningEntityRecords = mapper.getJoinRecords();
    const joiningMatrxIds = mapper.getJoinMatrxIds();
    const childIds = mapper.getChildMatrxIds();
    const childMatrxIds = mapper.getChildMatrxIds();
    const parentId = toPkValue(parentMatrxid);

    return { mapper, JoiningEntityRecords, joiningMatrxIds, childIds, childMatrxIds, parentMatrxid, parentId };
}
