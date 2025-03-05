import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BrokerValueData,
    DataBrokerData,
    EntityData,
    EntityKeys,
    DataInputComponentData,
    DataOutputComponentData,
    RecipeData,
    CompiledRecipeData,
    AllEntityFieldKeys,
    FetchStrategy,
    AppletData,
    AiAgentData,
    AiSettingsData,
    AiModelEndpointData,
    AiEndpointData,
    AiModelData,
} from "@/types";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { RootState } from "@/lib/redux/store";
import {
    EntityMetadata,
    EntityRecordMap,
    MatrxRecordId,
    QuickReferenceState,
    SelectionState,
    LoadingState,
    QuickReferenceRecord,
    EntityStateField,
    EntityFieldRecord,
} from "../types/stateTypes";
import { createEntitySelectors, EntitySelectors } from "../selectors";
import { getEntitySlice } from "../entitySlice";
import { EntityActions } from "../slice";
import { FetchMode } from "../actions";
import { getEntityMetadata } from "../utils/direct-schema";
import { parseRecordKey } from "../utils/stateHelpUtils";
import { createRecordKey } from "../utils/stateHelpUtils";
import { useEntityFetch } from "./useEntityFetch";
interface EntityState<TEntity extends EntityKeys> {
    entityMetadata: EntityMetadata;
    records: EntityRecordMap<EntityKeys>;
    unsavedRecords: Record<MatrxRecordId, Partial<EntityData<TEntity>>>;
    quickReference: QuickReferenceState;
    selection: SelectionState;
    loading: LoadingState;
}

export const useEntityState = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    return useAppSelector((state: RootState) => state.entities[entityKey] as EntityState<TEntity>);
};

export const useDataBrokerState = () => {
    return useAppSelector((state: RootState) => state.entities["dataBroker"] as EntityState<"dataBroker">);
};

export const useEntityRecords = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    return useAppSelector((state: RootState) => state.entities[entityKey].records);
};

export const useEntityUnsavedRecords = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    return useAppSelector((state: RootState) => state.entities[entityKey].unsavedRecords);
};

export const useEntitySelectedRecordIds = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    return useAppSelector((state: RootState) => state.entities[entityKey].selection.selectedRecords);
};

export const useEntityLoadingState = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const loadingState = useAppSelector((state: RootState) => state.entities[entityKey].loading);

    return useMemo(() => ({
        isLoading: loadingState.loading,
        isError: loadingState.error !== null,
    }), [loadingState]);
};

export const useEntityQuickRefRecords = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    return useAppSelector((state: RootState) => state.entities[entityKey].quickReference.records);
};

export const useEntityMetadata = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    return useAppSelector((state: RootState) => state.entities[entityKey].entityMetadata);
};

interface UseEntitySelectorsReturn<TEntity extends EntityKeys> {
    selectors: EntitySelectors<TEntity>;
    actions: EntityActions<TEntity>;
    allRecords: Record<MatrxRecordId, EntityData<TEntity>>;
    unsavedRecords: Record<MatrxRecordId, Partial<EntityData<TEntity>>>;
    selectedRecordIds: MatrxRecordId[];
    isLoading: boolean;
    isError: boolean;
    quickRefRecords: QuickReferenceRecord[];
    metadata: EntityMetadata;
    fields: EntityFieldRecord;
    pkValueToMatrxId: (pkValue: string) => MatrxRecordId;
    pkValuesToMatrxId: (pkValues: Record<string, unknown>) => MatrxRecordId;
    matrxIdToPks: (recordId: MatrxRecordId) => Record<AllEntityFieldKeys, unknown>;
    defaultFetchStrategy: FetchStrategy;
}

export const useEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity): UseEntitySelectorsReturn<TEntity> => {
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const actions = useMemo(() => getEntitySlice(entityKey).actions, [entityKey]);
    const allRecords = useEntityRecords(entityKey);
    const unsavedRecords = useEntityUnsavedRecords(entityKey);
    const selectedRecordIds = useEntitySelectedRecordIds(entityKey);
    const { isLoading, isError } = useEntityLoadingState(entityKey);
    const quickRefRecords = useEntityQuickRefRecords(entityKey);
    const metadata = getEntityMetadata(entityKey);
    if (!metadata) { return null; }
    const fields = metadata.entityFields;
    const pkMeta = metadata?.primaryKeyMetadata;
    const pkType = pkMeta?.type;
    const pkFields = pkMeta?.fields || [];
    const defaultFetchStrategy = metadata?.defaultFetchStrategy;
    const firstPkField = useMemo(() => pkFields[0], [pkFields]);

    const pkValueToMatrxId = useCallback(
        (pkValue: string) => {
            if (pkType === 'composite') {
                console.error('This Entity has a composite primary key. Use pkValuesToMatrxId instead.');
            }
            return createRecordKey(pkMeta, { [firstPkField]: pkValue });
        },
        [pkMeta, pkType, firstPkField]
    );

    const pkValuesToMatrxId = useCallback((pkValues: Record<string, unknown>) => createRecordKey(pkMeta, pkValues), [pkMeta]);

    const matrxIdToPks = useCallback((recordId: MatrxRecordId) => parseRecordKey(recordId) as Record<AllEntityFieldKeys, unknown>, []);

    return useMemo(
        () => ({
            selectors,
            actions,
            allRecords,
            unsavedRecords,
            selectedRecordIds,
            isLoading,
            isError,
            quickRefRecords,
            metadata,
            fields,
            pkValueToMatrxId,
            pkValuesToMatrxId,
            matrxIdToPks,
            defaultFetchStrategy,
        }),
        [allRecords, unsavedRecords, selectedRecordIds, isLoading, isError, quickRefRecords, metadata, fields, pkValueToMatrxId, pkValuesToMatrxId, matrxIdToPks, defaultFetchStrategy]
    );
};

