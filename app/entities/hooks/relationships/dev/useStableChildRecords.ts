import { useAppSelector } from '@/lib/redux';
import { EntityDataWithKey, EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { useDebounce } from '@uidotdev/usehooks';
import { useGetorFetchRecords } from '../../records/useGetOrFetch';
import { useStableJoinRecords } from './useStableJoinRecords';
import { SimpleRelDef } from '../definitionConversionUtil';
import { useRef } from 'react';
import { isEqual } from 'lodash';

export const useStableChildRecords = (relDefSimple: SimpleRelDef, anyParentId: MatrxRecordId | string | number) => {
    const {
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

        // Loading state
        isLoading: isJoinLoading,
    } = useStableJoinRecords(relDefSimple, anyParentId);

    const childSelectors = childTools.selectors;
    const isChildLoading = useAppSelector(childSelectors.selectIsLoading);

    // Keep track of stable child records
    const stableRef = useRef({
        lastStableRecords: [] as EntityDataWithKey<EntityKeys>[],
        lastStableIds: null as string[] | null,
    });

    const shouldProcess = !isJoinLoading && !isChildLoading && childMatrxIds && !isEqual(childMatrxIds, stableRef.current.lastStableIds)

    console.log('===============>>> Should process:', shouldProcess);
    // Get current records
    const currentChildRecords = useGetorFetchRecords(childEntity, childMatrxIds, shouldProcess) as EntityDataWithKey<EntityKeys>[];

    // Update stable records only when loading is complete and IDs match current data
    const isCurrentlyLoading = isJoinLoading || isChildLoading;
    if (!isCurrentlyLoading && childMatrxIds && isEqual(childMatrxIds, stableRef.current.lastStableIds)) {
        stableRef.current.lastStableRecords = currentChildRecords;
        stableRef.current.lastStableIds = childMatrxIds;
    }

    // Use stable records or empty array if we're still loading
    const rawChildRecords = !isCurrentlyLoading ? currentChildRecords : stableRef.current.lastStableRecords;

    const isLoading = useDebounce(isCurrentlyLoading, 200);

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
        childRecords: useDebounce(rawChildRecords, 200),

        // Loading state
        isJoinLoading,
        isLoading,
    };
};
