"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AiSettingsData,
    BrokerValueData,
    DataInputComponentData,
    DataInputComponentRecordWithKey,
    DataOutputComponentData,
    MatrxRecordId,
    MessageBrokerData,
    MessageTemplateDataOptional,
    RecipeRecordWithKey,
} from "@/types";
import { useGetorFetchRecords, useGetOrFetchRecord } from "@/app/entities/hooks/records/useGetOrFetch";
import { createEntitySelectors, useAppSelector } from "@/lib/redux";
import { useDebounce } from "@uidotdev/usehooks";

export type DataBrokerData = {
    id: string;
    name: string;
    dataType?: "str" | "bool" | "dict" | "float" | "int" | "list" | "url";
    outputComponent?: string;
    dataInputComponentReference?: DataInputComponentData[];
    defaultValue?: string;
    inputComponent?: string;
    color?:
        | "blue"
        | "amber"
        | "cyan"
        | "emerald"
        | "fuchsia"
        | "gray"
        | "green"
        | "indigo"
        | "lime"
        | "neutral"
        | "orange"
        | "pink"
        | "purple"
        | "red"
        | "rose"
        | "sky"
        | "slate"
        | "stone"
        | "teal"
        | "violet"
        | "yellow"
        | "zinc";
    dataOutputComponentReference?: DataOutputComponentData[];
    brokerValueInverse?: BrokerValueData[];
    messageBrokerInverse?: MessageBrokerData[];
};

type CompiledRecipeEntry = {
    id: string;
    name: string;
    brokers: DataBrokerData[];
    messages: MessageTemplateDataOptional[];
    settings: AiSettingsData[];
};

type CompiledRecipeRecordWithKey = {
    id: string;
    compiledRecipe: Record<string, unknown>;
    recipeId: string;
    createdAt: Date;
    userId: string;
    isPublic: boolean;
    version: number;
    updatedAt: Date;
    authenticatedRead: boolean;
    matrxRecordId: MatrxRecordId;
};

interface UsePrepareRecipeToRunProps {
    recipeRecordKey: MatrxRecordId;
    version?: "latest" | number;
}

export type BrokerWithComponent = {
    brokerId: string;
    brokerRecordKey: MatrxRecordId;
    brokerName: string;
    componentRecordKey: MatrxRecordId;
    componentMetadata: DataInputComponentData;
};

export type BrokerWithComponentsMap = Record<string, BrokerWithComponent>;

export function usePrepareRecipeToRun({ recipeRecordKey, version = "latest" }: UsePrepareRecipeToRunProps) {
    const initialVersion = version === "latest" ? null : version;
    const [selectedVersion, setSelectedVersion] = useState<number | null>(initialVersion);
    const recipeRecord = useGetOrFetchRecord({ entityName: "recipe", matrxRecordId: recipeRecordKey }) as RecipeRecordWithKey;
    const latestVersion = recipeRecord?.version;
    const recipeId = recipeRecord?.id;

    useEffect(() => {
        if (version === "latest") {
            setSelectedVersion(latestVersion);
        } else {
            setSelectedVersion(version);
        }
    }, [version, latestVersion]);

    const dataInputSelectors = useMemo(() => createEntitySelectors("dataInputComponent"), []);
    const compiledRecipeSelectors = useMemo(() => createEntitySelectors("compiledRecipe"), []);
    const recipeSelectors = useMemo(() => createEntitySelectors("recipe"), []);

    const allCompiledVersions = useAppSelector((state) =>
        compiledRecipeSelectors.selectRecordsByFieldValue(state, "recipeId", recipeId)
    ) as CompiledRecipeRecordWithKey[];

    const activeCompiledRecipeRecord = useMemo(
        () => allCompiledVersions.find((record) => record.version === selectedVersion),
        [allCompiledVersions, selectedVersion]
    );

    const dataInputComponentsLoading = useAppSelector((state) => dataInputSelectors.selectIsLoading(state));
    const recipeLoading = useAppSelector((state) => recipeSelectors.selectIsLoading(state));
    const compiledRecipeLoading = useAppSelector((state) => compiledRecipeSelectors.selectIsLoading(state));
    const isReduxLoading = useDebounce(dataInputComponentsLoading || recipeLoading || compiledRecipeLoading, 400);

    const compiledRecipe = activeCompiledRecipeRecord?.compiledRecipe as CompiledRecipeEntry;

    console.log("compiledRecipe", compiledRecipe);
    
    const neededBrokers = useMemo(() => compiledRecipe?.brokers ?? [], [compiledRecipe?.brokers]);

    const { uniqueComponentIds, uniqueComponentRecordKeys } = useMemo(() => {
        return {
            uniqueComponentIds: [...new Set(neededBrokers.map(broker => broker.inputComponent))],
            uniqueComponentRecordKeys: [...new Set(neededBrokers.map((broker) => `id:${broker.inputComponent}`))]
        };
    }, [neededBrokers]);
        
    const componentMetadata = useGetorFetchRecords("dataInputComponent", uniqueComponentRecordKeys) as DataInputComponentRecordWithKey[];

    const stableComponentMetadata = useDebounce(componentMetadata, 300);
    
    const hasAllInputComponents = useMemo(() => {
        if (isReduxLoading || !neededBrokers || !stableComponentMetadata) return false;
        return uniqueComponentIds.every(
            componentId => componentId && 
            stableComponentMetadata.some(metadata => metadata.id === componentId)
        );
    }, [uniqueComponentIds, stableComponentMetadata, isReduxLoading]);

    const brokerComponentMetadataMap = useMemo(() => {
        if (!hasAllInputComponents || !neededBrokers) {
            return null;
        }
    
        const map: BrokerWithComponentsMap = {};
        
        neededBrokers.forEach(broker => {
            if (broker?.id) {
                const componentData = stableComponentMetadata.find(
                    metadata => metadata.id === broker.inputComponent
                );
                
                if (componentData) {
                    map[broker.id] = {
                        brokerId: broker.id,
                        brokerName: broker.name,
                        brokerRecordKey: `id:${broker.id}`,
                        componentRecordKey: `id:${broker.inputComponent}`,
                        componentMetadata: componentData
                    };
                }
            }
        });
    
        return map;
    }, [hasAllInputComponents, neededBrokers, stableComponentMetadata]);


    return {
        brokerComponentMetadataMap,
        hasAllInputComponents,
        isReduxLoading,
        compiledRecipe,
        activeCompiledRecipeRecord,
        selectedVersion,
        recipeRecordKey,
    };
}

export type UsePrepareRecipeToRunReturn = ReturnType<typeof usePrepareRecipeToRun>;