export const useEntityWithFetch = <TEntity extends EntityKeys>(entityName: TEntity) => {
    const dispatch = useAppDispatch();
    const {
        selectors,
        actions,
        allRecords,
        unsavedRecords,
        selectedRecordIds,
        isLoading,
        isError,
        quickRefRecords,
        metadata,
        fields,
        pkValueToMatrxId,
        pkValuesToMatrxId,
        matrxIdToPks,
        defaultFetchStrategy,
    } = useEntitySelectors(entityName);

    const [matrxIdSet, setMatrxIdSet] = useState<Set<MatrxRecordId>>(new Set());
    const [fetchMode, setFetchMode] = useState<FetchMode>('fkIfk');
    const [shouldFetch, setShouldFetch] = useState(false);

    const {
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
    } = useEntityFetch(entityName);

    const isMissingRecords = useMemo(() => {
        const allFetchedIds = Object.keys(allRecords);
        return Array.from(matrxIdSet).some(id => !allFetchedIds.includes(id));
    }, [allRecords, matrxIdSet]);
    
    useEffect(() => {
        if (isMissingRecords && shouldFetch) {
            dispatch(
                actions.getOrFetchSelectedRecords({
                    matrxRecordIds: Array.from(matrxIdSet),
                    fetchMode: fetchMode,
                })
            );
        }
    }, [dispatch, actions, matrxIdSet, shouldFetch, isMissingRecords, fetchMode]);

    const addMatrxId = useCallback((recordId: MatrxRecordId) => {
        setMatrxIdSet(prevSet => {
            const newSet = new Set(prevSet);
            newSet.add(recordId);
            return newSet;
        });
        if (!shouldFetch) {
            setShouldFetch(true);
        }
    }, [shouldFetch]);

    const addMatrxIds = useCallback((recordIds: MatrxRecordId[]) => {
        setMatrxIdSet(prevSet => {
            const newSet = new Set(prevSet);
            recordIds.forEach(id => newSet.add(id));
            return newSet;
        });
        setShouldFetch(true);
    }, []);

    const removeMatrxId = useCallback((recordId: MatrxRecordId) => {
        setMatrxIdSet(prevSet => {
            const newSet = new Set(prevSet);
            newSet.delete(recordId);
            return newSet;
        });
    }, []);

    const removeMatrxIds = useCallback((recordIds: MatrxRecordId[]) => {
        setMatrxIdSet(prevSet => {
            const newSet = new Set(prevSet);
            recordIds.forEach(id => newSet.delete(id));
            return newSet;
        });
    }, []);

    const addPkValue = useCallback((pkValue: string) => {
        const matrxId = pkValueToMatrxId(pkValue);
        setMatrxIdSet(prevSet => {
            const newSet = new Set(prevSet);
            newSet.add(matrxId);
            return newSet;
        });
        setShouldFetch(true);
    }, [pkValueToMatrxId]);

    const addPkValues = useCallback((pkValues: Record<string, unknown>) => {
        const matrxId = pkValuesToMatrxId(pkValues);
        setMatrxIdSet(prevSet => {
            const newSet = new Set(prevSet);
            newSet.add(matrxId);
            return newSet;
        });
        setShouldFetch(true);
    }, [pkValuesToMatrxId]);

    const removePkValue = useCallback((pkValue: string) => {
        const matrxId = pkValueToMatrxId(pkValue);
        setMatrxIdSet(prevSet => {
            const newSet = new Set(prevSet);
            newSet.delete(matrxId);
            return newSet;
        });
    }, [pkValueToMatrxId]);

    const removePkValues = useCallback((pkValues: Record<string, unknown>) => {
        const matrxId = pkValuesToMatrxId(pkValues);
        setMatrxIdSet(prevSet => {
            const newSet = new Set(prevSet);
            newSet.delete(matrxId);
            return newSet;
        });
    }, [pkValuesToMatrxId]);

    return {
        selectors,
        actions,
        allRecords,
        unsavedRecords,
        selectedRecordIds,
        isLoading,
        isError,
        quickRefRecords,
        addMatrxId,
        addMatrxIds,
        removeMatrxId,
        removeMatrxIds,
        addPkValue,
        addPkValues,
        removePkValue,
        removePkValues,
        isMissingRecords,
        setShouldFetch,
        setFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,

    };
};

export type UseEntityWithFetchReturn<TEntity extends EntityKeys> = ReturnType<typeof useEntityWithFetch<TEntity>>;

export type UseBrokerValuesWithFetchReturn = {
    brokerValueSelectors: EntitySelectors<"brokerValue">;
    brokerValueActions: EntityActions<"brokerValue">;
    brokerValueRecords: Record<MatrxRecordId, BrokerValueData>;
    brokerValueUnsavedRecords: Record<MatrxRecordId, Partial<BrokerValueData>>;
    brokerValueSelectedRecordIds: MatrxRecordId[];
    brokerValueIsLoading: boolean;
    brokerValueIsError: boolean;
    brokerValueQuickRefRecords: QuickReferenceRecord[];
    addBrokerValueMatrxId: (recordId: MatrxRecordId) => void;
    addBrokerValueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeBrokerValueMatrxId: (recordId: MatrxRecordId) => void;
    removeBrokerValueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addBrokerValuePkValue: (pkValue: string) => void;
    addBrokerValuePkValues: (pkValues: Record<string, unknown>) => void;
    removeBrokerValuePkValue: (pkValue: string) => void;
    removeBrokerValuePkValues: (pkValues: Record<string, unknown>) => void;
    isBrokerValueMissingRecords: boolean;
    setBrokerValueShouldFetch: (shouldFetch: boolean) => void;
    setBrokerValueFetchMode: (fetchMode: FetchMode) => void;
};


