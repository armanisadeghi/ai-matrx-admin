import { useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { usePrevious, useThrottle, useDebounce } from '@uidotdev/usehooks';
import { isEqual } from 'lodash';
import { SimpleRelDef } from '../definitionConversionUtil';
import { useGetOrFetchRecord, useGetorFetchRecords } from '../../records/useGetOrFetch';
import { RelationshipMapper } from '../relationshipDefinitions';
import { processJoinedData } from '../utils';

export const useStableRelationships = (relDefSimple: SimpleRelDef, anyParentId: MatrxRecordId | string | number) => {
    const parentId = anyParentId ? (typeof anyParentId === 'string' && anyParentId.includes(':') ? toPkValue(anyParentId) : anyParentId.toString()) : undefined;

    const previousParentId = usePrevious(parentId);
    const parentChanged = previousParentId !== parentId;

    const stableRef = useRef({
        lastStableRecords: null,
        previousRawRecords: null,
        stableChildMatrxIds: null as string[] | null,
        lastParentId: null as string | null,
        stabilizedAfterParentChange: false,
        lastStableChildIds: null as string[] | null,
    });

    // Track parent changes and reset stability
    if (parentChanged) {
        stableRef.current.stabilizedAfterParentChange = false;
        stableRef.current.lastParentId = parentId;
        stableRef.current.lastStableChildIds = null;
    }

    const parentEntity = relDefSimple.parent.name;
    const joiningEntity = relDefSimple.join.name;
    const childEntity = relDefSimple.child.name;

    // Entity tooling setup
    const parentTools = useEntityTools(parentEntity);
    const joinTools = useEntityTools(joiningEntity);
    const childTools = useEntityTools(childEntity);
    const { selectors: parentSelectors } = parentTools;
    const { selectors: joinSelectors } = joinTools;

    // Data fetching
    const parentRecords = useGetOrFetchRecord({ entityName: parentEntity, simpleId: parentId });
    const parentMatrxid = parentRecords?.matrxRecordId;
    const isParentLoading = useAppSelector(parentSelectors.selectIsLoading);
    const isRawJoinLoading = useAppSelector(joinSelectors.selectIsLoading);
    const initialJoinRecords = useAppSelector(joinSelectors.selectAllEffectiveRecordsWithKeys);

    // Stability checks
    const areRecordsEffectivelyEqual = (prev: any, current: any) => {
        if (Array.isArray(current) && current.length === 0 && (prev === null || (Array.isArray(prev) && prev.length === 0))) {
            return true;
        }
        return isEqual(prev, current);
    };

    const hasChanged = !areRecordsEffectivelyEqual(stableRef.current.previousRawRecords, initialJoinRecords);

    // Update stable records when data stabilizes
    if (!hasChanged && initialJoinRecords) {
        stableRef.current.lastStableRecords = initialJoinRecords;
        if (!stableRef.current.stabilizedAfterParentChange && parentId === stableRef.current.lastParentId) {
            stableRef.current.stabilizedAfterParentChange = true;
        }
    }
    stableRef.current.previousRawRecords = initialJoinRecords;

    // Relationship mapping with stable data
    const mapper = useMemo(() => {
        const m = new RelationshipMapper(joiningEntity);
        m.setParentEntity(parentEntity);
        m.setUniqueData(stableRef.current.lastStableRecords);
        m.setParentId(parentId);
        return m;
    }, [joiningEntity, parentEntity, stableRef.current.lastStableRecords, parentId]);

    const { rawJoinRecords, rawJoiningMatrxIds, rawJoinIds, rawChildIds, rawChildMatrxIds } = useMemo(
        () => ({
            rawJoinRecords: mapper.getJoinRecords() as EntityDataWithKey<EntityKeys>[],
            rawJoiningMatrxIds: mapper.getJoinMatrxIds(),
            rawJoinIds: mapper.getJoinRecordIds(),
            rawChildIds: mapper.getChildIds(),
            rawChildMatrxIds: mapper.getChildMatrxIds(),
        }),
        [mapper]
    );

    const joinRecords = useDebounce(rawJoinRecords, 200);
    const joiningMatrxIds = useDebounce(rawJoiningMatrxIds, 200);
    const joinIds = useDebounce(rawJoinIds, 200);
    const childMatrxIds = useDebounce(rawChildMatrxIds, 200);
    const childIds = useDebounce(rawChildIds, 200);

    // Single consolidated loading state that respects the initial state and parent changes
    const isJoinLoading = useDebounce(parentId ? isParentLoading || isRawJoinLoading || !stableRef.current.stabilizedAfterParentChange : false, 200);

    const childSelectors = childTools.selectors;
    const isChildLoading = useAppSelector(childSelectors.selectIsLoading);

    const shouldProcess = useDebounce(!isJoinLoading && !isChildLoading, 200);

    const currentChildRecords = useGetorFetchRecords(childEntity, childMatrxIds, shouldProcess) as EntityDataWithKey<EntityKeys>[];

    const unprocessedChildRecords = useDebounce(currentChildRecords, 300);
    const [needsReprocess, setNeedsReprocess] = useState(true);

    // This could be called from the drag-and-drop handler
    const triggerProcessing = useCallback(() => {
        setNeedsReprocess(true);
    }, []);

    const childRecords = useMemo(() => {
        if (needsReprocess) {
            setNeedsReprocess(false);
        }

        if (!unprocessedChildRecords || !joinRecords || !relDefSimple || !parentMatrxid) {
            return [];
        }

        return processJoinedData({
            childRecords: unprocessedChildRecords,
            joiningRecords: joinRecords,
            relationshipDefinition: relDefSimple,
            parentMatrxId: parentMatrxid,
        });
    }, [unprocessedChildRecords, joinRecords, relDefSimple, parentMatrxid, needsReprocess]);

    return {
        // Entity names
        parentEntity,
        joiningEntity,
        childEntity,

        // Entity tools
        parentTools,
        joinTools,
        childTools,

        // Parent data
        parentId,
        parentRecords,
        parentMatrxid,

        // Join/Relationship data
        joinIds,
        joinRecords,
        joiningMatrxIds,

        // Child data
        childIds,
        childMatrxIds,
        unprocessedChildRecords,
        childRecords,

        // Loading state
        isChildLoading,
        isJoinLoading,

        triggerProcessing,
    };
};
