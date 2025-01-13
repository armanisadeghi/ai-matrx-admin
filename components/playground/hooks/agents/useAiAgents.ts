import { useActiveJoinedRecords } from "@/app/entities/hooks/relationships/useActiveJoinedRecords";
import { RelationshipDefinition, processJoinedData } from "@/app/entities/hooks/relationships/utils";
import { useAppDispatch, GetOrFetchSelectedRecordsPayload } from "@/lib/redux";
import React, { useCallback, useEffect } from "react";

const aiSettingsRelationshipDefinition: RelationshipDefinition = {
    parentEntity: {
        entityKey: 'recipe',
        referenceField: 'id',
    },
    childEntity: {
        entityKey: 'aiSettings',
        referenceField: 'id',
    },
    joiningEntity: {
        entityKey: 'aiAgent',
        parentField: 'recipeId',
        childField: 'aiSettingsId',
        nameField: 'name',           // Assuming aiAgent might have a name field
    },
};

export function useAiAgents() {
    const {
        matchingChildRecords: settings,
        JoiningEntityRecords: agents,
        childMatrxIds: settingsMatrxIds,
        childActions: settingsActions,
    } = useActiveJoinedRecords(aiSettingsRelationshipDefinition);

    // Process settings with joining data from agents
    const processedSettings = React.useMemo(() => {
        return processJoinedData({
            childRecords: settings,
            joiningRecords: agents,
            relationshipDefinition: aiSettingsRelationshipDefinition
        });
    }, [settings, agents]);

    const dispatch = useAppDispatch();

    const fetchSettingsPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: settingsMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [settingsMatrxIds]
    );

    const fetchSettingsForActiveAgent = useCallback(() => {
        if (settingsMatrxIds.length > 0) {
            dispatch(settingsActions.getOrFetchSelectedRecords(fetchSettingsPayload));
        }
    }, [dispatch, settingsActions, settingsMatrxIds, fetchSettingsPayload]);

    useEffect(() => {
        fetchSettingsForActiveAgent();
    }, [fetchSettingsForActiveAgent]);

    return {
        aiAgentRecords: agents,
        AiSettingsRecords: processedSettings,
        settingsMatrxIds,
    };
}