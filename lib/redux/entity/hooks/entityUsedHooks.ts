// lib/redux/entity/hooks/entityUsedHooks.ts
// Minimal set of entity hooks actively used across the codebase.
// This replaces entityMainHooks.ts (which was auto-generated and contained
// 134 hooks, only 6 of which were ever used).

import {
    AiModelData,
    CompiledRecipeData,
    DataBrokerData,
    NodeCategoryData,
    RegisteredNodeData,
    RegisteredNodeResultsData,
} from "@/types/AutomationSchemaTypes";
import { MatrxRecordId, QuickReferenceRecord, FilterPayload, SortPayload } from "@/lib/redux/entity/types/stateTypes";
import { EntitySelectors } from "@/lib/redux/entity/selectors";
import { EntityActions } from "@/lib/redux/entity/slice";
import { FetchMode } from "@/lib/redux/entity/actions";
import { useEntityWithFetch } from "@/lib/redux/entity/hooks/useAllData";

// ---------------------------------------------------------------------------
// useAiModelWithFetch
// ---------------------------------------------------------------------------

type UseAiModelWithFetchReturn = {
    aiModelSelectors: EntitySelectors<"aiModel">;
    aiModelActions: EntityActions<"aiModel">;
    aiModelRecords: Record<MatrxRecordId, AiModelData>;
    aiModelRecordsById: Record<string, AiModelData>;
    aiModelUnsavedRecords: Record<MatrxRecordId, Partial<AiModelData>>;
    aiModelSelectedRecordIds: MatrxRecordId[];
    aiModelIsLoading: boolean;
    aiModelIsError: boolean;
    aiModelQuickRefRecords: QuickReferenceRecord[];
    addAiModelMatrxId: (recordId: MatrxRecordId) => void;
    addAiModelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAiModelMatrxId: (recordId: MatrxRecordId) => void;
    removeAiModelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAiModelPkValue: (pkValue: string) => void;
    addAiModelPkValues: (pkValues: Record<string, unknown>) => void;
    removeAiModelPkValue: (pkValue: string) => void;
    removeAiModelPkValues: (pkValues: Record<string, unknown>) => void;
    isAiModelMissingRecords: boolean;
    setAiModelShouldFetch: (shouldFetch: boolean) => void;
    setAiModelFetchMode: (fetchMode: FetchMode) => void;
    fetchAiModelQuickRefs: () => void;
    fetchAiModelOne: (recordId: MatrxRecordId) => void;
    fetchAiModelOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAiModelAll: () => void;
    fetchAiModelPaginated: (page: number, pageSize: number, options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    }) => void;
};

export const useAiModelWithFetch = (): UseAiModelWithFetchReturn => {
    const {
        selectors: aiModelSelectors,
        actions: aiModelActions,
        allRecords: aiModelRecords,
        recordsById: aiModelRecordsById,
        unsavedRecords: aiModelUnsavedRecords,
        selectedRecordIds: aiModelSelectedRecordIds,
        isLoading: aiModelIsLoading,
        isError: aiModelIsError,
        quickRefRecords: aiModelQuickRefRecords,
        addMatrxId: addAiModelMatrxId,
        addMatrxIds: addAiModelMatrxIds,
        removeMatrxId: removeAiModelMatrxId,
        removeMatrxIds: removeAiModelMatrxIds,
        addPkValue: addAiModelPkValue,
        addPkValues: addAiModelPkValues,
        removePkValue: removeAiModelPkValue,
        removePkValues: removeAiModelPkValues,
        isMissingRecords: isAiModelMissingRecords,
        setShouldFetch: setAiModelShouldFetch,
        setFetchMode: setAiModelFetchMode,
        fetchQuickRefs: fetchAiModelQuickRefs,
        fetchOne: fetchAiModelOne,
        fetchOneWithFkIfk: fetchAiModelOneWithFkIfk,
        fetchAll: fetchAiModelAll,
        fetchPaginated: fetchAiModelPaginated,
    } = useEntityWithFetch("aiModel");

    return {
        aiModelSelectors,
        aiModelActions,
        aiModelRecords,
        aiModelRecordsById,
        aiModelUnsavedRecords,
        aiModelSelectedRecordIds,
        aiModelIsLoading,
        aiModelIsError,
        aiModelQuickRefRecords,
        addAiModelMatrxId,
        addAiModelMatrxIds,
        removeAiModelMatrxId,
        removeAiModelMatrxIds,
        addAiModelPkValue,
        addAiModelPkValues,
        removeAiModelPkValue,
        removeAiModelPkValues,
        isAiModelMissingRecords,
        setAiModelShouldFetch,
        setAiModelFetchMode,
        fetchAiModelQuickRefs,
        fetchAiModelOne,
        fetchAiModelOneWithFkIfk,
        fetchAiModelAll,
        fetchAiModelPaginated,
    };
};

