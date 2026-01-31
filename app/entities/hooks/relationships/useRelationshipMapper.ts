import { createEntitySelectors, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { useCallback, useMemo } from 'react';
import { RelationshipMapper } from './relationshipDefinitions';
import { toMatrxIdFromValue, toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { useGetOrFetchRecord, useGetorFetchRecords } from '../records/useGetOrFetch';
import { useSequentialDelete } from '../crud/useSequentialDelete';
import { useRelationshipCreate } from '../unsaved-records/useDirectCreate';
import { SimpleRelDef } from './definitionConversionUtil';

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

export function useRelWithFetch(relationshipDefinition: SimpleRelDef, anyParentId: MatrxRecordId | string | number) {
    const parentId = typeof anyParentId === 'string' && anyParentId.includes(':') ? toPkValue(anyParentId) : anyParentId.toString();

    const parentEntity = relationshipDefinition.parent.name;
    const joiningEntity = relationshipDefinition.join.name;
    const childEntity = relationshipDefinition.child.name;

    // Get selectors for all entities
    const parentSelectors = createEntitySelectors(parentEntity);
    const joinSelectors = createEntitySelectors(joiningEntity);
    const childSelectors = createEntitySelectors(childEntity);

    // Get loading states from each entity
    const isParentLoading = useAppSelector(parentSelectors.selectIsLoading);
    const isJoinLoading = useAppSelector(joinSelectors.selectIsLoading);
    const isChildLoading = useAppSelector(childSelectors.selectIsLoading);

    const { deleteRecords, isDeleting } = useSequentialDelete(childEntity, joiningEntity);

    const parentRecordsWithKey = useGetOrFetchRecord({ entityName: parentEntity, simpleId: parentId });
    const parentMatrxid = parentRecordsWithKey?.matrxRecordId;
    const joinRecords = useAppSelector(joinSelectors.selectAllEffectiveRecordsWithKeys);

    const mapper = useMemo(() => {
        const m = new RelationshipMapper(joiningEntity);
        m.setParentEntity(parentEntity);
        m.setData(joinRecords);
        m.setParentId(parentId);
        return m;
    }, [joiningEntity, parentEntity, joinRecords, parentId]);

    const JoiningEntityRecords = mapper.getJoinRecords() as EntityDataWithKey<EntityKeys>[];
    const joiningMatrxIds = mapper.getJoinMatrxIds();
    const childIds = mapper.getChildMatrxIds();
    const childMatrxIds = mapper.getChildMatrxIds();
    const childRecords = useAppSelector((state) => childSelectors.selectRecordsWithKeys(state, childMatrxIds)) as EntityDataWithKey<EntityKeys>[];

    useGetorFetchRecords(childEntity, childMatrxIds) as EntityDataWithKey<EntityKeys>[];

    const deleteChildAndJoin = useCallback(
        (childRecordId: MatrxRecordId) => {
            if (!childMatrxIds.includes(childRecordId)) {
                return;
            }

            const JoinRecordId = findSingleJoinRecordKeyForChild(JoiningEntityRecords, childRecordId, relationshipDefinition);
            if (JoinRecordId) {
                deleteRecords(childRecordId, JoinRecordId);
            }
        },
        [deleteRecords, JoiningEntityRecords]
    );

    const createRelatedRecords = useRelationshipCreate(joiningEntity, childEntity, parentId);

    const isLoading = isParentLoading || isJoinLoading || isChildLoading;
    const loadingState = {
        parent: isParentLoading,
        join: isJoinLoading,
        child: isChildLoading,
        isDeleting: isDeleting,
    };

    return {
        mapper,
        JoiningEntityRecords,
        joiningMatrxIds,
        childIds,
        childMatrxIds,
        childRecords,
        parentMatrxid,
        parentId,
        deleteChildAndJoin,
        createRelatedRecords,
        isLoading,
        loadingState,
    };
}

export function findSingleJoinRecordKeyForChild(
    joinRecordsWithKey: EntityDataWithKey<EntityKeys>[],
    childIdValue: MatrxRecordId | string | number,
    relationshipDefinition: SimpleRelDef
): MatrxRecordId | undefined {
    const childField = relationshipDefinition.join.childField;
    const childId = typeof childIdValue === 'string' && childIdValue.includes(':') ? toPkValue(childIdValue) : childIdValue;
    const matchingRecord = joinRecordsWithKey.find((record) => record[childField] === childId);
    if (!matchingRecord) {
        return undefined;
    }
    return matchingRecord.matrxRecordId;
}

export function filterAllJoinRecordKeysForChild(
    joinRecordsWithKey: EntityDataWithKey<EntityKeys>[],
    childIdValue: MatrxRecordId | string | number,
    relationshipDefinition: SimpleRelDef
): MatrxRecordId[] {
    const childField = relationshipDefinition.join.childField;
    const childId = typeof childIdValue === 'string' && childIdValue.includes(':') ? toPkValue(childIdValue) : childIdValue;
    const matchingRecords = joinRecordsWithKey.filter((record) => record[childField] === childId);
    const recordKeys: MatrxRecordId[] = matchingRecords.map((record) => record.matrxRecordId);
    return recordKeys;
}