export const useBrokerValuesWithFetch = (): UseBrokerValuesWithFetchReturn => {
    const {
        selectors: brokerValueSelectors,
        actions: brokerValueActions,
        allRecords: brokerValueRecords,
        unsavedRecords: brokerValueUnsavedRecords,
        selectedRecordIds: brokerValueSelectedRecordIds,
        isLoading: brokerValueIsLoading,
        isError: brokerValueIsError,
        quickRefRecords: brokerValueQuickRefRecords,
        addMatrxId: addBrokerValueMatrxId,
        addMatrxIds: addBrokerValueMatrxIds,
        removeMatrxId: removeBrokerValueMatrxId,
        removeMatrxIds: removeBrokerValueMatrxIds,
        addPkValue: addBrokerValuePkValue,
        addPkValues: addBrokerValuePkValues,
        removePkValue: removeBrokerValuePkValue,
        removePkValues: removeBrokerValuePkValues,
        isMissingRecords: isBrokerValueMissingRecords,
        setShouldFetch: setBrokerValueShouldFetch,
        setFetchMode: setBrokerValueFetchMode,
    } = useEntityWithFetch("brokerValue");

    return {
        brokerValueSelectors,
        brokerValueActions,
        brokerValueRecords,
        brokerValueUnsavedRecords,
        brokerValueSelectedRecordIds,
        brokerValueIsLoading,
        brokerValueIsError,
        brokerValueQuickRefRecords,
        addBrokerValueMatrxId,
        addBrokerValueMatrxIds,
        removeBrokerValueMatrxId,
        removeBrokerValueMatrxIds,
        addBrokerValuePkValue,
        addBrokerValuePkValues,
        removeBrokerValuePkValue,
        removeBrokerValuePkValues,
        isBrokerValueMissingRecords,
        setBrokerValueShouldFetch,
        setBrokerValueFetchMode,
    };
};




export type UseDataBrokersWithFetchReturn = {
    dataBrokerSelectors: EntitySelectors<"dataBroker">;
    dataBrokerActions: EntityActions<"dataBroker">;
    dataBrokerRecords: Record<MatrxRecordId, DataBrokerData>;
    dataBrokerUnsavedRecords: Record<MatrxRecordId, Partial<DataBrokerData>>;
    dataBrokerSelectedRecordIds: MatrxRecordId[];
    dataBrokerIsLoading: boolean;
    dataBrokerIsError: boolean;
    dataBrokerQuickRefRecords: QuickReferenceRecord[];
    addDataBrokerMatrxId: (recordId: MatrxRecordId) => void;
    addDataBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeDataBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removeDataBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addDataBrokerPkValue: (pkValue: string) => void;
    addDataBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removeDataBrokerPkValue: (pkValue: string) => void;
    removeDataBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isDataBrokerMissingRecords: boolean;
    setDataBrokerShouldFetch: (shouldFetch: boolean) => void;
    setDataBrokerFetchMode: (fetchMode: FetchMode) => void;
};


export const useDataBrokersWithFetch = (): UseDataBrokersWithFetchReturn => {
    const {
        selectors: dataBrokerSelectors,
        actions: dataBrokerActions,
        allRecords: dataBrokerRecords,
        unsavedRecords: dataBrokerUnsavedRecords,
        selectedRecordIds: dataBrokerSelectedRecordIds,
        isLoading: dataBrokerIsLoading,
        isError: dataBrokerIsError,
        quickRefRecords: dataBrokerQuickRefRecords,
        addMatrxId: addDataBrokerMatrxId,
        addMatrxIds: addDataBrokerMatrxIds,
        removeMatrxId: removeDataBrokerMatrxId,
        removeMatrxIds: removeDataBrokerMatrxIds,
        addPkValue: addDataBrokerPkValue,
        addPkValues: addDataBrokerPkValues,
        removePkValue: removeDataBrokerPkValue,
        removePkValues: removeDataBrokerPkValues,
        isMissingRecords: isDataBrokerMissingRecords,
        setShouldFetch: setDataBrokerShouldFetch,
        setFetchMode: setDataBrokerFetchMode,
    } = useEntityWithFetch("dataBroker");

    return {
        dataBrokerSelectors,
        dataBrokerActions,
        dataBrokerRecords,
        dataBrokerUnsavedRecords,
        dataBrokerSelectedRecordIds,
        dataBrokerIsLoading,
        dataBrokerIsError,
        dataBrokerQuickRefRecords,
        addDataBrokerMatrxId,
        addDataBrokerMatrxIds,
        removeDataBrokerMatrxId,
        removeDataBrokerMatrxIds,
        addDataBrokerPkValue,
        addDataBrokerPkValues,
        removeDataBrokerPkValue,
        removeDataBrokerPkValues,
        isDataBrokerMissingRecords,
        setDataBrokerShouldFetch,
        setDataBrokerFetchMode,
    };
};


export type UseDataInputComponentsWithFetchReturn = {
    dataInputComponentSelectors: EntitySelectors<"dataInputComponent">;
    dataInputComponentActions: EntityActions<"dataInputComponent">;
    dataInputComponentRecords: Record<MatrxRecordId, DataInputComponentData>;
    dataInputComponentUnsavedRecords: Record<MatrxRecordId, Partial<DataInputComponentData>>;
    dataInputComponentSelectedRecordIds: MatrxRecordId[];
    dataInputComponentIsLoading: boolean;
    dataInputComponentIsError: boolean;
    dataInputComponentQuickRefRecords: QuickReferenceRecord[];
    addDataInputComponentMatrxId: (recordId: MatrxRecordId) => void;
    addDataInputComponentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeDataInputComponentMatrxId: (recordId: MatrxRecordId) => void;
    removeDataInputComponentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addDataInputComponentPkValue: (pkValue: string) => void;
    addDataInputComponentPkValues: (pkValues: Record<string, unknown>) => void;
    removeDataInputComponentPkValue: (pkValue: string) => void;
    removeDataInputComponentPkValues: (pkValues: Record<string, unknown>) => void;
    isDataInputComponentMissingRecords: boolean;
    setDataInputComponentShouldFetch: (shouldFetch: boolean) => void;
    setDataInputComponentFetchMode: (fetchMode: FetchMode) => void;
};


