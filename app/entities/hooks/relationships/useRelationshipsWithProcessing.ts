import { createEntitySelectors, useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityDataWithKey, EntityKeys, MatrxRecordId, ProcessedEntityData } from '@/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RelationshipMapper } from './relationshipDefinitions';
import { toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { useGetOrFetchRecord, useGetorFetchRecords } from '../records/useGetOrFetch';
import { useSequentialDelete } from '../crud/useSequentialDelete';
import { getStandardRelationship, KnownRelDef, SimpleRelDef } from './definitionConversionUtil';
import { processJoinedData } from './utils';
import _ from 'lodash';
import { useRelationshipDirectCreate } from '../crud/useDirectRelCreate';
import React from 'react';
import { usePrevious, useThrottle, useDebounce } from '@uidotdev/usehooks';

export const useStableJoinRecords = (relDefSimple: SimpleRelDef, anyParentId: MatrxRecordId | string | number) => {
    const parentId = anyParentId ? (typeof anyParentId === 'string' && anyParentId.includes(':') ? toPkValue(anyParentId) : anyParentId.toString()) : undefined;
    const parentEntity = relDefSimple.parent.name;
    const joiningEntity = relDefSimple.join.name;
    const childEntity = relDefSimple.child.name;

    const {selectors: parentSelectors} = useEntityTools(parentEntity);
    const {selectors: joinSelectors} = useEntityTools(joiningEntity);
    const {selectors: childSelectors} = useEntityTools(childEntity);

    const parentRecordsWithKey = useGetOrFetchRecord({ entityName: parentEntity, simpleId: parentId });
    const parentMatrxid = parentRecordsWithKey?.matrxRecordId;

    const isParentLoading = useAppSelector(parentSelectors.selectIsLoading);
    const isJoinLoading = useAppSelector(joinSelectors.selectIsLoading);
    const isChildLoading = useAppSelector(childSelectors.selectIsLoading);

    const rawJoinRecords = useAppSelector(joinSelectors.selectAllEffectiveRecordsWithKeys);
    const previousRecords = usePrevious(rawJoinRecords);
    const hasChanged = rawJoinRecords !== previousRecords;
    const isChanging = useDebounce(hasChanged, 200);
    const joinRecords = useThrottle(rawJoinRecords, 200);
    const isRawLoading = useDebounce(isParentLoading || isJoinLoading || isChildLoading || isChanging, 200);

    return {
        parentId,
        parentMatrxid,
        parentEntity,
        joiningEntity,
        childEntity,
        joinRecords,
        isRawLoading,
    };
};

const useChildRecords = (relDefSimple: SimpleRelDef, parentId: string | undefined, joinRecords: EntityDataWithKey<EntityKeys>[]) => {
    const parentEntity = relDefSimple.parent.name;
    const joiningEntity = relDefSimple.join.name;
    const childEntity = relDefSimple.child.name;

    const [stableChildRecords, setStableChildRecords] = useState<EntityDataWithKey<EntityKeys>[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const lastChangeRef = useRef<number>(Date.now());

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

    const childRecords = useGetorFetchRecords(childEntity, childMatrxIds) as EntityDataWithKey<EntityKeys>[];

    useEffect(() => {
        if (_.isEmpty(childRecords)) {
            clearTimeout(timeoutRef.current);
            return;
        }

        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (Date.now() - lastChangeRef.current >= 200) {
                setStableChildRecords(childRecords);
            }
        }, 200);

        lastChangeRef.current = Date.now();

        return () => clearTimeout(timeoutRef.current);
    }, [childRecords]);

    return {
        JoiningEntityRecords,
        joiningMatrxIds,
        childIds,
        childMatrxIds,
        childRecords: stableChildRecords,
        isChildLoading: _.isEmpty(stableChildRecords),
    };
};

