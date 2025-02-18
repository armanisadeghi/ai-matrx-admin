import { useEffect, useMemo, useState } from "react";
import { useGetOrFetchRecord, useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { BrokerWithComponentsMap, DataBrokerData, CompiledRecipeEntry, CompiledRecipeRecordWithKey } from "./types";
import { createEntitySelectors, useAppSelector } from "@/lib/redux";
import { useDebounce } from "@uidotdev/usehooks";
import { AppletRecordWithKey, DataInputComponentRecordWithKey } from "@/types";
import { UsePrepareRecipeToRunReturn } from "./usePrepareRecipeToRun";

export function useAppletRecipe(appletId: string) {
    const compiledRecipeSelectors = useMemo(() => createEntitySelectors("compiledRecipe"), []);
    const appletRecord = useGetOrFetchRecord({ entityName: "applet", simpleId: appletId }) as AppletRecordWithKey;
    const compiledId = appletRecord?.compiledRecipeId;
    const activeCompiledRecipeRecord = useGetOrFetchRecord({
        entityName: "compiledRecipe",
        simpleId: compiledId,
    }) as CompiledRecipeRecordWithKey;

    const recipeId = activeCompiledRecipeRecord?.recipeId;
    const recipeRecordKey = `id:${recipeId}`;

    const appletLoading = useAppSelector((state) => compiledRecipeSelectors.selectIsLoading(state));
    const compiledRecipeLoading = useAppSelector((state) => compiledRecipeSelectors.selectIsLoading(state));
    const isLoading = appletLoading || compiledRecipeLoading;

    const compiledRecipe = activeCompiledRecipeRecord?.compiledRecipe as CompiledRecipeEntry;
    const selectedVersion = activeCompiledRecipeRecord?.version;

    const neededBrokers = useMemo(() => compiledRecipe?.brokers ?? [], [compiledRecipe?.brokers]);

    console.log("compiledRecipe", compiledRecipe);

    return {
        isLoading,
        activeCompiledRecipeRecord,
        compiledRecipe,
        selectedVersion,
        recipeRecordKey,
        neededBrokers,
        appletRecord,
    };
}

type BrokerComponentsProps = {
    neededBrokers: DataBrokerData[];
    isAppletLoading: boolean;
};

export function useBrokerComponents({ neededBrokers, isAppletLoading }: BrokerComponentsProps) {
    const dataInputSelectors = useMemo(() => createEntitySelectors("dataInputComponent"), []);
    const isComponentLoading = useAppSelector((state) => dataInputSelectors.selectIsLoading(state));

    const { uniqueComponentIds, uniqueComponentRecordKeys } = useMemo(() => {
        return {
            uniqueComponentIds: [...new Set(neededBrokers.map(broker => broker.inputComponent))],
            uniqueComponentRecordKeys: [...new Set(neededBrokers.map((broker) => `id:${broker.inputComponent}`))]
        };
    }, [neededBrokers]);
        
    const componentMetadata = useGetorFetchRecords("dataInputComponent", uniqueComponentRecordKeys) as DataInputComponentRecordWithKey[];

    const stableComponentMetadata = useDebounce(componentMetadata, 300);
    
    const hasAllInputComponents = useMemo(() => {
        if (isAppletLoading || !neededBrokers || !stableComponentMetadata) return false;
        return uniqueComponentIds.every(
            componentId => componentId && 
            stableComponentMetadata.some(metadata => metadata.id === componentId)
        );
    }, [uniqueComponentIds, stableComponentMetadata, isAppletLoading]);

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

    const isLoading = useDebounce(isAppletLoading || isComponentLoading, 300);

    return {
        brokerComponentMetadataMap,
        hasAllInputComponents,
        isLoading,
    };
}


export function useRunRecipeApplet(appletId: string) {
    const {
        isLoading: isAppletLoading,
        activeCompiledRecipeRecord,
        compiledRecipe,
        selectedVersion,
        recipeRecordKey,
        neededBrokers,
        appletRecord,
    } = useAppletRecipe(appletId);
    const { brokerComponentMetadataMap, hasAllInputComponents, isLoading } = useBrokerComponents({ neededBrokers, isAppletLoading });

    return {
        brokerComponentMetadataMap,
        hasAllInputComponents,
        isLoading,
        compiledRecipe,
        activeCompiledRecipeRecord,
        selectedVersion,
        recipeRecordKey,
        appletRecord,
    };
}

export type UseRunRecipeAppletReturn = ReturnType<typeof useRunRecipeApplet>;

export type RunGenericHookType = UseRunRecipeAppletReturn | UsePrepareRecipeToRunReturn;