export const useDataInputComponentsWithFetch = (): UseDataInputComponentsWithFetchReturn => {
    const {
        selectors: dataInputComponentSelectors,
        actions: dataInputComponentActions,
        allRecords: dataInputComponentRecords,
        unsavedRecords: dataInputComponentUnsavedRecords,
        selectedRecordIds: dataInputComponentSelectedRecordIds,
        isLoading: dataInputComponentIsLoading,
        isError: dataInputComponentIsError,
        quickRefRecords: dataInputComponentQuickRefRecords,
        addMatrxId: addDataInputComponentMatrxId,
        addMatrxIds: addDataInputComponentMatrxIds,
        removeMatrxId: removeDataInputComponentMatrxId,
        removeMatrxIds: removeDataInputComponentMatrxIds,
        addPkValue: addDataInputComponentPkValue,
        addPkValues: addDataInputComponentPkValues,
        removePkValue: removeDataInputComponentPkValue,
        removePkValues: removeDataInputComponentPkValues,
        isMissingRecords: isDataInputComponentMissingRecords,
        setShouldFetch: setDataInputComponentShouldFetch,
        setFetchMode: setDataInputComponentFetchMode,
    } = useEntityWithFetch("dataInputComponent");

    return {
        dataInputComponentSelectors,
        dataInputComponentActions,
        dataInputComponentRecords,
        dataInputComponentUnsavedRecords,
        dataInputComponentSelectedRecordIds,
        dataInputComponentIsLoading,
        dataInputComponentIsError,
        dataInputComponentQuickRefRecords,
        addDataInputComponentMatrxId,
        addDataInputComponentMatrxIds,
        removeDataInputComponentMatrxId,
        removeDataInputComponentMatrxIds,
        addDataInputComponentPkValue,
        addDataInputComponentPkValues,
        removeDataInputComponentPkValue,
        removeDataInputComponentPkValues,
        isDataInputComponentMissingRecords,
        setDataInputComponentShouldFetch,
        setDataInputComponentFetchMode,
    };
};







type UseDataBrokersReturn = {
    brokerSelectors: EntitySelectors<"dataBroker">;
    brokerActions: EntityActions<"dataBroker">;
    brokerRecords: Record<MatrxRecordId, DataBrokerData>;
    brokerUnsavedRecords: Record<MatrxRecordId, Partial<DataBrokerData>>;
    brokerSelectedRecordIds: MatrxRecordId[];
    brokerIsLoading: boolean;
    brokerIsError: boolean;
    brokerQuickRefRecords: QuickReferenceRecord[];
};

export const useDataBrokers = (): UseDataBrokersReturn => {
    const {
        selectors: brokerSelectors,
        actions: brokerActions,
        allRecords: brokerRecords,
        unsavedRecords: brokerUnsavedRecords,
        selectedRecordIds: brokerSelectedRecordIds,
        isLoading: brokerIsLoading,
        isError: brokerIsError,
        quickRefRecords: brokerQuickRefRecords,
    } = useEntitySelectors("dataBroker");
    return {
        brokerSelectors,
        brokerActions,
        brokerRecords,
        brokerUnsavedRecords,
        brokerSelectedRecordIds,
        brokerIsLoading,
        brokerIsError,
        brokerQuickRefRecords,
    };
};



type UseValueBrokersReturn = {
    valueBrokerSelectors: EntitySelectors<"brokerValue">;
    valueBrokerActions: EntityActions<"brokerValue">;
    valueBrokerRecords: Record<MatrxRecordId, BrokerValueData>;
    valueBrokerUnsavedRecords: Record<MatrxRecordId, Partial<BrokerValueData>>;
    valueBrokerSelectedRecordIds: MatrxRecordId[];
    valueBrokerIsLoading: boolean;
    valueBrokerIsError: boolean;
    valueBrokerQuickRefRecords: QuickReferenceRecord[];
};

export const useValueBrokers = (): UseValueBrokersReturn => {
    const {
        selectors: valueBrokerSelectors,
        actions: valueBrokerActions,
        allRecords: valueBrokerRecords,
        unsavedRecords: valueBrokerUnsavedRecords,
        selectedRecordIds: valueBrokerSelectedRecordIds,
        isLoading: valueBrokerIsLoading,
        isError: valueBrokerIsError,
        quickRefRecords: valueBrokerQuickRefRecords,
    } = useEntitySelectors("brokerValue");
    return {
        valueBrokerSelectors,
        valueBrokerActions,
        valueBrokerRecords,
        valueBrokerUnsavedRecords,
        valueBrokerSelectedRecordIds,
        valueBrokerIsLoading,
        valueBrokerIsError,
        valueBrokerQuickRefRecords,
    };
};

type UseInputComponentsReturn = {
    inputComponentSelectors: EntitySelectors<"dataInputComponent">;
    inputComponentActions: EntityActions<"dataInputComponent">;
    inputComponentRecords: Record<MatrxRecordId, DataInputComponentData>;
    inputComponentUnsavedRecords: Record<MatrxRecordId, Partial<DataInputComponentData>>;
    inputComponentSelectedRecordIds: MatrxRecordId[];
    inputComponentIsLoading: boolean;
    inputComponentIsError: boolean;
    inputComponentQuickRefRecords: QuickReferenceRecord[];
};

export const useInputComponents = (): UseInputComponentsReturn => {
    const {
        selectors: inputComponentSelectors,
        actions: inputComponentActions,
        allRecords: inputComponentRecords,
        unsavedRecords: inputComponentUnsavedRecords,
        selectedRecordIds: inputComponentSelectedRecordIds,
        isLoading: inputComponentIsLoading,
        isError: inputComponentIsError,
        quickRefRecords: inputComponentQuickRefRecords,
    } = useEntitySelectors("dataInputComponent");
    return {
        inputComponentSelectors,
        inputComponentActions,
        inputComponentRecords,
        inputComponentUnsavedRecords,
        inputComponentSelectedRecordIds,
        inputComponentIsLoading,
        inputComponentIsError,
        inputComponentQuickRefRecords,
    };
};

type UseOutputComponentsReturn = {
    outputComponentSelectors: EntitySelectors<"dataOutputComponent">;
    outputComponentActions: EntityActions<"dataOutputComponent">;
    outputComponentRecords: Record<MatrxRecordId, DataOutputComponentData>;
    outputComponentUnsavedRecords: Record<MatrxRecordId, Partial<DataOutputComponentData>>;
    outputComponentSelectedRecordIds: MatrxRecordId[];
    outputComponentIsLoading: boolean;
    outputComponentIsError: boolean;
    outputComponentQuickRefRecords: QuickReferenceRecord[];
};

