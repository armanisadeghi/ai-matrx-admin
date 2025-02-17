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
    const isLoading = useDebounce(appletLoading || compiledRecipeLoading, 400);

    const compiledRecipe = activeCompiledRecipeRecord?.compiledRecipe as CompiledRecipeEntry;
    const selectedVersion = activeCompiledRecipeRecord?.version;

    const neededBrokers = useMemo(() => compiledRecipe?.brokers ?? [], [compiledRecipe?.brokers]);

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
    const [shouldFetch, setShouldFetch] = useState(false);
    const dataInputSelectors = useMemo(() => createEntitySelectors("dataInputComponent"), []);
    const isComponentLoading = useAppSelector((state) => dataInputSelectors.selectIsLoading(state));

    useEffect(() => {
        if (isAppletLoading) return;
        if (neededBrokers.length > 0) {
            setShouldFetch(true);
        }
    }, [neededBrokers, isAppletLoading]);

    const { uniqueComponentIds, uniqueComponentRecordKeys } = useMemo(() => {
        return {
            uniqueComponentIds: [...new Set(neededBrokers.map((broker) => broker.inputComponent))],
            uniqueComponentRecordKeys: [...new Set(neededBrokers.map((broker) => `id:${broker.inputComponent}`))],
        };
    }, [neededBrokers]);

    const componentMetadata = useGetorFetchRecords(
        "dataInputComponent",
        uniqueComponentRecordKeys,
        shouldFetch
    ) as DataInputComponentRecordWithKey[];

    const rawIsLoading = isComponentLoading || isAppletLoading;

    const stableState = useDebounce(
        {
            isLoading: rawIsLoading,
            componentMetadata,
            uniqueComponentIds,
            neededBrokers,
        },
        200
    );

    const { hasAllInputComponents, brokerComponentMetadataMap } = useMemo(() => {
        const hasAll =
            !stableState.isLoading &&
            stableState.neededBrokers &&
            stableState.componentMetadata &&
            stableState.uniqueComponentIds.every(
                (componentId) => componentId && stableState.componentMetadata.some((metadata) => metadata.id === componentId)
            );

        let metadataMap: BrokerWithComponentsMap | null = null;

        if (hasAll && stableState.neededBrokers) {
            metadataMap = {};
            stableState.neededBrokers.forEach((broker) => {
                if (broker?.id) {
                    const componentData = stableState.componentMetadata.find((metadata) => metadata.id === broker.inputComponent);

                    if (componentData) {
                        metadataMap![broker.id] = {
                            brokerId: broker.id,
                            brokerName: broker.name,
                            brokerRecordKey: `id:${broker.id}`,
                            componentRecordKey: `id:${broker.inputComponent}`,
                            componentMetadata: componentData,
                        };
                    }
                }
            });
        }

        return {
            hasAllInputComponents: hasAll,
            brokerComponentMetadataMap: metadataMap,
        };
    }, [stableState]);

    return {
        brokerComponentMetadataMap,
        hasAllInputComponents,
        isLoading: stableState.isLoading,
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
