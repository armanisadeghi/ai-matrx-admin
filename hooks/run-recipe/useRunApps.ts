import { useMemo } from "react";
import { useEntityData } from "@/lib/redux/entity/hooks/coreHooks";
import { useGetOrFetchRecord, useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { BrokerWithComponentsMap, CompiledRecipeEntry, CompiledRecipeRecordWithKey } from "./types";
import { createEntitySelectors, useAppSelector } from "@/lib/redux";
import { useDebounce } from "@uidotdev/usehooks";
import { AppletRecordWithKey, DataInputComponentRecordWithKey } from "@/types";
import { UsePrepareRecipeToRunReturn } from "./usePrepareRecipeToRun";
export function useRunApps(appletId: string) {
    const { actions, selectors } = useEntityData("applet");
    const dataInputSelectors = useMemo(() => createEntitySelectors("dataInputComponent"), []);
    const compiledRecipeSelectors = useMemo(() => createEntitySelectors("compiledRecipe"), []);
    const recipeSelectors = useMemo(() => createEntitySelectors("recipe"), []);

    const appletRecord = useGetOrFetchRecord({ entityName: "applet", simpleId: appletId }) as AppletRecordWithKey;
    const appletType = appletRecord?.type;

    const compiledId = appletRecord?.compiledRecipeId;
    const activeCompiledRecipeRecord = useGetOrFetchRecord({
        entityName: "compiledRecipe",
        simpleId: compiledId,
    }) as CompiledRecipeRecordWithKey;
    const recipeId = activeCompiledRecipeRecord?.recipeId;

    const dataInputComponentsLoading = useAppSelector((state) => dataInputSelectors.selectIsLoading(state));
    const recipeLoading = useAppSelector((state) => recipeSelectors.selectIsLoading(state));
    const compiledRecipeLoading = useAppSelector((state) => compiledRecipeSelectors.selectIsLoading(state));
    const isReduxLoading = useDebounce(dataInputComponentsLoading || recipeLoading || compiledRecipeLoading, 400);

    const compiledRecipe = activeCompiledRecipeRecord?.compiledRecipe as CompiledRecipeEntry;

    console.log("compiledRecipe", compiledRecipe);

    const neededBrokers = useMemo(() => compiledRecipe?.brokers ?? [], [compiledRecipe?.brokers]);

    const { uniqueComponentIds, uniqueComponentRecordKeys } = useMemo(() => {
        return {
            uniqueComponentIds: [...new Set(neededBrokers.map((broker) => broker.inputComponent))],
            uniqueComponentRecordKeys: [...new Set(neededBrokers.map((broker) => `id:${broker.inputComponent}`))],
        };
    }, [neededBrokers]);

    const componentMetadata = useGetorFetchRecords("dataInputComponent", uniqueComponentRecordKeys) as DataInputComponentRecordWithKey[];

    const stableComponentMetadata = useDebounce(componentMetadata, 300);

    const hasAllInputComponents = useMemo(() => {
        if (isReduxLoading || !neededBrokers || !stableComponentMetadata) return false;
        return uniqueComponentIds.every(
            (componentId) => componentId && stableComponentMetadata.some((metadata) => metadata.id === componentId)
        );
    }, [uniqueComponentIds, stableComponentMetadata, isReduxLoading]);

    const brokerComponentMetadataMap = useMemo(() => {
        if (!hasAllInputComponents || !neededBrokers) {
            return null;
        }

        const map: BrokerWithComponentsMap = {};

        neededBrokers.forEach((broker) => {
            if (broker?.id) {
                const componentData = stableComponentMetadata.find((metadata) => metadata.id === broker.inputComponent);

                if (componentData) {
                    map[broker.id] = {
                        brokerId: broker.id,
                        brokerName: broker.name,
                        brokerRecordKey: `id:${broker.id}`,
                        componentRecordKey: `id:${broker.inputComponent}`,
                        componentMetadata: componentData,
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
    };
}

export type UseRunAppsReturn = ReturnType<typeof useRunApps>;

export type RunGenericHookType = UseRunAppsReturn | UsePrepareRecipeToRunReturn;
