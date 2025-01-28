import { useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types';
import { useMemo, useRef } from 'react';
import { toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { usePrevious, useThrottle, useDebounce } from '@uidotdev/usehooks';
import { isEqual } from 'lodash';
import { SimpleRelDef } from '../definitionConversionUtil';
import { useGetOrFetchRecord } from '../../records/useGetOrFetch';
import { RelationshipMapper } from '../relationshipDefinitions';


export const useStableJoinRecords = (relDefSimple: SimpleRelDef, anyParentId: MatrxRecordId | string | number) => {
    const parentId = anyParentId ? (typeof anyParentId === 'string' && anyParentId.includes(':') ? 
        toPkValue(anyParentId) : anyParentId.toString()) : undefined;

    const previousParentId = usePrevious(parentId);
    const parentChanged = previousParentId !== parentId;

    // Stable reference tracking
    const stableRef = useRef({
        lastStableRecords: null,
        previousRawRecords: null,
        stableChildMatrxIds: null as string[] | null,
        lastParentId: null as string | null,
        stabilizedAfterParentChange: false,
        lastStableChildIds: null as string[] | null
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
    const isJoinLoading = useAppSelector(joinSelectors.selectIsLoading);
    const rawJoinRecords = useAppSelector(joinSelectors.selectAllEffectiveRecordsWithKeys);

    // Stability checks
    const areRecordsEffectivelyEqual = (prev: any, current: any) => {
        if (Array.isArray(current) && current.length === 0 && 
            (prev === null || (Array.isArray(prev) && prev.length === 0))) {
            return true;
        }
        return isEqual(prev, current);
    };

    const hasChanged = !areRecordsEffectivelyEqual(stableRef.current.previousRawRecords, rawJoinRecords);

    // Update stable records when data stabilizes
    if (!hasChanged && rawJoinRecords) {
        stableRef.current.lastStableRecords = rawJoinRecords;
        if (!stableRef.current.stabilizedAfterParentChange && parentId === stableRef.current.lastParentId) {
            stableRef.current.stabilizedAfterParentChange = true;
        }
    }
    stableRef.current.previousRawRecords = rawJoinRecords;

    // Relationship mapping with stable data
    const mapper = useMemo(() => {
        const m = new RelationshipMapper(joiningEntity);
        m.setParentEntity(parentEntity);
        m.setData(rawJoinRecords);
        m.setParentId(parentId);
        return m;
    }, [joiningEntity, parentEntity, rawJoinRecords, parentId]);

    // Get mapped data
    const joinRecords = useMemo(() => 
        mapper.getJoinRecords() as EntityDataWithKey<EntityKeys>[], 
        [mapper]
    );
    
    const joiningMatrxIds = useMemo(() => mapper.getJoinMatrxIds(), [mapper]);
    const joinIds = useMemo(() => mapper.getJoinRecordIds(), [mapper]);

    const rawChildIds = useMemo(() => mapper.getChildIds(), [mapper]);
    
    const rawChildMatrxIds = useMemo(() => {
        const newIds = mapper.getChildMatrxIds();
        if (!hasChanged && newIds) {
            stableRef.current.stableChildMatrxIds = newIds;
        }
        return stableRef.current.stableChildMatrxIds || newIds;
    }, [mapper, hasChanged]);

    // Single consolidated loading state that respects the initial state and parent changes
    const isLoading = useDebounce(
        parentId ? (
            isParentLoading || 
            isJoinLoading || 
            !stableRef.current.stabilizedAfterParentChange
        ) : false,
        200
    );

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
        childIds: useDebounce(rawChildIds, 200),
        childMatrxIds: useDebounce(rawChildMatrxIds, 200),

        // Loading state
        isLoading
    };
};