// ---------------------------------------------------------------------------
// useCompiledRecipeWithFetch
// ---------------------------------------------------------------------------

type UseCompiledRecipeWithFetchReturn = {
    compiledRecipeSelectors: EntitySelectors<"compiledRecipe">;
    compiledRecipeActions: EntityActions<"compiledRecipe">;
    compiledRecipeRecords: Record<MatrxRecordId, CompiledRecipeData>;
    compiledRecipeRecordsById: Record<string, CompiledRecipeData>;
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
    fetchCompiledRecipeQuickRefs: () => void;
    fetchCompiledRecipeOne: (recordId: MatrxRecordId) => void;
    fetchCompiledRecipeOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchCompiledRecipeAll: () => void;
    fetchCompiledRecipePaginated: (page: number, pageSize: number, options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    }) => void;
};

export const useCompiledRecipeWithFetch = (): UseCompiledRecipeWithFetchReturn => {
    const {
        selectors: compiledRecipeSelectors,
        actions: compiledRecipeActions,
        allRecords: compiledRecipeRecords,
        recordsById: compiledRecipeRecordsById,
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
        fetchQuickRefs: fetchCompiledRecipeQuickRefs,
        fetchOne: fetchCompiledRecipeOne,
        fetchOneWithFkIfk: fetchCompiledRecipeOneWithFkIfk,
        fetchAll: fetchCompiledRecipeAll,
        fetchPaginated: fetchCompiledRecipePaginated,
    } = useEntityWithFetch("compiledRecipe");

    return {
        compiledRecipeSelectors,
        compiledRecipeActions,
        compiledRecipeRecords,
        compiledRecipeRecordsById,
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
        fetchCompiledRecipeQuickRefs,
        fetchCompiledRecipeOne,
        fetchCompiledRecipeOneWithFkIfk,
        fetchCompiledRecipeAll,
        fetchCompiledRecipePaginated,
    };
};

// ---------------------------------------------------------------------------
// useDataBrokerWithFetch
// ---------------------------------------------------------------------------

type UseDataBrokerWithFetchReturn = {
    dataBrokerSelectors: EntitySelectors<"dataBroker">;
    dataBrokerActions: EntityActions<"dataBroker">;
    dataBrokerRecords: Record<MatrxRecordId, DataBrokerData>;
    dataBrokerRecordsById: Record<string, DataBrokerData>;
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
    fetchDataBrokerQuickRefs: () => void;
    fetchDataBrokerOne: (recordId: MatrxRecordId) => void;
    fetchDataBrokerOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchDataBrokerAll: () => void;
    fetchDataBrokerPaginated: (page: number, pageSize: number, options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    }) => void;
};

export const useDataBrokerWithFetch = (): UseDataBrokerWithFetchReturn => {
    const {
        selectors: dataBrokerSelectors,
        actions: dataBrokerActions,
        allRecords: dataBrokerRecords,
        recordsById: dataBrokerRecordsById,
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
        fetchQuickRefs: fetchDataBrokerQuickRefs,
        fetchOne: fetchDataBrokerOne,
        fetchOneWithFkIfk: fetchDataBrokerOneWithFkIfk,
        fetchAll: fetchDataBrokerAll,
        fetchPaginated: fetchDataBrokerPaginated,
    } = useEntityWithFetch("dataBroker");

    return {
        dataBrokerSelectors,
        dataBrokerActions,
        dataBrokerRecords,
        dataBrokerRecordsById,
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
        fetchDataBrokerQuickRefs,
        fetchDataBrokerOne,
        fetchDataBrokerOneWithFkIfk,
        fetchDataBrokerAll,
        fetchDataBrokerPaginated,
    };
};

// ---------------------------------------------------------------------------
// useNodeCategoryWithFetch
// ---------------------------------------------------------------------------