export const useOutputComponents = (): UseOutputComponentsReturn => {
    const {
        selectors: outputComponentSelectors,
        actions: outputComponentActions,
        allRecords: outputComponentRecords,
        unsavedRecords: outputComponentUnsavedRecords,
        selectedRecordIds: outputComponentSelectedRecordIds,
        isLoading: outputComponentIsLoading,
        isError: outputComponentIsError,
        quickRefRecords: outputComponentQuickRefRecords,
    } = useEntitySelectors("dataOutputComponent");
    return {
        outputComponentSelectors,
        outputComponentActions,
        outputComponentRecords,
        outputComponentUnsavedRecords,
        outputComponentSelectedRecordIds,
        outputComponentIsLoading,
        outputComponentIsError,
        outputComponentQuickRefRecords,
    };
};

type UseRecipesReturn = {
    recipeSelectors: EntitySelectors<"recipe">;
    recipeActions: EntityActions<"recipe">;
    recipeRecords: Record<MatrxRecordId, RecipeData>;
    recipeUnsavedRecords: Record<MatrxRecordId, Partial<RecipeData>>;
    recipeSelectedRecordIds: MatrxRecordId[];
    recipeIsLoading: boolean;
    recipeIsError: boolean;
    recipeQuickRefRecords: QuickReferenceRecord[];
};

export const useRecipes = (): UseRecipesReturn => {
    const {
        selectors: recipeSelectors,
        actions: recipeActions,
        allRecords: recipeRecords,
        unsavedRecords: recipeUnsavedRecords,
        selectedRecordIds: recipeSelectedRecordIds,
        isLoading: recipeIsLoading,
        isError: recipeIsError,
        quickRefRecords: recipeQuickRefRecords,
    } = useEntitySelectors("recipe");
    return {
        recipeSelectors,
        recipeActions,
        recipeRecords,
        recipeUnsavedRecords,
        recipeSelectedRecordIds,
        recipeIsLoading,
        recipeIsError,
        recipeQuickRefRecords,
    };
};

type UseCompiledRecipesReturn = {
    compiledRecipeSelectors: EntitySelectors<"compiledRecipe">;
    compiledRecipeActions: EntityActions<"compiledRecipe">;
    compiledRecipeRecords: Record<MatrxRecordId, CompiledRecipeData>;
    compiledRecipeUnsavedRecords: Record<MatrxRecordId, Partial<CompiledRecipeData>>;
    compiledRecipeSelectedRecordIds: MatrxRecordId[];
    compiledRecipeIsLoading: boolean;
    compiledRecipeIsError: boolean;
    compiledRecipeQuickRefRecords: QuickReferenceRecord[];
};

export const useCompiledRecipes = (): UseCompiledRecipesReturn => {
    const {
        selectors: compiledRecipeSelectors,
        actions: compiledRecipeActions,
        allRecords: compiledRecipeRecords,
        unsavedRecords: compiledRecipeUnsavedRecords,
        selectedRecordIds: compiledRecipeSelectedRecordIds,
        isLoading: compiledRecipeIsLoading,
        isError: compiledRecipeIsError,
        quickRefRecords: compiledRecipeQuickRefRecords,
    } = useEntitySelectors("compiledRecipe");
    return {
        compiledRecipeSelectors,
        compiledRecipeActions,
        compiledRecipeRecords,
        compiledRecipeUnsavedRecords,
        compiledRecipeSelectedRecordIds,
        compiledRecipeIsLoading,
        compiledRecipeIsError,
        compiledRecipeQuickRefRecords,
    };
};


type UseAppletsWithFetchReturn = {
    appletSelectors: EntitySelectors<"applet">;
    appletActions: EntityActions<"applet">;
    appletRecords: Record<MatrxRecordId, AppletData>;
    appletUnsavedRecords: Record<MatrxRecordId, Partial<AppletData>>;
    appletSelectedRecordIds: MatrxRecordId[];
    appletIsLoading: boolean;
    appletIsError: boolean;
    appletQuickRefRecords: QuickReferenceRecord[];
    addAppletMatrxId: (recordId: MatrxRecordId) => void;
    addAppletMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAppletMatrxId: (recordId: MatrxRecordId) => void;
    removeAppletMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAppletPkValue: (pkValue: string) => void;
    addAppletPkValues: (pkValues: Record<string, unknown>) => void;
    removeAppletPkValue: (pkValue: string) => void;
    removeAppletPkValues: (pkValues: Record<string, unknown>) => void;
    isAppletMissingRecords: boolean;
    setAppletShouldFetch: (shouldFetch: boolean) => void;
    setAppletFetchMode: (fetchMode: FetchMode) => void;
};


export const useAppletsWithFetch = (): UseAppletsWithFetchReturn => {
    const {
        selectors: appletSelectors,
        actions: appletActions,
        allRecords: appletRecords,
        unsavedRecords: appletUnsavedRecords,
        selectedRecordIds: appletSelectedRecordIds,
        isLoading: appletIsLoading,
        isError: appletIsError,
        quickRefRecords: appletQuickRefRecords,
        addMatrxId: addAppletMatrxId,
        addMatrxIds: addAppletMatrxIds,
        removeMatrxId: removeAppletMatrxId,
        removeMatrxIds: removeAppletMatrxIds,
        addPkValue: addAppletPkValue,
        addPkValues: addAppletPkValues,
        removePkValue: removeAppletPkValue,
        removePkValues: removeAppletPkValues,
        isMissingRecords: isAppletMissingRecords,
        setShouldFetch: setAppletShouldFetch,
        setFetchMode: setAppletFetchMode,
    } = useEntityWithFetch("applet");

    return {
        appletSelectors,
        appletActions,
        appletRecords,
        appletUnsavedRecords,
        appletSelectedRecordIds,
        appletIsLoading,
        appletIsError,
        appletQuickRefRecords,
        addAppletMatrxId,
        addAppletMatrxIds,
        removeAppletMatrxId,
        removeAppletMatrxIds,
        addAppletPkValue,
        addAppletPkValues,
        removeAppletPkValue,
        removeAppletPkValues,
        isAppletMissingRecords,
        setAppletShouldFetch,
        setAppletFetchMode,
    };
};

