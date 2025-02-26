import {
    useDataBrokersWithFetch,
    useBrokerValuesWithFetch,
    useDataInputComponentsWithFetch,
    useCompiledRecipesWithFetch,
    useAppletsWithFetch,
} from "@/lib/redux/entity/hooks/useAllData";
import { useValueBrokersData } from "../applets/useValueBrokers";
import { useEffect, useMemo, useState } from "react";
import { useGetOrFetchRecord, useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { BrokerWithComponentsMap, CompiledRecipeEntry, CompiledRecipeRecordWithKey } from "./types";
import { createEntitySelectors, useAppSelector, useEntityTools } from "@/lib/redux";
import { useDebounce } from "@uidotdev/usehooks";
import { AppletRecordWithKey, BrokerValueRecordWithKey, DataBrokerData, DataInputComponentRecordWithKey } from "@/types";
import { UsePrepareRecipeToRunReturn } from "./usePrepareRecipeToRun";
import { useCompiledToSocket } from "@/lib/redux/socket/hooks/useCompiledToSocket";

function useAppletRecipe(appletId: string) {
    const appletHook = useAppletsWithFetch();

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

function useCompiledRecipe(compiledRecipeId: string) {
    const compiledRecipeHook = useCompiledRecipesWithFetch();
    const compiledRecipeMatrxId = useMemo(() => `id:${compiledRecipeId}`, [compiledRecipeId]);

    const {
        compiledRecipeRecords,
        compiledRecipeIsLoading,
        compiledRecipeIsError,
        compiledRecipeQuickRefRecords,
        addCompiledRecipePkValue,
    } = compiledRecipeHook;

    useEffect(() => {
        if (compiledRecipeId) {
            addCompiledRecipePkValue(compiledRecipeId);
        }
    }, [compiledRecipeId, addCompiledRecipePkValue]); // Added function dependency

    // Create a memoized chain of derived values
    const derivedValues = useMemo(() => {
        const matchingCompiledRecipeRecord = compiledRecipeRecords[compiledRecipeMatrxId];
        const compiledRecipe = matchingCompiledRecipeRecord?.compiledRecipe as CompiledRecipeEntry;
        const selectedVersion = matchingCompiledRecipeRecord?.version;
        const recipeId = matchingCompiledRecipeRecord?.recipeId;
        const recipeRecordKey = recipeId ? `id:${recipeId}` : "";
        const neededBrokers = compiledRecipe?.brokers ?? [];
        const neededBrokerIds = neededBrokers.map((broker) => broker.id);
        const neededComponentIds = neededBrokers.map((broker) => broker.inputComponent);

        return {
            matchingCompiledRecipeRecord,
            compiledRecipe,
            selectedVersion,
            recipeId,
            recipeRecordKey,
            neededBrokers,
            neededBrokerIds,
            neededComponentIds,
        };
    }, [compiledRecipeRecords, compiledRecipeMatrxId]);

    return useMemo(
        () => ({
            compiledRecipeRecords,
            compiledRecipeIsLoading,
            compiledRecipeIsError,
            compiledRecipeQuickRefRecords,
            compiledRecipeHook,
            ...derivedValues,
        }),
        [
            compiledRecipeRecords,
            compiledRecipeIsLoading,
            compiledRecipeIsError,
            compiledRecipeQuickRefRecords,
            compiledRecipeHook,
            derivedValues,
        ]
    );
}

function useApplet(appletId: string) {
    const appletHook = useAppletsWithFetch();
    const appletMatrxId = useMemo(() => `id:${appletId}`, [appletId]);

    const { appletRecords, appletIsLoading, appletIsError, appletQuickRefRecords, addAppletPkValue } = appletHook;

    useEffect(() => {
        if (appletId) {
            addAppletPkValue(appletId);
        }
    }, [appletId, addAppletPkValue]); // Added function dependency

    const matchingAppletRecord = useMemo(() => appletRecords[appletMatrxId], [appletRecords, appletMatrxId]);

    // Memoize compiledId to make it stable
    const compiledId = useMemo(() => matchingAppletRecord?.compiledRecipeId, [matchingAppletRecord]);

    // Memoize the entire return object
    return useMemo(
        () => ({
            matchingAppletRecord,
            compiledId,
            appletMatrxId,
            appletRecords,
            appletIsLoading,
            appletIsError,
            appletQuickRefRecords,
            appletHook,
        }),
        [matchingAppletRecord, compiledId, appletMatrxId, appletRecords, appletIsLoading, appletIsError, appletQuickRefRecords, appletHook]
    );
}

type BrokerComponentsProps = {
    neededBrokers: DataBrokerData[];
    neededComponentIds: string[];
    appletIsLoading: boolean;
};

function useBrokerComponents({ neededBrokers, neededComponentIds, appletIsLoading }: BrokerComponentsProps) {
    const dataInputComponentHook = useDataInputComponentsWithFetch();

    const { dataInputComponentRecords, dataInputComponentIsLoading, addDataInputComponentPkValue } = dataInputComponentHook;

    useEffect(() => {
        if (neededComponentIds) {
            neededComponentIds.forEach((componentId) => {
                addDataInputComponentPkValue(componentId);
            });
        }
    }, [neededComponentIds, addDataInputComponentPkValue]);

    const brokerComponentMetadataMap = useMemo(() => {
        if (!dataInputComponentIsLoading || appletIsLoading || !neededBrokers) {
            return null;
        }

        const map: BrokerWithComponentsMap = {};

        neededBrokers.forEach((broker) => {
            if (broker?.id) {
                const componentKey = `id:${broker.inputComponent}`;
                const componentData = dataInputComponentRecords[componentKey];

                if (componentData) {
                    map[broker.id] = {
                        brokerId: broker.id,
                        brokerName: broker.name,
                        brokerDataType: broker.dataType,
                        brokerDefaultValue: broker.defaultValue,
                        brokerRecordKey: `id:${broker.id}`,
                        componentRecordKey: componentKey,
                        componentMetadata: componentData,
                    };
                }
            }
        });

        return map;
    }, [dataInputComponentRecords, dataInputComponentIsLoading, appletIsLoading, neededBrokers]);

    const componentsLoading = useDebounce(dataInputComponentIsLoading || appletIsLoading, 300);

    const result = useMemo(
        () => ({
            brokerComponentMetadataMap,
            componentsLoading,
            dataInputComponentHook,
        }),
        [brokerComponentMetadataMap, componentsLoading, dataInputComponentHook]
    );

    return result;
}

export function useRunRecipeAppletNew(appletId: string) {
    const appletHook = useApplet(appletId);
    const { compiledId, appletIsLoading } = appletHook;
    const compiledRecipeHook = useCompiledRecipe(compiledId);
    const { neededBrokerIds, neededComponentIds, neededBrokers, compiledRecipe } = compiledRecipeHook;
    const brokerComponentsHook = useBrokerComponents({ neededBrokers, neededComponentIds, appletIsLoading });
    const { brokerComponentMetadataMap, componentsLoading, dataInputComponentHook } = brokerComponentsHook;
    const dataBrokerHook = useDataBrokersWithFetch();
    const { addDataBrokerPkValue } = dataBrokerHook;

    useEffect(() => {
        if (neededBrokerIds) {
            neededBrokerIds.forEach((brokerId) => {
                addDataBrokerPkValue(brokerId);
            });
        }
    }, [neededBrokerIds, addDataBrokerPkValue]);

    const stableReturn = useMemo(
        () => ({
            brokerComponentMetadataMap,
            componentsLoading,
            compiledRecipe,
            appletHook,
            compiledRecipeHook,
            brokerComponentsHook,
            dataBrokerHook,
            neededBrokerIds,
            dataInputComponentHook,
        }),
        [
            brokerComponentMetadataMap,
            componentsLoading,
            compiledRecipe,
            appletHook,
            compiledRecipeHook,
            brokerComponentsHook,
            dataBrokerHook,
            neededBrokerIds,
            dataInputComponentHook,
        ]
    );

    return stableReturn;
}

interface UseAppletValuesProps {
    dataBrokerHook: ReturnType<typeof useDataBrokersWithFetch>;
    neededBrokerIds: string[];
}

export function useAppletValues({ dataBrokerHook, neededBrokerIds }: UseAppletValuesProps) {
    const brokerValueHook = useBrokerValuesWithFetch();

    const valueBrokerHook = useValueBrokersData({
        dataBrokerHook,
        brokerValueHook,
    });

    const { createBrokerValue, isReady, setValue } = valueBrokerHook;

    useEffect(() => {
        if (isReady) {
            neededBrokerIds.forEach((brokerId) => {
                createBrokerValue(brokerId);
            });
        }
    }, [isReady]);
    
    return {
        brokerValueHook,
        isReady,
        setValue,
    };
}



export function useAppletStream(appletId: string) {
    const runRecipeHook = useRunRecipeAppletNew(appletId);
    const { compiledRecipe, dataBrokerHook, neededBrokerIds } = runRecipeHook;

    const appletValuesHook = useAppletValues({ dataBrokerHook, neededBrokerIds });

    const { streamingResponses, responseRef, handleSend, handleClear, isResponseActive } = useCompiledToSocket({ compiledRecipe });

    return {
        streamingResponses,
        responseRef,
        handleSend,
        handleClear,
        isResponseActive,
        appletValuesHook,
        runRecipeHook,
    };
}



// New and incomplete code that has never been tested, but the concept is to use it for recipe calls from data, instead of the UI.
// But it might be pointless because we can probably do it much more directly.

export function useRecipeWithoutComponents(compiledRecipeId: string) {
    const compiledRecipeHook = useCompiledRecipe(compiledRecipeId);
    const { neededBrokerIds, compiledRecipe } = compiledRecipeHook;
    const dataBrokerHook = useDataBrokersWithFetch();
    const { addDataBrokerPkValue } = dataBrokerHook;

    useEffect(() => {
        if (neededBrokerIds) {
            neededBrokerIds.forEach((brokerId) => {
                addDataBrokerPkValue(brokerId);
            });
        }
    }, [neededBrokerIds, addDataBrokerPkValue]);

    const stableReturn = useMemo(
        () => ({
            compiledRecipe,
            compiledRecipeHook,
            dataBrokerHook,
            neededBrokerIds,
        }),
        [
            compiledRecipe,
            compiledRecipeHook,
            dataBrokerHook,
            neededBrokerIds,
        ]
    );

    return stableReturn;
}

// see comments above

export function useRecipeWithoutComponentsStream(compiledRecipeId: string) {
    const runRecipeHook = useRecipeWithoutComponents(compiledRecipeId);
    const { compiledRecipe, dataBrokerHook, neededBrokerIds } = runRecipeHook;

    const appletValuesHook = useAppletValues({ dataBrokerHook, neededBrokerIds });

    const { streamingResponses, responseRef, handleSend, handleClear, isResponseActive } = useCompiledToSocket({ compiledRecipe });

    return {
        streamingResponses,
        responseRef,
        handleSend,
        handleClear,
        isResponseActive,
        appletValuesHook,
        runRecipeHook,
    };
}