type UseNodeCategoryWithFetchReturn = {
    nodeCategorySelectors: EntitySelectors<"nodeCategory">;
    nodeCategoryActions: EntityActions<"nodeCategory">;
    nodeCategoryRecords: Record<MatrxRecordId, NodeCategoryData>;
    nodeCategoryRecordsById: Record<string, NodeCategoryData>;
    nodeCategoryUnsavedRecords: Record<MatrxRecordId, Partial<NodeCategoryData>>;
    nodeCategorySelectedRecordIds: MatrxRecordId[];
    nodeCategoryIsLoading: boolean;
    nodeCategoryIsError: boolean;
    nodeCategoryQuickRefRecords: QuickReferenceRecord[];
    addNodeCategoryMatrxId: (recordId: MatrxRecordId) => void;
    addNodeCategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeNodeCategoryMatrxId: (recordId: MatrxRecordId) => void;
    removeNodeCategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addNodeCategoryPkValue: (pkValue: string) => void;
    addNodeCategoryPkValues: (pkValues: Record<string, unknown>) => void;
    removeNodeCategoryPkValue: (pkValue: string) => void;
    removeNodeCategoryPkValues: (pkValues: Record<string, unknown>) => void;
    isNodeCategoryMissingRecords: boolean;
    setNodeCategoryShouldFetch: (shouldFetch: boolean) => void;
    setNodeCategoryFetchMode: (fetchMode: FetchMode) => void;
    fetchNodeCategoryQuickRefs: () => void;
    fetchNodeCategoryOne: (recordId: MatrxRecordId) => void;
    fetchNodeCategoryOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchNodeCategoryAll: () => void;
    fetchNodeCategoryPaginated: (page: number, pageSize: number, options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    }) => void;
};

export const useNodeCategoryWithFetch = (): UseNodeCategoryWithFetchReturn => {
    const {
        selectors: nodeCategorySelectors,
        actions: nodeCategoryActions,
        allRecords: nodeCategoryRecords,
        recordsById: nodeCategoryRecordsById,
        unsavedRecords: nodeCategoryUnsavedRecords,
        selectedRecordIds: nodeCategorySelectedRecordIds,
        isLoading: nodeCategoryIsLoading,
        isError: nodeCategoryIsError,
        quickRefRecords: nodeCategoryQuickRefRecords,
        addMatrxId: addNodeCategoryMatrxId,
        addMatrxIds: addNodeCategoryMatrxIds,
        removeMatrxId: removeNodeCategoryMatrxId,
        removeMatrxIds: removeNodeCategoryMatrxIds,
        addPkValue: addNodeCategoryPkValue,
        addPkValues: addNodeCategoryPkValues,
        removePkValue: removeNodeCategoryPkValue,
        removePkValues: removeNodeCategoryPkValues,
        isMissingRecords: isNodeCategoryMissingRecords,
        setShouldFetch: setNodeCategoryShouldFetch,
        setFetchMode: setNodeCategoryFetchMode,
        fetchQuickRefs: fetchNodeCategoryQuickRefs,
        fetchOne: fetchNodeCategoryOne,
        fetchOneWithFkIfk: fetchNodeCategoryOneWithFkIfk,
        fetchAll: fetchNodeCategoryAll,
        fetchPaginated: fetchNodeCategoryPaginated,
    } = useEntityWithFetch("nodeCategory");

    return {
        nodeCategorySelectors,
        nodeCategoryActions,
        nodeCategoryRecords,
        nodeCategoryRecordsById,
        nodeCategoryUnsavedRecords,
        nodeCategorySelectedRecordIds,
        nodeCategoryIsLoading,
        nodeCategoryIsError,
        nodeCategoryQuickRefRecords,
        addNodeCategoryMatrxId,
        addNodeCategoryMatrxIds,
        removeNodeCategoryMatrxId,
        removeNodeCategoryMatrxIds,
        addNodeCategoryPkValue,
        addNodeCategoryPkValues,
        removeNodeCategoryPkValue,
        removeNodeCategoryPkValues,
        isNodeCategoryMissingRecords,
        setNodeCategoryShouldFetch,
        setNodeCategoryFetchMode,
        fetchNodeCategoryQuickRefs,
        fetchNodeCategoryOne,
        fetchNodeCategoryOneWithFkIfk,
        fetchNodeCategoryAll,
        fetchNodeCategoryPaginated,
    };
};

// ---------------------------------------------------------------------------
// useRegisteredNodeWithFetch
// ---------------------------------------------------------------------------