type UseCompiledRecipesWithFetchReturn = {
    compiledRecipeSelectors: EntitySelectors<"compiledRecipe">;
    compiledRecipeActions: EntityActions<"compiledRecipe">;
    compiledRecipeRecords: Record<MatrxRecordId, CompiledRecipeData>;
    compiledRecipeUnsavedRecords: Record<MatrxRecordId, Partial<CompiledRecipeData>>;
    compiledRecipeSelectedRecordIds: MatrxRecordId[];
    compiledRecipeIsLoading: boolean;
    compiledRecipeIsError: boolean;
    compiledRecipeQuickRefRecords: QuickReferenceRecord[];
    addCompiledRecipeMatrxId: (recordId: MatrxRecordId) => void;
    addCompiledRecipeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeCompiledRecipeMatrxId: (recordId: MatrxRecordId) => void;
    removeCompiledRecipeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addCompiledRecipePkValue: (pkValue: string) => void;
    addCompiledRecipePkValues: (pkValues: Record<string, unknown>) => void;
    removeCompiledRecipePkValue: (pkValue: string) => void;
    removeCompiledRecipePkValues: (pkValues: Record<string, unknown>) => void;
    isCompiledRecipeMissingRecords: boolean;
    setCompiledRecipeShouldFetch: (shouldFetch: boolean) => void;
    setCompiledRecipeFetchMode: (fetchMode: FetchMode) => void;
};


export const useCompiledRecipesWithFetch = (): UseCompiledRecipesWithFetchReturn => {
    const {
        selectors: compiledRecipeSelectors,
        actions: compiledRecipeActions,
        allRecords: compiledRecipeRecords,
        unsavedRecords: compiledRecipeUnsavedRecords,
        selectedRecordIds: compiledRecipeSelectedRecordIds,
        isLoading: compiledRecipeIsLoading,
        isError: compiledRecipeIsError,
        quickRefRecords: compiledRecipeQuickRefRecords,
        addMatrxId: addCompiledRecipeMatrxId,
        addMatrxIds: addCompiledRecipeMatrxIds,
        removeMatrxId: removeCompiledRecipeMatrxId,
        removeMatrxIds: removeCompiledRecipeMatrxIds,
        addPkValue: addCompiledRecipePkValue,
        addPkValues: addCompiledRecipePkValues,
        removePkValue: removeCompiledRecipePkValue,
        removePkValues: removeCompiledRecipePkValues,
        isMissingRecords: isCompiledRecipeMissingRecords,
        setShouldFetch: setCompiledRecipeShouldFetch,
        setFetchMode: setCompiledRecipeFetchMode,
    } = useEntityWithFetch("compiledRecipe");

    return {
        compiledRecipeSelectors,
        compiledRecipeActions,
        compiledRecipeRecords,
        compiledRecipeUnsavedRecords,
        compiledRecipeSelectedRecordIds,
        compiledRecipeIsLoading,
        compiledRecipeIsError,
        compiledRecipeQuickRefRecords,
        addCompiledRecipeMatrxId,
        addCompiledRecipeMatrxIds,
        removeCompiledRecipeMatrxId,
        removeCompiledRecipeMatrxIds,
        addCompiledRecipePkValue,
        addCompiledRecipePkValues,
        removeCompiledRecipePkValue,
        removeCompiledRecipePkValues,
        isCompiledRecipeMissingRecords,
        setCompiledRecipeShouldFetch,
        setCompiledRecipeFetchMode,
    };
};

type UseAiModelWithFetchReturn = {
    aiModelSelectors: EntitySelectors<"aiModel">;
    aiModelActions: EntityActions<"aiModel">;
    aiModelRecords: Record<MatrxRecordId, AiModelData>;
    aiModelUnsavedRecords: Record<MatrxRecordId, Partial<AiModelData>>;
    aiModelSelectedRecordIds: MatrxRecordId[];
    aiModelIsLoading: boolean;
    aiModelIsError: boolean;
    aiModelQuickRefRecords: QuickReferenceRecord[];
    addaiModelMatrxId: (recordId: MatrxRecordId) => void;
    addaiModelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaiModelMatrxId: (recordId: MatrxRecordId) => void;
    removeaiModelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaiModelPkValue: (pkValue: string) => void;
    addaiModelPkValues: (pkValues: Record<string, unknown>) => void;
    removeaiModelPkValue: (pkValue: string) => void;
    removeaiModelPkValues: (pkValues: Record<string, unknown>) => void;
    isaiModelMissingRecords: boolean;
    setaiModelShouldFetch: (shouldFetch: boolean) => void;
    setaiModelFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;

};

export const useAiModelWithFetch = (): UseAiModelWithFetchReturn => {
    const {
        selectors: aiModelSelectors,
        actions: aiModelActions,
        allRecords: aiModelRecords,
        unsavedRecords: aiModelUnsavedRecords,
        selectedRecordIds: aiModelSelectedRecordIds,
        isLoading: aiModelIsLoading,
        isError: aiModelIsError,
        quickRefRecords: aiModelQuickRefRecords,
        addMatrxId: addaiModelMatrxId,
        addMatrxIds: addaiModelMatrxIds,
        removeMatrxId: removeaiModelMatrxId,
        removeMatrxIds: removeaiModelMatrxIds,
        addPkValue: addaiModelPkValue,
        addPkValues: addaiModelPkValues,
        removePkValue: removeaiModelPkValue,
        removePkValues: removeaiModelPkValues,
        isMissingRecords: isaiModelMissingRecords,
        setShouldFetch: setaiModelShouldFetch,
        setFetchMode: setaiModelFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,

    } = useEntityWithFetch("aiModel");

    return {
        aiModelSelectors,
        aiModelActions,
        aiModelRecords,
        aiModelUnsavedRecords,
        aiModelSelectedRecordIds,
        aiModelIsLoading,
        aiModelIsError,
        aiModelQuickRefRecords,
        addaiModelMatrxId,
        addaiModelMatrxIds,
        removeaiModelMatrxId,
        removeaiModelMatrxIds,
        addaiModelPkValue,
        addaiModelPkValues,
        removeaiModelPkValue,
        removeaiModelPkValues,
        isaiModelMissingRecords,
        setaiModelShouldFetch,
        setaiModelFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
    };
};



