import React from "react";
import { useActiveJoinedRecords } from "./useActiveJoinedRecords";
import { RelationshipStatus, RelationshipDefinition, processJoinedData, getOrderedRecords } from "./utils";
import { EntityData, EntityKeys } from "@/types";

type RelatedRecordsResult = {
    parentSelectors: any;
    parentActions: any;
    activeParentRecord: EntityData<EntityKeys>;
    activeParentMatrxId: string;
    JoiningEntityRecords: EntityData<EntityKeys>[];
    joiningMatrxIds: string[];
    joiningSelectors: any;
    joiningActions: any;
    matchingChildRecords: EntityData<EntityKeys>[];
    childMatrxIds: string[];
    childSelectors: any;
    childActions: any;
    relationshipData: any;
};

type ProcessRecordsInput = {
    childRecords: EntityData<EntityKeys>[];
    joiningRecords: EntityData<EntityKeys>[];
};

type UseProcessedRelatedRecordsOptions = {
    filterStatus?: {
        value: RelationshipStatus | RelationshipStatus[];
        not?: boolean;
    };
    includeOrdered?: boolean;
};

export function useProcessedRelatedRecords(
    relationshipDefinition: RelationshipDefinition,
    records?: ProcessRecordsInput,
    options?: UseProcessedRelatedRecordsOptions
) {
    // If records are not provided, fetch them using useRelatedRecords
    const relatedRecordsResult = useActiveJoinedRecords(relationshipDefinition);
    
    const childRecords = records?.childRecords || relatedRecordsResult.matchingChildRecords;
    const joiningRecords = records?.joiningRecords || relatedRecordsResult.JoiningEntityRecords;

    // Process records with merging and optional filtering
    const processedRecords = React.useMemo(() => {
        return processJoinedData({
            childRecords,
            joiningRecords,
            relationshipDefinition,
            filterStatus: options?.filterStatus
        });
    }, [childRecords, joiningRecords, relationshipDefinition, options?.filterStatus]);

    // Apply ordering if requested
    const orderedRecords = React.useMemo(() => {
        if (!options?.includeOrdered || !relationshipDefinition.joiningEntity.orderPositionField) {
            return null;
        }

        return getOrderedRecords({
            childRecords: processedRecords || childRecords,
            joiningRecords,
            orderField: relationshipDefinition.joiningEntity.orderPositionField,
            childField: relationshipDefinition.joiningEntity.childField
        });
    }, [
        processedRecords,
        childRecords,
        joiningRecords,
        relationshipDefinition,
        options?.includeOrdered
    ]);

    return {
        ...(records ? {} : relatedRecordsResult),
        processedRecords: processedRecords || childRecords,
        ...(orderedRecords && { orderedRecords }),
    };
}