type UseRegisteredNodeWithFetchReturn = {
    registeredNodeSelectors: EntitySelectors<"registeredNode">;
    registeredNodeActions: EntityActions<"registeredNode">;
    registeredNodeRecords: Record<MatrxRecordId, RegisteredNodeData>;
    registeredNodeRecordsById: Record<string, RegisteredNodeData>;
    registeredNodeUnsavedRecords: Record<MatrxRecordId, Partial<RegisteredNodeData>>;
    registeredNodeSelectedRecordIds: MatrxRecordId[];
    registeredNodeIsLoading: boolean;
    registeredNodeIsError: boolean;
    registeredNodeQuickRefRecords: QuickReferenceRecord[];
    addRegisteredNodeMatrxId: (recordId: MatrxRecordId) => void;
    addRegisteredNodeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRegisteredNodeMatrxId: (recordId: MatrxRecordId) => void;
    removeRegisteredNodeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRegisteredNodePkValue: (pkValue: string) => void;
    addRegisteredNodePkValues: (pkValues: Record<string, unknown>) => void;
    removeRegisteredNodePkValue: (pkValue: string) => void;
    removeRegisteredNodePkValues: (pkValues: Record<string, unknown>) => void;
    isRegisteredNodeMissingRecords: boolean;
    setRegisteredNodeShouldFetch: (shouldFetch: boolean) => void;
    setRegisteredNodeFetchMode: (fetchMode: FetchMode) => void;
    fetchRegisteredNodeQuickRefs: () => void;
    fetchRegisteredNodeOne: (recordId: MatrxRecordId) => void;
    fetchRegisteredNodeOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRegisteredNodeAll: () => void;
    fetchRegisteredNodePaginated: (page: number, pageSize: number, options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    }) => void;
};

export const useRegisteredNodeWithFetch = (): UseRegisteredNodeWithFetchReturn => {
    const {
        selectors: registeredNodeSelectors,
        actions: registeredNodeActions,
        allRecords: registeredNodeRecords,
        recordsById: registeredNodeRecordsById,
        unsavedRecords: registeredNodeUnsavedRecords,
        selectedRecordIds: registeredNodeSelectedRecordIds,
        isLoading: registeredNodeIsLoading,
        isError: registeredNodeIsError,
        quickRefRecords: registeredNodeQuickRefRecords,
        addMatrxId: addRegisteredNodeMatrxId,
        addMatrxIds: addRegisteredNodeMatrxIds,
        removeMatrxId: removeRegisteredNodeMatrxId,
        removeMatrxIds: removeRegisteredNodeMatrxIds,
        addPkValue: addRegisteredNodePkValue,
        addPkValues: addRegisteredNodePkValues,
        removePkValue: removeRegisteredNodePkValue,
        removePkValues: removeRegisteredNodePkValues,
        isMissingRecords: isRegisteredNodeMissingRecords,
        setShouldFetch: setRegisteredNodeShouldFetch,
        setFetchMode: setRegisteredNodeFetchMode,
        fetchQuickRefs: fetchRegisteredNodeQuickRefs,
        fetchOne: fetchRegisteredNodeOne,
        fetchOneWithFkIfk: fetchRegisteredNodeOneWithFkIfk,
        fetchAll: fetchRegisteredNodeAll,
        fetchPaginated: fetchRegisteredNodePaginated,
    } = useEntityWithFetch("registeredNode");

    return {
        registeredNodeSelectors,
        registeredNodeActions,
        registeredNodeRecords,
        registeredNodeRecordsById,
        registeredNodeUnsavedRecords,
        registeredNodeSelectedRecordIds,
        registeredNodeIsLoading,
        registeredNodeIsError,
        registeredNodeQuickRefRecords,
        addRegisteredNodeMatrxId,
        addRegisteredNodeMatrxIds,
        removeRegisteredNodeMatrxId,
        removeRegisteredNodeMatrxIds,
        addRegisteredNodePkValue,
        addRegisteredNodePkValues,
        removeRegisteredNodePkValue,
        removeRegisteredNodePkValues,
        isRegisteredNodeMissingRecords,
        setRegisteredNodeShouldFetch,
        setRegisteredNodeFetchMode,
        fetchRegisteredNodeQuickRefs,
        fetchRegisteredNodeOne,
        fetchRegisteredNodeOneWithFkIfk,
        fetchRegisteredNodeAll,
        fetchRegisteredNodePaginated,
    };
};

// ---------------------------------------------------------------------------
// useRegisteredNodeResultsWithFetch
// ---------------------------------------------------------------------------