type UseAiEndpointWithFetchReturn = {
    aiEndpointSelectors: EntitySelectors<"aiEndpoint">;
    aiEndpointActions: EntityActions<"aiEndpoint">;
    aiEndpointRecords: Record<MatrxRecordId, AiEndpointData>;
    aiEndpointUnsavedRecords: Record<MatrxRecordId, Partial<AiEndpointData>>;
    aiEndpointSelectedRecordIds: MatrxRecordId[];
    aiEndpointIsLoading: boolean;
    aiEndpointIsError: boolean;
    aiEndpointQuickRefRecords: QuickReferenceRecord[];
    addaiEndpointMatrxId: (recordId: MatrxRecordId) => void;
    addaiEndpointMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaiEndpointMatrxId: (recordId: MatrxRecordId) => void;
    removeaiEndpointMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaiEndpointPkValue: (pkValue: string) => void;
    addaiEndpointPkValues: (pkValues: Record<string, unknown>) => void;
    removeaiEndpointPkValue: (pkValue: string) => void;
    removeaiEndpointPkValues: (pkValues: Record<string, unknown>) => void;
    isaiEndpointMissingRecords: boolean;
    setaiEndpointShouldFetch: (shouldFetch: boolean) => void;
    setaiEndpointFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;

};

export const useAiEndpointWithFetch = (): UseAiEndpointWithFetchReturn => {
    const {
        selectors: aiEndpointSelectors,
        actions: aiEndpointActions,
        allRecords: aiEndpointRecords,
        unsavedRecords: aiEndpointUnsavedRecords,
        selectedRecordIds: aiEndpointSelectedRecordIds,
        isLoading: aiEndpointIsLoading,
        isError: aiEndpointIsError,
        quickRefRecords: aiEndpointQuickRefRecords,
        addMatrxId: addaiEndpointMatrxId,
        addMatrxIds: addaiEndpointMatrxIds,
        removeMatrxId: removeaiEndpointMatrxId,
        removeMatrxIds: removeaiEndpointMatrxIds,
        addPkValue: addaiEndpointPkValue,
        addPkValues: addaiEndpointPkValues,
        removePkValue: removeaiEndpointPkValue,
        removePkValues: removeaiEndpointPkValues,
        isMissingRecords: isaiEndpointMissingRecords,
        setShouldFetch: setaiEndpointShouldFetch,
        setFetchMode: setaiEndpointFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,

    } = useEntityWithFetch("aiEndpoint");

    return {
        aiEndpointSelectors,
        aiEndpointActions,
        aiEndpointRecords,
        aiEndpointUnsavedRecords,
        aiEndpointSelectedRecordIds,
        aiEndpointIsLoading,
        aiEndpointIsError,
        aiEndpointQuickRefRecords,
        addaiEndpointMatrxId,
        addaiEndpointMatrxIds,
        removeaiEndpointMatrxId,
        removeaiEndpointMatrxIds,
        addaiEndpointPkValue,
        addaiEndpointPkValues,
        removeaiEndpointPkValue,
        removeaiEndpointPkValues,
        isaiEndpointMissingRecords,
        setaiEndpointShouldFetch,
        setaiEndpointFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
    };
};



type UseAiModelEndpointWithFetchReturn = {
    aiModelEndpointSelectors: EntitySelectors<"aiModelEndpoint">;
    aiModelEndpointActions: EntityActions<"aiModelEndpoint">;
    aiModelEndpointRecords: Record<MatrxRecordId, AiModelEndpointData>;
    aiModelEndpointUnsavedRecords: Record<MatrxRecordId, Partial<AiModelEndpointData>>;
    aiModelEndpointSelectedRecordIds: MatrxRecordId[];
    aiModelEndpointIsLoading: boolean;
    aiModelEndpointIsError: boolean;
    aiModelEndpointQuickRefRecords: QuickReferenceRecord[];
    addaiModelEndpointMatrxId: (recordId: MatrxRecordId) => void;
    addaiModelEndpointMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaiModelEndpointMatrxId: (recordId: MatrxRecordId) => void;
    removeaiModelEndpointMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaiModelEndpointPkValue: (pkValue: string) => void;
    addaiModelEndpointPkValues: (pkValues: Record<string, unknown>) => void;
    removeaiModelEndpointPkValue: (pkValue: string) => void;
    removeaiModelEndpointPkValues: (pkValues: Record<string, unknown>) => void;
    isaiModelEndpointMissingRecords: boolean;
    setaiModelEndpointShouldFetch: (shouldFetch: boolean) => void;
    setaiModelEndpointFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;

};

export const useAiModelEndpointWithFetch = (): UseAiModelEndpointWithFetchReturn => {
    const {
        selectors: aiModelEndpointSelectors,
        actions: aiModelEndpointActions,
        allRecords: aiModelEndpointRecords,
        unsavedRecords: aiModelEndpointUnsavedRecords,
        selectedRecordIds: aiModelEndpointSelectedRecordIds,
        isLoading: aiModelEndpointIsLoading,
        isError: aiModelEndpointIsError,
        quickRefRecords: aiModelEndpointQuickRefRecords,
        addMatrxId: addaiModelEndpointMatrxId,
        addMatrxIds: addaiModelEndpointMatrxIds,
        removeMatrxId: removeaiModelEndpointMatrxId,
        removeMatrxIds: removeaiModelEndpointMatrxIds,
        addPkValue: addaiModelEndpointPkValue,
        addPkValues: addaiModelEndpointPkValues,
        removePkValue: removeaiModelEndpointPkValue,
        removePkValues: removeaiModelEndpointPkValues,
        isMissingRecords: isaiModelEndpointMissingRecords,
        setShouldFetch: setaiModelEndpointShouldFetch,
        setFetchMode: setaiModelEndpointFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,

    } = useEntityWithFetch("aiModelEndpoint");

    return {
        aiModelEndpointSelectors,
        aiModelEndpointActions,
        aiModelEndpointRecords,
        aiModelEndpointUnsavedRecords,
        aiModelEndpointSelectedRecordIds,
        aiModelEndpointIsLoading,
        aiModelEndpointIsError,
        aiModelEndpointQuickRefRecords,
        addaiModelEndpointMatrxId,
        addaiModelEndpointMatrxIds,
        removeaiModelEndpointMatrxId,
        removeaiModelEndpointMatrxIds,
        addaiModelEndpointPkValue,
        addaiModelEndpointPkValues,
        removeaiModelEndpointPkValue,
        removeaiModelEndpointPkValues,
        isaiModelEndpointMissingRecords,
        setaiModelEndpointShouldFetch,
        setaiModelEndpointFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
    };
};



