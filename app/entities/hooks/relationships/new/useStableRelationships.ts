import { useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { RecipeMessageRecordWithKey } from '@/types/AutomationSchemaTypes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import { useDebounce } from '@uidotdev/usehooks';
import { isEqual } from 'lodash';
import { SimpleRelDef } from '../definitionConversionUtil';
import { useGetOrFetchRecord, useGetorFetchRecords } from '../../records/useGetOrFetch';
import { RelationshipMapper } from '../relationshipDefinitions';
import { processJoinedData } from '../utils';

const VERBOSE_PRINTS = false;
const DEBUG_PRINTS = false;

export const useStableRelationships = (
    relDefSimple: SimpleRelDef, 
    anyParentId: MatrxRecordId | string | number,
    // Add a forceRefresh flag that can be triggered from outside
    forceRefresh?: boolean 
) => {
    const parentId = anyParentId ? (typeof anyParentId === 'string' && anyParentId.includes(':') ? toPkValue(anyParentId) : anyParentId.toString()) : undefined;
    const [needsReprocess, setNeedsReprocess] = useState(true);
    
    // Track last force refresh to detect changes
    const lastForceRefreshRef = useRef(forceRefresh);
    
    const stableRef = useRef({
        lastStableRecords: null,
        previousRawRecords: null,
        stableChildMatrxIds: null as string[] | null,
        lastParentId: parentId,
        stabilizedAfterParentChange: false,
        lastStableChildIds: null as string[] | null,
        lastForceRefresh: forceRefresh,
        rendersSinceParentChange: 0,
    });
    
    // Detect parent change and reset immediately
    const parentChanged = stableRef.current.lastParentId !== parentId;
    
    if (parentChanged) {
        if (DEBUG_PRINTS) {
            console.log('Parent ID changed from', stableRef.current.lastParentId, 'to', parentId);
        }
        // Immediately reset all stability flags
        stableRef.current.stabilizedAfterParentChange = false;
        stableRef.current.lastParentId = parentId;
        stableRef.current.lastStableChildIds = null;
        stableRef.current.lastStableRecords = null;
        stableRef.current.previousRawRecords = null;
        stableRef.current.rendersSinceParentChange = 0;
        setNeedsReprocess(true);
    } else {
        // Increment render count since parent change
        stableRef.current.rendersSinceParentChange += 1;
    }
    
    // Force reprocessing when forceRefresh changes
    useEffect(() => {
        if (forceRefresh !== lastForceRefreshRef.current) {
            if (DEBUG_PRINTS) {
                console.log('Force refresh triggered, setting needsReprocess to true');
            }
            setNeedsReprocess(true);
            lastForceRefreshRef.current = forceRefresh;
        }
    }, [forceRefresh]);
    
    if (DEBUG_PRINTS) {
        console.log('-------------');
        console.log('parentChanged', parentChanged);
        console.log('parentId', parentId);
        console.log('lastParentId', stableRef.current.lastParentId);
        console.log('rendersSinceParentChange', stableRef.current.rendersSinceParentChange);
        console.log('forceRefresh', forceRefresh);
        console.log('-------------');
    }
    
    if (VERBOSE_PRINTS) {
        console.log('stableRef', stableRef.current);
    }
    
    const parentEntity = relDefSimple.parent.name;
    const joiningEntity = relDefSimple.join.name;
    const childEntity = relDefSimple.child.name;
    
    if (VERBOSE_PRINTS) {
        console.log('parentEntity', parentEntity);
        console.log('joiningEntity', joiningEntity);
        console.log('childEntity', childEntity);
    }
    
    // Entity tooling setup
    const parentTools = useEntityTools(parentEntity);
    const joinTools = useEntityTools(joiningEntity);
    const childTools = useEntityTools(childEntity);
    const { selectors: parentSelectors } = parentTools;
    const { selectors: joinSelectors } = joinTools;
    
    // Data fetching
    const parentRecord = useGetOrFetchRecord({ entityName: parentEntity, simpleId: parentId });
    const parentMatrxid = parentRecord?.matrxRecordId;
    
    if (DEBUG_PRINTS) {
        console.log('parentRecord', parentRecord);
        console.log('parentMatrxid', parentMatrxid);
    }
    
    const isParentLoading = useAppSelector(parentSelectors.selectIsLoading);
    const isRawJoinLoading = useAppSelector(joinSelectors.selectIsLoading);
    const initialJoinRecords = useAppSelector(joinSelectors.selectAllEffectiveRecordsWithKeys) as RecipeMessageRecordWithKey[];
    // Add a timestamp for join records to detect changes in deep equality check
    const joinRecordsWithTimestamp = useMemo(() => {
        return { 
            records: initialJoinRecords, 
            timestamp: Date.now(),
            forceRefresh // Include forceRefresh in the dependency
        };
    }, [initialJoinRecords, forceRefresh]);
    
    if (DEBUG_PRINTS) {
        console.log('--- initialJoinRecords', initialJoinRecords);
    }
    
    // Stability checks
    const areRecordsEffectivelyEqual = (prev: any, current: any) => {
        // When forceRefresh is triggered, consider records as changed
        if (current?.forceRefresh !== prev?.forceRefresh) {
            return false;
        }
        
        if (Array.isArray(current?.records) && current?.records.length === 0 && 
            (prev === null || (Array.isArray(prev?.records) && prev?.records.length === 0))) {
            return true;
        }
        
        return isEqual(prev?.records, current?.records);
    };
    
    const hasChanged = !areRecordsEffectivelyEqual(
        stableRef.current.previousRawRecords, 
        joinRecordsWithTimestamp
    );
    
    if (DEBUG_PRINTS) {
        console.log('hasChanged', hasChanged);
    }
    
    // Update stable records when data stabilizes
    if (!hasChanged && joinRecordsWithTimestamp?.records) {
        stableRef.current.lastStableRecords = joinRecordsWithTimestamp.records;
        // Mark as stabilized if we haven't changed and we're on the same parent
        if (!stableRef.current.stabilizedAfterParentChange && parentId === stableRef.current.lastParentId) {
            stableRef.current.stabilizedAfterParentChange = true;
            if (DEBUG_PRINTS) {
                console.log('Stabilized after parent change');
            }
        }
    }
    
    // Fallback: Force stabilization after a reasonable number of renders (prevents infinite loading)
    // If we've had 5+ renders without parent change and records exist, consider it stable
    if (!stableRef.current.stabilizedAfterParentChange && 
        stableRef.current.rendersSinceParentChange >= 5 &&
        parentId === stableRef.current.lastParentId &&
        joinRecordsWithTimestamp?.records) {
        stableRef.current.stabilizedAfterParentChange = true;
        stableRef.current.lastStableRecords = joinRecordsWithTimestamp.records;
        if (DEBUG_PRINTS) {
            console.log('Force stabilized after 5 renders');
        }
    }
    
    stableRef.current.previousRawRecords = joinRecordsWithTimestamp;
    
    // Relationship mapping with stable data
    const mapper = useMemo(() => {
        const m = new RelationshipMapper(joiningEntity);
        m.setParentEntity(parentEntity);
        m.setUniqueData(stableRef.current.lastStableRecords);
        m.setParentId(parentId);
        return m;
    }, [
        joiningEntity, 
        parentEntity, 
        stableRef.current.lastStableRecords, 
        parentId,
        // Add forceRefresh to dependencies to trigger remapping
        forceRefresh
    ]);
    
    const { rawJoinRecords, rawJoiningMatrxIds, rawJoinIds, rawChildIds, rawChildMatrxIds } = useMemo(
        () => ({
            rawJoinRecords: mapper.getJoinRecords() as EntityDataWithKey<EntityKeys>[],
            rawJoiningMatrxIds: mapper.getJoinMatrxIds(),
            rawJoinIds: mapper.getJoinRecordIds(),
            rawChildIds: mapper.getChildIds(),
            rawChildMatrxIds: mapper.getChildMatrxIds(),
        }),
        [mapper, needsReprocess]
    );
    
    if (DEBUG_PRINTS) {
        console.log('rawChildIds', rawChildIds);
    }
    
    const joinRecords = useDebounce(rawJoinRecords, 200);
    const joiningMatrxIds = useDebounce(rawJoiningMatrxIds, 200);
    const joinIds = useDebounce(rawJoinIds, 200);
    const childMatrxIds = useDebounce(rawChildMatrxIds, 200);
    const childIds = useDebounce(rawChildIds, 200);
    
    if (DEBUG_PRINTS) {
        console.log('childIds with debounce', childIds);
    }
    
    // Single consolidated loading state that respects the initial state and parent changes
    const isJoinLoading = useDebounce(
        parentId ? isParentLoading || isRawJoinLoading || !stableRef.current.stabilizedAfterParentChange : false, 
        100
    );
    
    const childSelectors = childTools.selectors;
    const isChildLoading = useAppSelector(childSelectors.selectIsLoading);
    
    if (DEBUG_PRINTS) {
        console.log('isJoinLoading', isJoinLoading);
        console.log('isChildLoading', isChildLoading);
    }
    
    const shouldProcess = useDebounce(!isJoinLoading && !isChildLoading, 100);
    
    if (DEBUG_PRINTS) {
        console.log('shouldProcess', shouldProcess);
    }
    
    const currentChildRecords = useGetorFetchRecords(
        childEntity, 
        childMatrxIds, 
        shouldProcess
    ) as EntityDataWithKey<EntityKeys>[];
    
    if (DEBUG_PRINTS) {
        console.log('currentChildRecords', currentChildRecords);
    }
    
    const unprocessedChildRecords = useDebounce(currentChildRecords, 200);
    
    if (DEBUG_PRINTS) {
        console.log('unprocessedChildRecords', unprocessedChildRecords);
        console.log('needsReprocess', needsReprocess);
    }
    
    const triggerProcessing = useCallback(() => {
        if (DEBUG_PRINTS) {
            console.log('triggerProcessing called');
        }
        setNeedsReprocess(true);
    }, []);
    
    const childRecords = useMemo(() => {
        if (needsReprocess) {
            if (DEBUG_PRINTS) {
                console.log('Processing due to needsReprocess flag');
            }
            setNeedsReprocess(false);
            return processJoinedData({
                childRecords: currentChildRecords,
                joiningRecords: rawJoinRecords,
                relationshipDefinition: relDefSimple,
                parentMatrxId: parentMatrxid,
            });
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
    }, [
        unprocessedChildRecords, 
        joinRecords, 
        relDefSimple, 
        parentMatrxid, 
        needsReprocess, 
        currentChildRecords, 
        rawJoinRecords,
        // Add forceRefresh to dependencies to trigger reprocessing
        forceRefresh
    ]);
    
    if (DEBUG_PRINTS) {
        console.log('childRecords', childRecords);
    }
    
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
        parentRecord,
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