type UseRegisteredNodeResultsWithFetchReturn = {
    registeredNodeResultsSelectors: EntitySelectors<"registeredNodeResults">;
    registeredNodeResultsActions: EntityActions<"registeredNodeResults">;
    registeredNodeResultsRecords: Record<MatrxRecordId, RegisteredNodeResultsData>;
    registeredNodeResultsRecordsById: Record<string, RegisteredNodeResultsData>;
    registeredNodeResultsUnsavedRecords: Record<MatrxRecordId, Partial<RegisteredNodeResultsData>>;
    registeredNodeResultsSelectedRecordIds: MatrxRecordId[];
    registeredNodeResultsIsLoading: boolean;
    registeredNodeResultsIsError: boolean;
    registeredNodeResultsQuickRefRecords: QuickReferenceRecord[];
    addRegisteredNodeResultsMatrxId: (recordId: MatrxRecordId) => void;
    addRegisteredNodeResultsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRegisteredNodeResultsMatrxId: (recordId: MatrxRecordId) => void;
    removeRegisteredNodeResultsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRegisteredNodeResultsPkValue: (pkValue: string) => void;
    addRegisteredNodeResultsPkValues: (pkValues: Record<string, unknown>) => void;
    removeRegisteredNodeResultsPkValue: (pkValue: string) => void;
    removeRegisteredNodeResultsPkValues: (pkValues: Record<string, unknown>) => void;
    isRegisteredNodeResultsMissingRecords: boolean;
    setRegisteredNodeResultsShouldFetch: (shouldFetch: boolean) => void;
    setRegisteredNodeResultsFetchMode: (fetchMode: FetchMode) => void;
    fetchRegisteredNodeResultsQuickRefs: () => void;
    fetchRegisteredNodeResultsOne: (recordId: MatrxRecordId) => void;
    fetchRegisteredNodeResultsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRegisteredNodeResultsAll: () => void;
    fetchRegisteredNodeResultsPaginated: (page: number, pageSize: number, options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    }) => void;
};

export const useRegisteredNodeResultsWithFetch = (): UseRegisteredNodeResultsWithFetchReturn => {
    const {
        selectors: registeredNodeResultsSelectors,
        actions: registeredNodeResultsActions,
        allRecords: registeredNodeResultsRecords,
        recordsById: registeredNodeResultsRecordsById,
        unsavedRecords: registeredNodeResultsUnsavedRecords,
        selectedRecordIds: registeredNodeResultsSelectedRecordIds,
        isLoading: registeredNodeResultsIsLoading,
        isError: registeredNodeResultsIsError,
        quickRefRecords: registeredNodeResultsQuickRefRecords,
        addMatrxId: addRegisteredNodeResultsMatrxId,
        addMatrxIds: addRegisteredNodeResultsMatrxIds,
        removeMatrxId: removeRegisteredNodeResultsMatrxId,
        removeMatrxIds: removeRegisteredNodeResultsMatrxIds,
        addPkValue: addRegisteredNodeResultsPkValue,
        addPkValues: addRegisteredNodeResultsPkValues,
        removePkValue: removeRegisteredNodeResultsPkValue,
        removePkValues: removeRegisteredNodeResultsPkValues,
        isMissingRecords: isRegisteredNodeResultsMissingRecords,
        setShouldFetch: setRegisteredNodeResultsShouldFetch,
        setFetchMode: setRegisteredNodeResultsFetchMode,
        fetchQuickRefs: fetchRegisteredNodeResultsQuickRefs,
        fetchOne: fetchRegisteredNodeResultsOne,
        fetchOneWithFkIfk: fetchRegisteredNodeResultsOneWithFkIfk,
        fetchAll: fetchRegisteredNodeResultsAll,
        fetchPaginated: fetchRegisteredNodeResultsPaginated,
    } = useEntityWithFetch("registeredNodeResults");

    return {
        registeredNodeResultsSelectors,
        registeredNodeResultsActions,
        registeredNodeResultsRecords,
        registeredNodeResultsRecordsById,
        registeredNodeResultsUnsavedRecords,
        registeredNodeResultsSelectedRecordIds,
        registeredNodeResultsIsLoading,
        registeredNodeResultsIsError,
        registeredNodeResultsQuickRefRecords,
        addRegisteredNodeResultsMatrxId,
        addRegisteredNodeResultsMatrxIds,
        removeRegisteredNodeResultsMatrxId,
        removeRegisteredNodeResultsMatrxIds,
        addRegisteredNodeResultsPkValue,
        addRegisteredNodeResultsPkValues,
        removeRegisteredNodeResultsPkValue,
        removeRegisteredNodeResultsPkValues,
        isRegisteredNodeResultsMissingRecords,
        setRegisteredNodeResultsShouldFetch,
        setRegisteredNodeResultsFetchMode,
        fetchRegisteredNodeResultsQuickRefs,
        fetchRegisteredNodeResultsOne,
        fetchRegisteredNodeResultsOneWithFkIfk,
        fetchRegisteredNodeResultsAll,
        fetchRegisteredNodeResultsPaginated,
    };
};