type UseAiSettingsWithFetchReturn = {
    aiSettingsSelectors: EntitySelectors<"aiSettings">;
    aiSettingsActions: EntityActions<"aiSettings">;
    aiSettingsRecords: Record<MatrxRecordId, AiSettingsData>;
    aiSettingsUnsavedRecords: Record<MatrxRecordId, Partial<AiSettingsData>>;
    aiSettingsSelectedRecordIds: MatrxRecordId[];
    aiSettingsIsLoading: boolean;
    aiSettingsIsError: boolean;
    aiSettingsQuickRefRecords: QuickReferenceRecord[];
    addaiSettingsMatrxId: (recordId: MatrxRecordId) => void;
    addaiSettingsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaiSettingsMatrxId: (recordId: MatrxRecordId) => void;
    removeaiSettingsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaiSettingsPkValue: (pkValue: string) => void;
    addaiSettingsPkValues: (pkValues: Record<string, unknown>) => void;
    removeaiSettingsPkValue: (pkValue: string) => void;
    removeaiSettingsPkValues: (pkValues: Record<string, unknown>) => void;
    isaiSettingsMissingRecords: boolean;
    setaiSettingsShouldFetch: (shouldFetch: boolean) => void;
    setaiSettingsFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;

};

export const useAiSettingsWithFetch = (): UseAiSettingsWithFetchReturn => {
    const {
        selectors: aiSettingsSelectors,
        actions: aiSettingsActions,
        allRecords: aiSettingsRecords,
        unsavedRecords: aiSettingsUnsavedRecords,
        selectedRecordIds: aiSettingsSelectedRecordIds,
        isLoading: aiSettingsIsLoading,
        isError: aiSettingsIsError,
        quickRefRecords: aiSettingsQuickRefRecords,
        addMatrxId: addaiSettingsMatrxId,
        addMatrxIds: addaiSettingsMatrxIds,
        removeMatrxId: removeaiSettingsMatrxId,
        removeMatrxIds: removeaiSettingsMatrxIds,
        addPkValue: addaiSettingsPkValue,
        addPkValues: addaiSettingsPkValues,
        removePkValue: removeaiSettingsPkValue,
        removePkValues: removeaiSettingsPkValues,
        isMissingRecords: isaiSettingsMissingRecords,
        setShouldFetch: setaiSettingsShouldFetch,
        setFetchMode: setaiSettingsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,

    } = useEntityWithFetch("aiSettings");

    return {
        aiSettingsSelectors,
        aiSettingsActions,
        aiSettingsRecords,
        aiSettingsUnsavedRecords,
        aiSettingsSelectedRecordIds,
        aiSettingsIsLoading,
        aiSettingsIsError,
        aiSettingsQuickRefRecords,
        addaiSettingsMatrxId,
        addaiSettingsMatrxIds,
        removeaiSettingsMatrxId,
        removeaiSettingsMatrxIds,
        addaiSettingsPkValue,
        addaiSettingsPkValues,
        removeaiSettingsPkValue,
        removeaiSettingsPkValues,
        isaiSettingsMissingRecords,
        setaiSettingsShouldFetch,
        setaiSettingsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
    };
};



type UseAiAgentWithFetchReturn = {
    aiAgentSelectors: EntitySelectors<"aiAgent">;
    aiAgentActions: EntityActions<"aiAgent">;
    aiAgentRecords: Record<MatrxRecordId, AiAgentData>;
    aiAgentUnsavedRecords: Record<MatrxRecordId, Partial<AiAgentData>>;
    aiAgentSelectedRecordIds: MatrxRecordId[];
    aiAgentIsLoading: boolean;
    aiAgentIsError: boolean;
    aiAgentQuickRefRecords: QuickReferenceRecord[];
    addaiAgentMatrxId: (recordId: MatrxRecordId) => void;
    addaiAgentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaiAgentMatrxId: (recordId: MatrxRecordId) => void;
    removeaiAgentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaiAgentPkValue: (pkValue: string) => void;
    addaiAgentPkValues: (pkValues: Record<string, unknown>) => void;
    removeaiAgentPkValue: (pkValue: string) => void;
    removeaiAgentPkValues: (pkValues: Record<string, unknown>) => void;
    isaiAgentMissingRecords: boolean;
    setaiAgentShouldFetch: (shouldFetch: boolean) => void;
    setaiAgentFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;

};

export const useAiAgentWithFetch = (): UseAiAgentWithFetchReturn => {
    const {
        selectors: aiAgentSelectors,
        actions: aiAgentActions,
        allRecords: aiAgentRecords,
        unsavedRecords: aiAgentUnsavedRecords,
        selectedRecordIds: aiAgentSelectedRecordIds,
        isLoading: aiAgentIsLoading,
        isError: aiAgentIsError,
        quickRefRecords: aiAgentQuickRefRecords,
        addMatrxId: addaiAgentMatrxId,
        addMatrxIds: addaiAgentMatrxIds,
        removeMatrxId: removeaiAgentMatrxId,
        removeMatrxIds: removeaiAgentMatrxIds,
        addPkValue: addaiAgentPkValue,
        addPkValues: addaiAgentPkValues,
        removePkValue: removeaiAgentPkValue,
        removePkValues: removeaiAgentPkValues,
        isMissingRecords: isaiAgentMissingRecords,
        setShouldFetch: setaiAgentShouldFetch,
        setFetchMode: setaiAgentFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,

    } = useEntityWithFetch("aiAgent");

    return {
        aiAgentSelectors,
        aiAgentActions,
        aiAgentRecords,
        aiAgentUnsavedRecords,
        aiAgentSelectedRecordIds,
        aiAgentIsLoading,
        aiAgentIsError,
        aiAgentQuickRefRecords,
        addaiAgentMatrxId,
        addaiAgentMatrxIds,
        removeaiAgentMatrxId,
        removeaiAgentMatrxIds,
        addaiAgentPkValue,
        addaiAgentPkValues,
        removeaiAgentPkValue,
        removeaiAgentPkValues,
        isaiAgentMissingRecords,
        setaiAgentShouldFetch,
        setaiAgentFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
    };
};