export function useRelFetchProcessing(relDefSimple: SimpleRelDef, anyParentId: MatrxRecordId | string | number) {
    const { parentId, parentMatrxid, parentEntity, joiningEntity, childEntity, joinRecords, isRawLoading } = useStableJoinRecords(relDefSimple, anyParentId);
    const { JoiningEntityRecords, joiningMatrxIds, childIds, childMatrxIds, childRecords, isChildLoading } = useChildRecords(
        relDefSimple,
        parentId,
        joinRecords
    );

    const [lastProcessed, setLastProcessed] = useState<ProcessedEntityData<EntityKeys>[]>([]);
    const [needsReprocess, setNeedsReprocess] = useState(true);
    const [isProcessingStable, setIsProcessingStable] = useState(false);

    // Process messages with joining data when loading is stable
    const processedChildRecords = React.useMemo(() => {
        if (isChildLoading || !isProcessingStable) {
            return lastProcessed;
        }
        const newProcessed = processJoinedData({
            childRecords,
            joiningRecords: JoiningEntityRecords,
            relationshipDefinition: relDefSimple,
            parentMatrxId: parentMatrxid,
        });

        // Update the last known good state
        setLastProcessed(newProcessed);
        setIsProcessingStable(true);
        return newProcessed;
    }, [childRecords, JoiningEntityRecords, parentMatrxid, needsReprocess]);

    // Force immediate processing
    const triggerProcessing = useCallback(() => {
        setIsProcessingStable(false);
        setNeedsReprocess(true);
    }, []);

    // Derived loading state that includes processing stability
    const isLoading = isRawLoading || !isProcessingStable;

    const { deleteRecords, isDeleting } = useSequentialDelete(childEntity, joiningEntity);

    const deleteChildAndJoin = useCallback(
        (childRecordId: MatrxRecordId) => {
            if (!childMatrxIds.includes(childRecordId)) {
                return;
            }

            const JoinRecordId = findSingleJoinRecordKeyForChild(JoiningEntityRecords, childRecordId, relDefSimple);
            if (JoinRecordId) {
                deleteRecords(childRecordId, JoinRecordId);
            }
        },
        [deleteRecords, JoiningEntityRecords, childMatrxIds, relDefSimple]
    );

    const createRelatedRecords = useRelationshipDirectCreate(joiningEntity, childEntity, parentId);

    const loadingState = {
        isRawLoading,
        isDeleting,
        isProcessingStable,
    };

    return {
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
        processedChildRecords,
        triggerProcessing,
    };
}

export type RelationshipProcessingHook = ReturnType<typeof useRelFetchProcessing>;

export function findSingleJoinRecordKeyForChild(
    joinRecordsWithKey: EntityDataWithKey<EntityKeys>[],
    childIdValue: MatrxRecordId | string | number,
    relDefSimple: SimpleRelDef
): MatrxRecordId | undefined {
    const childField = relDefSimple.join.childField;
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
    relDefSimple: SimpleRelDef
): MatrxRecordId[] {
    const childField = relDefSimple.join.childField;
    const childId = typeof childIdValue === 'string' && childIdValue.includes(':') ? toPkValue(childIdValue) : childIdValue;
    const matchingRecords = joinRecordsWithKey.filter((record) => record[childField] === childId);
    const recordKeys: MatrxRecordId[] = matchingRecords.map((record) => record.matrxRecordId);
    return recordKeys;
}

export function useJoinedActiveParentProcessing(relDef: SimpleRelDef) {
    const selectors = createEntitySelectors(relDef.parent.name);
    const activeParentMatrxId = useAppSelector(selectors.selectActiveRecordId);
    const activeParentId = toPkValue(activeParentMatrxId);

    const relationshipHook = useRelFetchProcessing(relDef, activeParentId);

    return { activeParentMatrxId, activeParentId, relationshipHook };
}

export type JoinedActiveParentProcessingHook = ReturnType<typeof useJoinedActiveParentProcessing>;

export function useDoubleJoinedActiveParentProcessing(firstRelKey: KnownRelDef, secondRelKey: KnownRelDef) {
    const firstRelDef = getStandardRelationship(firstRelKey);
    const secondRelDef = getStandardRelationship(secondRelKey);
    const selectors = createEntitySelectors(firstRelDef.parent.name);
    const activeParentMatrxId = useAppSelector(selectors.selectActiveRecordId);
    const activeParentId = toPkValue(activeParentMatrxId);
    const firstRelHook = useRelFetchProcessing(firstRelDef, activeParentId);
    const secondRelHook = useRelFetchProcessing(secondRelDef, activeParentId);

    return { activeParentMatrxId, activeParentId, firstRelHook, secondRelHook };
}

export type DoubleJoinedActiveParentProcessingHook = ReturnType<typeof useDoubleJoinedActiveParentProcessing>;
