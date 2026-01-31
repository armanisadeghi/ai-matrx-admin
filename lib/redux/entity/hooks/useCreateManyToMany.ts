import { useCallback, useEffect, useMemo } from "react";
import { useEntityFetch } from "./useEntityFetch";
import { useDirectCreateRecord } from "@/app/entities/hooks/crud/useDirectCreateRecord";
import { RelationshipDefinition } from "@/types/relationshipTypes";
import { useDeleteRecord } from "@/app/entities/hooks/crud/useDeleteRecord";
import { EntityKeys, MatrxRecordId } from "@/types/entityTypes";

export const useCreateManyToMany = (
    relationshipDefinition: RelationshipDefinition,
    options: { onSuccess?: (recordId: string) => void } = {}
) => {
    const parentEntity = relationshipDefinition.entityOne;
    const joiningEntity = relationshipDefinition.joiningTable;
    const childEntity = relationshipDefinition.entityTwo;

    const {
        fetchAll: fetchAllParent,
        allFetchedRecords: allParentRecords,
        allFetchedRecordsArray: allParentRecordsArray,
    } = useEntityFetch(parentEntity as EntityKeys);

    const {
        fetchAll: fetchAllChild,
        allFetchedRecords: allChildRecords,
        allFetchedRecordsArray: allChildRecordsArray,
    } = useEntityFetch(childEntity as EntityKeys);

    const {
        fetchAll: fetchAllJoin,
        allFetchedRecords: allJoinRecords,
        allFetchedRecordsArray: allJoinRecordsArray,
    } = useEntityFetch(joiningEntity as EntityKeys);

    useEffect(() => {
        fetchAllParent();
        fetchAllChild();
        fetchAllJoin();
    }, [fetchAllParent, fetchAllChild, fetchAllJoin]);

    const createRecord = useDirectCreateRecord({
        entityKey: joiningEntity as EntityKeys,
        onSuccess: options.onSuccess,
        onError: () => {},
        showToast: true,
    });

    const { deleteRecord } = useDeleteRecord(joiningEntity as EntityKeys);

    const createManyToMany = useCallback(
        (parentRefValue: string, childRefValue: string, additionalData?: Record<string, any>) => {
            const createRecordPayload = {
                data: {
                    [relationshipDefinition.ReferenceFieldOne]: parentRefValue,
                    [relationshipDefinition.ReferenceFieldTwo]: childRefValue,
                    ...additionalData,
                },
            };

            return createRecord(createRecordPayload);
        },
        [createRecord, relationshipDefinition]
    );


    const getGroupedChildrenByParent = useMemo(() => {
        const groupedChildren = new Map<string, string[]>();
        const unassociatedChildren = new Set<string>();

        const parentLookup = new Map<string, string>();
        allParentRecordsArray.forEach((parent) => {
            const parentRefValue = parent[relationshipDefinition.entityOneField];
            if (parentRefValue) {
                parentLookup.set(parentRefValue, parentRefValue);
                groupedChildren.set(parentRefValue, []);
            }
        });

        allJoinRecordsArray.forEach((join) => {
            const parentRefValue = join[relationshipDefinition.ReferenceFieldOne];
            const childRefValue = join[relationshipDefinition.ReferenceFieldTwo];

            if (!parentRefValue || !childRefValue) return;

            if (parentLookup.has(parentRefValue)) {
                const children = groupedChildren.get(parentRefValue)!;
                if (!children.includes(childRefValue)) {
                    children.push(childRefValue);
                }
            } else {
                unassociatedChildren.add(childRefValue);
            }
        });

        return {
            groupedChildren: Object.fromEntries(groupedChildren),
            unassociatedChildren: Array.from(unassociatedChildren),
        };
    }, [
        allParentRecordsArray,
        allJoinRecordsArray,
        relationshipDefinition.entityOneField,
        relationshipDefinition.ReferenceFieldOne,
        relationshipDefinition.ReferenceFieldTwo,
    ]);

    const deleteManyToMany = useCallback(
        (parentRefValue: string, childRefValue: string) => {

            const joinRecord = allJoinRecordsArray.find(
                (join) => join[relationshipDefinition.ReferenceFieldOne] === parentRefValue && join[relationshipDefinition.ReferenceFieldTwo] === childRefValue
            );

            if (joinRecord) {
                deleteRecord(joinRecord.matrxRecordId);
            }
        },
        [deleteRecord, allJoinRecordsArray, relationshipDefinition]
    );

    return {
        allParentRecords,
        allChildRecords,
        allJoinRecords,
        allParentRecordsArray,
        allChildRecordsArray,
        allJoinRecordsArray,
        createManyToMany,
        deleteManyToMany,
        getGroupedChildrenByParent,
    };
};

export type UseCreateManyToManyReturn = ReturnType<typeof useCreateManyToMany>;
