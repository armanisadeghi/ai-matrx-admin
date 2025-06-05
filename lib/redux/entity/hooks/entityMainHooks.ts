// File: lib/redux/entity/hooks/entityMainHooks.ts

import {
    BrokerValueData,
    DataBrokerData,
    DataInputComponentData,
    DataOutputComponentData,
    RecipeData,
    CompiledRecipeData,
    AppletData,
    AiAgentData,
    AiSettingsData,
    AiModelEndpointData,
    AiEndpointData,
    AiModelData,
    ActionData,
    AiProviderData,
    ArgData,
    AudioLabelData,
    AudioRecordingData,
    AudioRecordingUsersData,
    AutomationBoundaryBrokerData,
    AutomationMatrixData,
    BrokerData,
    BucketStructuresData,
    BucketTreeStructuresData,
    CategoryData,
    DisplayOptionData,
    EmailsData,
    ExtractorData,
    FileStructureData,
    FlashcardDataData,
    FlashcardHistoryData,
    FlashcardImagesData,
    FlashcardSetRelationsData,
    FlashcardSetsData,
    MessageBrokerData,
    MessageTemplateData,
    ProcessorData,
    ProjectMembersData,
    ProjectsData,
    RecipeBrokerData,
    RecipeDisplayData,
    RecipeFunctionData,
    RecipeMessageData,
    RecipeModelData,
    RecipeProcessorData,
    RecipeToolData,
    RegisteredFunctionData,
    SubcategoryData,
    SystemFunctionData,
    TaskAssignmentsData,
    TaskAttachmentsData,
    TaskCommentsData,
    TasksData,
    ToolData,
    TransformerData,
    UserPreferencesData,
    WcClaimData,
    WcImpairmentDefinitionData,
    RecipeMessageReorderQueueData,
    MessageData,
    ConversationData,
    WcInjuryData,
    WcReportData,
} from "@/types";
import { MatrxRecordId, QuickReferenceRecord } from "../types/stateTypes";
import { EntitySelectors } from "../selectors";
import { EntityActions } from "../slice";
import { FetchMode } from "../actions";
import { useEntityWithFetch } from "./useAllData";


type UseActionWithFetchReturn = {
    actionSelectors: EntitySelectors<"action">;
    actionActions: EntityActions<"action">;
    actionRecords: Record<MatrxRecordId, ActionData>;
    actionUnsavedRecords: Record<MatrxRecordId, Partial<ActionData>>;
    actionSelectedRecordIds: MatrxRecordId[];
    actionIsLoading: boolean;
    actionIsError: boolean;
    actionQuickRefRecords: QuickReferenceRecord[];
    addActionMatrxId: (recordId: MatrxRecordId) => void;
    addActionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeActionMatrxId: (recordId: MatrxRecordId) => void;
    removeActionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addActionPkValue: (pkValue: string) => void;
    addActionPkValues: (pkValues: Record<string, unknown>) => void;
    removeActionPkValue: (pkValue: string) => void;
    removeActionPkValues: (pkValues: Record<string, unknown>) => void;
    isActionMissingRecords: boolean;
    setActionShouldFetch: (shouldFetch: boolean) => void;
    setActionFetchMode: (fetchMode: FetchMode) => void;
    fetchActionQuickRefs: () => void;
    fetchActionOne: (recordId: MatrxRecordId) => void;
    fetchActionOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchActionAll: () => void;
    fetchActionPaginated: (page: number, pageSize: number) => void;
};

export const useActionWithFetch = (): UseActionWithFetchReturn => {
    const {
        selectors: actionSelectors,
        actions: actionActions,
        allRecords: actionRecords,
        unsavedRecords: actionUnsavedRecords,
        selectedRecordIds: actionSelectedRecordIds,
        isLoading: actionIsLoading,
        isError: actionIsError,
        quickRefRecords: actionQuickRefRecords,
        addMatrxId: addActionMatrxId,
        addMatrxIds: addActionMatrxIds,
        removeMatrxId: removeActionMatrxId,
        removeMatrxIds: removeActionMatrxIds,
        addPkValue: addActionPkValue,
        addPkValues: addActionPkValues,
        removePkValue: removeActionPkValue,
        removePkValues: removeActionPkValues,
        isMissingRecords: isActionMissingRecords,
        setShouldFetch: setActionShouldFetch,
        setFetchMode: setActionFetchMode,
        fetchQuickRefs: fetchActionQuickRefs,
        fetchOne: fetchActionOne,
        fetchOneWithFkIfk: fetchActionOneWithFkIfk,
        fetchAll: fetchActionAll,
        fetchPaginated: fetchActionPaginated,

    } = useEntityWithFetch("action");

    return {
        actionSelectors,
        actionActions,
        actionRecords,
        actionUnsavedRecords,
        actionSelectedRecordIds,
        actionIsLoading,
        actionIsError,
        actionQuickRefRecords,
        addActionMatrxId,
        addActionMatrxIds,
        removeActionMatrxId,
        removeActionMatrxIds,
        addActionPkValue,
        addActionPkValues,
        removeActionPkValue,
        removeActionPkValues,
        isActionMissingRecords,
        setActionShouldFetch,
        setActionFetchMode,
        fetchActionQuickRefs,
        fetchActionOne,
        fetchActionOneWithFkIfk,
        fetchActionAll,
        fetchActionPaginated,
    };
};



type UseAdminsWithFetchReturn = {
    adminsSelectors: EntitySelectors<"admins">;
    adminsActions: EntityActions<"admins">;
    adminsRecords: Record<MatrxRecordId, AdminsData>;
    adminsUnsavedRecords: Record<MatrxRecordId, Partial<AdminsData>>;
    adminsSelectedRecordIds: MatrxRecordId[];
    adminsIsLoading: boolean;
    adminsIsError: boolean;
    adminsQuickRefRecords: QuickReferenceRecord[];
    addAdminsMatrxId: (recordId: MatrxRecordId) => void;
    addAdminsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAdminsMatrxId: (recordId: MatrxRecordId) => void;
    removeAdminsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAdminsPkValue: (pkValue: string) => void;
    addAdminsPkValues: (pkValues: Record<string, unknown>) => void;
    removeAdminsPkValue: (pkValue: string) => void;
    removeAdminsPkValues: (pkValues: Record<string, unknown>) => void;
    isAdminsMissingRecords: boolean;
    setAdminsShouldFetch: (shouldFetch: boolean) => void;
    setAdminsFetchMode: (fetchMode: FetchMode) => void;
    fetchAdminsQuickRefs: () => void;
    fetchAdminsOne: (recordId: MatrxRecordId) => void;
    fetchAdminsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAdminsAll: () => void;
    fetchAdminsPaginated: (page: number, pageSize: number) => void;
};

export const useAdminsWithFetch = (): UseAdminsWithFetchReturn => {
    const {
        selectors: adminsSelectors,
        actions: adminsActions,
        allRecords: adminsRecords,
        unsavedRecords: adminsUnsavedRecords,
        selectedRecordIds: adminsSelectedRecordIds,
        isLoading: adminsIsLoading,
        isError: adminsIsError,
        quickRefRecords: adminsQuickRefRecords,
        addMatrxId: addAdminsMatrxId,
        addMatrxIds: addAdminsMatrxIds,
        removeMatrxId: removeAdminsMatrxId,
        removeMatrxIds: removeAdminsMatrxIds,
        addPkValue: addAdminsPkValue,
        addPkValues: addAdminsPkValues,
        removePkValue: removeAdminsPkValue,
        removePkValues: removeAdminsPkValues,
        isMissingRecords: isAdminsMissingRecords,
        setShouldFetch: setAdminsShouldFetch,
        setFetchMode: setAdminsFetchMode,
        fetchQuickRefs: fetchAdminsQuickRefs,
        fetchOne: fetchAdminsOne,
        fetchOneWithFkIfk: fetchAdminsOneWithFkIfk,
        fetchAll: fetchAdminsAll,
        fetchPaginated: fetchAdminsPaginated,

    } = useEntityWithFetch("admins");

    return {
        adminsSelectors,
        adminsActions,
        adminsRecords,
        adminsUnsavedRecords,
        adminsSelectedRecordIds,
        adminsIsLoading,
        adminsIsError,
        adminsQuickRefRecords,
        addAdminsMatrxId,
        addAdminsMatrxIds,
        removeAdminsMatrxId,
        removeAdminsMatrxIds,
        addAdminsPkValue,
        addAdminsPkValues,
        removeAdminsPkValue,
        removeAdminsPkValues,
        isAdminsMissingRecords,
        setAdminsShouldFetch,
        setAdminsFetchMode,
        fetchAdminsQuickRefs,
        fetchAdminsOne,
        fetchAdminsOneWithFkIfk,
        fetchAdminsAll,
        fetchAdminsPaginated,
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
    addAiAgentMatrxId: (recordId: MatrxRecordId) => void;
    addAiAgentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAiAgentMatrxId: (recordId: MatrxRecordId) => void;
    removeAiAgentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAiAgentPkValue: (pkValue: string) => void;
    addAiAgentPkValues: (pkValues: Record<string, unknown>) => void;
    removeAiAgentPkValue: (pkValue: string) => void;
    removeAiAgentPkValues: (pkValues: Record<string, unknown>) => void;
    isAiAgentMissingRecords: boolean;
    setAiAgentShouldFetch: (shouldFetch: boolean) => void;
    setAiAgentFetchMode: (fetchMode: FetchMode) => void;
    fetchAiAgentQuickRefs: () => void;
    fetchAiAgentOne: (recordId: MatrxRecordId) => void;
    fetchAiAgentOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAiAgentAll: () => void;
    fetchAiAgentPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addAiAgentMatrxId,
        addMatrxIds: addAiAgentMatrxIds,
        removeMatrxId: removeAiAgentMatrxId,
        removeMatrxIds: removeAiAgentMatrxIds,
        addPkValue: addAiAgentPkValue,
        addPkValues: addAiAgentPkValues,
        removePkValue: removeAiAgentPkValue,
        removePkValues: removeAiAgentPkValues,
        isMissingRecords: isAiAgentMissingRecords,
        setShouldFetch: setAiAgentShouldFetch,
        setFetchMode: setAiAgentFetchMode,
        fetchQuickRefs: fetchAiAgentQuickRefs,
        fetchOne: fetchAiAgentOne,
        fetchOneWithFkIfk: fetchAiAgentOneWithFkIfk,
        fetchAll: fetchAiAgentAll,
        fetchPaginated: fetchAiAgentPaginated,

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
        addAiAgentMatrxId,
        addAiAgentMatrxIds,
        removeAiAgentMatrxId,
        removeAiAgentMatrxIds,
        addAiAgentPkValue,
        addAiAgentPkValues,
        removeAiAgentPkValue,
        removeAiAgentPkValues,
        isAiAgentMissingRecords,
        setAiAgentShouldFetch,
        setAiAgentFetchMode,
        fetchAiAgentQuickRefs,
        fetchAiAgentOne,
        fetchAiAgentOneWithFkIfk,
        fetchAiAgentAll,
        fetchAiAgentPaginated,
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
    addAiEndpointMatrxId: (recordId: MatrxRecordId) => void;
    addAiEndpointMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAiEndpointMatrxId: (recordId: MatrxRecordId) => void;
    removeAiEndpointMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAiEndpointPkValue: (pkValue: string) => void;
    addAiEndpointPkValues: (pkValues: Record<string, unknown>) => void;
    removeAiEndpointPkValue: (pkValue: string) => void;
    removeAiEndpointPkValues: (pkValues: Record<string, unknown>) => void;
    isAiEndpointMissingRecords: boolean;
    setAiEndpointShouldFetch: (shouldFetch: boolean) => void;
    setAiEndpointFetchMode: (fetchMode: FetchMode) => void;
    fetchAiEndpointQuickRefs: () => void;
    fetchAiEndpointOne: (recordId: MatrxRecordId) => void;
    fetchAiEndpointOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAiEndpointAll: () => void;
    fetchAiEndpointPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addAiEndpointMatrxId,
        addMatrxIds: addAiEndpointMatrxIds,
        removeMatrxId: removeAiEndpointMatrxId,
        removeMatrxIds: removeAiEndpointMatrxIds,
        addPkValue: addAiEndpointPkValue,
        addPkValues: addAiEndpointPkValues,
        removePkValue: removeAiEndpointPkValue,
        removePkValues: removeAiEndpointPkValues,
        isMissingRecords: isAiEndpointMissingRecords,
        setShouldFetch: setAiEndpointShouldFetch,
        setFetchMode: setAiEndpointFetchMode,
        fetchQuickRefs: fetchAiEndpointQuickRefs,
        fetchOne: fetchAiEndpointOne,
        fetchOneWithFkIfk: fetchAiEndpointOneWithFkIfk,
        fetchAll: fetchAiEndpointAll,
        fetchPaginated: fetchAiEndpointPaginated,

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
        addAiEndpointMatrxId,
        addAiEndpointMatrxIds,
        removeAiEndpointMatrxId,
        removeAiEndpointMatrxIds,
        addAiEndpointPkValue,
        addAiEndpointPkValues,
        removeAiEndpointPkValue,
        removeAiEndpointPkValues,
        isAiEndpointMissingRecords,
        setAiEndpointShouldFetch,
        setAiEndpointFetchMode,
        fetchAiEndpointQuickRefs,
        fetchAiEndpointOne,
        fetchAiEndpointOneWithFkIfk,
        fetchAiEndpointAll,
        fetchAiEndpointPaginated,
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
    fetchAiModelPaginated: (page: number, pageSize: number) => void;
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



type UseAiModelEndpointWithFetchReturn = {
    aiModelEndpointSelectors: EntitySelectors<"aiModelEndpoint">;
    aiModelEndpointActions: EntityActions<"aiModelEndpoint">;
    aiModelEndpointRecords: Record<MatrxRecordId, AiModelEndpointData>;
    aiModelEndpointUnsavedRecords: Record<MatrxRecordId, Partial<AiModelEndpointData>>;
    aiModelEndpointSelectedRecordIds: MatrxRecordId[];
    aiModelEndpointIsLoading: boolean;
    aiModelEndpointIsError: boolean;
    aiModelEndpointQuickRefRecords: QuickReferenceRecord[];
    addAiModelEndpointMatrxId: (recordId: MatrxRecordId) => void;
    addAiModelEndpointMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAiModelEndpointMatrxId: (recordId: MatrxRecordId) => void;
    removeAiModelEndpointMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAiModelEndpointPkValue: (pkValue: string) => void;
    addAiModelEndpointPkValues: (pkValues: Record<string, unknown>) => void;
    removeAiModelEndpointPkValue: (pkValue: string) => void;
    removeAiModelEndpointPkValues: (pkValues: Record<string, unknown>) => void;
    isAiModelEndpointMissingRecords: boolean;
    setAiModelEndpointShouldFetch: (shouldFetch: boolean) => void;
    setAiModelEndpointFetchMode: (fetchMode: FetchMode) => void;
    fetchAiModelEndpointQuickRefs: () => void;
    fetchAiModelEndpointOne: (recordId: MatrxRecordId) => void;
    fetchAiModelEndpointOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAiModelEndpointAll: () => void;
    fetchAiModelEndpointPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addAiModelEndpointMatrxId,
        addMatrxIds: addAiModelEndpointMatrxIds,
        removeMatrxId: removeAiModelEndpointMatrxId,
        removeMatrxIds: removeAiModelEndpointMatrxIds,
        addPkValue: addAiModelEndpointPkValue,
        addPkValues: addAiModelEndpointPkValues,
        removePkValue: removeAiModelEndpointPkValue,
        removePkValues: removeAiModelEndpointPkValues,
        isMissingRecords: isAiModelEndpointMissingRecords,
        setShouldFetch: setAiModelEndpointShouldFetch,
        setFetchMode: setAiModelEndpointFetchMode,
        fetchQuickRefs: fetchAiModelEndpointQuickRefs,
        fetchOne: fetchAiModelEndpointOne,
        fetchOneWithFkIfk: fetchAiModelEndpointOneWithFkIfk,
        fetchAll: fetchAiModelEndpointAll,
        fetchPaginated: fetchAiModelEndpointPaginated,

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
        addAiModelEndpointMatrxId,
        addAiModelEndpointMatrxIds,
        removeAiModelEndpointMatrxId,
        removeAiModelEndpointMatrxIds,
        addAiModelEndpointPkValue,
        addAiModelEndpointPkValues,
        removeAiModelEndpointPkValue,
        removeAiModelEndpointPkValues,
        isAiModelEndpointMissingRecords,
        setAiModelEndpointShouldFetch,
        setAiModelEndpointFetchMode,
        fetchAiModelEndpointQuickRefs,
        fetchAiModelEndpointOne,
        fetchAiModelEndpointOneWithFkIfk,
        fetchAiModelEndpointAll,
        fetchAiModelEndpointPaginated,
    };
};



type UseAiProviderWithFetchReturn = {
    aiProviderSelectors: EntitySelectors<"aiProvider">;
    aiProviderActions: EntityActions<"aiProvider">;
    aiProviderRecords: Record<MatrxRecordId, AiProviderData>;
    aiProviderUnsavedRecords: Record<MatrxRecordId, Partial<AiProviderData>>;
    aiProviderSelectedRecordIds: MatrxRecordId[];
    aiProviderIsLoading: boolean;
    aiProviderIsError: boolean;
    aiProviderQuickRefRecords: QuickReferenceRecord[];
    addAiProviderMatrxId: (recordId: MatrxRecordId) => void;
    addAiProviderMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAiProviderMatrxId: (recordId: MatrxRecordId) => void;
    removeAiProviderMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAiProviderPkValue: (pkValue: string) => void;
    addAiProviderPkValues: (pkValues: Record<string, unknown>) => void;
    removeAiProviderPkValue: (pkValue: string) => void;
    removeAiProviderPkValues: (pkValues: Record<string, unknown>) => void;
    isAiProviderMissingRecords: boolean;
    setAiProviderShouldFetch: (shouldFetch: boolean) => void;
    setAiProviderFetchMode: (fetchMode: FetchMode) => void;
    fetchAiProviderQuickRefs: () => void;
    fetchAiProviderOne: (recordId: MatrxRecordId) => void;
    fetchAiProviderOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAiProviderAll: () => void;
    fetchAiProviderPaginated: (page: number, pageSize: number) => void;
};

export const useAiProviderWithFetch = (): UseAiProviderWithFetchReturn => {
    const {
        selectors: aiProviderSelectors,
        actions: aiProviderActions,
        allRecords: aiProviderRecords,
        unsavedRecords: aiProviderUnsavedRecords,
        selectedRecordIds: aiProviderSelectedRecordIds,
        isLoading: aiProviderIsLoading,
        isError: aiProviderIsError,
        quickRefRecords: aiProviderQuickRefRecords,
        addMatrxId: addAiProviderMatrxId,
        addMatrxIds: addAiProviderMatrxIds,
        removeMatrxId: removeAiProviderMatrxId,
        removeMatrxIds: removeAiProviderMatrxIds,
        addPkValue: addAiProviderPkValue,
        addPkValues: addAiProviderPkValues,
        removePkValue: removeAiProviderPkValue,
        removePkValues: removeAiProviderPkValues,
        isMissingRecords: isAiProviderMissingRecords,
        setShouldFetch: setAiProviderShouldFetch,
        setFetchMode: setAiProviderFetchMode,
        fetchQuickRefs: fetchAiProviderQuickRefs,
        fetchOne: fetchAiProviderOne,
        fetchOneWithFkIfk: fetchAiProviderOneWithFkIfk,
        fetchAll: fetchAiProviderAll,
        fetchPaginated: fetchAiProviderPaginated,

    } = useEntityWithFetch("aiProvider");

    return {
        aiProviderSelectors,
        aiProviderActions,
        aiProviderRecords,
        aiProviderUnsavedRecords,
        aiProviderSelectedRecordIds,
        aiProviderIsLoading,
        aiProviderIsError,
        aiProviderQuickRefRecords,
        addAiProviderMatrxId,
        addAiProviderMatrxIds,
        removeAiProviderMatrxId,
        removeAiProviderMatrxIds,
        addAiProviderPkValue,
        addAiProviderPkValues,
        removeAiProviderPkValue,
        removeAiProviderPkValues,
        isAiProviderMissingRecords,
        setAiProviderShouldFetch,
        setAiProviderFetchMode,
        fetchAiProviderQuickRefs,
        fetchAiProviderOne,
        fetchAiProviderOneWithFkIfk,
        fetchAiProviderAll,
        fetchAiProviderPaginated,
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
    addAiSettingsMatrxId: (recordId: MatrxRecordId) => void;
    addAiSettingsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAiSettingsMatrxId: (recordId: MatrxRecordId) => void;
    removeAiSettingsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAiSettingsPkValue: (pkValue: string) => void;
    addAiSettingsPkValues: (pkValues: Record<string, unknown>) => void;
    removeAiSettingsPkValue: (pkValue: string) => void;
    removeAiSettingsPkValues: (pkValues: Record<string, unknown>) => void;
    isAiSettingsMissingRecords: boolean;
    setAiSettingsShouldFetch: (shouldFetch: boolean) => void;
    setAiSettingsFetchMode: (fetchMode: FetchMode) => void;
    fetchAiSettingsQuickRefs: () => void;
    fetchAiSettingsOne: (recordId: MatrxRecordId) => void;
    fetchAiSettingsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAiSettingsAll: () => void;
    fetchAiSettingsPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addAiSettingsMatrxId,
        addMatrxIds: addAiSettingsMatrxIds,
        removeMatrxId: removeAiSettingsMatrxId,
        removeMatrxIds: removeAiSettingsMatrxIds,
        addPkValue: addAiSettingsPkValue,
        addPkValues: addAiSettingsPkValues,
        removePkValue: removeAiSettingsPkValue,
        removePkValues: removeAiSettingsPkValues,
        isMissingRecords: isAiSettingsMissingRecords,
        setShouldFetch: setAiSettingsShouldFetch,
        setFetchMode: setAiSettingsFetchMode,
        fetchQuickRefs: fetchAiSettingsQuickRefs,
        fetchOne: fetchAiSettingsOne,
        fetchOneWithFkIfk: fetchAiSettingsOneWithFkIfk,
        fetchAll: fetchAiSettingsAll,
        fetchPaginated: fetchAiSettingsPaginated,

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
        addAiSettingsMatrxId,
        addAiSettingsMatrxIds,
        removeAiSettingsMatrxId,
        removeAiSettingsMatrxIds,
        addAiSettingsPkValue,
        addAiSettingsPkValues,
        removeAiSettingsPkValue,
        removeAiSettingsPkValues,
        isAiSettingsMissingRecords,
        setAiSettingsShouldFetch,
        setAiSettingsFetchMode,
        fetchAiSettingsQuickRefs,
        fetchAiSettingsOne,
        fetchAiSettingsOneWithFkIfk,
        fetchAiSettingsAll,
        fetchAiSettingsPaginated,
    };
};



type UseAiTrainingDataWithFetchReturn = {
    aiTrainingDataSelectors: EntitySelectors<"aiTrainingData">;
    aiTrainingDataActions: EntityActions<"aiTrainingData">;
    aiTrainingDataRecords: Record<MatrxRecordId, AiTrainingDataData>;
    aiTrainingDataUnsavedRecords: Record<MatrxRecordId, Partial<AiTrainingDataData>>;
    aiTrainingDataSelectedRecordIds: MatrxRecordId[];
    aiTrainingDataIsLoading: boolean;
    aiTrainingDataIsError: boolean;
    aiTrainingDataQuickRefRecords: QuickReferenceRecord[];
    addAiTrainingDataMatrxId: (recordId: MatrxRecordId) => void;
    addAiTrainingDataMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAiTrainingDataMatrxId: (recordId: MatrxRecordId) => void;
    removeAiTrainingDataMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAiTrainingDataPkValue: (pkValue: string) => void;
    addAiTrainingDataPkValues: (pkValues: Record<string, unknown>) => void;
    removeAiTrainingDataPkValue: (pkValue: string) => void;
    removeAiTrainingDataPkValues: (pkValues: Record<string, unknown>) => void;
    isAiTrainingDataMissingRecords: boolean;
    setAiTrainingDataShouldFetch: (shouldFetch: boolean) => void;
    setAiTrainingDataFetchMode: (fetchMode: FetchMode) => void;
    fetchAiTrainingDataQuickRefs: () => void;
    fetchAiTrainingDataOne: (recordId: MatrxRecordId) => void;
    fetchAiTrainingDataOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAiTrainingDataAll: () => void;
    fetchAiTrainingDataPaginated: (page: number, pageSize: number) => void;
};

export const useAiTrainingDataWithFetch = (): UseAiTrainingDataWithFetchReturn => {
    const {
        selectors: aiTrainingDataSelectors,
        actions: aiTrainingDataActions,
        allRecords: aiTrainingDataRecords,
        unsavedRecords: aiTrainingDataUnsavedRecords,
        selectedRecordIds: aiTrainingDataSelectedRecordIds,
        isLoading: aiTrainingDataIsLoading,
        isError: aiTrainingDataIsError,
        quickRefRecords: aiTrainingDataQuickRefRecords,
        addMatrxId: addAiTrainingDataMatrxId,
        addMatrxIds: addAiTrainingDataMatrxIds,
        removeMatrxId: removeAiTrainingDataMatrxId,
        removeMatrxIds: removeAiTrainingDataMatrxIds,
        addPkValue: addAiTrainingDataPkValue,
        addPkValues: addAiTrainingDataPkValues,
        removePkValue: removeAiTrainingDataPkValue,
        removePkValues: removeAiTrainingDataPkValues,
        isMissingRecords: isAiTrainingDataMissingRecords,
        setShouldFetch: setAiTrainingDataShouldFetch,
        setFetchMode: setAiTrainingDataFetchMode,
        fetchQuickRefs: fetchAiTrainingDataQuickRefs,
        fetchOne: fetchAiTrainingDataOne,
        fetchOneWithFkIfk: fetchAiTrainingDataOneWithFkIfk,
        fetchAll: fetchAiTrainingDataAll,
        fetchPaginated: fetchAiTrainingDataPaginated,

    } = useEntityWithFetch("aiTrainingData");

    return {
        aiTrainingDataSelectors,
        aiTrainingDataActions,
        aiTrainingDataRecords,
        aiTrainingDataUnsavedRecords,
        aiTrainingDataSelectedRecordIds,
        aiTrainingDataIsLoading,
        aiTrainingDataIsError,
        aiTrainingDataQuickRefRecords,
        addAiTrainingDataMatrxId,
        addAiTrainingDataMatrxIds,
        removeAiTrainingDataMatrxId,
        removeAiTrainingDataMatrxIds,
        addAiTrainingDataPkValue,
        addAiTrainingDataPkValues,
        removeAiTrainingDataPkValue,
        removeAiTrainingDataPkValues,
        isAiTrainingDataMissingRecords,
        setAiTrainingDataShouldFetch,
        setAiTrainingDataFetchMode,
        fetchAiTrainingDataQuickRefs,
        fetchAiTrainingDataOne,
        fetchAiTrainingDataOneWithFkIfk,
        fetchAiTrainingDataAll,
        fetchAiTrainingDataPaginated,
    };
};



type UseAppletWithFetchReturn = {
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
    fetchAppletQuickRefs: () => void;
    fetchAppletOne: (recordId: MatrxRecordId) => void;
    fetchAppletOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAppletAll: () => void;
    fetchAppletPaginated: (page: number, pageSize: number) => void;
};

export const useAppletWithFetch = (): UseAppletWithFetchReturn => {
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
        fetchQuickRefs: fetchAppletQuickRefs,
        fetchOne: fetchAppletOne,
        fetchOneWithFkIfk: fetchAppletOneWithFkIfk,
        fetchAll: fetchAppletAll,
        fetchPaginated: fetchAppletPaginated,

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
        fetchAppletQuickRefs,
        fetchAppletOne,
        fetchAppletOneWithFkIfk,
        fetchAppletAll,
        fetchAppletPaginated,
    };
};



type UseAppletContainersWithFetchReturn = {
    appletContainersSelectors: EntitySelectors<"appletContainers">;
    appletContainersActions: EntityActions<"appletContainers">;
    appletContainersRecords: Record<MatrxRecordId, AppletContainersData>;
    appletContainersUnsavedRecords: Record<MatrxRecordId, Partial<AppletContainersData>>;
    appletContainersSelectedRecordIds: MatrxRecordId[];
    appletContainersIsLoading: boolean;
    appletContainersIsError: boolean;
    appletContainersQuickRefRecords: QuickReferenceRecord[];
    addAppletContainersMatrxId: (recordId: MatrxRecordId) => void;
    addAppletContainersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAppletContainersMatrxId: (recordId: MatrxRecordId) => void;
    removeAppletContainersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAppletContainersPkValue: (pkValue: string) => void;
    addAppletContainersPkValues: (pkValues: Record<string, unknown>) => void;
    removeAppletContainersPkValue: (pkValue: string) => void;
    removeAppletContainersPkValues: (pkValues: Record<string, unknown>) => void;
    isAppletContainersMissingRecords: boolean;
    setAppletContainersShouldFetch: (shouldFetch: boolean) => void;
    setAppletContainersFetchMode: (fetchMode: FetchMode) => void;
    fetchAppletContainersQuickRefs: () => void;
    fetchAppletContainersOne: (recordId: MatrxRecordId) => void;
    fetchAppletContainersOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAppletContainersAll: () => void;
    fetchAppletContainersPaginated: (page: number, pageSize: number) => void;
};

export const useAppletContainersWithFetch = (): UseAppletContainersWithFetchReturn => {
    const {
        selectors: appletContainersSelectors,
        actions: appletContainersActions,
        allRecords: appletContainersRecords,
        unsavedRecords: appletContainersUnsavedRecords,
        selectedRecordIds: appletContainersSelectedRecordIds,
        isLoading: appletContainersIsLoading,
        isError: appletContainersIsError,
        quickRefRecords: appletContainersQuickRefRecords,
        addMatrxId: addAppletContainersMatrxId,
        addMatrxIds: addAppletContainersMatrxIds,
        removeMatrxId: removeAppletContainersMatrxId,
        removeMatrxIds: removeAppletContainersMatrxIds,
        addPkValue: addAppletContainersPkValue,
        addPkValues: addAppletContainersPkValues,
        removePkValue: removeAppletContainersPkValue,
        removePkValues: removeAppletContainersPkValues,
        isMissingRecords: isAppletContainersMissingRecords,
        setShouldFetch: setAppletContainersShouldFetch,
        setFetchMode: setAppletContainersFetchMode,
        fetchQuickRefs: fetchAppletContainersQuickRefs,
        fetchOne: fetchAppletContainersOne,
        fetchOneWithFkIfk: fetchAppletContainersOneWithFkIfk,
        fetchAll: fetchAppletContainersAll,
        fetchPaginated: fetchAppletContainersPaginated,

    } = useEntityWithFetch("appletContainers");

    return {
        appletContainersSelectors,
        appletContainersActions,
        appletContainersRecords,
        appletContainersUnsavedRecords,
        appletContainersSelectedRecordIds,
        appletContainersIsLoading,
        appletContainersIsError,
        appletContainersQuickRefRecords,
        addAppletContainersMatrxId,
        addAppletContainersMatrxIds,
        removeAppletContainersMatrxId,
        removeAppletContainersMatrxIds,
        addAppletContainersPkValue,
        addAppletContainersPkValues,
        removeAppletContainersPkValue,
        removeAppletContainersPkValues,
        isAppletContainersMissingRecords,
        setAppletContainersShouldFetch,
        setAppletContainersFetchMode,
        fetchAppletContainersQuickRefs,
        fetchAppletContainersOne,
        fetchAppletContainersOneWithFkIfk,
        fetchAppletContainersAll,
        fetchAppletContainersPaginated,
    };
};



type UseArgWithFetchReturn = {
    argSelectors: EntitySelectors<"arg">;
    argActions: EntityActions<"arg">;
    argRecords: Record<MatrxRecordId, ArgData>;
    argUnsavedRecords: Record<MatrxRecordId, Partial<ArgData>>;
    argSelectedRecordIds: MatrxRecordId[];
    argIsLoading: boolean;
    argIsError: boolean;
    argQuickRefRecords: QuickReferenceRecord[];
    addArgMatrxId: (recordId: MatrxRecordId) => void;
    addArgMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeArgMatrxId: (recordId: MatrxRecordId) => void;
    removeArgMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addArgPkValue: (pkValue: string) => void;
    addArgPkValues: (pkValues: Record<string, unknown>) => void;
    removeArgPkValue: (pkValue: string) => void;
    removeArgPkValues: (pkValues: Record<string, unknown>) => void;
    isArgMissingRecords: boolean;
    setArgShouldFetch: (shouldFetch: boolean) => void;
    setArgFetchMode: (fetchMode: FetchMode) => void;
    fetchArgQuickRefs: () => void;
    fetchArgOne: (recordId: MatrxRecordId) => void;
    fetchArgOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchArgAll: () => void;
    fetchArgPaginated: (page: number, pageSize: number) => void;
};

export const useArgWithFetch = (): UseArgWithFetchReturn => {
    const {
        selectors: argSelectors,
        actions: argActions,
        allRecords: argRecords,
        unsavedRecords: argUnsavedRecords,
        selectedRecordIds: argSelectedRecordIds,
        isLoading: argIsLoading,
        isError: argIsError,
        quickRefRecords: argQuickRefRecords,
        addMatrxId: addArgMatrxId,
        addMatrxIds: addArgMatrxIds,
        removeMatrxId: removeArgMatrxId,
        removeMatrxIds: removeArgMatrxIds,
        addPkValue: addArgPkValue,
        addPkValues: addArgPkValues,
        removePkValue: removeArgPkValue,
        removePkValues: removeArgPkValues,
        isMissingRecords: isArgMissingRecords,
        setShouldFetch: setArgShouldFetch,
        setFetchMode: setArgFetchMode,
        fetchQuickRefs: fetchArgQuickRefs,
        fetchOne: fetchArgOne,
        fetchOneWithFkIfk: fetchArgOneWithFkIfk,
        fetchAll: fetchArgAll,
        fetchPaginated: fetchArgPaginated,

    } = useEntityWithFetch("arg");

    return {
        argSelectors,
        argActions,
        argRecords,
        argUnsavedRecords,
        argSelectedRecordIds,
        argIsLoading,
        argIsError,
        argQuickRefRecords,
        addArgMatrxId,
        addArgMatrxIds,
        removeArgMatrxId,
        removeArgMatrxIds,
        addArgPkValue,
        addArgPkValues,
        removeArgPkValue,
        removeArgPkValues,
        isArgMissingRecords,
        setArgShouldFetch,
        setArgFetchMode,
        fetchArgQuickRefs,
        fetchArgOne,
        fetchArgOneWithFkIfk,
        fetchArgAll,
        fetchArgPaginated,
    };
};



type UseAudioLabelWithFetchReturn = {
    audioLabelSelectors: EntitySelectors<"audioLabel">;
    audioLabelActions: EntityActions<"audioLabel">;
    audioLabelRecords: Record<MatrxRecordId, AudioLabelData>;
    audioLabelUnsavedRecords: Record<MatrxRecordId, Partial<AudioLabelData>>;
    audioLabelSelectedRecordIds: MatrxRecordId[];
    audioLabelIsLoading: boolean;
    audioLabelIsError: boolean;
    audioLabelQuickRefRecords: QuickReferenceRecord[];
    addAudioLabelMatrxId: (recordId: MatrxRecordId) => void;
    addAudioLabelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAudioLabelMatrxId: (recordId: MatrxRecordId) => void;
    removeAudioLabelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAudioLabelPkValue: (pkValue: string) => void;
    addAudioLabelPkValues: (pkValues: Record<string, unknown>) => void;
    removeAudioLabelPkValue: (pkValue: string) => void;
    removeAudioLabelPkValues: (pkValues: Record<string, unknown>) => void;
    isAudioLabelMissingRecords: boolean;
    setAudioLabelShouldFetch: (shouldFetch: boolean) => void;
    setAudioLabelFetchMode: (fetchMode: FetchMode) => void;
    fetchAudioLabelQuickRefs: () => void;
    fetchAudioLabelOne: (recordId: MatrxRecordId) => void;
    fetchAudioLabelOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAudioLabelAll: () => void;
    fetchAudioLabelPaginated: (page: number, pageSize: number) => void;
};

export const useAudioLabelWithFetch = (): UseAudioLabelWithFetchReturn => {
    const {
        selectors: audioLabelSelectors,
        actions: audioLabelActions,
        allRecords: audioLabelRecords,
        unsavedRecords: audioLabelUnsavedRecords,
        selectedRecordIds: audioLabelSelectedRecordIds,
        isLoading: audioLabelIsLoading,
        isError: audioLabelIsError,
        quickRefRecords: audioLabelQuickRefRecords,
        addMatrxId: addAudioLabelMatrxId,
        addMatrxIds: addAudioLabelMatrxIds,
        removeMatrxId: removeAudioLabelMatrxId,
        removeMatrxIds: removeAudioLabelMatrxIds,
        addPkValue: addAudioLabelPkValue,
        addPkValues: addAudioLabelPkValues,
        removePkValue: removeAudioLabelPkValue,
        removePkValues: removeAudioLabelPkValues,
        isMissingRecords: isAudioLabelMissingRecords,
        setShouldFetch: setAudioLabelShouldFetch,
        setFetchMode: setAudioLabelFetchMode,
        fetchQuickRefs: fetchAudioLabelQuickRefs,
        fetchOne: fetchAudioLabelOne,
        fetchOneWithFkIfk: fetchAudioLabelOneWithFkIfk,
        fetchAll: fetchAudioLabelAll,
        fetchPaginated: fetchAudioLabelPaginated,

    } = useEntityWithFetch("audioLabel");

    return {
        audioLabelSelectors,
        audioLabelActions,
        audioLabelRecords,
        audioLabelUnsavedRecords,
        audioLabelSelectedRecordIds,
        audioLabelIsLoading,
        audioLabelIsError,
        audioLabelQuickRefRecords,
        addAudioLabelMatrxId,
        addAudioLabelMatrxIds,
        removeAudioLabelMatrxId,
        removeAudioLabelMatrxIds,
        addAudioLabelPkValue,
        addAudioLabelPkValues,
        removeAudioLabelPkValue,
        removeAudioLabelPkValues,
        isAudioLabelMissingRecords,
        setAudioLabelShouldFetch,
        setAudioLabelFetchMode,
        fetchAudioLabelQuickRefs,
        fetchAudioLabelOne,
        fetchAudioLabelOneWithFkIfk,
        fetchAudioLabelAll,
        fetchAudioLabelPaginated,
    };
};



type UseAudioRecordingWithFetchReturn = {
    audioRecordingSelectors: EntitySelectors<"audioRecording">;
    audioRecordingActions: EntityActions<"audioRecording">;
    audioRecordingRecords: Record<MatrxRecordId, AudioRecordingData>;
    audioRecordingUnsavedRecords: Record<MatrxRecordId, Partial<AudioRecordingData>>;
    audioRecordingSelectedRecordIds: MatrxRecordId[];
    audioRecordingIsLoading: boolean;
    audioRecordingIsError: boolean;
    audioRecordingQuickRefRecords: QuickReferenceRecord[];
    addAudioRecordingMatrxId: (recordId: MatrxRecordId) => void;
    addAudioRecordingMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAudioRecordingMatrxId: (recordId: MatrxRecordId) => void;
    removeAudioRecordingMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAudioRecordingPkValue: (pkValue: string) => void;
    addAudioRecordingPkValues: (pkValues: Record<string, unknown>) => void;
    removeAudioRecordingPkValue: (pkValue: string) => void;
    removeAudioRecordingPkValues: (pkValues: Record<string, unknown>) => void;
    isAudioRecordingMissingRecords: boolean;
    setAudioRecordingShouldFetch: (shouldFetch: boolean) => void;
    setAudioRecordingFetchMode: (fetchMode: FetchMode) => void;
    fetchAudioRecordingQuickRefs: () => void;
    fetchAudioRecordingOne: (recordId: MatrxRecordId) => void;
    fetchAudioRecordingOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAudioRecordingAll: () => void;
    fetchAudioRecordingPaginated: (page: number, pageSize: number) => void;
};

export const useAudioRecordingWithFetch = (): UseAudioRecordingWithFetchReturn => {
    const {
        selectors: audioRecordingSelectors,
        actions: audioRecordingActions,
        allRecords: audioRecordingRecords,
        unsavedRecords: audioRecordingUnsavedRecords,
        selectedRecordIds: audioRecordingSelectedRecordIds,
        isLoading: audioRecordingIsLoading,
        isError: audioRecordingIsError,
        quickRefRecords: audioRecordingQuickRefRecords,
        addMatrxId: addAudioRecordingMatrxId,
        addMatrxIds: addAudioRecordingMatrxIds,
        removeMatrxId: removeAudioRecordingMatrxId,
        removeMatrxIds: removeAudioRecordingMatrxIds,
        addPkValue: addAudioRecordingPkValue,
        addPkValues: addAudioRecordingPkValues,
        removePkValue: removeAudioRecordingPkValue,
        removePkValues: removeAudioRecordingPkValues,
        isMissingRecords: isAudioRecordingMissingRecords,
        setShouldFetch: setAudioRecordingShouldFetch,
        setFetchMode: setAudioRecordingFetchMode,
        fetchQuickRefs: fetchAudioRecordingQuickRefs,
        fetchOne: fetchAudioRecordingOne,
        fetchOneWithFkIfk: fetchAudioRecordingOneWithFkIfk,
        fetchAll: fetchAudioRecordingAll,
        fetchPaginated: fetchAudioRecordingPaginated,

    } = useEntityWithFetch("audioRecording");

    return {
        audioRecordingSelectors,
        audioRecordingActions,
        audioRecordingRecords,
        audioRecordingUnsavedRecords,
        audioRecordingSelectedRecordIds,
        audioRecordingIsLoading,
        audioRecordingIsError,
        audioRecordingQuickRefRecords,
        addAudioRecordingMatrxId,
        addAudioRecordingMatrxIds,
        removeAudioRecordingMatrxId,
        removeAudioRecordingMatrxIds,
        addAudioRecordingPkValue,
        addAudioRecordingPkValues,
        removeAudioRecordingPkValue,
        removeAudioRecordingPkValues,
        isAudioRecordingMissingRecords,
        setAudioRecordingShouldFetch,
        setAudioRecordingFetchMode,
        fetchAudioRecordingQuickRefs,
        fetchAudioRecordingOne,
        fetchAudioRecordingOneWithFkIfk,
        fetchAudioRecordingAll,
        fetchAudioRecordingPaginated,
    };
};



type UseAudioRecordingUsersWithFetchReturn = {
    audioRecordingUsersSelectors: EntitySelectors<"audioRecordingUsers">;
    audioRecordingUsersActions: EntityActions<"audioRecordingUsers">;
    audioRecordingUsersRecords: Record<MatrxRecordId, AudioRecordingUsersData>;
    audioRecordingUsersUnsavedRecords: Record<MatrxRecordId, Partial<AudioRecordingUsersData>>;
    audioRecordingUsersSelectedRecordIds: MatrxRecordId[];
    audioRecordingUsersIsLoading: boolean;
    audioRecordingUsersIsError: boolean;
    audioRecordingUsersQuickRefRecords: QuickReferenceRecord[];
    addAudioRecordingUsersMatrxId: (recordId: MatrxRecordId) => void;
    addAudioRecordingUsersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAudioRecordingUsersMatrxId: (recordId: MatrxRecordId) => void;
    removeAudioRecordingUsersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAudioRecordingUsersPkValue: (pkValue: string) => void;
    addAudioRecordingUsersPkValues: (pkValues: Record<string, unknown>) => void;
    removeAudioRecordingUsersPkValue: (pkValue: string) => void;
    removeAudioRecordingUsersPkValues: (pkValues: Record<string, unknown>) => void;
    isAudioRecordingUsersMissingRecords: boolean;
    setAudioRecordingUsersShouldFetch: (shouldFetch: boolean) => void;
    setAudioRecordingUsersFetchMode: (fetchMode: FetchMode) => void;
    fetchAudioRecordingUsersQuickRefs: () => void;
    fetchAudioRecordingUsersOne: (recordId: MatrxRecordId) => void;
    fetchAudioRecordingUsersOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAudioRecordingUsersAll: () => void;
    fetchAudioRecordingUsersPaginated: (page: number, pageSize: number) => void;
};

export const useAudioRecordingUsersWithFetch = (): UseAudioRecordingUsersWithFetchReturn => {
    const {
        selectors: audioRecordingUsersSelectors,
        actions: audioRecordingUsersActions,
        allRecords: audioRecordingUsersRecords,
        unsavedRecords: audioRecordingUsersUnsavedRecords,
        selectedRecordIds: audioRecordingUsersSelectedRecordIds,
        isLoading: audioRecordingUsersIsLoading,
        isError: audioRecordingUsersIsError,
        quickRefRecords: audioRecordingUsersQuickRefRecords,
        addMatrxId: addAudioRecordingUsersMatrxId,
        addMatrxIds: addAudioRecordingUsersMatrxIds,
        removeMatrxId: removeAudioRecordingUsersMatrxId,
        removeMatrxIds: removeAudioRecordingUsersMatrxIds,
        addPkValue: addAudioRecordingUsersPkValue,
        addPkValues: addAudioRecordingUsersPkValues,
        removePkValue: removeAudioRecordingUsersPkValue,
        removePkValues: removeAudioRecordingUsersPkValues,
        isMissingRecords: isAudioRecordingUsersMissingRecords,
        setShouldFetch: setAudioRecordingUsersShouldFetch,
        setFetchMode: setAudioRecordingUsersFetchMode,
        fetchQuickRefs: fetchAudioRecordingUsersQuickRefs,
        fetchOne: fetchAudioRecordingUsersOne,
        fetchOneWithFkIfk: fetchAudioRecordingUsersOneWithFkIfk,
        fetchAll: fetchAudioRecordingUsersAll,
        fetchPaginated: fetchAudioRecordingUsersPaginated,

    } = useEntityWithFetch("audioRecordingUsers");

    return {
        audioRecordingUsersSelectors,
        audioRecordingUsersActions,
        audioRecordingUsersRecords,
        audioRecordingUsersUnsavedRecords,
        audioRecordingUsersSelectedRecordIds,
        audioRecordingUsersIsLoading,
        audioRecordingUsersIsError,
        audioRecordingUsersQuickRefRecords,
        addAudioRecordingUsersMatrxId,
        addAudioRecordingUsersMatrxIds,
        removeAudioRecordingUsersMatrxId,
        removeAudioRecordingUsersMatrxIds,
        addAudioRecordingUsersPkValue,
        addAudioRecordingUsersPkValues,
        removeAudioRecordingUsersPkValue,
        removeAudioRecordingUsersPkValues,
        isAudioRecordingUsersMissingRecords,
        setAudioRecordingUsersShouldFetch,
        setAudioRecordingUsersFetchMode,
        fetchAudioRecordingUsersQuickRefs,
        fetchAudioRecordingUsersOne,
        fetchAudioRecordingUsersOneWithFkIfk,
        fetchAudioRecordingUsersAll,
        fetchAudioRecordingUsersPaginated,
    };
};



type UseAutomationBoundaryBrokerWithFetchReturn = {
    automationBoundaryBrokerSelectors: EntitySelectors<"automationBoundaryBroker">;
    automationBoundaryBrokerActions: EntityActions<"automationBoundaryBroker">;
    automationBoundaryBrokerRecords: Record<MatrxRecordId, AutomationBoundaryBrokerData>;
    automationBoundaryBrokerUnsavedRecords: Record<MatrxRecordId, Partial<AutomationBoundaryBrokerData>>;
    automationBoundaryBrokerSelectedRecordIds: MatrxRecordId[];
    automationBoundaryBrokerIsLoading: boolean;
    automationBoundaryBrokerIsError: boolean;
    automationBoundaryBrokerQuickRefRecords: QuickReferenceRecord[];
    addAutomationBoundaryBrokerMatrxId: (recordId: MatrxRecordId) => void;
    addAutomationBoundaryBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAutomationBoundaryBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removeAutomationBoundaryBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAutomationBoundaryBrokerPkValue: (pkValue: string) => void;
    addAutomationBoundaryBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removeAutomationBoundaryBrokerPkValue: (pkValue: string) => void;
    removeAutomationBoundaryBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isAutomationBoundaryBrokerMissingRecords: boolean;
    setAutomationBoundaryBrokerShouldFetch: (shouldFetch: boolean) => void;
    setAutomationBoundaryBrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchAutomationBoundaryBrokerQuickRefs: () => void;
    fetchAutomationBoundaryBrokerOne: (recordId: MatrxRecordId) => void;
    fetchAutomationBoundaryBrokerOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAutomationBoundaryBrokerAll: () => void;
    fetchAutomationBoundaryBrokerPaginated: (page: number, pageSize: number) => void;
};

export const useAutomationBoundaryBrokerWithFetch = (): UseAutomationBoundaryBrokerWithFetchReturn => {
    const {
        selectors: automationBoundaryBrokerSelectors,
        actions: automationBoundaryBrokerActions,
        allRecords: automationBoundaryBrokerRecords,
        unsavedRecords: automationBoundaryBrokerUnsavedRecords,
        selectedRecordIds: automationBoundaryBrokerSelectedRecordIds,
        isLoading: automationBoundaryBrokerIsLoading,
        isError: automationBoundaryBrokerIsError,
        quickRefRecords: automationBoundaryBrokerQuickRefRecords,
        addMatrxId: addAutomationBoundaryBrokerMatrxId,
        addMatrxIds: addAutomationBoundaryBrokerMatrxIds,
        removeMatrxId: removeAutomationBoundaryBrokerMatrxId,
        removeMatrxIds: removeAutomationBoundaryBrokerMatrxIds,
        addPkValue: addAutomationBoundaryBrokerPkValue,
        addPkValues: addAutomationBoundaryBrokerPkValues,
        removePkValue: removeAutomationBoundaryBrokerPkValue,
        removePkValues: removeAutomationBoundaryBrokerPkValues,
        isMissingRecords: isAutomationBoundaryBrokerMissingRecords,
        setShouldFetch: setAutomationBoundaryBrokerShouldFetch,
        setFetchMode: setAutomationBoundaryBrokerFetchMode,
        fetchQuickRefs: fetchAutomationBoundaryBrokerQuickRefs,
        fetchOne: fetchAutomationBoundaryBrokerOne,
        fetchOneWithFkIfk: fetchAutomationBoundaryBrokerOneWithFkIfk,
        fetchAll: fetchAutomationBoundaryBrokerAll,
        fetchPaginated: fetchAutomationBoundaryBrokerPaginated,

    } = useEntityWithFetch("automationBoundaryBroker");

    return {
        automationBoundaryBrokerSelectors,
        automationBoundaryBrokerActions,
        automationBoundaryBrokerRecords,
        automationBoundaryBrokerUnsavedRecords,
        automationBoundaryBrokerSelectedRecordIds,
        automationBoundaryBrokerIsLoading,
        automationBoundaryBrokerIsError,
        automationBoundaryBrokerQuickRefRecords,
        addAutomationBoundaryBrokerMatrxId,
        addAutomationBoundaryBrokerMatrxIds,
        removeAutomationBoundaryBrokerMatrxId,
        removeAutomationBoundaryBrokerMatrxIds,
        addAutomationBoundaryBrokerPkValue,
        addAutomationBoundaryBrokerPkValues,
        removeAutomationBoundaryBrokerPkValue,
        removeAutomationBoundaryBrokerPkValues,
        isAutomationBoundaryBrokerMissingRecords,
        setAutomationBoundaryBrokerShouldFetch,
        setAutomationBoundaryBrokerFetchMode,
        fetchAutomationBoundaryBrokerQuickRefs,
        fetchAutomationBoundaryBrokerOne,
        fetchAutomationBoundaryBrokerOneWithFkIfk,
        fetchAutomationBoundaryBrokerAll,
        fetchAutomationBoundaryBrokerPaginated,
    };
};



type UseAutomationMatrixWithFetchReturn = {
    automationMatrixSelectors: EntitySelectors<"automationMatrix">;
    automationMatrixActions: EntityActions<"automationMatrix">;
    automationMatrixRecords: Record<MatrxRecordId, AutomationMatrixData>;
    automationMatrixUnsavedRecords: Record<MatrxRecordId, Partial<AutomationMatrixData>>;
    automationMatrixSelectedRecordIds: MatrxRecordId[];
    automationMatrixIsLoading: boolean;
    automationMatrixIsError: boolean;
    automationMatrixQuickRefRecords: QuickReferenceRecord[];
    addAutomationMatrixMatrxId: (recordId: MatrxRecordId) => void;
    addAutomationMatrixMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeAutomationMatrixMatrxId: (recordId: MatrxRecordId) => void;
    removeAutomationMatrixMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addAutomationMatrixPkValue: (pkValue: string) => void;
    addAutomationMatrixPkValues: (pkValues: Record<string, unknown>) => void;
    removeAutomationMatrixPkValue: (pkValue: string) => void;
    removeAutomationMatrixPkValues: (pkValues: Record<string, unknown>) => void;
    isAutomationMatrixMissingRecords: boolean;
    setAutomationMatrixShouldFetch: (shouldFetch: boolean) => void;
    setAutomationMatrixFetchMode: (fetchMode: FetchMode) => void;
    fetchAutomationMatrixQuickRefs: () => void;
    fetchAutomationMatrixOne: (recordId: MatrxRecordId) => void;
    fetchAutomationMatrixOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAutomationMatrixAll: () => void;
    fetchAutomationMatrixPaginated: (page: number, pageSize: number) => void;
};

export const useAutomationMatrixWithFetch = (): UseAutomationMatrixWithFetchReturn => {
    const {
        selectors: automationMatrixSelectors,
        actions: automationMatrixActions,
        allRecords: automationMatrixRecords,
        unsavedRecords: automationMatrixUnsavedRecords,
        selectedRecordIds: automationMatrixSelectedRecordIds,
        isLoading: automationMatrixIsLoading,
        isError: automationMatrixIsError,
        quickRefRecords: automationMatrixQuickRefRecords,
        addMatrxId: addAutomationMatrixMatrxId,
        addMatrxIds: addAutomationMatrixMatrxIds,
        removeMatrxId: removeAutomationMatrixMatrxId,
        removeMatrxIds: removeAutomationMatrixMatrxIds,
        addPkValue: addAutomationMatrixPkValue,
        addPkValues: addAutomationMatrixPkValues,
        removePkValue: removeAutomationMatrixPkValue,
        removePkValues: removeAutomationMatrixPkValues,
        isMissingRecords: isAutomationMatrixMissingRecords,
        setShouldFetch: setAutomationMatrixShouldFetch,
        setFetchMode: setAutomationMatrixFetchMode,
        fetchQuickRefs: fetchAutomationMatrixQuickRefs,
        fetchOne: fetchAutomationMatrixOne,
        fetchOneWithFkIfk: fetchAutomationMatrixOneWithFkIfk,
        fetchAll: fetchAutomationMatrixAll,
        fetchPaginated: fetchAutomationMatrixPaginated,

    } = useEntityWithFetch("automationMatrix");

    return {
        automationMatrixSelectors,
        automationMatrixActions,
        automationMatrixRecords,
        automationMatrixUnsavedRecords,
        automationMatrixSelectedRecordIds,
        automationMatrixIsLoading,
        automationMatrixIsError,
        automationMatrixQuickRefRecords,
        addAutomationMatrixMatrxId,
        addAutomationMatrixMatrxIds,
        removeAutomationMatrixMatrxId,
        removeAutomationMatrixMatrxIds,
        addAutomationMatrixPkValue,
        addAutomationMatrixPkValues,
        removeAutomationMatrixPkValue,
        removeAutomationMatrixPkValues,
        isAutomationMatrixMissingRecords,
        setAutomationMatrixShouldFetch,
        setAutomationMatrixFetchMode,
        fetchAutomationMatrixQuickRefs,
        fetchAutomationMatrixOne,
        fetchAutomationMatrixOneWithFkIfk,
        fetchAutomationMatrixAll,
        fetchAutomationMatrixPaginated,
    };
};



type UseBrokerWithFetchReturn = {
    brokerSelectors: EntitySelectors<"broker">;
    brokerActions: EntityActions<"broker">;
    brokerRecords: Record<MatrxRecordId, BrokerData>;
    brokerUnsavedRecords: Record<MatrxRecordId, Partial<BrokerData>>;
    brokerSelectedRecordIds: MatrxRecordId[];
    brokerIsLoading: boolean;
    brokerIsError: boolean;
    brokerQuickRefRecords: QuickReferenceRecord[];
    addBrokerMatrxId: (recordId: MatrxRecordId) => void;
    addBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removeBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addBrokerPkValue: (pkValue: string) => void;
    addBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removeBrokerPkValue: (pkValue: string) => void;
    removeBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isBrokerMissingRecords: boolean;
    setBrokerShouldFetch: (shouldFetch: boolean) => void;
    setBrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchBrokerQuickRefs: () => void;
    fetchBrokerOne: (recordId: MatrxRecordId) => void;
    fetchBrokerOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchBrokerAll: () => void;
    fetchBrokerPaginated: (page: number, pageSize: number) => void;
};

export const useBrokerWithFetch = (): UseBrokerWithFetchReturn => {
    const {
        selectors: brokerSelectors,
        actions: brokerActions,
        allRecords: brokerRecords,
        unsavedRecords: brokerUnsavedRecords,
        selectedRecordIds: brokerSelectedRecordIds,
        isLoading: brokerIsLoading,
        isError: brokerIsError,
        quickRefRecords: brokerQuickRefRecords,
        addMatrxId: addBrokerMatrxId,
        addMatrxIds: addBrokerMatrxIds,
        removeMatrxId: removeBrokerMatrxId,
        removeMatrxIds: removeBrokerMatrxIds,
        addPkValue: addBrokerPkValue,
        addPkValues: addBrokerPkValues,
        removePkValue: removeBrokerPkValue,
        removePkValues: removeBrokerPkValues,
        isMissingRecords: isBrokerMissingRecords,
        setShouldFetch: setBrokerShouldFetch,
        setFetchMode: setBrokerFetchMode,
        fetchQuickRefs: fetchBrokerQuickRefs,
        fetchOne: fetchBrokerOne,
        fetchOneWithFkIfk: fetchBrokerOneWithFkIfk,
        fetchAll: fetchBrokerAll,
        fetchPaginated: fetchBrokerPaginated,

    } = useEntityWithFetch("broker");

    return {
        brokerSelectors,
        brokerActions,
        brokerRecords,
        brokerUnsavedRecords,
        brokerSelectedRecordIds,
        brokerIsLoading,
        brokerIsError,
        brokerQuickRefRecords,
        addBrokerMatrxId,
        addBrokerMatrxIds,
        removeBrokerMatrxId,
        removeBrokerMatrxIds,
        addBrokerPkValue,
        addBrokerPkValues,
        removeBrokerPkValue,
        removeBrokerPkValues,
        isBrokerMissingRecords,
        setBrokerShouldFetch,
        setBrokerFetchMode,
        fetchBrokerQuickRefs,
        fetchBrokerOne,
        fetchBrokerOneWithFkIfk,
        fetchBrokerAll,
        fetchBrokerPaginated,
    };
};



type UseBrokerValueWithFetchReturn = {
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
    fetchBrokerValueQuickRefs: () => void;
    fetchBrokerValueOne: (recordId: MatrxRecordId) => void;
    fetchBrokerValueOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchBrokerValueAll: () => void;
    fetchBrokerValuePaginated: (page: number, pageSize: number) => void;
};

export const useBrokerValueWithFetch = (): UseBrokerValueWithFetchReturn => {
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
        fetchQuickRefs: fetchBrokerValueQuickRefs,
        fetchOne: fetchBrokerValueOne,
        fetchOneWithFkIfk: fetchBrokerValueOneWithFkIfk,
        fetchAll: fetchBrokerValueAll,
        fetchPaginated: fetchBrokerValuePaginated,

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
        fetchBrokerValueQuickRefs,
        fetchBrokerValueOne,
        fetchBrokerValueOneWithFkIfk,
        fetchBrokerValueAll,
        fetchBrokerValuePaginated,
    };
};



type UseBucketStructuresWithFetchReturn = {
    bucketStructuresSelectors: EntitySelectors<"bucketStructures">;
    bucketStructuresActions: EntityActions<"bucketStructures">;
    bucketStructuresRecords: Record<MatrxRecordId, BucketStructuresData>;
    bucketStructuresUnsavedRecords: Record<MatrxRecordId, Partial<BucketStructuresData>>;
    bucketStructuresSelectedRecordIds: MatrxRecordId[];
    bucketStructuresIsLoading: boolean;
    bucketStructuresIsError: boolean;
    bucketStructuresQuickRefRecords: QuickReferenceRecord[];
    addBucketStructuresMatrxId: (recordId: MatrxRecordId) => void;
    addBucketStructuresMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeBucketStructuresMatrxId: (recordId: MatrxRecordId) => void;
    removeBucketStructuresMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addBucketStructuresPkValue: (pkValue: string) => void;
    addBucketStructuresPkValues: (pkValues: Record<string, unknown>) => void;
    removeBucketStructuresPkValue: (pkValue: string) => void;
    removeBucketStructuresPkValues: (pkValues: Record<string, unknown>) => void;
    isBucketStructuresMissingRecords: boolean;
    setBucketStructuresShouldFetch: (shouldFetch: boolean) => void;
    setBucketStructuresFetchMode: (fetchMode: FetchMode) => void;
    fetchBucketStructuresQuickRefs: () => void;
    fetchBucketStructuresOne: (recordId: MatrxRecordId) => void;
    fetchBucketStructuresOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchBucketStructuresAll: () => void;
    fetchBucketStructuresPaginated: (page: number, pageSize: number) => void;
};

export const useBucketStructuresWithFetch = (): UseBucketStructuresWithFetchReturn => {
    const {
        selectors: bucketStructuresSelectors,
        actions: bucketStructuresActions,
        allRecords: bucketStructuresRecords,
        unsavedRecords: bucketStructuresUnsavedRecords,
        selectedRecordIds: bucketStructuresSelectedRecordIds,
        isLoading: bucketStructuresIsLoading,
        isError: bucketStructuresIsError,
        quickRefRecords: bucketStructuresQuickRefRecords,
        addMatrxId: addBucketStructuresMatrxId,
        addMatrxIds: addBucketStructuresMatrxIds,
        removeMatrxId: removeBucketStructuresMatrxId,
        removeMatrxIds: removeBucketStructuresMatrxIds,
        addPkValue: addBucketStructuresPkValue,
        addPkValues: addBucketStructuresPkValues,
        removePkValue: removeBucketStructuresPkValue,
        removePkValues: removeBucketStructuresPkValues,
        isMissingRecords: isBucketStructuresMissingRecords,
        setShouldFetch: setBucketStructuresShouldFetch,
        setFetchMode: setBucketStructuresFetchMode,
        fetchQuickRefs: fetchBucketStructuresQuickRefs,
        fetchOne: fetchBucketStructuresOne,
        fetchOneWithFkIfk: fetchBucketStructuresOneWithFkIfk,
        fetchAll: fetchBucketStructuresAll,
        fetchPaginated: fetchBucketStructuresPaginated,

    } = useEntityWithFetch("bucketStructures");

    return {
        bucketStructuresSelectors,
        bucketStructuresActions,
        bucketStructuresRecords,
        bucketStructuresUnsavedRecords,
        bucketStructuresSelectedRecordIds,
        bucketStructuresIsLoading,
        bucketStructuresIsError,
        bucketStructuresQuickRefRecords,
        addBucketStructuresMatrxId,
        addBucketStructuresMatrxIds,
        removeBucketStructuresMatrxId,
        removeBucketStructuresMatrxIds,
        addBucketStructuresPkValue,
        addBucketStructuresPkValues,
        removeBucketStructuresPkValue,
        removeBucketStructuresPkValues,
        isBucketStructuresMissingRecords,
        setBucketStructuresShouldFetch,
        setBucketStructuresFetchMode,
        fetchBucketStructuresQuickRefs,
        fetchBucketStructuresOne,
        fetchBucketStructuresOneWithFkIfk,
        fetchBucketStructuresAll,
        fetchBucketStructuresPaginated,
    };
};



type UseBucketTreeStructuresWithFetchReturn = {
    bucketTreeStructuresSelectors: EntitySelectors<"bucketTreeStructures">;
    bucketTreeStructuresActions: EntityActions<"bucketTreeStructures">;
    bucketTreeStructuresRecords: Record<MatrxRecordId, BucketTreeStructuresData>;
    bucketTreeStructuresUnsavedRecords: Record<MatrxRecordId, Partial<BucketTreeStructuresData>>;
    bucketTreeStructuresSelectedRecordIds: MatrxRecordId[];
    bucketTreeStructuresIsLoading: boolean;
    bucketTreeStructuresIsError: boolean;
    bucketTreeStructuresQuickRefRecords: QuickReferenceRecord[];
    addBucketTreeStructuresMatrxId: (recordId: MatrxRecordId) => void;
    addBucketTreeStructuresMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeBucketTreeStructuresMatrxId: (recordId: MatrxRecordId) => void;
    removeBucketTreeStructuresMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addBucketTreeStructuresPkValue: (pkValue: string) => void;
    addBucketTreeStructuresPkValues: (pkValues: Record<string, unknown>) => void;
    removeBucketTreeStructuresPkValue: (pkValue: string) => void;
    removeBucketTreeStructuresPkValues: (pkValues: Record<string, unknown>) => void;
    isBucketTreeStructuresMissingRecords: boolean;
    setBucketTreeStructuresShouldFetch: (shouldFetch: boolean) => void;
    setBucketTreeStructuresFetchMode: (fetchMode: FetchMode) => void;
    fetchBucketTreeStructuresQuickRefs: () => void;
    fetchBucketTreeStructuresOne: (recordId: MatrxRecordId) => void;
    fetchBucketTreeStructuresOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchBucketTreeStructuresAll: () => void;
    fetchBucketTreeStructuresPaginated: (page: number, pageSize: number) => void;
};

export const useBucketTreeStructuresWithFetch = (): UseBucketTreeStructuresWithFetchReturn => {
    const {
        selectors: bucketTreeStructuresSelectors,
        actions: bucketTreeStructuresActions,
        allRecords: bucketTreeStructuresRecords,
        unsavedRecords: bucketTreeStructuresUnsavedRecords,
        selectedRecordIds: bucketTreeStructuresSelectedRecordIds,
        isLoading: bucketTreeStructuresIsLoading,
        isError: bucketTreeStructuresIsError,
        quickRefRecords: bucketTreeStructuresQuickRefRecords,
        addMatrxId: addBucketTreeStructuresMatrxId,
        addMatrxIds: addBucketTreeStructuresMatrxIds,
        removeMatrxId: removeBucketTreeStructuresMatrxId,
        removeMatrxIds: removeBucketTreeStructuresMatrxIds,
        addPkValue: addBucketTreeStructuresPkValue,
        addPkValues: addBucketTreeStructuresPkValues,
        removePkValue: removeBucketTreeStructuresPkValue,
        removePkValues: removeBucketTreeStructuresPkValues,
        isMissingRecords: isBucketTreeStructuresMissingRecords,
        setShouldFetch: setBucketTreeStructuresShouldFetch,
        setFetchMode: setBucketTreeStructuresFetchMode,
        fetchQuickRefs: fetchBucketTreeStructuresQuickRefs,
        fetchOne: fetchBucketTreeStructuresOne,
        fetchOneWithFkIfk: fetchBucketTreeStructuresOneWithFkIfk,
        fetchAll: fetchBucketTreeStructuresAll,
        fetchPaginated: fetchBucketTreeStructuresPaginated,

    } = useEntityWithFetch("bucketTreeStructures");

    return {
        bucketTreeStructuresSelectors,
        bucketTreeStructuresActions,
        bucketTreeStructuresRecords,
        bucketTreeStructuresUnsavedRecords,
        bucketTreeStructuresSelectedRecordIds,
        bucketTreeStructuresIsLoading,
        bucketTreeStructuresIsError,
        bucketTreeStructuresQuickRefRecords,
        addBucketTreeStructuresMatrxId,
        addBucketTreeStructuresMatrxIds,
        removeBucketTreeStructuresMatrxId,
        removeBucketTreeStructuresMatrxIds,
        addBucketTreeStructuresPkValue,
        addBucketTreeStructuresPkValues,
        removeBucketTreeStructuresPkValue,
        removeBucketTreeStructuresPkValues,
        isBucketTreeStructuresMissingRecords,
        setBucketTreeStructuresShouldFetch,
        setBucketTreeStructuresFetchMode,
        fetchBucketTreeStructuresQuickRefs,
        fetchBucketTreeStructuresOne,
        fetchBucketTreeStructuresOneWithFkIfk,
        fetchBucketTreeStructuresAll,
        fetchBucketTreeStructuresPaginated,
    };
};



type UseCategoryWithFetchReturn = {
    categorySelectors: EntitySelectors<"category">;
    categoryActions: EntityActions<"category">;
    categoryRecords: Record<MatrxRecordId, CategoryData>;
    categoryUnsavedRecords: Record<MatrxRecordId, Partial<CategoryData>>;
    categorySelectedRecordIds: MatrxRecordId[];
    categoryIsLoading: boolean;
    categoryIsError: boolean;
    categoryQuickRefRecords: QuickReferenceRecord[];
    addCategoryMatrxId: (recordId: MatrxRecordId) => void;
    addCategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeCategoryMatrxId: (recordId: MatrxRecordId) => void;
    removeCategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addCategoryPkValue: (pkValue: string) => void;
    addCategoryPkValues: (pkValues: Record<string, unknown>) => void;
    removeCategoryPkValue: (pkValue: string) => void;
    removeCategoryPkValues: (pkValues: Record<string, unknown>) => void;
    isCategoryMissingRecords: boolean;
    setCategoryShouldFetch: (shouldFetch: boolean) => void;
    setCategoryFetchMode: (fetchMode: FetchMode) => void;
    fetchCategoryQuickRefs: () => void;
    fetchCategoryOne: (recordId: MatrxRecordId) => void;
    fetchCategoryOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchCategoryAll: () => void;
    fetchCategoryPaginated: (page: number, pageSize: number) => void;
};

export const useCategoryWithFetch = (): UseCategoryWithFetchReturn => {
    const {
        selectors: categorySelectors,
        actions: categoryActions,
        allRecords: categoryRecords,
        unsavedRecords: categoryUnsavedRecords,
        selectedRecordIds: categorySelectedRecordIds,
        isLoading: categoryIsLoading,
        isError: categoryIsError,
        quickRefRecords: categoryQuickRefRecords,
        addMatrxId: addCategoryMatrxId,
        addMatrxIds: addCategoryMatrxIds,
        removeMatrxId: removeCategoryMatrxId,
        removeMatrxIds: removeCategoryMatrxIds,
        addPkValue: addCategoryPkValue,
        addPkValues: addCategoryPkValues,
        removePkValue: removeCategoryPkValue,
        removePkValues: removeCategoryPkValues,
        isMissingRecords: isCategoryMissingRecords,
        setShouldFetch: setCategoryShouldFetch,
        setFetchMode: setCategoryFetchMode,
        fetchQuickRefs: fetchCategoryQuickRefs,
        fetchOne: fetchCategoryOne,
        fetchOneWithFkIfk: fetchCategoryOneWithFkIfk,
        fetchAll: fetchCategoryAll,
        fetchPaginated: fetchCategoryPaginated,

    } = useEntityWithFetch("category");

    return {
        categorySelectors,
        categoryActions,
        categoryRecords,
        categoryUnsavedRecords,
        categorySelectedRecordIds,
        categoryIsLoading,
        categoryIsError,
        categoryQuickRefRecords,
        addCategoryMatrxId,
        addCategoryMatrxIds,
        removeCategoryMatrxId,
        removeCategoryMatrxIds,
        addCategoryPkValue,
        addCategoryPkValues,
        removeCategoryPkValue,
        removeCategoryPkValues,
        isCategoryMissingRecords,
        setCategoryShouldFetch,
        setCategoryFetchMode,
        fetchCategoryQuickRefs,
        fetchCategoryOne,
        fetchCategoryOneWithFkIfk,
        fetchCategoryAll,
        fetchCategoryPaginated,
    };
};



type UseCompiledRecipeWithFetchReturn = {
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
    fetchCompiledRecipeQuickRefs: () => void;
    fetchCompiledRecipeOne: (recordId: MatrxRecordId) => void;
    fetchCompiledRecipeOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchCompiledRecipeAll: () => void;
    fetchCompiledRecipePaginated: (page: number, pageSize: number) => void;
};

export const useCompiledRecipeWithFetch = (): UseCompiledRecipeWithFetchReturn => {
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



type UseComponentGroupsWithFetchReturn = {
    componentGroupsSelectors: EntitySelectors<"componentGroups">;
    componentGroupsActions: EntityActions<"componentGroups">;
    componentGroupsRecords: Record<MatrxRecordId, ComponentGroupsData>;
    componentGroupsUnsavedRecords: Record<MatrxRecordId, Partial<ComponentGroupsData>>;
    componentGroupsSelectedRecordIds: MatrxRecordId[];
    componentGroupsIsLoading: boolean;
    componentGroupsIsError: boolean;
    componentGroupsQuickRefRecords: QuickReferenceRecord[];
    addComponentGroupsMatrxId: (recordId: MatrxRecordId) => void;
    addComponentGroupsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeComponentGroupsMatrxId: (recordId: MatrxRecordId) => void;
    removeComponentGroupsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addComponentGroupsPkValue: (pkValue: string) => void;
    addComponentGroupsPkValues: (pkValues: Record<string, unknown>) => void;
    removeComponentGroupsPkValue: (pkValue: string) => void;
    removeComponentGroupsPkValues: (pkValues: Record<string, unknown>) => void;
    isComponentGroupsMissingRecords: boolean;
    setComponentGroupsShouldFetch: (shouldFetch: boolean) => void;
    setComponentGroupsFetchMode: (fetchMode: FetchMode) => void;
    fetchComponentGroupsQuickRefs: () => void;
    fetchComponentGroupsOne: (recordId: MatrxRecordId) => void;
    fetchComponentGroupsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchComponentGroupsAll: () => void;
    fetchComponentGroupsPaginated: (page: number, pageSize: number) => void;
};

export const useComponentGroupsWithFetch = (): UseComponentGroupsWithFetchReturn => {
    const {
        selectors: componentGroupsSelectors,
        actions: componentGroupsActions,
        allRecords: componentGroupsRecords,
        unsavedRecords: componentGroupsUnsavedRecords,
        selectedRecordIds: componentGroupsSelectedRecordIds,
        isLoading: componentGroupsIsLoading,
        isError: componentGroupsIsError,
        quickRefRecords: componentGroupsQuickRefRecords,
        addMatrxId: addComponentGroupsMatrxId,
        addMatrxIds: addComponentGroupsMatrxIds,
        removeMatrxId: removeComponentGroupsMatrxId,
        removeMatrxIds: removeComponentGroupsMatrxIds,
        addPkValue: addComponentGroupsPkValue,
        addPkValues: addComponentGroupsPkValues,
        removePkValue: removeComponentGroupsPkValue,
        removePkValues: removeComponentGroupsPkValues,
        isMissingRecords: isComponentGroupsMissingRecords,
        setShouldFetch: setComponentGroupsShouldFetch,
        setFetchMode: setComponentGroupsFetchMode,
        fetchQuickRefs: fetchComponentGroupsQuickRefs,
        fetchOne: fetchComponentGroupsOne,
        fetchOneWithFkIfk: fetchComponentGroupsOneWithFkIfk,
        fetchAll: fetchComponentGroupsAll,
        fetchPaginated: fetchComponentGroupsPaginated,

    } = useEntityWithFetch("componentGroups");

    return {
        componentGroupsSelectors,
        componentGroupsActions,
        componentGroupsRecords,
        componentGroupsUnsavedRecords,
        componentGroupsSelectedRecordIds,
        componentGroupsIsLoading,
        componentGroupsIsError,
        componentGroupsQuickRefRecords,
        addComponentGroupsMatrxId,
        addComponentGroupsMatrxIds,
        removeComponentGroupsMatrxId,
        removeComponentGroupsMatrxIds,
        addComponentGroupsPkValue,
        addComponentGroupsPkValues,
        removeComponentGroupsPkValue,
        removeComponentGroupsPkValues,
        isComponentGroupsMissingRecords,
        setComponentGroupsShouldFetch,
        setComponentGroupsFetchMode,
        fetchComponentGroupsQuickRefs,
        fetchComponentGroupsOne,
        fetchComponentGroupsOneWithFkIfk,
        fetchComponentGroupsAll,
        fetchComponentGroupsPaginated,
    };
};



type UseContainerFieldsWithFetchReturn = {
    containerFieldsSelectors: EntitySelectors<"containerFields">;
    containerFieldsActions: EntityActions<"containerFields">;
    containerFieldsRecords: Record<MatrxRecordId, ContainerFieldsData>;
    containerFieldsUnsavedRecords: Record<MatrxRecordId, Partial<ContainerFieldsData>>;
    containerFieldsSelectedRecordIds: MatrxRecordId[];
    containerFieldsIsLoading: boolean;
    containerFieldsIsError: boolean;
    containerFieldsQuickRefRecords: QuickReferenceRecord[];
    addContainerFieldsMatrxId: (recordId: MatrxRecordId) => void;
    addContainerFieldsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeContainerFieldsMatrxId: (recordId: MatrxRecordId) => void;
    removeContainerFieldsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addContainerFieldsPkValue: (pkValue: string) => void;
    addContainerFieldsPkValues: (pkValues: Record<string, unknown>) => void;
    removeContainerFieldsPkValue: (pkValue: string) => void;
    removeContainerFieldsPkValues: (pkValues: Record<string, unknown>) => void;
    isContainerFieldsMissingRecords: boolean;
    setContainerFieldsShouldFetch: (shouldFetch: boolean) => void;
    setContainerFieldsFetchMode: (fetchMode: FetchMode) => void;
    fetchContainerFieldsQuickRefs: () => void;
    fetchContainerFieldsOne: (recordId: MatrxRecordId) => void;
    fetchContainerFieldsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchContainerFieldsAll: () => void;
    fetchContainerFieldsPaginated: (page: number, pageSize: number) => void;
};

export const useContainerFieldsWithFetch = (): UseContainerFieldsWithFetchReturn => {
    const {
        selectors: containerFieldsSelectors,
        actions: containerFieldsActions,
        allRecords: containerFieldsRecords,
        unsavedRecords: containerFieldsUnsavedRecords,
        selectedRecordIds: containerFieldsSelectedRecordIds,
        isLoading: containerFieldsIsLoading,
        isError: containerFieldsIsError,
        quickRefRecords: containerFieldsQuickRefRecords,
        addMatrxId: addContainerFieldsMatrxId,
        addMatrxIds: addContainerFieldsMatrxIds,
        removeMatrxId: removeContainerFieldsMatrxId,
        removeMatrxIds: removeContainerFieldsMatrxIds,
        addPkValue: addContainerFieldsPkValue,
        addPkValues: addContainerFieldsPkValues,
        removePkValue: removeContainerFieldsPkValue,
        removePkValues: removeContainerFieldsPkValues,
        isMissingRecords: isContainerFieldsMissingRecords,
        setShouldFetch: setContainerFieldsShouldFetch,
        setFetchMode: setContainerFieldsFetchMode,
        fetchQuickRefs: fetchContainerFieldsQuickRefs,
        fetchOne: fetchContainerFieldsOne,
        fetchOneWithFkIfk: fetchContainerFieldsOneWithFkIfk,
        fetchAll: fetchContainerFieldsAll,
        fetchPaginated: fetchContainerFieldsPaginated,

    } = useEntityWithFetch("containerFields");

    return {
        containerFieldsSelectors,
        containerFieldsActions,
        containerFieldsRecords,
        containerFieldsUnsavedRecords,
        containerFieldsSelectedRecordIds,
        containerFieldsIsLoading,
        containerFieldsIsError,
        containerFieldsQuickRefRecords,
        addContainerFieldsMatrxId,
        addContainerFieldsMatrxIds,
        removeContainerFieldsMatrxId,
        removeContainerFieldsMatrxIds,
        addContainerFieldsPkValue,
        addContainerFieldsPkValues,
        removeContainerFieldsPkValue,
        removeContainerFieldsPkValues,
        isContainerFieldsMissingRecords,
        setContainerFieldsShouldFetch,
        setContainerFieldsFetchMode,
        fetchContainerFieldsQuickRefs,
        fetchContainerFieldsOne,
        fetchContainerFieldsOneWithFkIfk,
        fetchContainerFieldsAll,
        fetchContainerFieldsPaginated,
    };
};



type UseConversationWithFetchReturn = {
    conversationSelectors: EntitySelectors<"conversation">;
    conversationActions: EntityActions<"conversation">;
    conversationRecords: Record<MatrxRecordId, ConversationData>;
    conversationUnsavedRecords: Record<MatrxRecordId, Partial<ConversationData>>;
    conversationSelectedRecordIds: MatrxRecordId[];
    conversationIsLoading: boolean;
    conversationIsError: boolean;
    conversationQuickRefRecords: QuickReferenceRecord[];
    addConversationMatrxId: (recordId: MatrxRecordId) => void;
    addConversationMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeConversationMatrxId: (recordId: MatrxRecordId) => void;
    removeConversationMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addConversationPkValue: (pkValue: string) => void;
    addConversationPkValues: (pkValues: Record<string, unknown>) => void;
    removeConversationPkValue: (pkValue: string) => void;
    removeConversationPkValues: (pkValues: Record<string, unknown>) => void;
    isConversationMissingRecords: boolean;
    setConversationShouldFetch: (shouldFetch: boolean) => void;
    setConversationFetchMode: (fetchMode: FetchMode) => void;
    fetchConversationQuickRefs: () => void;
    fetchConversationOne: (recordId: MatrxRecordId) => void;
    fetchConversationOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchConversationAll: () => void;
    fetchConversationPaginated: (page: number, pageSize: number) => void;
};

export const useConversationWithFetch = (): UseConversationWithFetchReturn => {
    const {
        selectors: conversationSelectors,
        actions: conversationActions,
        allRecords: conversationRecords,
        unsavedRecords: conversationUnsavedRecords,
        selectedRecordIds: conversationSelectedRecordIds,
        isLoading: conversationIsLoading,
        isError: conversationIsError,
        quickRefRecords: conversationQuickRefRecords,
        addMatrxId: addConversationMatrxId,
        addMatrxIds: addConversationMatrxIds,
        removeMatrxId: removeConversationMatrxId,
        removeMatrxIds: removeConversationMatrxIds,
        addPkValue: addConversationPkValue,
        addPkValues: addConversationPkValues,
        removePkValue: removeConversationPkValue,
        removePkValues: removeConversationPkValues,
        isMissingRecords: isConversationMissingRecords,
        setShouldFetch: setConversationShouldFetch,
        setFetchMode: setConversationFetchMode,
        fetchQuickRefs: fetchConversationQuickRefs,
        fetchOne: fetchConversationOne,
        fetchOneWithFkIfk: fetchConversationOneWithFkIfk,
        fetchAll: fetchConversationAll,
        fetchPaginated: fetchConversationPaginated,

    } = useEntityWithFetch("conversation");

    return {
        conversationSelectors,
        conversationActions,
        conversationRecords,
        conversationUnsavedRecords,
        conversationSelectedRecordIds,
        conversationIsLoading,
        conversationIsError,
        conversationQuickRefRecords,
        addConversationMatrxId,
        addConversationMatrxIds,
        removeConversationMatrxId,
        removeConversationMatrxIds,
        addConversationPkValue,
        addConversationPkValues,
        removeConversationPkValue,
        removeConversationPkValues,
        isConversationMissingRecords,
        setConversationShouldFetch,
        setConversationFetchMode,
        fetchConversationQuickRefs,
        fetchConversationOne,
        fetchConversationOneWithFkIfk,
        fetchConversationAll,
        fetchConversationPaginated,
    };
};



type UseCustomAppConfigsWithFetchReturn = {
    customAppConfigsSelectors: EntitySelectors<"customAppConfigs">;
    customAppConfigsActions: EntityActions<"customAppConfigs">;
    customAppConfigsRecords: Record<MatrxRecordId, CustomAppConfigsData>;
    customAppConfigsUnsavedRecords: Record<MatrxRecordId, Partial<CustomAppConfigsData>>;
    customAppConfigsSelectedRecordIds: MatrxRecordId[];
    customAppConfigsIsLoading: boolean;
    customAppConfigsIsError: boolean;
    customAppConfigsQuickRefRecords: QuickReferenceRecord[];
    addCustomAppConfigsMatrxId: (recordId: MatrxRecordId) => void;
    addCustomAppConfigsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeCustomAppConfigsMatrxId: (recordId: MatrxRecordId) => void;
    removeCustomAppConfigsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addCustomAppConfigsPkValue: (pkValue: string) => void;
    addCustomAppConfigsPkValues: (pkValues: Record<string, unknown>) => void;
    removeCustomAppConfigsPkValue: (pkValue: string) => void;
    removeCustomAppConfigsPkValues: (pkValues: Record<string, unknown>) => void;
    isCustomAppConfigsMissingRecords: boolean;
    setCustomAppConfigsShouldFetch: (shouldFetch: boolean) => void;
    setCustomAppConfigsFetchMode: (fetchMode: FetchMode) => void;
    fetchCustomAppConfigsQuickRefs: () => void;
    fetchCustomAppConfigsOne: (recordId: MatrxRecordId) => void;
    fetchCustomAppConfigsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchCustomAppConfigsAll: () => void;
    fetchCustomAppConfigsPaginated: (page: number, pageSize: number) => void;
};

export const useCustomAppConfigsWithFetch = (): UseCustomAppConfigsWithFetchReturn => {
    const {
        selectors: customAppConfigsSelectors,
        actions: customAppConfigsActions,
        allRecords: customAppConfigsRecords,
        unsavedRecords: customAppConfigsUnsavedRecords,
        selectedRecordIds: customAppConfigsSelectedRecordIds,
        isLoading: customAppConfigsIsLoading,
        isError: customAppConfigsIsError,
        quickRefRecords: customAppConfigsQuickRefRecords,
        addMatrxId: addCustomAppConfigsMatrxId,
        addMatrxIds: addCustomAppConfigsMatrxIds,
        removeMatrxId: removeCustomAppConfigsMatrxId,
        removeMatrxIds: removeCustomAppConfigsMatrxIds,
        addPkValue: addCustomAppConfigsPkValue,
        addPkValues: addCustomAppConfigsPkValues,
        removePkValue: removeCustomAppConfigsPkValue,
        removePkValues: removeCustomAppConfigsPkValues,
        isMissingRecords: isCustomAppConfigsMissingRecords,
        setShouldFetch: setCustomAppConfigsShouldFetch,
        setFetchMode: setCustomAppConfigsFetchMode,
        fetchQuickRefs: fetchCustomAppConfigsQuickRefs,
        fetchOne: fetchCustomAppConfigsOne,
        fetchOneWithFkIfk: fetchCustomAppConfigsOneWithFkIfk,
        fetchAll: fetchCustomAppConfigsAll,
        fetchPaginated: fetchCustomAppConfigsPaginated,

    } = useEntityWithFetch("customAppConfigs");

    return {
        customAppConfigsSelectors,
        customAppConfigsActions,
        customAppConfigsRecords,
        customAppConfigsUnsavedRecords,
        customAppConfigsSelectedRecordIds,
        customAppConfigsIsLoading,
        customAppConfigsIsError,
        customAppConfigsQuickRefRecords,
        addCustomAppConfigsMatrxId,
        addCustomAppConfigsMatrxIds,
        removeCustomAppConfigsMatrxId,
        removeCustomAppConfigsMatrxIds,
        addCustomAppConfigsPkValue,
        addCustomAppConfigsPkValues,
        removeCustomAppConfigsPkValue,
        removeCustomAppConfigsPkValues,
        isCustomAppConfigsMissingRecords,
        setCustomAppConfigsShouldFetch,
        setCustomAppConfigsFetchMode,
        fetchCustomAppConfigsQuickRefs,
        fetchCustomAppConfigsOne,
        fetchCustomAppConfigsOneWithFkIfk,
        fetchCustomAppConfigsAll,
        fetchCustomAppConfigsPaginated,
    };
};



type UseCustomAppletConfigsWithFetchReturn = {
    customAppletConfigsSelectors: EntitySelectors<"customAppletConfigs">;
    customAppletConfigsActions: EntityActions<"customAppletConfigs">;
    customAppletConfigsRecords: Record<MatrxRecordId, CustomAppletConfigsData>;
    customAppletConfigsUnsavedRecords: Record<MatrxRecordId, Partial<CustomAppletConfigsData>>;
    customAppletConfigsSelectedRecordIds: MatrxRecordId[];
    customAppletConfigsIsLoading: boolean;
    customAppletConfigsIsError: boolean;
    customAppletConfigsQuickRefRecords: QuickReferenceRecord[];
    addCustomAppletConfigsMatrxId: (recordId: MatrxRecordId) => void;
    addCustomAppletConfigsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeCustomAppletConfigsMatrxId: (recordId: MatrxRecordId) => void;
    removeCustomAppletConfigsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addCustomAppletConfigsPkValue: (pkValue: string) => void;
    addCustomAppletConfigsPkValues: (pkValues: Record<string, unknown>) => void;
    removeCustomAppletConfigsPkValue: (pkValue: string) => void;
    removeCustomAppletConfigsPkValues: (pkValues: Record<string, unknown>) => void;
    isCustomAppletConfigsMissingRecords: boolean;
    setCustomAppletConfigsShouldFetch: (shouldFetch: boolean) => void;
    setCustomAppletConfigsFetchMode: (fetchMode: FetchMode) => void;
    fetchCustomAppletConfigsQuickRefs: () => void;
    fetchCustomAppletConfigsOne: (recordId: MatrxRecordId) => void;
    fetchCustomAppletConfigsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchCustomAppletConfigsAll: () => void;
    fetchCustomAppletConfigsPaginated: (page: number, pageSize: number) => void;
};

export const useCustomAppletConfigsWithFetch = (): UseCustomAppletConfigsWithFetchReturn => {
    const {
        selectors: customAppletConfigsSelectors,
        actions: customAppletConfigsActions,
        allRecords: customAppletConfigsRecords,
        unsavedRecords: customAppletConfigsUnsavedRecords,
        selectedRecordIds: customAppletConfigsSelectedRecordIds,
        isLoading: customAppletConfigsIsLoading,
        isError: customAppletConfigsIsError,
        quickRefRecords: customAppletConfigsQuickRefRecords,
        addMatrxId: addCustomAppletConfigsMatrxId,
        addMatrxIds: addCustomAppletConfigsMatrxIds,
        removeMatrxId: removeCustomAppletConfigsMatrxId,
        removeMatrxIds: removeCustomAppletConfigsMatrxIds,
        addPkValue: addCustomAppletConfigsPkValue,
        addPkValues: addCustomAppletConfigsPkValues,
        removePkValue: removeCustomAppletConfigsPkValue,
        removePkValues: removeCustomAppletConfigsPkValues,
        isMissingRecords: isCustomAppletConfigsMissingRecords,
        setShouldFetch: setCustomAppletConfigsShouldFetch,
        setFetchMode: setCustomAppletConfigsFetchMode,
        fetchQuickRefs: fetchCustomAppletConfigsQuickRefs,
        fetchOne: fetchCustomAppletConfigsOne,
        fetchOneWithFkIfk: fetchCustomAppletConfigsOneWithFkIfk,
        fetchAll: fetchCustomAppletConfigsAll,
        fetchPaginated: fetchCustomAppletConfigsPaginated,

    } = useEntityWithFetch("customAppletConfigs");

    return {
        customAppletConfigsSelectors,
        customAppletConfigsActions,
        customAppletConfigsRecords,
        customAppletConfigsUnsavedRecords,
        customAppletConfigsSelectedRecordIds,
        customAppletConfigsIsLoading,
        customAppletConfigsIsError,
        customAppletConfigsQuickRefRecords,
        addCustomAppletConfigsMatrxId,
        addCustomAppletConfigsMatrxIds,
        removeCustomAppletConfigsMatrxId,
        removeCustomAppletConfigsMatrxIds,
        addCustomAppletConfigsPkValue,
        addCustomAppletConfigsPkValues,
        removeCustomAppletConfigsPkValue,
        removeCustomAppletConfigsPkValues,
        isCustomAppletConfigsMissingRecords,
        setCustomAppletConfigsShouldFetch,
        setCustomAppletConfigsFetchMode,
        fetchCustomAppletConfigsQuickRefs,
        fetchCustomAppletConfigsOne,
        fetchCustomAppletConfigsOneWithFkIfk,
        fetchCustomAppletConfigsAll,
        fetchCustomAppletConfigsPaginated,
    };
};



type UseDataBrokerWithFetchReturn = {
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
    fetchDataBrokerQuickRefs: () => void;
    fetchDataBrokerOne: (recordId: MatrxRecordId) => void;
    fetchDataBrokerOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchDataBrokerAll: () => void;
    fetchDataBrokerPaginated: (page: number, pageSize: number) => void;
};

export const useDataBrokerWithFetch = (): UseDataBrokerWithFetchReturn => {
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



type UseDataInputComponentWithFetchReturn = {
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
    fetchDataInputComponentQuickRefs: () => void;
    fetchDataInputComponentOne: (recordId: MatrxRecordId) => void;
    fetchDataInputComponentOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchDataInputComponentAll: () => void;
    fetchDataInputComponentPaginated: (page: number, pageSize: number) => void;
};

export const useDataInputComponentWithFetch = (): UseDataInputComponentWithFetchReturn => {
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
        fetchQuickRefs: fetchDataInputComponentQuickRefs,
        fetchOne: fetchDataInputComponentOne,
        fetchOneWithFkIfk: fetchDataInputComponentOneWithFkIfk,
        fetchAll: fetchDataInputComponentAll,
        fetchPaginated: fetchDataInputComponentPaginated,

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
        fetchDataInputComponentQuickRefs,
        fetchDataInputComponentOne,
        fetchDataInputComponentOneWithFkIfk,
        fetchDataInputComponentAll,
        fetchDataInputComponentPaginated,
    };
};



type UseDataOutputComponentWithFetchReturn = {
    dataOutputComponentSelectors: EntitySelectors<"dataOutputComponent">;
    dataOutputComponentActions: EntityActions<"dataOutputComponent">;
    dataOutputComponentRecords: Record<MatrxRecordId, DataOutputComponentData>;
    dataOutputComponentUnsavedRecords: Record<MatrxRecordId, Partial<DataOutputComponentData>>;
    dataOutputComponentSelectedRecordIds: MatrxRecordId[];
    dataOutputComponentIsLoading: boolean;
    dataOutputComponentIsError: boolean;
    dataOutputComponentQuickRefRecords: QuickReferenceRecord[];
    addDataOutputComponentMatrxId: (recordId: MatrxRecordId) => void;
    addDataOutputComponentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeDataOutputComponentMatrxId: (recordId: MatrxRecordId) => void;
    removeDataOutputComponentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addDataOutputComponentPkValue: (pkValue: string) => void;
    addDataOutputComponentPkValues: (pkValues: Record<string, unknown>) => void;
    removeDataOutputComponentPkValue: (pkValue: string) => void;
    removeDataOutputComponentPkValues: (pkValues: Record<string, unknown>) => void;
    isDataOutputComponentMissingRecords: boolean;
    setDataOutputComponentShouldFetch: (shouldFetch: boolean) => void;
    setDataOutputComponentFetchMode: (fetchMode: FetchMode) => void;
    fetchDataOutputComponentQuickRefs: () => void;
    fetchDataOutputComponentOne: (recordId: MatrxRecordId) => void;
    fetchDataOutputComponentOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchDataOutputComponentAll: () => void;
    fetchDataOutputComponentPaginated: (page: number, pageSize: number) => void;
};

export const useDataOutputComponentWithFetch = (): UseDataOutputComponentWithFetchReturn => {
    const {
        selectors: dataOutputComponentSelectors,
        actions: dataOutputComponentActions,
        allRecords: dataOutputComponentRecords,
        unsavedRecords: dataOutputComponentUnsavedRecords,
        selectedRecordIds: dataOutputComponentSelectedRecordIds,
        isLoading: dataOutputComponentIsLoading,
        isError: dataOutputComponentIsError,
        quickRefRecords: dataOutputComponentQuickRefRecords,
        addMatrxId: addDataOutputComponentMatrxId,
        addMatrxIds: addDataOutputComponentMatrxIds,
        removeMatrxId: removeDataOutputComponentMatrxId,
        removeMatrxIds: removeDataOutputComponentMatrxIds,
        addPkValue: addDataOutputComponentPkValue,
        addPkValues: addDataOutputComponentPkValues,
        removePkValue: removeDataOutputComponentPkValue,
        removePkValues: removeDataOutputComponentPkValues,
        isMissingRecords: isDataOutputComponentMissingRecords,
        setShouldFetch: setDataOutputComponentShouldFetch,
        setFetchMode: setDataOutputComponentFetchMode,
        fetchQuickRefs: fetchDataOutputComponentQuickRefs,
        fetchOne: fetchDataOutputComponentOne,
        fetchOneWithFkIfk: fetchDataOutputComponentOneWithFkIfk,
        fetchAll: fetchDataOutputComponentAll,
        fetchPaginated: fetchDataOutputComponentPaginated,

    } = useEntityWithFetch("dataOutputComponent");

    return {
        dataOutputComponentSelectors,
        dataOutputComponentActions,
        dataOutputComponentRecords,
        dataOutputComponentUnsavedRecords,
        dataOutputComponentSelectedRecordIds,
        dataOutputComponentIsLoading,
        dataOutputComponentIsError,
        dataOutputComponentQuickRefRecords,
        addDataOutputComponentMatrxId,
        addDataOutputComponentMatrxIds,
        removeDataOutputComponentMatrxId,
        removeDataOutputComponentMatrxIds,
        addDataOutputComponentPkValue,
        addDataOutputComponentPkValues,
        removeDataOutputComponentPkValue,
        removeDataOutputComponentPkValues,
        isDataOutputComponentMissingRecords,
        setDataOutputComponentShouldFetch,
        setDataOutputComponentFetchMode,
        fetchDataOutputComponentQuickRefs,
        fetchDataOutputComponentOne,
        fetchDataOutputComponentOneWithFkIfk,
        fetchDataOutputComponentAll,
        fetchDataOutputComponentPaginated,
    };
};



type UseDisplayOptionWithFetchReturn = {
    displayOptionSelectors: EntitySelectors<"displayOption">;
    displayOptionActions: EntityActions<"displayOption">;
    displayOptionRecords: Record<MatrxRecordId, DisplayOptionData>;
    displayOptionUnsavedRecords: Record<MatrxRecordId, Partial<DisplayOptionData>>;
    displayOptionSelectedRecordIds: MatrxRecordId[];
    displayOptionIsLoading: boolean;
    displayOptionIsError: boolean;
    displayOptionQuickRefRecords: QuickReferenceRecord[];
    addDisplayOptionMatrxId: (recordId: MatrxRecordId) => void;
    addDisplayOptionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeDisplayOptionMatrxId: (recordId: MatrxRecordId) => void;
    removeDisplayOptionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addDisplayOptionPkValue: (pkValue: string) => void;
    addDisplayOptionPkValues: (pkValues: Record<string, unknown>) => void;
    removeDisplayOptionPkValue: (pkValue: string) => void;
    removeDisplayOptionPkValues: (pkValues: Record<string, unknown>) => void;
    isDisplayOptionMissingRecords: boolean;
    setDisplayOptionShouldFetch: (shouldFetch: boolean) => void;
    setDisplayOptionFetchMode: (fetchMode: FetchMode) => void;
    fetchDisplayOptionQuickRefs: () => void;
    fetchDisplayOptionOne: (recordId: MatrxRecordId) => void;
    fetchDisplayOptionOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchDisplayOptionAll: () => void;
    fetchDisplayOptionPaginated: (page: number, pageSize: number) => void;
};

export const useDisplayOptionWithFetch = (): UseDisplayOptionWithFetchReturn => {
    const {
        selectors: displayOptionSelectors,
        actions: displayOptionActions,
        allRecords: displayOptionRecords,
        unsavedRecords: displayOptionUnsavedRecords,
        selectedRecordIds: displayOptionSelectedRecordIds,
        isLoading: displayOptionIsLoading,
        isError: displayOptionIsError,
        quickRefRecords: displayOptionQuickRefRecords,
        addMatrxId: addDisplayOptionMatrxId,
        addMatrxIds: addDisplayOptionMatrxIds,
        removeMatrxId: removeDisplayOptionMatrxId,
        removeMatrxIds: removeDisplayOptionMatrxIds,
        addPkValue: addDisplayOptionPkValue,
        addPkValues: addDisplayOptionPkValues,
        removePkValue: removeDisplayOptionPkValue,
        removePkValues: removeDisplayOptionPkValues,
        isMissingRecords: isDisplayOptionMissingRecords,
        setShouldFetch: setDisplayOptionShouldFetch,
        setFetchMode: setDisplayOptionFetchMode,
        fetchQuickRefs: fetchDisplayOptionQuickRefs,
        fetchOne: fetchDisplayOptionOne,
        fetchOneWithFkIfk: fetchDisplayOptionOneWithFkIfk,
        fetchAll: fetchDisplayOptionAll,
        fetchPaginated: fetchDisplayOptionPaginated,

    } = useEntityWithFetch("displayOption");

    return {
        displayOptionSelectors,
        displayOptionActions,
        displayOptionRecords,
        displayOptionUnsavedRecords,
        displayOptionSelectedRecordIds,
        displayOptionIsLoading,
        displayOptionIsError,
        displayOptionQuickRefRecords,
        addDisplayOptionMatrxId,
        addDisplayOptionMatrxIds,
        removeDisplayOptionMatrxId,
        removeDisplayOptionMatrxIds,
        addDisplayOptionPkValue,
        addDisplayOptionPkValues,
        removeDisplayOptionPkValue,
        removeDisplayOptionPkValues,
        isDisplayOptionMissingRecords,
        setDisplayOptionShouldFetch,
        setDisplayOptionFetchMode,
        fetchDisplayOptionQuickRefs,
        fetchDisplayOptionOne,
        fetchDisplayOptionOneWithFkIfk,
        fetchDisplayOptionAll,
        fetchDisplayOptionPaginated,
    };
};



type UseEmailsWithFetchReturn = {
    emailsSelectors: EntitySelectors<"emails">;
    emailsActions: EntityActions<"emails">;
    emailsRecords: Record<MatrxRecordId, EmailsData>;
    emailsUnsavedRecords: Record<MatrxRecordId, Partial<EmailsData>>;
    emailsSelectedRecordIds: MatrxRecordId[];
    emailsIsLoading: boolean;
    emailsIsError: boolean;
    emailsQuickRefRecords: QuickReferenceRecord[];
    addEmailsMatrxId: (recordId: MatrxRecordId) => void;
    addEmailsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeEmailsMatrxId: (recordId: MatrxRecordId) => void;
    removeEmailsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addEmailsPkValue: (pkValue: string) => void;
    addEmailsPkValues: (pkValues: Record<string, unknown>) => void;
    removeEmailsPkValue: (pkValue: string) => void;
    removeEmailsPkValues: (pkValues: Record<string, unknown>) => void;
    isEmailsMissingRecords: boolean;
    setEmailsShouldFetch: (shouldFetch: boolean) => void;
    setEmailsFetchMode: (fetchMode: FetchMode) => void;
    fetchEmailsQuickRefs: () => void;
    fetchEmailsOne: (recordId: MatrxRecordId) => void;
    fetchEmailsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchEmailsAll: () => void;
    fetchEmailsPaginated: (page: number, pageSize: number) => void;
};

export const useEmailsWithFetch = (): UseEmailsWithFetchReturn => {
    const {
        selectors: emailsSelectors,
        actions: emailsActions,
        allRecords: emailsRecords,
        unsavedRecords: emailsUnsavedRecords,
        selectedRecordIds: emailsSelectedRecordIds,
        isLoading: emailsIsLoading,
        isError: emailsIsError,
        quickRefRecords: emailsQuickRefRecords,
        addMatrxId: addEmailsMatrxId,
        addMatrxIds: addEmailsMatrxIds,
        removeMatrxId: removeEmailsMatrxId,
        removeMatrxIds: removeEmailsMatrxIds,
        addPkValue: addEmailsPkValue,
        addPkValues: addEmailsPkValues,
        removePkValue: removeEmailsPkValue,
        removePkValues: removeEmailsPkValues,
        isMissingRecords: isEmailsMissingRecords,
        setShouldFetch: setEmailsShouldFetch,
        setFetchMode: setEmailsFetchMode,
        fetchQuickRefs: fetchEmailsQuickRefs,
        fetchOne: fetchEmailsOne,
        fetchOneWithFkIfk: fetchEmailsOneWithFkIfk,
        fetchAll: fetchEmailsAll,
        fetchPaginated: fetchEmailsPaginated,

    } = useEntityWithFetch("emails");

    return {
        emailsSelectors,
        emailsActions,
        emailsRecords,
        emailsUnsavedRecords,
        emailsSelectedRecordIds,
        emailsIsLoading,
        emailsIsError,
        emailsQuickRefRecords,
        addEmailsMatrxId,
        addEmailsMatrxIds,
        removeEmailsMatrxId,
        removeEmailsMatrxIds,
        addEmailsPkValue,
        addEmailsPkValues,
        removeEmailsPkValue,
        removeEmailsPkValues,
        isEmailsMissingRecords,
        setEmailsShouldFetch,
        setEmailsFetchMode,
        fetchEmailsQuickRefs,
        fetchEmailsOne,
        fetchEmailsOneWithFkIfk,
        fetchEmailsAll,
        fetchEmailsPaginated,
    };
};



type UseExtractorWithFetchReturn = {
    extractorSelectors: EntitySelectors<"extractor">;
    extractorActions: EntityActions<"extractor">;
    extractorRecords: Record<MatrxRecordId, ExtractorData>;
    extractorUnsavedRecords: Record<MatrxRecordId, Partial<ExtractorData>>;
    extractorSelectedRecordIds: MatrxRecordId[];
    extractorIsLoading: boolean;
    extractorIsError: boolean;
    extractorQuickRefRecords: QuickReferenceRecord[];
    addExtractorMatrxId: (recordId: MatrxRecordId) => void;
    addExtractorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeExtractorMatrxId: (recordId: MatrxRecordId) => void;
    removeExtractorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addExtractorPkValue: (pkValue: string) => void;
    addExtractorPkValues: (pkValues: Record<string, unknown>) => void;
    removeExtractorPkValue: (pkValue: string) => void;
    removeExtractorPkValues: (pkValues: Record<string, unknown>) => void;
    isExtractorMissingRecords: boolean;
    setExtractorShouldFetch: (shouldFetch: boolean) => void;
    setExtractorFetchMode: (fetchMode: FetchMode) => void;
    fetchExtractorQuickRefs: () => void;
    fetchExtractorOne: (recordId: MatrxRecordId) => void;
    fetchExtractorOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchExtractorAll: () => void;
    fetchExtractorPaginated: (page: number, pageSize: number) => void;
};

export const useExtractorWithFetch = (): UseExtractorWithFetchReturn => {
    const {
        selectors: extractorSelectors,
        actions: extractorActions,
        allRecords: extractorRecords,
        unsavedRecords: extractorUnsavedRecords,
        selectedRecordIds: extractorSelectedRecordIds,
        isLoading: extractorIsLoading,
        isError: extractorIsError,
        quickRefRecords: extractorQuickRefRecords,
        addMatrxId: addExtractorMatrxId,
        addMatrxIds: addExtractorMatrxIds,
        removeMatrxId: removeExtractorMatrxId,
        removeMatrxIds: removeExtractorMatrxIds,
        addPkValue: addExtractorPkValue,
        addPkValues: addExtractorPkValues,
        removePkValue: removeExtractorPkValue,
        removePkValues: removeExtractorPkValues,
        isMissingRecords: isExtractorMissingRecords,
        setShouldFetch: setExtractorShouldFetch,
        setFetchMode: setExtractorFetchMode,
        fetchQuickRefs: fetchExtractorQuickRefs,
        fetchOne: fetchExtractorOne,
        fetchOneWithFkIfk: fetchExtractorOneWithFkIfk,
        fetchAll: fetchExtractorAll,
        fetchPaginated: fetchExtractorPaginated,

    } = useEntityWithFetch("extractor");

    return {
        extractorSelectors,
        extractorActions,
        extractorRecords,
        extractorUnsavedRecords,
        extractorSelectedRecordIds,
        extractorIsLoading,
        extractorIsError,
        extractorQuickRefRecords,
        addExtractorMatrxId,
        addExtractorMatrxIds,
        removeExtractorMatrxId,
        removeExtractorMatrxIds,
        addExtractorPkValue,
        addExtractorPkValues,
        removeExtractorPkValue,
        removeExtractorPkValues,
        isExtractorMissingRecords,
        setExtractorShouldFetch,
        setExtractorFetchMode,
        fetchExtractorQuickRefs,
        fetchExtractorOne,
        fetchExtractorOneWithFkIfk,
        fetchExtractorAll,
        fetchExtractorPaginated,
    };
};



type UseFieldComponentsWithFetchReturn = {
    fieldComponentsSelectors: EntitySelectors<"fieldComponents">;
    fieldComponentsActions: EntityActions<"fieldComponents">;
    fieldComponentsRecords: Record<MatrxRecordId, FieldComponentsData>;
    fieldComponentsUnsavedRecords: Record<MatrxRecordId, Partial<FieldComponentsData>>;
    fieldComponentsSelectedRecordIds: MatrxRecordId[];
    fieldComponentsIsLoading: boolean;
    fieldComponentsIsError: boolean;
    fieldComponentsQuickRefRecords: QuickReferenceRecord[];
    addFieldComponentsMatrxId: (recordId: MatrxRecordId) => void;
    addFieldComponentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeFieldComponentsMatrxId: (recordId: MatrxRecordId) => void;
    removeFieldComponentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addFieldComponentsPkValue: (pkValue: string) => void;
    addFieldComponentsPkValues: (pkValues: Record<string, unknown>) => void;
    removeFieldComponentsPkValue: (pkValue: string) => void;
    removeFieldComponentsPkValues: (pkValues: Record<string, unknown>) => void;
    isFieldComponentsMissingRecords: boolean;
    setFieldComponentsShouldFetch: (shouldFetch: boolean) => void;
    setFieldComponentsFetchMode: (fetchMode: FetchMode) => void;
    fetchFieldComponentsQuickRefs: () => void;
    fetchFieldComponentsOne: (recordId: MatrxRecordId) => void;
    fetchFieldComponentsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchFieldComponentsAll: () => void;
    fetchFieldComponentsPaginated: (page: number, pageSize: number) => void;
};

export const useFieldComponentsWithFetch = (): UseFieldComponentsWithFetchReturn => {
    const {
        selectors: fieldComponentsSelectors,
        actions: fieldComponentsActions,
        allRecords: fieldComponentsRecords,
        unsavedRecords: fieldComponentsUnsavedRecords,
        selectedRecordIds: fieldComponentsSelectedRecordIds,
        isLoading: fieldComponentsIsLoading,
        isError: fieldComponentsIsError,
        quickRefRecords: fieldComponentsQuickRefRecords,
        addMatrxId: addFieldComponentsMatrxId,
        addMatrxIds: addFieldComponentsMatrxIds,
        removeMatrxId: removeFieldComponentsMatrxId,
        removeMatrxIds: removeFieldComponentsMatrxIds,
        addPkValue: addFieldComponentsPkValue,
        addPkValues: addFieldComponentsPkValues,
        removePkValue: removeFieldComponentsPkValue,
        removePkValues: removeFieldComponentsPkValues,
        isMissingRecords: isFieldComponentsMissingRecords,
        setShouldFetch: setFieldComponentsShouldFetch,
        setFetchMode: setFieldComponentsFetchMode,
        fetchQuickRefs: fetchFieldComponentsQuickRefs,
        fetchOne: fetchFieldComponentsOne,
        fetchOneWithFkIfk: fetchFieldComponentsOneWithFkIfk,
        fetchAll: fetchFieldComponentsAll,
        fetchPaginated: fetchFieldComponentsPaginated,

    } = useEntityWithFetch("fieldComponents");

    return {
        fieldComponentsSelectors,
        fieldComponentsActions,
        fieldComponentsRecords,
        fieldComponentsUnsavedRecords,
        fieldComponentsSelectedRecordIds,
        fieldComponentsIsLoading,
        fieldComponentsIsError,
        fieldComponentsQuickRefRecords,
        addFieldComponentsMatrxId,
        addFieldComponentsMatrxIds,
        removeFieldComponentsMatrxId,
        removeFieldComponentsMatrxIds,
        addFieldComponentsPkValue,
        addFieldComponentsPkValues,
        removeFieldComponentsPkValue,
        removeFieldComponentsPkValues,
        isFieldComponentsMissingRecords,
        setFieldComponentsShouldFetch,
        setFieldComponentsFetchMode,
        fetchFieldComponentsQuickRefs,
        fetchFieldComponentsOne,
        fetchFieldComponentsOneWithFkIfk,
        fetchFieldComponentsAll,
        fetchFieldComponentsPaginated,
    };
};



type UseFileStructureWithFetchReturn = {
    fileStructureSelectors: EntitySelectors<"fileStructure">;
    fileStructureActions: EntityActions<"fileStructure">;
    fileStructureRecords: Record<MatrxRecordId, FileStructureData>;
    fileStructureUnsavedRecords: Record<MatrxRecordId, Partial<FileStructureData>>;
    fileStructureSelectedRecordIds: MatrxRecordId[];
    fileStructureIsLoading: boolean;
    fileStructureIsError: boolean;
    fileStructureQuickRefRecords: QuickReferenceRecord[];
    addFileStructureMatrxId: (recordId: MatrxRecordId) => void;
    addFileStructureMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeFileStructureMatrxId: (recordId: MatrxRecordId) => void;
    removeFileStructureMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addFileStructurePkValue: (pkValue: string) => void;
    addFileStructurePkValues: (pkValues: Record<string, unknown>) => void;
    removeFileStructurePkValue: (pkValue: string) => void;
    removeFileStructurePkValues: (pkValues: Record<string, unknown>) => void;
    isFileStructureMissingRecords: boolean;
    setFileStructureShouldFetch: (shouldFetch: boolean) => void;
    setFileStructureFetchMode: (fetchMode: FetchMode) => void;
    fetchFileStructureQuickRefs: () => void;
    fetchFileStructureOne: (recordId: MatrxRecordId) => void;
    fetchFileStructureOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchFileStructureAll: () => void;
    fetchFileStructurePaginated: (page: number, pageSize: number) => void;
};

export const useFileStructureWithFetch = (): UseFileStructureWithFetchReturn => {
    const {
        selectors: fileStructureSelectors,
        actions: fileStructureActions,
        allRecords: fileStructureRecords,
        unsavedRecords: fileStructureUnsavedRecords,
        selectedRecordIds: fileStructureSelectedRecordIds,
        isLoading: fileStructureIsLoading,
        isError: fileStructureIsError,
        quickRefRecords: fileStructureQuickRefRecords,
        addMatrxId: addFileStructureMatrxId,
        addMatrxIds: addFileStructureMatrxIds,
        removeMatrxId: removeFileStructureMatrxId,
        removeMatrxIds: removeFileStructureMatrxIds,
        addPkValue: addFileStructurePkValue,
        addPkValues: addFileStructurePkValues,
        removePkValue: removeFileStructurePkValue,
        removePkValues: removeFileStructurePkValues,
        isMissingRecords: isFileStructureMissingRecords,
        setShouldFetch: setFileStructureShouldFetch,
        setFetchMode: setFileStructureFetchMode,
        fetchQuickRefs: fetchFileStructureQuickRefs,
        fetchOne: fetchFileStructureOne,
        fetchOneWithFkIfk: fetchFileStructureOneWithFkIfk,
        fetchAll: fetchFileStructureAll,
        fetchPaginated: fetchFileStructurePaginated,

    } = useEntityWithFetch("fileStructure");

    return {
        fileStructureSelectors,
        fileStructureActions,
        fileStructureRecords,
        fileStructureUnsavedRecords,
        fileStructureSelectedRecordIds,
        fileStructureIsLoading,
        fileStructureIsError,
        fileStructureQuickRefRecords,
        addFileStructureMatrxId,
        addFileStructureMatrxIds,
        removeFileStructureMatrxId,
        removeFileStructureMatrxIds,
        addFileStructurePkValue,
        addFileStructurePkValues,
        removeFileStructurePkValue,
        removeFileStructurePkValues,
        isFileStructureMissingRecords,
        setFileStructureShouldFetch,
        setFileStructureFetchMode,
        fetchFileStructureQuickRefs,
        fetchFileStructureOne,
        fetchFileStructureOneWithFkIfk,
        fetchFileStructureAll,
        fetchFileStructurePaginated,
    };
};



type UseFlashcardDataWithFetchReturn = {
    flashcardDataSelectors: EntitySelectors<"flashcardData">;
    flashcardDataActions: EntityActions<"flashcardData">;
    flashcardDataRecords: Record<MatrxRecordId, FlashcardDataData>;
    flashcardDataUnsavedRecords: Record<MatrxRecordId, Partial<FlashcardDataData>>;
    flashcardDataSelectedRecordIds: MatrxRecordId[];
    flashcardDataIsLoading: boolean;
    flashcardDataIsError: boolean;
    flashcardDataQuickRefRecords: QuickReferenceRecord[];
    addFlashcardDataMatrxId: (recordId: MatrxRecordId) => void;
    addFlashcardDataMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeFlashcardDataMatrxId: (recordId: MatrxRecordId) => void;
    removeFlashcardDataMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addFlashcardDataPkValue: (pkValue: string) => void;
    addFlashcardDataPkValues: (pkValues: Record<string, unknown>) => void;
    removeFlashcardDataPkValue: (pkValue: string) => void;
    removeFlashcardDataPkValues: (pkValues: Record<string, unknown>) => void;
    isFlashcardDataMissingRecords: boolean;
    setFlashcardDataShouldFetch: (shouldFetch: boolean) => void;
    setFlashcardDataFetchMode: (fetchMode: FetchMode) => void;
    fetchFlashcardDataQuickRefs: () => void;
    fetchFlashcardDataOne: (recordId: MatrxRecordId) => void;
    fetchFlashcardDataOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchFlashcardDataAll: () => void;
    fetchFlashcardDataPaginated: (page: number, pageSize: number) => void;
};

export const useFlashcardDataWithFetch = (): UseFlashcardDataWithFetchReturn => {
    const {
        selectors: flashcardDataSelectors,
        actions: flashcardDataActions,
        allRecords: flashcardDataRecords,
        unsavedRecords: flashcardDataUnsavedRecords,
        selectedRecordIds: flashcardDataSelectedRecordIds,
        isLoading: flashcardDataIsLoading,
        isError: flashcardDataIsError,
        quickRefRecords: flashcardDataQuickRefRecords,
        addMatrxId: addFlashcardDataMatrxId,
        addMatrxIds: addFlashcardDataMatrxIds,
        removeMatrxId: removeFlashcardDataMatrxId,
        removeMatrxIds: removeFlashcardDataMatrxIds,
        addPkValue: addFlashcardDataPkValue,
        addPkValues: addFlashcardDataPkValues,
        removePkValue: removeFlashcardDataPkValue,
        removePkValues: removeFlashcardDataPkValues,
        isMissingRecords: isFlashcardDataMissingRecords,
        setShouldFetch: setFlashcardDataShouldFetch,
        setFetchMode: setFlashcardDataFetchMode,
        fetchQuickRefs: fetchFlashcardDataQuickRefs,
        fetchOne: fetchFlashcardDataOne,
        fetchOneWithFkIfk: fetchFlashcardDataOneWithFkIfk,
        fetchAll: fetchFlashcardDataAll,
        fetchPaginated: fetchFlashcardDataPaginated,

    } = useEntityWithFetch("flashcardData");

    return {
        flashcardDataSelectors,
        flashcardDataActions,
        flashcardDataRecords,
        flashcardDataUnsavedRecords,
        flashcardDataSelectedRecordIds,
        flashcardDataIsLoading,
        flashcardDataIsError,
        flashcardDataQuickRefRecords,
        addFlashcardDataMatrxId,
        addFlashcardDataMatrxIds,
        removeFlashcardDataMatrxId,
        removeFlashcardDataMatrxIds,
        addFlashcardDataPkValue,
        addFlashcardDataPkValues,
        removeFlashcardDataPkValue,
        removeFlashcardDataPkValues,
        isFlashcardDataMissingRecords,
        setFlashcardDataShouldFetch,
        setFlashcardDataFetchMode,
        fetchFlashcardDataQuickRefs,
        fetchFlashcardDataOne,
        fetchFlashcardDataOneWithFkIfk,
        fetchFlashcardDataAll,
        fetchFlashcardDataPaginated,
    };
};



type UseFlashcardHistoryWithFetchReturn = {
    flashcardHistorySelectors: EntitySelectors<"flashcardHistory">;
    flashcardHistoryActions: EntityActions<"flashcardHistory">;
    flashcardHistoryRecords: Record<MatrxRecordId, FlashcardHistoryData>;
    flashcardHistoryUnsavedRecords: Record<MatrxRecordId, Partial<FlashcardHistoryData>>;
    flashcardHistorySelectedRecordIds: MatrxRecordId[];
    flashcardHistoryIsLoading: boolean;
    flashcardHistoryIsError: boolean;
    flashcardHistoryQuickRefRecords: QuickReferenceRecord[];
    addFlashcardHistoryMatrxId: (recordId: MatrxRecordId) => void;
    addFlashcardHistoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeFlashcardHistoryMatrxId: (recordId: MatrxRecordId) => void;
    removeFlashcardHistoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addFlashcardHistoryPkValue: (pkValue: string) => void;
    addFlashcardHistoryPkValues: (pkValues: Record<string, unknown>) => void;
    removeFlashcardHistoryPkValue: (pkValue: string) => void;
    removeFlashcardHistoryPkValues: (pkValues: Record<string, unknown>) => void;
    isFlashcardHistoryMissingRecords: boolean;
    setFlashcardHistoryShouldFetch: (shouldFetch: boolean) => void;
    setFlashcardHistoryFetchMode: (fetchMode: FetchMode) => void;
    fetchFlashcardHistoryQuickRefs: () => void;
    fetchFlashcardHistoryOne: (recordId: MatrxRecordId) => void;
    fetchFlashcardHistoryOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchFlashcardHistoryAll: () => void;
    fetchFlashcardHistoryPaginated: (page: number, pageSize: number) => void;
};

export const useFlashcardHistoryWithFetch = (): UseFlashcardHistoryWithFetchReturn => {
    const {
        selectors: flashcardHistorySelectors,
        actions: flashcardHistoryActions,
        allRecords: flashcardHistoryRecords,
        unsavedRecords: flashcardHistoryUnsavedRecords,
        selectedRecordIds: flashcardHistorySelectedRecordIds,
        isLoading: flashcardHistoryIsLoading,
        isError: flashcardHistoryIsError,
        quickRefRecords: flashcardHistoryQuickRefRecords,
        addMatrxId: addFlashcardHistoryMatrxId,
        addMatrxIds: addFlashcardHistoryMatrxIds,
        removeMatrxId: removeFlashcardHistoryMatrxId,
        removeMatrxIds: removeFlashcardHistoryMatrxIds,
        addPkValue: addFlashcardHistoryPkValue,
        addPkValues: addFlashcardHistoryPkValues,
        removePkValue: removeFlashcardHistoryPkValue,
        removePkValues: removeFlashcardHistoryPkValues,
        isMissingRecords: isFlashcardHistoryMissingRecords,
        setShouldFetch: setFlashcardHistoryShouldFetch,
        setFetchMode: setFlashcardHistoryFetchMode,
        fetchQuickRefs: fetchFlashcardHistoryQuickRefs,
        fetchOne: fetchFlashcardHistoryOne,
        fetchOneWithFkIfk: fetchFlashcardHistoryOneWithFkIfk,
        fetchAll: fetchFlashcardHistoryAll,
        fetchPaginated: fetchFlashcardHistoryPaginated,

    } = useEntityWithFetch("flashcardHistory");

    return {
        flashcardHistorySelectors,
        flashcardHistoryActions,
        flashcardHistoryRecords,
        flashcardHistoryUnsavedRecords,
        flashcardHistorySelectedRecordIds,
        flashcardHistoryIsLoading,
        flashcardHistoryIsError,
        flashcardHistoryQuickRefRecords,
        addFlashcardHistoryMatrxId,
        addFlashcardHistoryMatrxIds,
        removeFlashcardHistoryMatrxId,
        removeFlashcardHistoryMatrxIds,
        addFlashcardHistoryPkValue,
        addFlashcardHistoryPkValues,
        removeFlashcardHistoryPkValue,
        removeFlashcardHistoryPkValues,
        isFlashcardHistoryMissingRecords,
        setFlashcardHistoryShouldFetch,
        setFlashcardHistoryFetchMode,
        fetchFlashcardHistoryQuickRefs,
        fetchFlashcardHistoryOne,
        fetchFlashcardHistoryOneWithFkIfk,
        fetchFlashcardHistoryAll,
        fetchFlashcardHistoryPaginated,
    };
};



type UseFlashcardImagesWithFetchReturn = {
    flashcardImagesSelectors: EntitySelectors<"flashcardImages">;
    flashcardImagesActions: EntityActions<"flashcardImages">;
    flashcardImagesRecords: Record<MatrxRecordId, FlashcardImagesData>;
    flashcardImagesUnsavedRecords: Record<MatrxRecordId, Partial<FlashcardImagesData>>;
    flashcardImagesSelectedRecordIds: MatrxRecordId[];
    flashcardImagesIsLoading: boolean;
    flashcardImagesIsError: boolean;
    flashcardImagesQuickRefRecords: QuickReferenceRecord[];
    addFlashcardImagesMatrxId: (recordId: MatrxRecordId) => void;
    addFlashcardImagesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeFlashcardImagesMatrxId: (recordId: MatrxRecordId) => void;
    removeFlashcardImagesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addFlashcardImagesPkValue: (pkValue: string) => void;
    addFlashcardImagesPkValues: (pkValues: Record<string, unknown>) => void;
    removeFlashcardImagesPkValue: (pkValue: string) => void;
    removeFlashcardImagesPkValues: (pkValues: Record<string, unknown>) => void;
    isFlashcardImagesMissingRecords: boolean;
    setFlashcardImagesShouldFetch: (shouldFetch: boolean) => void;
    setFlashcardImagesFetchMode: (fetchMode: FetchMode) => void;
    fetchFlashcardImagesQuickRefs: () => void;
    fetchFlashcardImagesOne: (recordId: MatrxRecordId) => void;
    fetchFlashcardImagesOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchFlashcardImagesAll: () => void;
    fetchFlashcardImagesPaginated: (page: number, pageSize: number) => void;
};

export const useFlashcardImagesWithFetch = (): UseFlashcardImagesWithFetchReturn => {
    const {
        selectors: flashcardImagesSelectors,
        actions: flashcardImagesActions,
        allRecords: flashcardImagesRecords,
        unsavedRecords: flashcardImagesUnsavedRecords,
        selectedRecordIds: flashcardImagesSelectedRecordIds,
        isLoading: flashcardImagesIsLoading,
        isError: flashcardImagesIsError,
        quickRefRecords: flashcardImagesQuickRefRecords,
        addMatrxId: addFlashcardImagesMatrxId,
        addMatrxIds: addFlashcardImagesMatrxIds,
        removeMatrxId: removeFlashcardImagesMatrxId,
        removeMatrxIds: removeFlashcardImagesMatrxIds,
        addPkValue: addFlashcardImagesPkValue,
        addPkValues: addFlashcardImagesPkValues,
        removePkValue: removeFlashcardImagesPkValue,
        removePkValues: removeFlashcardImagesPkValues,
        isMissingRecords: isFlashcardImagesMissingRecords,
        setShouldFetch: setFlashcardImagesShouldFetch,
        setFetchMode: setFlashcardImagesFetchMode,
        fetchQuickRefs: fetchFlashcardImagesQuickRefs,
        fetchOne: fetchFlashcardImagesOne,
        fetchOneWithFkIfk: fetchFlashcardImagesOneWithFkIfk,
        fetchAll: fetchFlashcardImagesAll,
        fetchPaginated: fetchFlashcardImagesPaginated,

    } = useEntityWithFetch("flashcardImages");

    return {
        flashcardImagesSelectors,
        flashcardImagesActions,
        flashcardImagesRecords,
        flashcardImagesUnsavedRecords,
        flashcardImagesSelectedRecordIds,
        flashcardImagesIsLoading,
        flashcardImagesIsError,
        flashcardImagesQuickRefRecords,
        addFlashcardImagesMatrxId,
        addFlashcardImagesMatrxIds,
        removeFlashcardImagesMatrxId,
        removeFlashcardImagesMatrxIds,
        addFlashcardImagesPkValue,
        addFlashcardImagesPkValues,
        removeFlashcardImagesPkValue,
        removeFlashcardImagesPkValues,
        isFlashcardImagesMissingRecords,
        setFlashcardImagesShouldFetch,
        setFlashcardImagesFetchMode,
        fetchFlashcardImagesQuickRefs,
        fetchFlashcardImagesOne,
        fetchFlashcardImagesOneWithFkIfk,
        fetchFlashcardImagesAll,
        fetchFlashcardImagesPaginated,
    };
};



type UseFlashcardSetRelationsWithFetchReturn = {
    flashcardSetRelationsSelectors: EntitySelectors<"flashcardSetRelations">;
    flashcardSetRelationsActions: EntityActions<"flashcardSetRelations">;
    flashcardSetRelationsRecords: Record<MatrxRecordId, FlashcardSetRelationsData>;
    flashcardSetRelationsUnsavedRecords: Record<MatrxRecordId, Partial<FlashcardSetRelationsData>>;
    flashcardSetRelationsSelectedRecordIds: MatrxRecordId[];
    flashcardSetRelationsIsLoading: boolean;
    flashcardSetRelationsIsError: boolean;
    flashcardSetRelationsQuickRefRecords: QuickReferenceRecord[];
    addFlashcardSetRelationsMatrxId: (recordId: MatrxRecordId) => void;
    addFlashcardSetRelationsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeFlashcardSetRelationsMatrxId: (recordId: MatrxRecordId) => void;
    removeFlashcardSetRelationsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addFlashcardSetRelationsPkValue: (pkValue: string) => void;
    addFlashcardSetRelationsPkValues: (pkValues: Record<string, unknown>) => void;
    removeFlashcardSetRelationsPkValue: (pkValue: string) => void;
    removeFlashcardSetRelationsPkValues: (pkValues: Record<string, unknown>) => void;
    isFlashcardSetRelationsMissingRecords: boolean;
    setFlashcardSetRelationsShouldFetch: (shouldFetch: boolean) => void;
    setFlashcardSetRelationsFetchMode: (fetchMode: FetchMode) => void;
    fetchFlashcardSetRelationsQuickRefs: () => void;
    fetchFlashcardSetRelationsOne: (recordId: MatrxRecordId) => void;
    fetchFlashcardSetRelationsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchFlashcardSetRelationsAll: () => void;
    fetchFlashcardSetRelationsPaginated: (page: number, pageSize: number) => void;
};

export const useFlashcardSetRelationsWithFetch = (): UseFlashcardSetRelationsWithFetchReturn => {
    const {
        selectors: flashcardSetRelationsSelectors,
        actions: flashcardSetRelationsActions,
        allRecords: flashcardSetRelationsRecords,
        unsavedRecords: flashcardSetRelationsUnsavedRecords,
        selectedRecordIds: flashcardSetRelationsSelectedRecordIds,
        isLoading: flashcardSetRelationsIsLoading,
        isError: flashcardSetRelationsIsError,
        quickRefRecords: flashcardSetRelationsQuickRefRecords,
        addMatrxId: addFlashcardSetRelationsMatrxId,
        addMatrxIds: addFlashcardSetRelationsMatrxIds,
        removeMatrxId: removeFlashcardSetRelationsMatrxId,
        removeMatrxIds: removeFlashcardSetRelationsMatrxIds,
        addPkValue: addFlashcardSetRelationsPkValue,
        addPkValues: addFlashcardSetRelationsPkValues,
        removePkValue: removeFlashcardSetRelationsPkValue,
        removePkValues: removeFlashcardSetRelationsPkValues,
        isMissingRecords: isFlashcardSetRelationsMissingRecords,
        setShouldFetch: setFlashcardSetRelationsShouldFetch,
        setFetchMode: setFlashcardSetRelationsFetchMode,
        fetchQuickRefs: fetchFlashcardSetRelationsQuickRefs,
        fetchOne: fetchFlashcardSetRelationsOne,
        fetchOneWithFkIfk: fetchFlashcardSetRelationsOneWithFkIfk,
        fetchAll: fetchFlashcardSetRelationsAll,
        fetchPaginated: fetchFlashcardSetRelationsPaginated,

    } = useEntityWithFetch("flashcardSetRelations");

    return {
        flashcardSetRelationsSelectors,
        flashcardSetRelationsActions,
        flashcardSetRelationsRecords,
        flashcardSetRelationsUnsavedRecords,
        flashcardSetRelationsSelectedRecordIds,
        flashcardSetRelationsIsLoading,
        flashcardSetRelationsIsError,
        flashcardSetRelationsQuickRefRecords,
        addFlashcardSetRelationsMatrxId,
        addFlashcardSetRelationsMatrxIds,
        removeFlashcardSetRelationsMatrxId,
        removeFlashcardSetRelationsMatrxIds,
        addFlashcardSetRelationsPkValue,
        addFlashcardSetRelationsPkValues,
        removeFlashcardSetRelationsPkValue,
        removeFlashcardSetRelationsPkValues,
        isFlashcardSetRelationsMissingRecords,
        setFlashcardSetRelationsShouldFetch,
        setFlashcardSetRelationsFetchMode,
        fetchFlashcardSetRelationsQuickRefs,
        fetchFlashcardSetRelationsOne,
        fetchFlashcardSetRelationsOneWithFkIfk,
        fetchFlashcardSetRelationsAll,
        fetchFlashcardSetRelationsPaginated,
    };
};



type UseFlashcardSetsWithFetchReturn = {
    flashcardSetsSelectors: EntitySelectors<"flashcardSets">;
    flashcardSetsActions: EntityActions<"flashcardSets">;
    flashcardSetsRecords: Record<MatrxRecordId, FlashcardSetsData>;
    flashcardSetsUnsavedRecords: Record<MatrxRecordId, Partial<FlashcardSetsData>>;
    flashcardSetsSelectedRecordIds: MatrxRecordId[];
    flashcardSetsIsLoading: boolean;
    flashcardSetsIsError: boolean;
    flashcardSetsQuickRefRecords: QuickReferenceRecord[];
    addFlashcardSetsMatrxId: (recordId: MatrxRecordId) => void;
    addFlashcardSetsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeFlashcardSetsMatrxId: (recordId: MatrxRecordId) => void;
    removeFlashcardSetsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addFlashcardSetsPkValue: (pkValue: string) => void;
    addFlashcardSetsPkValues: (pkValues: Record<string, unknown>) => void;
    removeFlashcardSetsPkValue: (pkValue: string) => void;
    removeFlashcardSetsPkValues: (pkValues: Record<string, unknown>) => void;
    isFlashcardSetsMissingRecords: boolean;
    setFlashcardSetsShouldFetch: (shouldFetch: boolean) => void;
    setFlashcardSetsFetchMode: (fetchMode: FetchMode) => void;
    fetchFlashcardSetsQuickRefs: () => void;
    fetchFlashcardSetsOne: (recordId: MatrxRecordId) => void;
    fetchFlashcardSetsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchFlashcardSetsAll: () => void;
    fetchFlashcardSetsPaginated: (page: number, pageSize: number) => void;
};

export const useFlashcardSetsWithFetch = (): UseFlashcardSetsWithFetchReturn => {
    const {
        selectors: flashcardSetsSelectors,
        actions: flashcardSetsActions,
        allRecords: flashcardSetsRecords,
        unsavedRecords: flashcardSetsUnsavedRecords,
        selectedRecordIds: flashcardSetsSelectedRecordIds,
        isLoading: flashcardSetsIsLoading,
        isError: flashcardSetsIsError,
        quickRefRecords: flashcardSetsQuickRefRecords,
        addMatrxId: addFlashcardSetsMatrxId,
        addMatrxIds: addFlashcardSetsMatrxIds,
        removeMatrxId: removeFlashcardSetsMatrxId,
        removeMatrxIds: removeFlashcardSetsMatrxIds,
        addPkValue: addFlashcardSetsPkValue,
        addPkValues: addFlashcardSetsPkValues,
        removePkValue: removeFlashcardSetsPkValue,
        removePkValues: removeFlashcardSetsPkValues,
        isMissingRecords: isFlashcardSetsMissingRecords,
        setShouldFetch: setFlashcardSetsShouldFetch,
        setFetchMode: setFlashcardSetsFetchMode,
        fetchQuickRefs: fetchFlashcardSetsQuickRefs,
        fetchOne: fetchFlashcardSetsOne,
        fetchOneWithFkIfk: fetchFlashcardSetsOneWithFkIfk,
        fetchAll: fetchFlashcardSetsAll,
        fetchPaginated: fetchFlashcardSetsPaginated,

    } = useEntityWithFetch("flashcardSets");

    return {
        flashcardSetsSelectors,
        flashcardSetsActions,
        flashcardSetsRecords,
        flashcardSetsUnsavedRecords,
        flashcardSetsSelectedRecordIds,
        flashcardSetsIsLoading,
        flashcardSetsIsError,
        flashcardSetsQuickRefRecords,
        addFlashcardSetsMatrxId,
        addFlashcardSetsMatrxIds,
        removeFlashcardSetsMatrxId,
        removeFlashcardSetsMatrxIds,
        addFlashcardSetsPkValue,
        addFlashcardSetsPkValues,
        removeFlashcardSetsPkValue,
        removeFlashcardSetsPkValues,
        isFlashcardSetsMissingRecords,
        setFlashcardSetsShouldFetch,
        setFlashcardSetsFetchMode,
        fetchFlashcardSetsQuickRefs,
        fetchFlashcardSetsOne,
        fetchFlashcardSetsOneWithFkIfk,
        fetchFlashcardSetsAll,
        fetchFlashcardSetsPaginated,
    };
};



type UseFullSpectrumPositionsWithFetchReturn = {
    fullSpectrumPositionsSelectors: EntitySelectors<"fullSpectrumPositions">;
    fullSpectrumPositionsActions: EntityActions<"fullSpectrumPositions">;
    fullSpectrumPositionsRecords: Record<MatrxRecordId, FullSpectrumPositionsData>;
    fullSpectrumPositionsUnsavedRecords: Record<MatrxRecordId, Partial<FullSpectrumPositionsData>>;
    fullSpectrumPositionsSelectedRecordIds: MatrxRecordId[];
    fullSpectrumPositionsIsLoading: boolean;
    fullSpectrumPositionsIsError: boolean;
    fullSpectrumPositionsQuickRefRecords: QuickReferenceRecord[];
    addFullSpectrumPositionsMatrxId: (recordId: MatrxRecordId) => void;
    addFullSpectrumPositionsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeFullSpectrumPositionsMatrxId: (recordId: MatrxRecordId) => void;
    removeFullSpectrumPositionsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addFullSpectrumPositionsPkValue: (pkValue: string) => void;
    addFullSpectrumPositionsPkValues: (pkValues: Record<string, unknown>) => void;
    removeFullSpectrumPositionsPkValue: (pkValue: string) => void;
    removeFullSpectrumPositionsPkValues: (pkValues: Record<string, unknown>) => void;
    isFullSpectrumPositionsMissingRecords: boolean;
    setFullSpectrumPositionsShouldFetch: (shouldFetch: boolean) => void;
    setFullSpectrumPositionsFetchMode: (fetchMode: FetchMode) => void;
    fetchFullSpectrumPositionsQuickRefs: () => void;
    fetchFullSpectrumPositionsOne: (recordId: MatrxRecordId) => void;
    fetchFullSpectrumPositionsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchFullSpectrumPositionsAll: () => void;
    fetchFullSpectrumPositionsPaginated: (page: number, pageSize: number) => void;
};

export const useFullSpectrumPositionsWithFetch = (): UseFullSpectrumPositionsWithFetchReturn => {
    const {
        selectors: fullSpectrumPositionsSelectors,
        actions: fullSpectrumPositionsActions,
        allRecords: fullSpectrumPositionsRecords,
        unsavedRecords: fullSpectrumPositionsUnsavedRecords,
        selectedRecordIds: fullSpectrumPositionsSelectedRecordIds,
        isLoading: fullSpectrumPositionsIsLoading,
        isError: fullSpectrumPositionsIsError,
        quickRefRecords: fullSpectrumPositionsQuickRefRecords,
        addMatrxId: addFullSpectrumPositionsMatrxId,
        addMatrxIds: addFullSpectrumPositionsMatrxIds,
        removeMatrxId: removeFullSpectrumPositionsMatrxId,
        removeMatrxIds: removeFullSpectrumPositionsMatrxIds,
        addPkValue: addFullSpectrumPositionsPkValue,
        addPkValues: addFullSpectrumPositionsPkValues,
        removePkValue: removeFullSpectrumPositionsPkValue,
        removePkValues: removeFullSpectrumPositionsPkValues,
        isMissingRecords: isFullSpectrumPositionsMissingRecords,
        setShouldFetch: setFullSpectrumPositionsShouldFetch,
        setFetchMode: setFullSpectrumPositionsFetchMode,
        fetchQuickRefs: fetchFullSpectrumPositionsQuickRefs,
        fetchOne: fetchFullSpectrumPositionsOne,
        fetchOneWithFkIfk: fetchFullSpectrumPositionsOneWithFkIfk,
        fetchAll: fetchFullSpectrumPositionsAll,
        fetchPaginated: fetchFullSpectrumPositionsPaginated,

    } = useEntityWithFetch("fullSpectrumPositions");

    return {
        fullSpectrumPositionsSelectors,
        fullSpectrumPositionsActions,
        fullSpectrumPositionsRecords,
        fullSpectrumPositionsUnsavedRecords,
        fullSpectrumPositionsSelectedRecordIds,
        fullSpectrumPositionsIsLoading,
        fullSpectrumPositionsIsError,
        fullSpectrumPositionsQuickRefRecords,
        addFullSpectrumPositionsMatrxId,
        addFullSpectrumPositionsMatrxIds,
        removeFullSpectrumPositionsMatrxId,
        removeFullSpectrumPositionsMatrxIds,
        addFullSpectrumPositionsPkValue,
        addFullSpectrumPositionsPkValues,
        removeFullSpectrumPositionsPkValue,
        removeFullSpectrumPositionsPkValues,
        isFullSpectrumPositionsMissingRecords,
        setFullSpectrumPositionsShouldFetch,
        setFullSpectrumPositionsFetchMode,
        fetchFullSpectrumPositionsQuickRefs,
        fetchFullSpectrumPositionsOne,
        fetchFullSpectrumPositionsOneWithFkIfk,
        fetchFullSpectrumPositionsAll,
        fetchFullSpectrumPositionsPaginated,
    };
};



type UseHtmlExtractionsWithFetchReturn = {
    htmlExtractionsSelectors: EntitySelectors<"htmlExtractions">;
    htmlExtractionsActions: EntityActions<"htmlExtractions">;
    htmlExtractionsRecords: Record<MatrxRecordId, HtmlExtractionsData>;
    htmlExtractionsUnsavedRecords: Record<MatrxRecordId, Partial<HtmlExtractionsData>>;
    htmlExtractionsSelectedRecordIds: MatrxRecordId[];
    htmlExtractionsIsLoading: boolean;
    htmlExtractionsIsError: boolean;
    htmlExtractionsQuickRefRecords: QuickReferenceRecord[];
    addHtmlExtractionsMatrxId: (recordId: MatrxRecordId) => void;
    addHtmlExtractionsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeHtmlExtractionsMatrxId: (recordId: MatrxRecordId) => void;
    removeHtmlExtractionsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addHtmlExtractionsPkValue: (pkValue: string) => void;
    addHtmlExtractionsPkValues: (pkValues: Record<string, unknown>) => void;
    removeHtmlExtractionsPkValue: (pkValue: string) => void;
    removeHtmlExtractionsPkValues: (pkValues: Record<string, unknown>) => void;
    isHtmlExtractionsMissingRecords: boolean;
    setHtmlExtractionsShouldFetch: (shouldFetch: boolean) => void;
    setHtmlExtractionsFetchMode: (fetchMode: FetchMode) => void;
    fetchHtmlExtractionsQuickRefs: () => void;
    fetchHtmlExtractionsOne: (recordId: MatrxRecordId) => void;
    fetchHtmlExtractionsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchHtmlExtractionsAll: () => void;
    fetchHtmlExtractionsPaginated: (page: number, pageSize: number) => void;
};

export const useHtmlExtractionsWithFetch = (): UseHtmlExtractionsWithFetchReturn => {
    const {
        selectors: htmlExtractionsSelectors,
        actions: htmlExtractionsActions,
        allRecords: htmlExtractionsRecords,
        unsavedRecords: htmlExtractionsUnsavedRecords,
        selectedRecordIds: htmlExtractionsSelectedRecordIds,
        isLoading: htmlExtractionsIsLoading,
        isError: htmlExtractionsIsError,
        quickRefRecords: htmlExtractionsQuickRefRecords,
        addMatrxId: addHtmlExtractionsMatrxId,
        addMatrxIds: addHtmlExtractionsMatrxIds,
        removeMatrxId: removeHtmlExtractionsMatrxId,
        removeMatrxIds: removeHtmlExtractionsMatrxIds,
        addPkValue: addHtmlExtractionsPkValue,
        addPkValues: addHtmlExtractionsPkValues,
        removePkValue: removeHtmlExtractionsPkValue,
        removePkValues: removeHtmlExtractionsPkValues,
        isMissingRecords: isHtmlExtractionsMissingRecords,
        setShouldFetch: setHtmlExtractionsShouldFetch,
        setFetchMode: setHtmlExtractionsFetchMode,
        fetchQuickRefs: fetchHtmlExtractionsQuickRefs,
        fetchOne: fetchHtmlExtractionsOne,
        fetchOneWithFkIfk: fetchHtmlExtractionsOneWithFkIfk,
        fetchAll: fetchHtmlExtractionsAll,
        fetchPaginated: fetchHtmlExtractionsPaginated,

    } = useEntityWithFetch("htmlExtractions");

    return {
        htmlExtractionsSelectors,
        htmlExtractionsActions,
        htmlExtractionsRecords,
        htmlExtractionsUnsavedRecords,
        htmlExtractionsSelectedRecordIds,
        htmlExtractionsIsLoading,
        htmlExtractionsIsError,
        htmlExtractionsQuickRefRecords,
        addHtmlExtractionsMatrxId,
        addHtmlExtractionsMatrxIds,
        removeHtmlExtractionsMatrxId,
        removeHtmlExtractionsMatrxIds,
        addHtmlExtractionsPkValue,
        addHtmlExtractionsPkValues,
        removeHtmlExtractionsPkValue,
        removeHtmlExtractionsPkValues,
        isHtmlExtractionsMissingRecords,
        setHtmlExtractionsShouldFetch,
        setHtmlExtractionsFetchMode,
        fetchHtmlExtractionsQuickRefs,
        fetchHtmlExtractionsOne,
        fetchHtmlExtractionsOneWithFkIfk,
        fetchHtmlExtractionsAll,
        fetchHtmlExtractionsPaginated,
    };
};



type UseMessageWithFetchReturn = {
    messageSelectors: EntitySelectors<"message">;
    messageActions: EntityActions<"message">;
    messageRecords: Record<MatrxRecordId, MessageData>;
    messageUnsavedRecords: Record<MatrxRecordId, Partial<MessageData>>;
    messageSelectedRecordIds: MatrxRecordId[];
    messageIsLoading: boolean;
    messageIsError: boolean;
    messageQuickRefRecords: QuickReferenceRecord[];
    addMessageMatrxId: (recordId: MatrxRecordId) => void;
    addMessageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeMessageMatrxId: (recordId: MatrxRecordId) => void;
    removeMessageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addMessagePkValue: (pkValue: string) => void;
    addMessagePkValues: (pkValues: Record<string, unknown>) => void;
    removeMessagePkValue: (pkValue: string) => void;
    removeMessagePkValues: (pkValues: Record<string, unknown>) => void;
    isMessageMissingRecords: boolean;
    setMessageShouldFetch: (shouldFetch: boolean) => void;
    setMessageFetchMode: (fetchMode: FetchMode) => void;
    fetchMessageQuickRefs: () => void;
    fetchMessageOne: (recordId: MatrxRecordId) => void;
    fetchMessageOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchMessageAll: () => void;
    fetchMessagePaginated: (page: number, pageSize: number) => void;
};

export const useMessageWithFetch = (): UseMessageWithFetchReturn => {
    const {
        selectors: messageSelectors,
        actions: messageActions,
        allRecords: messageRecords,
        unsavedRecords: messageUnsavedRecords,
        selectedRecordIds: messageSelectedRecordIds,
        isLoading: messageIsLoading,
        isError: messageIsError,
        quickRefRecords: messageQuickRefRecords,
        addMatrxId: addMessageMatrxId,
        addMatrxIds: addMessageMatrxIds,
        removeMatrxId: removeMessageMatrxId,
        removeMatrxIds: removeMessageMatrxIds,
        addPkValue: addMessagePkValue,
        addPkValues: addMessagePkValues,
        removePkValue: removeMessagePkValue,
        removePkValues: removeMessagePkValues,
        isMissingRecords: isMessageMissingRecords,
        setShouldFetch: setMessageShouldFetch,
        setFetchMode: setMessageFetchMode,
        fetchQuickRefs: fetchMessageQuickRefs,
        fetchOne: fetchMessageOne,
        fetchOneWithFkIfk: fetchMessageOneWithFkIfk,
        fetchAll: fetchMessageAll,
        fetchPaginated: fetchMessagePaginated,

    } = useEntityWithFetch("message");

    return {
        messageSelectors,
        messageActions,
        messageRecords,
        messageUnsavedRecords,
        messageSelectedRecordIds,
        messageIsLoading,
        messageIsError,
        messageQuickRefRecords,
        addMessageMatrxId,
        addMessageMatrxIds,
        removeMessageMatrxId,
        removeMessageMatrxIds,
        addMessagePkValue,
        addMessagePkValues,
        removeMessagePkValue,
        removeMessagePkValues,
        isMessageMissingRecords,
        setMessageShouldFetch,
        setMessageFetchMode,
        fetchMessageQuickRefs,
        fetchMessageOne,
        fetchMessageOneWithFkIfk,
        fetchMessageAll,
        fetchMessagePaginated,
    };
};



type UseMessageBrokerWithFetchReturn = {
    messageBrokerSelectors: EntitySelectors<"messageBroker">;
    messageBrokerActions: EntityActions<"messageBroker">;
    messageBrokerRecords: Record<MatrxRecordId, MessageBrokerData>;
    messageBrokerUnsavedRecords: Record<MatrxRecordId, Partial<MessageBrokerData>>;
    messageBrokerSelectedRecordIds: MatrxRecordId[];
    messageBrokerIsLoading: boolean;
    messageBrokerIsError: boolean;
    messageBrokerQuickRefRecords: QuickReferenceRecord[];
    addMessageBrokerMatrxId: (recordId: MatrxRecordId) => void;
    addMessageBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeMessageBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removeMessageBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addMessageBrokerPkValue: (pkValue: string) => void;
    addMessageBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removeMessageBrokerPkValue: (pkValue: string) => void;
    removeMessageBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isMessageBrokerMissingRecords: boolean;
    setMessageBrokerShouldFetch: (shouldFetch: boolean) => void;
    setMessageBrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchMessageBrokerQuickRefs: () => void;
    fetchMessageBrokerOne: (recordId: MatrxRecordId) => void;
    fetchMessageBrokerOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchMessageBrokerAll: () => void;
    fetchMessageBrokerPaginated: (page: number, pageSize: number) => void;
};

export const useMessageBrokerWithFetch = (): UseMessageBrokerWithFetchReturn => {
    const {
        selectors: messageBrokerSelectors,
        actions: messageBrokerActions,
        allRecords: messageBrokerRecords,
        unsavedRecords: messageBrokerUnsavedRecords,
        selectedRecordIds: messageBrokerSelectedRecordIds,
        isLoading: messageBrokerIsLoading,
        isError: messageBrokerIsError,
        quickRefRecords: messageBrokerQuickRefRecords,
        addMatrxId: addMessageBrokerMatrxId,
        addMatrxIds: addMessageBrokerMatrxIds,
        removeMatrxId: removeMessageBrokerMatrxId,
        removeMatrxIds: removeMessageBrokerMatrxIds,
        addPkValue: addMessageBrokerPkValue,
        addPkValues: addMessageBrokerPkValues,
        removePkValue: removeMessageBrokerPkValue,
        removePkValues: removeMessageBrokerPkValues,
        isMissingRecords: isMessageBrokerMissingRecords,
        setShouldFetch: setMessageBrokerShouldFetch,
        setFetchMode: setMessageBrokerFetchMode,
        fetchQuickRefs: fetchMessageBrokerQuickRefs,
        fetchOne: fetchMessageBrokerOne,
        fetchOneWithFkIfk: fetchMessageBrokerOneWithFkIfk,
        fetchAll: fetchMessageBrokerAll,
        fetchPaginated: fetchMessageBrokerPaginated,

    } = useEntityWithFetch("messageBroker");

    return {
        messageBrokerSelectors,
        messageBrokerActions,
        messageBrokerRecords,
        messageBrokerUnsavedRecords,
        messageBrokerSelectedRecordIds,
        messageBrokerIsLoading,
        messageBrokerIsError,
        messageBrokerQuickRefRecords,
        addMessageBrokerMatrxId,
        addMessageBrokerMatrxIds,
        removeMessageBrokerMatrxId,
        removeMessageBrokerMatrxIds,
        addMessageBrokerPkValue,
        addMessageBrokerPkValues,
        removeMessageBrokerPkValue,
        removeMessageBrokerPkValues,
        isMessageBrokerMissingRecords,
        setMessageBrokerShouldFetch,
        setMessageBrokerFetchMode,
        fetchMessageBrokerQuickRefs,
        fetchMessageBrokerOne,
        fetchMessageBrokerOneWithFkIfk,
        fetchMessageBrokerAll,
        fetchMessageBrokerPaginated,
    };
};



type UseMessageTemplateWithFetchReturn = {
    messageTemplateSelectors: EntitySelectors<"messageTemplate">;
    messageTemplateActions: EntityActions<"messageTemplate">;
    messageTemplateRecords: Record<MatrxRecordId, MessageTemplateData>;
    messageTemplateUnsavedRecords: Record<MatrxRecordId, Partial<MessageTemplateData>>;
    messageTemplateSelectedRecordIds: MatrxRecordId[];
    messageTemplateIsLoading: boolean;
    messageTemplateIsError: boolean;
    messageTemplateQuickRefRecords: QuickReferenceRecord[];
    addMessageTemplateMatrxId: (recordId: MatrxRecordId) => void;
    addMessageTemplateMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeMessageTemplateMatrxId: (recordId: MatrxRecordId) => void;
    removeMessageTemplateMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addMessageTemplatePkValue: (pkValue: string) => void;
    addMessageTemplatePkValues: (pkValues: Record<string, unknown>) => void;
    removeMessageTemplatePkValue: (pkValue: string) => void;
    removeMessageTemplatePkValues: (pkValues: Record<string, unknown>) => void;
    isMessageTemplateMissingRecords: boolean;
    setMessageTemplateShouldFetch: (shouldFetch: boolean) => void;
    setMessageTemplateFetchMode: (fetchMode: FetchMode) => void;
    fetchMessageTemplateQuickRefs: () => void;
    fetchMessageTemplateOne: (recordId: MatrxRecordId) => void;
    fetchMessageTemplateOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchMessageTemplateAll: () => void;
    fetchMessageTemplatePaginated: (page: number, pageSize: number) => void;
};

export const useMessageTemplateWithFetch = (): UseMessageTemplateWithFetchReturn => {
    const {
        selectors: messageTemplateSelectors,
        actions: messageTemplateActions,
        allRecords: messageTemplateRecords,
        unsavedRecords: messageTemplateUnsavedRecords,
        selectedRecordIds: messageTemplateSelectedRecordIds,
        isLoading: messageTemplateIsLoading,
        isError: messageTemplateIsError,
        quickRefRecords: messageTemplateQuickRefRecords,
        addMatrxId: addMessageTemplateMatrxId,
        addMatrxIds: addMessageTemplateMatrxIds,
        removeMatrxId: removeMessageTemplateMatrxId,
        removeMatrxIds: removeMessageTemplateMatrxIds,
        addPkValue: addMessageTemplatePkValue,
        addPkValues: addMessageTemplatePkValues,
        removePkValue: removeMessageTemplatePkValue,
        removePkValues: removeMessageTemplatePkValues,
        isMissingRecords: isMessageTemplateMissingRecords,
        setShouldFetch: setMessageTemplateShouldFetch,
        setFetchMode: setMessageTemplateFetchMode,
        fetchQuickRefs: fetchMessageTemplateQuickRefs,
        fetchOne: fetchMessageTemplateOne,
        fetchOneWithFkIfk: fetchMessageTemplateOneWithFkIfk,
        fetchAll: fetchMessageTemplateAll,
        fetchPaginated: fetchMessageTemplatePaginated,

    } = useEntityWithFetch("messageTemplate");

    return {
        messageTemplateSelectors,
        messageTemplateActions,
        messageTemplateRecords,
        messageTemplateUnsavedRecords,
        messageTemplateSelectedRecordIds,
        messageTemplateIsLoading,
        messageTemplateIsError,
        messageTemplateQuickRefRecords,
        addMessageTemplateMatrxId,
        addMessageTemplateMatrxIds,
        removeMessageTemplateMatrxId,
        removeMessageTemplateMatrxIds,
        addMessageTemplatePkValue,
        addMessageTemplatePkValues,
        removeMessageTemplatePkValue,
        removeMessageTemplatePkValues,
        isMessageTemplateMissingRecords,
        setMessageTemplateShouldFetch,
        setMessageTemplateFetchMode,
        fetchMessageTemplateQuickRefs,
        fetchMessageTemplateOne,
        fetchMessageTemplateOneWithFkIfk,
        fetchMessageTemplateAll,
        fetchMessageTemplatePaginated,
    };
};



type UseOrganizationInvitationsWithFetchReturn = {
    organizationInvitationsSelectors: EntitySelectors<"organizationInvitations">;
    organizationInvitationsActions: EntityActions<"organizationInvitations">;
    organizationInvitationsRecords: Record<MatrxRecordId, OrganizationInvitationsData>;
    organizationInvitationsUnsavedRecords: Record<MatrxRecordId, Partial<OrganizationInvitationsData>>;
    organizationInvitationsSelectedRecordIds: MatrxRecordId[];
    organizationInvitationsIsLoading: boolean;
    organizationInvitationsIsError: boolean;
    organizationInvitationsQuickRefRecords: QuickReferenceRecord[];
    addOrganizationInvitationsMatrxId: (recordId: MatrxRecordId) => void;
    addOrganizationInvitationsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeOrganizationInvitationsMatrxId: (recordId: MatrxRecordId) => void;
    removeOrganizationInvitationsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addOrganizationInvitationsPkValue: (pkValue: string) => void;
    addOrganizationInvitationsPkValues: (pkValues: Record<string, unknown>) => void;
    removeOrganizationInvitationsPkValue: (pkValue: string) => void;
    removeOrganizationInvitationsPkValues: (pkValues: Record<string, unknown>) => void;
    isOrganizationInvitationsMissingRecords: boolean;
    setOrganizationInvitationsShouldFetch: (shouldFetch: boolean) => void;
    setOrganizationInvitationsFetchMode: (fetchMode: FetchMode) => void;
    fetchOrganizationInvitationsQuickRefs: () => void;
    fetchOrganizationInvitationsOne: (recordId: MatrxRecordId) => void;
    fetchOrganizationInvitationsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchOrganizationInvitationsAll: () => void;
    fetchOrganizationInvitationsPaginated: (page: number, pageSize: number) => void;
};

export const useOrganizationInvitationsWithFetch = (): UseOrganizationInvitationsWithFetchReturn => {
    const {
        selectors: organizationInvitationsSelectors,
        actions: organizationInvitationsActions,
        allRecords: organizationInvitationsRecords,
        unsavedRecords: organizationInvitationsUnsavedRecords,
        selectedRecordIds: organizationInvitationsSelectedRecordIds,
        isLoading: organizationInvitationsIsLoading,
        isError: organizationInvitationsIsError,
        quickRefRecords: organizationInvitationsQuickRefRecords,
        addMatrxId: addOrganizationInvitationsMatrxId,
        addMatrxIds: addOrganizationInvitationsMatrxIds,
        removeMatrxId: removeOrganizationInvitationsMatrxId,
        removeMatrxIds: removeOrganizationInvitationsMatrxIds,
        addPkValue: addOrganizationInvitationsPkValue,
        addPkValues: addOrganizationInvitationsPkValues,
        removePkValue: removeOrganizationInvitationsPkValue,
        removePkValues: removeOrganizationInvitationsPkValues,
        isMissingRecords: isOrganizationInvitationsMissingRecords,
        setShouldFetch: setOrganizationInvitationsShouldFetch,
        setFetchMode: setOrganizationInvitationsFetchMode,
        fetchQuickRefs: fetchOrganizationInvitationsQuickRefs,
        fetchOne: fetchOrganizationInvitationsOne,
        fetchOneWithFkIfk: fetchOrganizationInvitationsOneWithFkIfk,
        fetchAll: fetchOrganizationInvitationsAll,
        fetchPaginated: fetchOrganizationInvitationsPaginated,

    } = useEntityWithFetch("organizationInvitations");

    return {
        organizationInvitationsSelectors,
        organizationInvitationsActions,
        organizationInvitationsRecords,
        organizationInvitationsUnsavedRecords,
        organizationInvitationsSelectedRecordIds,
        organizationInvitationsIsLoading,
        organizationInvitationsIsError,
        organizationInvitationsQuickRefRecords,
        addOrganizationInvitationsMatrxId,
        addOrganizationInvitationsMatrxIds,
        removeOrganizationInvitationsMatrxId,
        removeOrganizationInvitationsMatrxIds,
        addOrganizationInvitationsPkValue,
        addOrganizationInvitationsPkValues,
        removeOrganizationInvitationsPkValue,
        removeOrganizationInvitationsPkValues,
        isOrganizationInvitationsMissingRecords,
        setOrganizationInvitationsShouldFetch,
        setOrganizationInvitationsFetchMode,
        fetchOrganizationInvitationsQuickRefs,
        fetchOrganizationInvitationsOne,
        fetchOrganizationInvitationsOneWithFkIfk,
        fetchOrganizationInvitationsAll,
        fetchOrganizationInvitationsPaginated,
    };
};



type UseOrganizationMembersWithFetchReturn = {
    organizationMembersSelectors: EntitySelectors<"organizationMembers">;
    organizationMembersActions: EntityActions<"organizationMembers">;
    organizationMembersRecords: Record<MatrxRecordId, OrganizationMembersData>;
    organizationMembersUnsavedRecords: Record<MatrxRecordId, Partial<OrganizationMembersData>>;
    organizationMembersSelectedRecordIds: MatrxRecordId[];
    organizationMembersIsLoading: boolean;
    organizationMembersIsError: boolean;
    organizationMembersQuickRefRecords: QuickReferenceRecord[];
    addOrganizationMembersMatrxId: (recordId: MatrxRecordId) => void;
    addOrganizationMembersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeOrganizationMembersMatrxId: (recordId: MatrxRecordId) => void;
    removeOrganizationMembersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addOrganizationMembersPkValue: (pkValue: string) => void;
    addOrganizationMembersPkValues: (pkValues: Record<string, unknown>) => void;
    removeOrganizationMembersPkValue: (pkValue: string) => void;
    removeOrganizationMembersPkValues: (pkValues: Record<string, unknown>) => void;
    isOrganizationMembersMissingRecords: boolean;
    setOrganizationMembersShouldFetch: (shouldFetch: boolean) => void;
    setOrganizationMembersFetchMode: (fetchMode: FetchMode) => void;
    fetchOrganizationMembersQuickRefs: () => void;
    fetchOrganizationMembersOne: (recordId: MatrxRecordId) => void;
    fetchOrganizationMembersOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchOrganizationMembersAll: () => void;
    fetchOrganizationMembersPaginated: (page: number, pageSize: number) => void;
};

export const useOrganizationMembersWithFetch = (): UseOrganizationMembersWithFetchReturn => {
    const {
        selectors: organizationMembersSelectors,
        actions: organizationMembersActions,
        allRecords: organizationMembersRecords,
        unsavedRecords: organizationMembersUnsavedRecords,
        selectedRecordIds: organizationMembersSelectedRecordIds,
        isLoading: organizationMembersIsLoading,
        isError: organizationMembersIsError,
        quickRefRecords: organizationMembersQuickRefRecords,
        addMatrxId: addOrganizationMembersMatrxId,
        addMatrxIds: addOrganizationMembersMatrxIds,
        removeMatrxId: removeOrganizationMembersMatrxId,
        removeMatrxIds: removeOrganizationMembersMatrxIds,
        addPkValue: addOrganizationMembersPkValue,
        addPkValues: addOrganizationMembersPkValues,
        removePkValue: removeOrganizationMembersPkValue,
        removePkValues: removeOrganizationMembersPkValues,
        isMissingRecords: isOrganizationMembersMissingRecords,
        setShouldFetch: setOrganizationMembersShouldFetch,
        setFetchMode: setOrganizationMembersFetchMode,
        fetchQuickRefs: fetchOrganizationMembersQuickRefs,
        fetchOne: fetchOrganizationMembersOne,
        fetchOneWithFkIfk: fetchOrganizationMembersOneWithFkIfk,
        fetchAll: fetchOrganizationMembersAll,
        fetchPaginated: fetchOrganizationMembersPaginated,

    } = useEntityWithFetch("organizationMembers");

    return {
        organizationMembersSelectors,
        organizationMembersActions,
        organizationMembersRecords,
        organizationMembersUnsavedRecords,
        organizationMembersSelectedRecordIds,
        organizationMembersIsLoading,
        organizationMembersIsError,
        organizationMembersQuickRefRecords,
        addOrganizationMembersMatrxId,
        addOrganizationMembersMatrxIds,
        removeOrganizationMembersMatrxId,
        removeOrganizationMembersMatrxIds,
        addOrganizationMembersPkValue,
        addOrganizationMembersPkValues,
        removeOrganizationMembersPkValue,
        removeOrganizationMembersPkValues,
        isOrganizationMembersMissingRecords,
        setOrganizationMembersShouldFetch,
        setOrganizationMembersFetchMode,
        fetchOrganizationMembersQuickRefs,
        fetchOrganizationMembersOne,
        fetchOrganizationMembersOneWithFkIfk,
        fetchOrganizationMembersAll,
        fetchOrganizationMembersPaginated,
    };
};



type UseOrganizationsWithFetchReturn = {
    organizationsSelectors: EntitySelectors<"organizations">;
    organizationsActions: EntityActions<"organizations">;
    organizationsRecords: Record<MatrxRecordId, OrganizationsData>;
    organizationsUnsavedRecords: Record<MatrxRecordId, Partial<OrganizationsData>>;
    organizationsSelectedRecordIds: MatrxRecordId[];
    organizationsIsLoading: boolean;
    organizationsIsError: boolean;
    organizationsQuickRefRecords: QuickReferenceRecord[];
    addOrganizationsMatrxId: (recordId: MatrxRecordId) => void;
    addOrganizationsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeOrganizationsMatrxId: (recordId: MatrxRecordId) => void;
    removeOrganizationsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addOrganizationsPkValue: (pkValue: string) => void;
    addOrganizationsPkValues: (pkValues: Record<string, unknown>) => void;
    removeOrganizationsPkValue: (pkValue: string) => void;
    removeOrganizationsPkValues: (pkValues: Record<string, unknown>) => void;
    isOrganizationsMissingRecords: boolean;
    setOrganizationsShouldFetch: (shouldFetch: boolean) => void;
    setOrganizationsFetchMode: (fetchMode: FetchMode) => void;
    fetchOrganizationsQuickRefs: () => void;
    fetchOrganizationsOne: (recordId: MatrxRecordId) => void;
    fetchOrganizationsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchOrganizationsAll: () => void;
    fetchOrganizationsPaginated: (page: number, pageSize: number) => void;
};

export const useOrganizationsWithFetch = (): UseOrganizationsWithFetchReturn => {
    const {
        selectors: organizationsSelectors,
        actions: organizationsActions,
        allRecords: organizationsRecords,
        unsavedRecords: organizationsUnsavedRecords,
        selectedRecordIds: organizationsSelectedRecordIds,
        isLoading: organizationsIsLoading,
        isError: organizationsIsError,
        quickRefRecords: organizationsQuickRefRecords,
        addMatrxId: addOrganizationsMatrxId,
        addMatrxIds: addOrganizationsMatrxIds,
        removeMatrxId: removeOrganizationsMatrxId,
        removeMatrxIds: removeOrganizationsMatrxIds,
        addPkValue: addOrganizationsPkValue,
        addPkValues: addOrganizationsPkValues,
        removePkValue: removeOrganizationsPkValue,
        removePkValues: removeOrganizationsPkValues,
        isMissingRecords: isOrganizationsMissingRecords,
        setShouldFetch: setOrganizationsShouldFetch,
        setFetchMode: setOrganizationsFetchMode,
        fetchQuickRefs: fetchOrganizationsQuickRefs,
        fetchOne: fetchOrganizationsOne,
        fetchOneWithFkIfk: fetchOrganizationsOneWithFkIfk,
        fetchAll: fetchOrganizationsAll,
        fetchPaginated: fetchOrganizationsPaginated,

    } = useEntityWithFetch("organizations");

    return {
        organizationsSelectors,
        organizationsActions,
        organizationsRecords,
        organizationsUnsavedRecords,
        organizationsSelectedRecordIds,
        organizationsIsLoading,
        organizationsIsError,
        organizationsQuickRefRecords,
        addOrganizationsMatrxId,
        addOrganizationsMatrxIds,
        removeOrganizationsMatrxId,
        removeOrganizationsMatrxIds,
        addOrganizationsPkValue,
        addOrganizationsPkValues,
        removeOrganizationsPkValue,
        removeOrganizationsPkValues,
        isOrganizationsMissingRecords,
        setOrganizationsShouldFetch,
        setOrganizationsFetchMode,
        fetchOrganizationsQuickRefs,
        fetchOrganizationsOne,
        fetchOrganizationsOneWithFkIfk,
        fetchOrganizationsAll,
        fetchOrganizationsPaginated,
    };
};



type UsePermissionsWithFetchReturn = {
    permissionsSelectors: EntitySelectors<"permissions">;
    permissionsActions: EntityActions<"permissions">;
    permissionsRecords: Record<MatrxRecordId, PermissionsData>;
    permissionsUnsavedRecords: Record<MatrxRecordId, Partial<PermissionsData>>;
    permissionsSelectedRecordIds: MatrxRecordId[];
    permissionsIsLoading: boolean;
    permissionsIsError: boolean;
    permissionsQuickRefRecords: QuickReferenceRecord[];
    addPermissionsMatrxId: (recordId: MatrxRecordId) => void;
    addPermissionsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removePermissionsMatrxId: (recordId: MatrxRecordId) => void;
    removePermissionsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addPermissionsPkValue: (pkValue: string) => void;
    addPermissionsPkValues: (pkValues: Record<string, unknown>) => void;
    removePermissionsPkValue: (pkValue: string) => void;
    removePermissionsPkValues: (pkValues: Record<string, unknown>) => void;
    isPermissionsMissingRecords: boolean;
    setPermissionsShouldFetch: (shouldFetch: boolean) => void;
    setPermissionsFetchMode: (fetchMode: FetchMode) => void;
    fetchPermissionsQuickRefs: () => void;
    fetchPermissionsOne: (recordId: MatrxRecordId) => void;
    fetchPermissionsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchPermissionsAll: () => void;
    fetchPermissionsPaginated: (page: number, pageSize: number) => void;
};

export const usePermissionsWithFetch = (): UsePermissionsWithFetchReturn => {
    const {
        selectors: permissionsSelectors,
        actions: permissionsActions,
        allRecords: permissionsRecords,
        unsavedRecords: permissionsUnsavedRecords,
        selectedRecordIds: permissionsSelectedRecordIds,
        isLoading: permissionsIsLoading,
        isError: permissionsIsError,
        quickRefRecords: permissionsQuickRefRecords,
        addMatrxId: addPermissionsMatrxId,
        addMatrxIds: addPermissionsMatrxIds,
        removeMatrxId: removePermissionsMatrxId,
        removeMatrxIds: removePermissionsMatrxIds,
        addPkValue: addPermissionsPkValue,
        addPkValues: addPermissionsPkValues,
        removePkValue: removePermissionsPkValue,
        removePkValues: removePermissionsPkValues,
        isMissingRecords: isPermissionsMissingRecords,
        setShouldFetch: setPermissionsShouldFetch,
        setFetchMode: setPermissionsFetchMode,
        fetchQuickRefs: fetchPermissionsQuickRefs,
        fetchOne: fetchPermissionsOne,
        fetchOneWithFkIfk: fetchPermissionsOneWithFkIfk,
        fetchAll: fetchPermissionsAll,
        fetchPaginated: fetchPermissionsPaginated,

    } = useEntityWithFetch("permissions");

    return {
        permissionsSelectors,
        permissionsActions,
        permissionsRecords,
        permissionsUnsavedRecords,
        permissionsSelectedRecordIds,
        permissionsIsLoading,
        permissionsIsError,
        permissionsQuickRefRecords,
        addPermissionsMatrxId,
        addPermissionsMatrxIds,
        removePermissionsMatrxId,
        removePermissionsMatrxIds,
        addPermissionsPkValue,
        addPermissionsPkValues,
        removePermissionsPkValue,
        removePermissionsPkValues,
        isPermissionsMissingRecords,
        setPermissionsShouldFetch,
        setPermissionsFetchMode,
        fetchPermissionsQuickRefs,
        fetchPermissionsOne,
        fetchPermissionsOneWithFkIfk,
        fetchPermissionsAll,
        fetchPermissionsPaginated,
    };
};



type UseProcessorWithFetchReturn = {
    processorSelectors: EntitySelectors<"processor">;
    processorActions: EntityActions<"processor">;
    processorRecords: Record<MatrxRecordId, ProcessorData>;
    processorUnsavedRecords: Record<MatrxRecordId, Partial<ProcessorData>>;
    processorSelectedRecordIds: MatrxRecordId[];
    processorIsLoading: boolean;
    processorIsError: boolean;
    processorQuickRefRecords: QuickReferenceRecord[];
    addProcessorMatrxId: (recordId: MatrxRecordId) => void;
    addProcessorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeProcessorMatrxId: (recordId: MatrxRecordId) => void;
    removeProcessorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addProcessorPkValue: (pkValue: string) => void;
    addProcessorPkValues: (pkValues: Record<string, unknown>) => void;
    removeProcessorPkValue: (pkValue: string) => void;
    removeProcessorPkValues: (pkValues: Record<string, unknown>) => void;
    isProcessorMissingRecords: boolean;
    setProcessorShouldFetch: (shouldFetch: boolean) => void;
    setProcessorFetchMode: (fetchMode: FetchMode) => void;
    fetchProcessorQuickRefs: () => void;
    fetchProcessorOne: (recordId: MatrxRecordId) => void;
    fetchProcessorOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchProcessorAll: () => void;
    fetchProcessorPaginated: (page: number, pageSize: number) => void;
};

export const useProcessorWithFetch = (): UseProcessorWithFetchReturn => {
    const {
        selectors: processorSelectors,
        actions: processorActions,
        allRecords: processorRecords,
        unsavedRecords: processorUnsavedRecords,
        selectedRecordIds: processorSelectedRecordIds,
        isLoading: processorIsLoading,
        isError: processorIsError,
        quickRefRecords: processorQuickRefRecords,
        addMatrxId: addProcessorMatrxId,
        addMatrxIds: addProcessorMatrxIds,
        removeMatrxId: removeProcessorMatrxId,
        removeMatrxIds: removeProcessorMatrxIds,
        addPkValue: addProcessorPkValue,
        addPkValues: addProcessorPkValues,
        removePkValue: removeProcessorPkValue,
        removePkValues: removeProcessorPkValues,
        isMissingRecords: isProcessorMissingRecords,
        setShouldFetch: setProcessorShouldFetch,
        setFetchMode: setProcessorFetchMode,
        fetchQuickRefs: fetchProcessorQuickRefs,
        fetchOne: fetchProcessorOne,
        fetchOneWithFkIfk: fetchProcessorOneWithFkIfk,
        fetchAll: fetchProcessorAll,
        fetchPaginated: fetchProcessorPaginated,

    } = useEntityWithFetch("processor");

    return {
        processorSelectors,
        processorActions,
        processorRecords,
        processorUnsavedRecords,
        processorSelectedRecordIds,
        processorIsLoading,
        processorIsError,
        processorQuickRefRecords,
        addProcessorMatrxId,
        addProcessorMatrxIds,
        removeProcessorMatrxId,
        removeProcessorMatrxIds,
        addProcessorPkValue,
        addProcessorPkValues,
        removeProcessorPkValue,
        removeProcessorPkValues,
        isProcessorMissingRecords,
        setProcessorShouldFetch,
        setProcessorFetchMode,
        fetchProcessorQuickRefs,
        fetchProcessorOne,
        fetchProcessorOneWithFkIfk,
        fetchProcessorAll,
        fetchProcessorPaginated,
    };
};



type UseProjectMembersWithFetchReturn = {
    projectMembersSelectors: EntitySelectors<"projectMembers">;
    projectMembersActions: EntityActions<"projectMembers">;
    projectMembersRecords: Record<MatrxRecordId, ProjectMembersData>;
    projectMembersUnsavedRecords: Record<MatrxRecordId, Partial<ProjectMembersData>>;
    projectMembersSelectedRecordIds: MatrxRecordId[];
    projectMembersIsLoading: boolean;
    projectMembersIsError: boolean;
    projectMembersQuickRefRecords: QuickReferenceRecord[];
    addProjectMembersMatrxId: (recordId: MatrxRecordId) => void;
    addProjectMembersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeProjectMembersMatrxId: (recordId: MatrxRecordId) => void;
    removeProjectMembersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addProjectMembersPkValue: (pkValue: string) => void;
    addProjectMembersPkValues: (pkValues: Record<string, unknown>) => void;
    removeProjectMembersPkValue: (pkValue: string) => void;
    removeProjectMembersPkValues: (pkValues: Record<string, unknown>) => void;
    isProjectMembersMissingRecords: boolean;
    setProjectMembersShouldFetch: (shouldFetch: boolean) => void;
    setProjectMembersFetchMode: (fetchMode: FetchMode) => void;
    fetchProjectMembersQuickRefs: () => void;
    fetchProjectMembersOne: (recordId: MatrxRecordId) => void;
    fetchProjectMembersOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchProjectMembersAll: () => void;
    fetchProjectMembersPaginated: (page: number, pageSize: number) => void;
};

export const useProjectMembersWithFetch = (): UseProjectMembersWithFetchReturn => {
    const {
        selectors: projectMembersSelectors,
        actions: projectMembersActions,
        allRecords: projectMembersRecords,
        unsavedRecords: projectMembersUnsavedRecords,
        selectedRecordIds: projectMembersSelectedRecordIds,
        isLoading: projectMembersIsLoading,
        isError: projectMembersIsError,
        quickRefRecords: projectMembersQuickRefRecords,
        addMatrxId: addProjectMembersMatrxId,
        addMatrxIds: addProjectMembersMatrxIds,
        removeMatrxId: removeProjectMembersMatrxId,
        removeMatrxIds: removeProjectMembersMatrxIds,
        addPkValue: addProjectMembersPkValue,
        addPkValues: addProjectMembersPkValues,
        removePkValue: removeProjectMembersPkValue,
        removePkValues: removeProjectMembersPkValues,
        isMissingRecords: isProjectMembersMissingRecords,
        setShouldFetch: setProjectMembersShouldFetch,
        setFetchMode: setProjectMembersFetchMode,
        fetchQuickRefs: fetchProjectMembersQuickRefs,
        fetchOne: fetchProjectMembersOne,
        fetchOneWithFkIfk: fetchProjectMembersOneWithFkIfk,
        fetchAll: fetchProjectMembersAll,
        fetchPaginated: fetchProjectMembersPaginated,

    } = useEntityWithFetch("projectMembers");

    return {
        projectMembersSelectors,
        projectMembersActions,
        projectMembersRecords,
        projectMembersUnsavedRecords,
        projectMembersSelectedRecordIds,
        projectMembersIsLoading,
        projectMembersIsError,
        projectMembersQuickRefRecords,
        addProjectMembersMatrxId,
        addProjectMembersMatrxIds,
        removeProjectMembersMatrxId,
        removeProjectMembersMatrxIds,
        addProjectMembersPkValue,
        addProjectMembersPkValues,
        removeProjectMembersPkValue,
        removeProjectMembersPkValues,
        isProjectMembersMissingRecords,
        setProjectMembersShouldFetch,
        setProjectMembersFetchMode,
        fetchProjectMembersQuickRefs,
        fetchProjectMembersOne,
        fetchProjectMembersOneWithFkIfk,
        fetchProjectMembersAll,
        fetchProjectMembersPaginated,
    };
};



type UseProjectsWithFetchReturn = {
    projectsSelectors: EntitySelectors<"projects">;
    projectsActions: EntityActions<"projects">;
    projectsRecords: Record<MatrxRecordId, ProjectsData>;
    projectsUnsavedRecords: Record<MatrxRecordId, Partial<ProjectsData>>;
    projectsSelectedRecordIds: MatrxRecordId[];
    projectsIsLoading: boolean;
    projectsIsError: boolean;
    projectsQuickRefRecords: QuickReferenceRecord[];
    addProjectsMatrxId: (recordId: MatrxRecordId) => void;
    addProjectsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeProjectsMatrxId: (recordId: MatrxRecordId) => void;
    removeProjectsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addProjectsPkValue: (pkValue: string) => void;
    addProjectsPkValues: (pkValues: Record<string, unknown>) => void;
    removeProjectsPkValue: (pkValue: string) => void;
    removeProjectsPkValues: (pkValues: Record<string, unknown>) => void;
    isProjectsMissingRecords: boolean;
    setProjectsShouldFetch: (shouldFetch: boolean) => void;
    setProjectsFetchMode: (fetchMode: FetchMode) => void;
    fetchProjectsQuickRefs: () => void;
    fetchProjectsOne: (recordId: MatrxRecordId) => void;
    fetchProjectsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchProjectsAll: () => void;
    fetchProjectsPaginated: (page: number, pageSize: number) => void;
};

export const useProjectsWithFetch = (): UseProjectsWithFetchReturn => {
    const {
        selectors: projectsSelectors,
        actions: projectsActions,
        allRecords: projectsRecords,
        unsavedRecords: projectsUnsavedRecords,
        selectedRecordIds: projectsSelectedRecordIds,
        isLoading: projectsIsLoading,
        isError: projectsIsError,
        quickRefRecords: projectsQuickRefRecords,
        addMatrxId: addProjectsMatrxId,
        addMatrxIds: addProjectsMatrxIds,
        removeMatrxId: removeProjectsMatrxId,
        removeMatrxIds: removeProjectsMatrxIds,
        addPkValue: addProjectsPkValue,
        addPkValues: addProjectsPkValues,
        removePkValue: removeProjectsPkValue,
        removePkValues: removeProjectsPkValues,
        isMissingRecords: isProjectsMissingRecords,
        setShouldFetch: setProjectsShouldFetch,
        setFetchMode: setProjectsFetchMode,
        fetchQuickRefs: fetchProjectsQuickRefs,
        fetchOne: fetchProjectsOne,
        fetchOneWithFkIfk: fetchProjectsOneWithFkIfk,
        fetchAll: fetchProjectsAll,
        fetchPaginated: fetchProjectsPaginated,

    } = useEntityWithFetch("projects");

    return {
        projectsSelectors,
        projectsActions,
        projectsRecords,
        projectsUnsavedRecords,
        projectsSelectedRecordIds,
        projectsIsLoading,
        projectsIsError,
        projectsQuickRefRecords,
        addProjectsMatrxId,
        addProjectsMatrxIds,
        removeProjectsMatrxId,
        removeProjectsMatrxIds,
        addProjectsPkValue,
        addProjectsPkValues,
        removeProjectsPkValue,
        removeProjectsPkValues,
        isProjectsMissingRecords,
        setProjectsShouldFetch,
        setProjectsFetchMode,
        fetchProjectsQuickRefs,
        fetchProjectsOne,
        fetchProjectsOneWithFkIfk,
        fetchProjectsAll,
        fetchProjectsPaginated,
    };
};



type UseRecipeWithFetchReturn = {
    recipeSelectors: EntitySelectors<"recipe">;
    recipeActions: EntityActions<"recipe">;
    recipeRecords: Record<MatrxRecordId, RecipeData>;
    recipeUnsavedRecords: Record<MatrxRecordId, Partial<RecipeData>>;
    recipeSelectedRecordIds: MatrxRecordId[];
    recipeIsLoading: boolean;
    recipeIsError: boolean;
    recipeQuickRefRecords: QuickReferenceRecord[];
    addRecipeMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipePkValue: (pkValue: string) => void;
    addRecipePkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipePkValue: (pkValue: string) => void;
    removeRecipePkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeMissingRecords: boolean;
    setRecipeShouldFetch: (shouldFetch: boolean) => void;
    setRecipeFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeQuickRefs: () => void;
    fetchRecipeOne: (recordId: MatrxRecordId) => void;
    fetchRecipeOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeAll: () => void;
    fetchRecipePaginated: (page: number, pageSize: number) => void;
};

export const useRecipeWithFetch = (): UseRecipeWithFetchReturn => {
    const {
        selectors: recipeSelectors,
        actions: recipeActions,
        allRecords: recipeRecords,
        unsavedRecords: recipeUnsavedRecords,
        selectedRecordIds: recipeSelectedRecordIds,
        isLoading: recipeIsLoading,
        isError: recipeIsError,
        quickRefRecords: recipeQuickRefRecords,
        addMatrxId: addRecipeMatrxId,
        addMatrxIds: addRecipeMatrxIds,
        removeMatrxId: removeRecipeMatrxId,
        removeMatrxIds: removeRecipeMatrxIds,
        addPkValue: addRecipePkValue,
        addPkValues: addRecipePkValues,
        removePkValue: removeRecipePkValue,
        removePkValues: removeRecipePkValues,
        isMissingRecords: isRecipeMissingRecords,
        setShouldFetch: setRecipeShouldFetch,
        setFetchMode: setRecipeFetchMode,
        fetchQuickRefs: fetchRecipeQuickRefs,
        fetchOne: fetchRecipeOne,
        fetchOneWithFkIfk: fetchRecipeOneWithFkIfk,
        fetchAll: fetchRecipeAll,
        fetchPaginated: fetchRecipePaginated,

    } = useEntityWithFetch("recipe");

    return {
        recipeSelectors,
        recipeActions,
        recipeRecords,
        recipeUnsavedRecords,
        recipeSelectedRecordIds,
        recipeIsLoading,
        recipeIsError,
        recipeQuickRefRecords,
        addRecipeMatrxId,
        addRecipeMatrxIds,
        removeRecipeMatrxId,
        removeRecipeMatrxIds,
        addRecipePkValue,
        addRecipePkValues,
        removeRecipePkValue,
        removeRecipePkValues,
        isRecipeMissingRecords,
        setRecipeShouldFetch,
        setRecipeFetchMode,
        fetchRecipeQuickRefs,
        fetchRecipeOne,
        fetchRecipeOneWithFkIfk,
        fetchRecipeAll,
        fetchRecipePaginated,
    };
};



type UseRecipeBrokerWithFetchReturn = {
    recipeBrokerSelectors: EntitySelectors<"recipeBroker">;
    recipeBrokerActions: EntityActions<"recipeBroker">;
    recipeBrokerRecords: Record<MatrxRecordId, RecipeBrokerData>;
    recipeBrokerUnsavedRecords: Record<MatrxRecordId, Partial<RecipeBrokerData>>;
    recipeBrokerSelectedRecordIds: MatrxRecordId[];
    recipeBrokerIsLoading: boolean;
    recipeBrokerIsError: boolean;
    recipeBrokerQuickRefRecords: QuickReferenceRecord[];
    addRecipeBrokerMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipeBrokerPkValue: (pkValue: string) => void;
    addRecipeBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipeBrokerPkValue: (pkValue: string) => void;
    removeRecipeBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeBrokerMissingRecords: boolean;
    setRecipeBrokerShouldFetch: (shouldFetch: boolean) => void;
    setRecipeBrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeBrokerQuickRefs: () => void;
    fetchRecipeBrokerOne: (recordId: MatrxRecordId) => void;
    fetchRecipeBrokerOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeBrokerAll: () => void;
    fetchRecipeBrokerPaginated: (page: number, pageSize: number) => void;
};

export const useRecipeBrokerWithFetch = (): UseRecipeBrokerWithFetchReturn => {
    const {
        selectors: recipeBrokerSelectors,
        actions: recipeBrokerActions,
        allRecords: recipeBrokerRecords,
        unsavedRecords: recipeBrokerUnsavedRecords,
        selectedRecordIds: recipeBrokerSelectedRecordIds,
        isLoading: recipeBrokerIsLoading,
        isError: recipeBrokerIsError,
        quickRefRecords: recipeBrokerQuickRefRecords,
        addMatrxId: addRecipeBrokerMatrxId,
        addMatrxIds: addRecipeBrokerMatrxIds,
        removeMatrxId: removeRecipeBrokerMatrxId,
        removeMatrxIds: removeRecipeBrokerMatrxIds,
        addPkValue: addRecipeBrokerPkValue,
        addPkValues: addRecipeBrokerPkValues,
        removePkValue: removeRecipeBrokerPkValue,
        removePkValues: removeRecipeBrokerPkValues,
        isMissingRecords: isRecipeBrokerMissingRecords,
        setShouldFetch: setRecipeBrokerShouldFetch,
        setFetchMode: setRecipeBrokerFetchMode,
        fetchQuickRefs: fetchRecipeBrokerQuickRefs,
        fetchOne: fetchRecipeBrokerOne,
        fetchOneWithFkIfk: fetchRecipeBrokerOneWithFkIfk,
        fetchAll: fetchRecipeBrokerAll,
        fetchPaginated: fetchRecipeBrokerPaginated,

    } = useEntityWithFetch("recipeBroker");

    return {
        recipeBrokerSelectors,
        recipeBrokerActions,
        recipeBrokerRecords,
        recipeBrokerUnsavedRecords,
        recipeBrokerSelectedRecordIds,
        recipeBrokerIsLoading,
        recipeBrokerIsError,
        recipeBrokerQuickRefRecords,
        addRecipeBrokerMatrxId,
        addRecipeBrokerMatrxIds,
        removeRecipeBrokerMatrxId,
        removeRecipeBrokerMatrxIds,
        addRecipeBrokerPkValue,
        addRecipeBrokerPkValues,
        removeRecipeBrokerPkValue,
        removeRecipeBrokerPkValues,
        isRecipeBrokerMissingRecords,
        setRecipeBrokerShouldFetch,
        setRecipeBrokerFetchMode,
        fetchRecipeBrokerQuickRefs,
        fetchRecipeBrokerOne,
        fetchRecipeBrokerOneWithFkIfk,
        fetchRecipeBrokerAll,
        fetchRecipeBrokerPaginated,
    };
};



type UseRecipeDisplayWithFetchReturn = {
    recipeDisplaySelectors: EntitySelectors<"recipeDisplay">;
    recipeDisplayActions: EntityActions<"recipeDisplay">;
    recipeDisplayRecords: Record<MatrxRecordId, RecipeDisplayData>;
    recipeDisplayUnsavedRecords: Record<MatrxRecordId, Partial<RecipeDisplayData>>;
    recipeDisplaySelectedRecordIds: MatrxRecordId[];
    recipeDisplayIsLoading: boolean;
    recipeDisplayIsError: boolean;
    recipeDisplayQuickRefRecords: QuickReferenceRecord[];
    addRecipeDisplayMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeDisplayMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeDisplayMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeDisplayMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipeDisplayPkValue: (pkValue: string) => void;
    addRecipeDisplayPkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipeDisplayPkValue: (pkValue: string) => void;
    removeRecipeDisplayPkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeDisplayMissingRecords: boolean;
    setRecipeDisplayShouldFetch: (shouldFetch: boolean) => void;
    setRecipeDisplayFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeDisplayQuickRefs: () => void;
    fetchRecipeDisplayOne: (recordId: MatrxRecordId) => void;
    fetchRecipeDisplayOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeDisplayAll: () => void;
    fetchRecipeDisplayPaginated: (page: number, pageSize: number) => void;
};

export const useRecipeDisplayWithFetch = (): UseRecipeDisplayWithFetchReturn => {
    const {
        selectors: recipeDisplaySelectors,
        actions: recipeDisplayActions,
        allRecords: recipeDisplayRecords,
        unsavedRecords: recipeDisplayUnsavedRecords,
        selectedRecordIds: recipeDisplaySelectedRecordIds,
        isLoading: recipeDisplayIsLoading,
        isError: recipeDisplayIsError,
        quickRefRecords: recipeDisplayQuickRefRecords,
        addMatrxId: addRecipeDisplayMatrxId,
        addMatrxIds: addRecipeDisplayMatrxIds,
        removeMatrxId: removeRecipeDisplayMatrxId,
        removeMatrxIds: removeRecipeDisplayMatrxIds,
        addPkValue: addRecipeDisplayPkValue,
        addPkValues: addRecipeDisplayPkValues,
        removePkValue: removeRecipeDisplayPkValue,
        removePkValues: removeRecipeDisplayPkValues,
        isMissingRecords: isRecipeDisplayMissingRecords,
        setShouldFetch: setRecipeDisplayShouldFetch,
        setFetchMode: setRecipeDisplayFetchMode,
        fetchQuickRefs: fetchRecipeDisplayQuickRefs,
        fetchOne: fetchRecipeDisplayOne,
        fetchOneWithFkIfk: fetchRecipeDisplayOneWithFkIfk,
        fetchAll: fetchRecipeDisplayAll,
        fetchPaginated: fetchRecipeDisplayPaginated,

    } = useEntityWithFetch("recipeDisplay");

    return {
        recipeDisplaySelectors,
        recipeDisplayActions,
        recipeDisplayRecords,
        recipeDisplayUnsavedRecords,
        recipeDisplaySelectedRecordIds,
        recipeDisplayIsLoading,
        recipeDisplayIsError,
        recipeDisplayQuickRefRecords,
        addRecipeDisplayMatrxId,
        addRecipeDisplayMatrxIds,
        removeRecipeDisplayMatrxId,
        removeRecipeDisplayMatrxIds,
        addRecipeDisplayPkValue,
        addRecipeDisplayPkValues,
        removeRecipeDisplayPkValue,
        removeRecipeDisplayPkValues,
        isRecipeDisplayMissingRecords,
        setRecipeDisplayShouldFetch,
        setRecipeDisplayFetchMode,
        fetchRecipeDisplayQuickRefs,
        fetchRecipeDisplayOne,
        fetchRecipeDisplayOneWithFkIfk,
        fetchRecipeDisplayAll,
        fetchRecipeDisplayPaginated,
    };
};



type UseRecipeFunctionWithFetchReturn = {
    recipeFunctionSelectors: EntitySelectors<"recipeFunction">;
    recipeFunctionActions: EntityActions<"recipeFunction">;
    recipeFunctionRecords: Record<MatrxRecordId, RecipeFunctionData>;
    recipeFunctionUnsavedRecords: Record<MatrxRecordId, Partial<RecipeFunctionData>>;
    recipeFunctionSelectedRecordIds: MatrxRecordId[];
    recipeFunctionIsLoading: boolean;
    recipeFunctionIsError: boolean;
    recipeFunctionQuickRefRecords: QuickReferenceRecord[];
    addRecipeFunctionMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeFunctionMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipeFunctionPkValue: (pkValue: string) => void;
    addRecipeFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipeFunctionPkValue: (pkValue: string) => void;
    removeRecipeFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeFunctionMissingRecords: boolean;
    setRecipeFunctionShouldFetch: (shouldFetch: boolean) => void;
    setRecipeFunctionFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeFunctionQuickRefs: () => void;
    fetchRecipeFunctionOne: (recordId: MatrxRecordId) => void;
    fetchRecipeFunctionOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeFunctionAll: () => void;
    fetchRecipeFunctionPaginated: (page: number, pageSize: number) => void;
};

export const useRecipeFunctionWithFetch = (): UseRecipeFunctionWithFetchReturn => {
    const {
        selectors: recipeFunctionSelectors,
        actions: recipeFunctionActions,
        allRecords: recipeFunctionRecords,
        unsavedRecords: recipeFunctionUnsavedRecords,
        selectedRecordIds: recipeFunctionSelectedRecordIds,
        isLoading: recipeFunctionIsLoading,
        isError: recipeFunctionIsError,
        quickRefRecords: recipeFunctionQuickRefRecords,
        addMatrxId: addRecipeFunctionMatrxId,
        addMatrxIds: addRecipeFunctionMatrxIds,
        removeMatrxId: removeRecipeFunctionMatrxId,
        removeMatrxIds: removeRecipeFunctionMatrxIds,
        addPkValue: addRecipeFunctionPkValue,
        addPkValues: addRecipeFunctionPkValues,
        removePkValue: removeRecipeFunctionPkValue,
        removePkValues: removeRecipeFunctionPkValues,
        isMissingRecords: isRecipeFunctionMissingRecords,
        setShouldFetch: setRecipeFunctionShouldFetch,
        setFetchMode: setRecipeFunctionFetchMode,
        fetchQuickRefs: fetchRecipeFunctionQuickRefs,
        fetchOne: fetchRecipeFunctionOne,
        fetchOneWithFkIfk: fetchRecipeFunctionOneWithFkIfk,
        fetchAll: fetchRecipeFunctionAll,
        fetchPaginated: fetchRecipeFunctionPaginated,

    } = useEntityWithFetch("recipeFunction");

    return {
        recipeFunctionSelectors,
        recipeFunctionActions,
        recipeFunctionRecords,
        recipeFunctionUnsavedRecords,
        recipeFunctionSelectedRecordIds,
        recipeFunctionIsLoading,
        recipeFunctionIsError,
        recipeFunctionQuickRefRecords,
        addRecipeFunctionMatrxId,
        addRecipeFunctionMatrxIds,
        removeRecipeFunctionMatrxId,
        removeRecipeFunctionMatrxIds,
        addRecipeFunctionPkValue,
        addRecipeFunctionPkValues,
        removeRecipeFunctionPkValue,
        removeRecipeFunctionPkValues,
        isRecipeFunctionMissingRecords,
        setRecipeFunctionShouldFetch,
        setRecipeFunctionFetchMode,
        fetchRecipeFunctionQuickRefs,
        fetchRecipeFunctionOne,
        fetchRecipeFunctionOneWithFkIfk,
        fetchRecipeFunctionAll,
        fetchRecipeFunctionPaginated,
    };
};



type UseRecipeMessageWithFetchReturn = {
    recipeMessageSelectors: EntitySelectors<"recipeMessage">;
    recipeMessageActions: EntityActions<"recipeMessage">;
    recipeMessageRecords: Record<MatrxRecordId, RecipeMessageData>;
    recipeMessageUnsavedRecords: Record<MatrxRecordId, Partial<RecipeMessageData>>;
    recipeMessageSelectedRecordIds: MatrxRecordId[];
    recipeMessageIsLoading: boolean;
    recipeMessageIsError: boolean;
    recipeMessageQuickRefRecords: QuickReferenceRecord[];
    addRecipeMessageMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeMessageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeMessageMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeMessageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipeMessagePkValue: (pkValue: string) => void;
    addRecipeMessagePkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipeMessagePkValue: (pkValue: string) => void;
    removeRecipeMessagePkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeMessageMissingRecords: boolean;
    setRecipeMessageShouldFetch: (shouldFetch: boolean) => void;
    setRecipeMessageFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeMessageQuickRefs: () => void;
    fetchRecipeMessageOne: (recordId: MatrxRecordId) => void;
    fetchRecipeMessageOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeMessageAll: () => void;
    fetchRecipeMessagePaginated: (page: number, pageSize: number) => void;
};

export const useRecipeMessageWithFetch = (): UseRecipeMessageWithFetchReturn => {
    const {
        selectors: recipeMessageSelectors,
        actions: recipeMessageActions,
        allRecords: recipeMessageRecords,
        unsavedRecords: recipeMessageUnsavedRecords,
        selectedRecordIds: recipeMessageSelectedRecordIds,
        isLoading: recipeMessageIsLoading,
        isError: recipeMessageIsError,
        quickRefRecords: recipeMessageQuickRefRecords,
        addMatrxId: addRecipeMessageMatrxId,
        addMatrxIds: addRecipeMessageMatrxIds,
        removeMatrxId: removeRecipeMessageMatrxId,
        removeMatrxIds: removeRecipeMessageMatrxIds,
        addPkValue: addRecipeMessagePkValue,
        addPkValues: addRecipeMessagePkValues,
        removePkValue: removeRecipeMessagePkValue,
        removePkValues: removeRecipeMessagePkValues,
        isMissingRecords: isRecipeMessageMissingRecords,
        setShouldFetch: setRecipeMessageShouldFetch,
        setFetchMode: setRecipeMessageFetchMode,
        fetchQuickRefs: fetchRecipeMessageQuickRefs,
        fetchOne: fetchRecipeMessageOne,
        fetchOneWithFkIfk: fetchRecipeMessageOneWithFkIfk,
        fetchAll: fetchRecipeMessageAll,
        fetchPaginated: fetchRecipeMessagePaginated,

    } = useEntityWithFetch("recipeMessage");

    return {
        recipeMessageSelectors,
        recipeMessageActions,
        recipeMessageRecords,
        recipeMessageUnsavedRecords,
        recipeMessageSelectedRecordIds,
        recipeMessageIsLoading,
        recipeMessageIsError,
        recipeMessageQuickRefRecords,
        addRecipeMessageMatrxId,
        addRecipeMessageMatrxIds,
        removeRecipeMessageMatrxId,
        removeRecipeMessageMatrxIds,
        addRecipeMessagePkValue,
        addRecipeMessagePkValues,
        removeRecipeMessagePkValue,
        removeRecipeMessagePkValues,
        isRecipeMessageMissingRecords,
        setRecipeMessageShouldFetch,
        setRecipeMessageFetchMode,
        fetchRecipeMessageQuickRefs,
        fetchRecipeMessageOne,
        fetchRecipeMessageOneWithFkIfk,
        fetchRecipeMessageAll,
        fetchRecipeMessagePaginated,
    };
};



type UseRecipeMessageReorderQueueWithFetchReturn = {
    recipeMessageReorderQueueSelectors: EntitySelectors<"recipeMessageReorderQueue">;
    recipeMessageReorderQueueActions: EntityActions<"recipeMessageReorderQueue">;
    recipeMessageReorderQueueRecords: Record<MatrxRecordId, RecipeMessageReorderQueueData>;
    recipeMessageReorderQueueUnsavedRecords: Record<MatrxRecordId, Partial<RecipeMessageReorderQueueData>>;
    recipeMessageReorderQueueSelectedRecordIds: MatrxRecordId[];
    recipeMessageReorderQueueIsLoading: boolean;
    recipeMessageReorderQueueIsError: boolean;
    recipeMessageReorderQueueQuickRefRecords: QuickReferenceRecord[];
    addRecipeMessageReorderQueueMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeMessageReorderQueueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeMessageReorderQueueMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeMessageReorderQueueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipeMessageReorderQueuePkValue: (pkValue: string) => void;
    addRecipeMessageReorderQueuePkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipeMessageReorderQueuePkValue: (pkValue: string) => void;
    removeRecipeMessageReorderQueuePkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeMessageReorderQueueMissingRecords: boolean;
    setRecipeMessageReorderQueueShouldFetch: (shouldFetch: boolean) => void;
    setRecipeMessageReorderQueueFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeMessageReorderQueueQuickRefs: () => void;
    fetchRecipeMessageReorderQueueOne: (recordId: MatrxRecordId) => void;
    fetchRecipeMessageReorderQueueOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeMessageReorderQueueAll: () => void;
    fetchRecipeMessageReorderQueuePaginated: (page: number, pageSize: number) => void;
};

export const useRecipeMessageReorderQueueWithFetch = (): UseRecipeMessageReorderQueueWithFetchReturn => {
    const {
        selectors: recipeMessageReorderQueueSelectors,
        actions: recipeMessageReorderQueueActions,
        allRecords: recipeMessageReorderQueueRecords,
        unsavedRecords: recipeMessageReorderQueueUnsavedRecords,
        selectedRecordIds: recipeMessageReorderQueueSelectedRecordIds,
        isLoading: recipeMessageReorderQueueIsLoading,
        isError: recipeMessageReorderQueueIsError,
        quickRefRecords: recipeMessageReorderQueueQuickRefRecords,
        addMatrxId: addRecipeMessageReorderQueueMatrxId,
        addMatrxIds: addRecipeMessageReorderQueueMatrxIds,
        removeMatrxId: removeRecipeMessageReorderQueueMatrxId,
        removeMatrxIds: removeRecipeMessageReorderQueueMatrxIds,
        addPkValue: addRecipeMessageReorderQueuePkValue,
        addPkValues: addRecipeMessageReorderQueuePkValues,
        removePkValue: removeRecipeMessageReorderQueuePkValue,
        removePkValues: removeRecipeMessageReorderQueuePkValues,
        isMissingRecords: isRecipeMessageReorderQueueMissingRecords,
        setShouldFetch: setRecipeMessageReorderQueueShouldFetch,
        setFetchMode: setRecipeMessageReorderQueueFetchMode,
        fetchQuickRefs: fetchRecipeMessageReorderQueueQuickRefs,
        fetchOne: fetchRecipeMessageReorderQueueOne,
        fetchOneWithFkIfk: fetchRecipeMessageReorderQueueOneWithFkIfk,
        fetchAll: fetchRecipeMessageReorderQueueAll,
        fetchPaginated: fetchRecipeMessageReorderQueuePaginated,

    } = useEntityWithFetch("recipeMessageReorderQueue");

    return {
        recipeMessageReorderQueueSelectors,
        recipeMessageReorderQueueActions,
        recipeMessageReorderQueueRecords,
        recipeMessageReorderQueueUnsavedRecords,
        recipeMessageReorderQueueSelectedRecordIds,
        recipeMessageReorderQueueIsLoading,
        recipeMessageReorderQueueIsError,
        recipeMessageReorderQueueQuickRefRecords,
        addRecipeMessageReorderQueueMatrxId,
        addRecipeMessageReorderQueueMatrxIds,
        removeRecipeMessageReorderQueueMatrxId,
        removeRecipeMessageReorderQueueMatrxIds,
        addRecipeMessageReorderQueuePkValue,
        addRecipeMessageReorderQueuePkValues,
        removeRecipeMessageReorderQueuePkValue,
        removeRecipeMessageReorderQueuePkValues,
        isRecipeMessageReorderQueueMissingRecords,
        setRecipeMessageReorderQueueShouldFetch,
        setRecipeMessageReorderQueueFetchMode,
        fetchRecipeMessageReorderQueueQuickRefs,
        fetchRecipeMessageReorderQueueOne,
        fetchRecipeMessageReorderQueueOneWithFkIfk,
        fetchRecipeMessageReorderQueueAll,
        fetchRecipeMessageReorderQueuePaginated,
    };
};



type UseRecipeModelWithFetchReturn = {
    recipeModelSelectors: EntitySelectors<"recipeModel">;
    recipeModelActions: EntityActions<"recipeModel">;
    recipeModelRecords: Record<MatrxRecordId, RecipeModelData>;
    recipeModelUnsavedRecords: Record<MatrxRecordId, Partial<RecipeModelData>>;
    recipeModelSelectedRecordIds: MatrxRecordId[];
    recipeModelIsLoading: boolean;
    recipeModelIsError: boolean;
    recipeModelQuickRefRecords: QuickReferenceRecord[];
    addRecipeModelMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeModelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeModelMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeModelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipeModelPkValue: (pkValue: string) => void;
    addRecipeModelPkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipeModelPkValue: (pkValue: string) => void;
    removeRecipeModelPkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeModelMissingRecords: boolean;
    setRecipeModelShouldFetch: (shouldFetch: boolean) => void;
    setRecipeModelFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeModelQuickRefs: () => void;
    fetchRecipeModelOne: (recordId: MatrxRecordId) => void;
    fetchRecipeModelOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeModelAll: () => void;
    fetchRecipeModelPaginated: (page: number, pageSize: number) => void;
};

export const useRecipeModelWithFetch = (): UseRecipeModelWithFetchReturn => {
    const {
        selectors: recipeModelSelectors,
        actions: recipeModelActions,
        allRecords: recipeModelRecords,
        unsavedRecords: recipeModelUnsavedRecords,
        selectedRecordIds: recipeModelSelectedRecordIds,
        isLoading: recipeModelIsLoading,
        isError: recipeModelIsError,
        quickRefRecords: recipeModelQuickRefRecords,
        addMatrxId: addRecipeModelMatrxId,
        addMatrxIds: addRecipeModelMatrxIds,
        removeMatrxId: removeRecipeModelMatrxId,
        removeMatrxIds: removeRecipeModelMatrxIds,
        addPkValue: addRecipeModelPkValue,
        addPkValues: addRecipeModelPkValues,
        removePkValue: removeRecipeModelPkValue,
        removePkValues: removeRecipeModelPkValues,
        isMissingRecords: isRecipeModelMissingRecords,
        setShouldFetch: setRecipeModelShouldFetch,
        setFetchMode: setRecipeModelFetchMode,
        fetchQuickRefs: fetchRecipeModelQuickRefs,
        fetchOne: fetchRecipeModelOne,
        fetchOneWithFkIfk: fetchRecipeModelOneWithFkIfk,
        fetchAll: fetchRecipeModelAll,
        fetchPaginated: fetchRecipeModelPaginated,

    } = useEntityWithFetch("recipeModel");

    return {
        recipeModelSelectors,
        recipeModelActions,
        recipeModelRecords,
        recipeModelUnsavedRecords,
        recipeModelSelectedRecordIds,
        recipeModelIsLoading,
        recipeModelIsError,
        recipeModelQuickRefRecords,
        addRecipeModelMatrxId,
        addRecipeModelMatrxIds,
        removeRecipeModelMatrxId,
        removeRecipeModelMatrxIds,
        addRecipeModelPkValue,
        addRecipeModelPkValues,
        removeRecipeModelPkValue,
        removeRecipeModelPkValues,
        isRecipeModelMissingRecords,
        setRecipeModelShouldFetch,
        setRecipeModelFetchMode,
        fetchRecipeModelQuickRefs,
        fetchRecipeModelOne,
        fetchRecipeModelOneWithFkIfk,
        fetchRecipeModelAll,
        fetchRecipeModelPaginated,
    };
};



type UseRecipeProcessorWithFetchReturn = {
    recipeProcessorSelectors: EntitySelectors<"recipeProcessor">;
    recipeProcessorActions: EntityActions<"recipeProcessor">;
    recipeProcessorRecords: Record<MatrxRecordId, RecipeProcessorData>;
    recipeProcessorUnsavedRecords: Record<MatrxRecordId, Partial<RecipeProcessorData>>;
    recipeProcessorSelectedRecordIds: MatrxRecordId[];
    recipeProcessorIsLoading: boolean;
    recipeProcessorIsError: boolean;
    recipeProcessorQuickRefRecords: QuickReferenceRecord[];
    addRecipeProcessorMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeProcessorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeProcessorMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeProcessorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipeProcessorPkValue: (pkValue: string) => void;
    addRecipeProcessorPkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipeProcessorPkValue: (pkValue: string) => void;
    removeRecipeProcessorPkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeProcessorMissingRecords: boolean;
    setRecipeProcessorShouldFetch: (shouldFetch: boolean) => void;
    setRecipeProcessorFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeProcessorQuickRefs: () => void;
    fetchRecipeProcessorOne: (recordId: MatrxRecordId) => void;
    fetchRecipeProcessorOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeProcessorAll: () => void;
    fetchRecipeProcessorPaginated: (page: number, pageSize: number) => void;
};

export const useRecipeProcessorWithFetch = (): UseRecipeProcessorWithFetchReturn => {
    const {
        selectors: recipeProcessorSelectors,
        actions: recipeProcessorActions,
        allRecords: recipeProcessorRecords,
        unsavedRecords: recipeProcessorUnsavedRecords,
        selectedRecordIds: recipeProcessorSelectedRecordIds,
        isLoading: recipeProcessorIsLoading,
        isError: recipeProcessorIsError,
        quickRefRecords: recipeProcessorQuickRefRecords,
        addMatrxId: addRecipeProcessorMatrxId,
        addMatrxIds: addRecipeProcessorMatrxIds,
        removeMatrxId: removeRecipeProcessorMatrxId,
        removeMatrxIds: removeRecipeProcessorMatrxIds,
        addPkValue: addRecipeProcessorPkValue,
        addPkValues: addRecipeProcessorPkValues,
        removePkValue: removeRecipeProcessorPkValue,
        removePkValues: removeRecipeProcessorPkValues,
        isMissingRecords: isRecipeProcessorMissingRecords,
        setShouldFetch: setRecipeProcessorShouldFetch,
        setFetchMode: setRecipeProcessorFetchMode,
        fetchQuickRefs: fetchRecipeProcessorQuickRefs,
        fetchOne: fetchRecipeProcessorOne,
        fetchOneWithFkIfk: fetchRecipeProcessorOneWithFkIfk,
        fetchAll: fetchRecipeProcessorAll,
        fetchPaginated: fetchRecipeProcessorPaginated,

    } = useEntityWithFetch("recipeProcessor");

    return {
        recipeProcessorSelectors,
        recipeProcessorActions,
        recipeProcessorRecords,
        recipeProcessorUnsavedRecords,
        recipeProcessorSelectedRecordIds,
        recipeProcessorIsLoading,
        recipeProcessorIsError,
        recipeProcessorQuickRefRecords,
        addRecipeProcessorMatrxId,
        addRecipeProcessorMatrxIds,
        removeRecipeProcessorMatrxId,
        removeRecipeProcessorMatrxIds,
        addRecipeProcessorPkValue,
        addRecipeProcessorPkValues,
        removeRecipeProcessorPkValue,
        removeRecipeProcessorPkValues,
        isRecipeProcessorMissingRecords,
        setRecipeProcessorShouldFetch,
        setRecipeProcessorFetchMode,
        fetchRecipeProcessorQuickRefs,
        fetchRecipeProcessorOne,
        fetchRecipeProcessorOneWithFkIfk,
        fetchRecipeProcessorAll,
        fetchRecipeProcessorPaginated,
    };
};



type UseRecipeToolWithFetchReturn = {
    recipeToolSelectors: EntitySelectors<"recipeTool">;
    recipeToolActions: EntityActions<"recipeTool">;
    recipeToolRecords: Record<MatrxRecordId, RecipeToolData>;
    recipeToolUnsavedRecords: Record<MatrxRecordId, Partial<RecipeToolData>>;
    recipeToolSelectedRecordIds: MatrxRecordId[];
    recipeToolIsLoading: boolean;
    recipeToolIsError: boolean;
    recipeToolQuickRefRecords: QuickReferenceRecord[];
    addRecipeToolMatrxId: (recordId: MatrxRecordId) => void;
    addRecipeToolMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRecipeToolMatrxId: (recordId: MatrxRecordId) => void;
    removeRecipeToolMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRecipeToolPkValue: (pkValue: string) => void;
    addRecipeToolPkValues: (pkValues: Record<string, unknown>) => void;
    removeRecipeToolPkValue: (pkValue: string) => void;
    removeRecipeToolPkValues: (pkValues: Record<string, unknown>) => void;
    isRecipeToolMissingRecords: boolean;
    setRecipeToolShouldFetch: (shouldFetch: boolean) => void;
    setRecipeToolFetchMode: (fetchMode: FetchMode) => void;
    fetchRecipeToolQuickRefs: () => void;
    fetchRecipeToolOne: (recordId: MatrxRecordId) => void;
    fetchRecipeToolOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRecipeToolAll: () => void;
    fetchRecipeToolPaginated: (page: number, pageSize: number) => void;
};

export const useRecipeToolWithFetch = (): UseRecipeToolWithFetchReturn => {
    const {
        selectors: recipeToolSelectors,
        actions: recipeToolActions,
        allRecords: recipeToolRecords,
        unsavedRecords: recipeToolUnsavedRecords,
        selectedRecordIds: recipeToolSelectedRecordIds,
        isLoading: recipeToolIsLoading,
        isError: recipeToolIsError,
        quickRefRecords: recipeToolQuickRefRecords,
        addMatrxId: addRecipeToolMatrxId,
        addMatrxIds: addRecipeToolMatrxIds,
        removeMatrxId: removeRecipeToolMatrxId,
        removeMatrxIds: removeRecipeToolMatrxIds,
        addPkValue: addRecipeToolPkValue,
        addPkValues: addRecipeToolPkValues,
        removePkValue: removeRecipeToolPkValue,
        removePkValues: removeRecipeToolPkValues,
        isMissingRecords: isRecipeToolMissingRecords,
        setShouldFetch: setRecipeToolShouldFetch,
        setFetchMode: setRecipeToolFetchMode,
        fetchQuickRefs: fetchRecipeToolQuickRefs,
        fetchOne: fetchRecipeToolOne,
        fetchOneWithFkIfk: fetchRecipeToolOneWithFkIfk,
        fetchAll: fetchRecipeToolAll,
        fetchPaginated: fetchRecipeToolPaginated,

    } = useEntityWithFetch("recipeTool");

    return {
        recipeToolSelectors,
        recipeToolActions,
        recipeToolRecords,
        recipeToolUnsavedRecords,
        recipeToolSelectedRecordIds,
        recipeToolIsLoading,
        recipeToolIsError,
        recipeToolQuickRefRecords,
        addRecipeToolMatrxId,
        addRecipeToolMatrxIds,
        removeRecipeToolMatrxId,
        removeRecipeToolMatrxIds,
        addRecipeToolPkValue,
        addRecipeToolPkValues,
        removeRecipeToolPkValue,
        removeRecipeToolPkValues,
        isRecipeToolMissingRecords,
        setRecipeToolShouldFetch,
        setRecipeToolFetchMode,
        fetchRecipeToolQuickRefs,
        fetchRecipeToolOne,
        fetchRecipeToolOneWithFkIfk,
        fetchRecipeToolAll,
        fetchRecipeToolPaginated,
    };
};



type UseRegisteredFunctionWithFetchReturn = {
    registeredFunctionSelectors: EntitySelectors<"registeredFunction">;
    registeredFunctionActions: EntityActions<"registeredFunction">;
    registeredFunctionRecords: Record<MatrxRecordId, RegisteredFunctionData>;
    registeredFunctionUnsavedRecords: Record<MatrxRecordId, Partial<RegisteredFunctionData>>;
    registeredFunctionSelectedRecordIds: MatrxRecordId[];
    registeredFunctionIsLoading: boolean;
    registeredFunctionIsError: boolean;
    registeredFunctionQuickRefRecords: QuickReferenceRecord[];
    addRegisteredFunctionMatrxId: (recordId: MatrxRecordId) => void;
    addRegisteredFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeRegisteredFunctionMatrxId: (recordId: MatrxRecordId) => void;
    removeRegisteredFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addRegisteredFunctionPkValue: (pkValue: string) => void;
    addRegisteredFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    removeRegisteredFunctionPkValue: (pkValue: string) => void;
    removeRegisteredFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    isRegisteredFunctionMissingRecords: boolean;
    setRegisteredFunctionShouldFetch: (shouldFetch: boolean) => void;
    setRegisteredFunctionFetchMode: (fetchMode: FetchMode) => void;
    fetchRegisteredFunctionQuickRefs: () => void;
    fetchRegisteredFunctionOne: (recordId: MatrxRecordId) => void;
    fetchRegisteredFunctionOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchRegisteredFunctionAll: () => void;
    fetchRegisteredFunctionPaginated: (page: number, pageSize: number) => void;
};

export const useRegisteredFunctionWithFetch = (): UseRegisteredFunctionWithFetchReturn => {
    const {
        selectors: registeredFunctionSelectors,
        actions: registeredFunctionActions,
        allRecords: registeredFunctionRecords,
        unsavedRecords: registeredFunctionUnsavedRecords,
        selectedRecordIds: registeredFunctionSelectedRecordIds,
        isLoading: registeredFunctionIsLoading,
        isError: registeredFunctionIsError,
        quickRefRecords: registeredFunctionQuickRefRecords,
        addMatrxId: addRegisteredFunctionMatrxId,
        addMatrxIds: addRegisteredFunctionMatrxIds,
        removeMatrxId: removeRegisteredFunctionMatrxId,
        removeMatrxIds: removeRegisteredFunctionMatrxIds,
        addPkValue: addRegisteredFunctionPkValue,
        addPkValues: addRegisteredFunctionPkValues,
        removePkValue: removeRegisteredFunctionPkValue,
        removePkValues: removeRegisteredFunctionPkValues,
        isMissingRecords: isRegisteredFunctionMissingRecords,
        setShouldFetch: setRegisteredFunctionShouldFetch,
        setFetchMode: setRegisteredFunctionFetchMode,
        fetchQuickRefs: fetchRegisteredFunctionQuickRefs,
        fetchOne: fetchRegisteredFunctionOne,
        fetchOneWithFkIfk: fetchRegisteredFunctionOneWithFkIfk,
        fetchAll: fetchRegisteredFunctionAll,
        fetchPaginated: fetchRegisteredFunctionPaginated,

    } = useEntityWithFetch("registeredFunction");

    return {
        registeredFunctionSelectors,
        registeredFunctionActions,
        registeredFunctionRecords,
        registeredFunctionUnsavedRecords,
        registeredFunctionSelectedRecordIds,
        registeredFunctionIsLoading,
        registeredFunctionIsError,
        registeredFunctionQuickRefRecords,
        addRegisteredFunctionMatrxId,
        addRegisteredFunctionMatrxIds,
        removeRegisteredFunctionMatrxId,
        removeRegisteredFunctionMatrxIds,
        addRegisteredFunctionPkValue,
        addRegisteredFunctionPkValues,
        removeRegisteredFunctionPkValue,
        removeRegisteredFunctionPkValues,
        isRegisteredFunctionMissingRecords,
        setRegisteredFunctionShouldFetch,
        setRegisteredFunctionFetchMode,
        fetchRegisteredFunctionQuickRefs,
        fetchRegisteredFunctionOne,
        fetchRegisteredFunctionOneWithFkIfk,
        fetchRegisteredFunctionAll,
        fetchRegisteredFunctionPaginated,
    };
};



type UseSchemaTemplatesWithFetchReturn = {
    schemaTemplatesSelectors: EntitySelectors<"schemaTemplates">;
    schemaTemplatesActions: EntityActions<"schemaTemplates">;
    schemaTemplatesRecords: Record<MatrxRecordId, SchemaTemplatesData>;
    schemaTemplatesUnsavedRecords: Record<MatrxRecordId, Partial<SchemaTemplatesData>>;
    schemaTemplatesSelectedRecordIds: MatrxRecordId[];
    schemaTemplatesIsLoading: boolean;
    schemaTemplatesIsError: boolean;
    schemaTemplatesQuickRefRecords: QuickReferenceRecord[];
    addSchemaTemplatesMatrxId: (recordId: MatrxRecordId) => void;
    addSchemaTemplatesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeSchemaTemplatesMatrxId: (recordId: MatrxRecordId) => void;
    removeSchemaTemplatesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addSchemaTemplatesPkValue: (pkValue: string) => void;
    addSchemaTemplatesPkValues: (pkValues: Record<string, unknown>) => void;
    removeSchemaTemplatesPkValue: (pkValue: string) => void;
    removeSchemaTemplatesPkValues: (pkValues: Record<string, unknown>) => void;
    isSchemaTemplatesMissingRecords: boolean;
    setSchemaTemplatesShouldFetch: (shouldFetch: boolean) => void;
    setSchemaTemplatesFetchMode: (fetchMode: FetchMode) => void;
    fetchSchemaTemplatesQuickRefs: () => void;
    fetchSchemaTemplatesOne: (recordId: MatrxRecordId) => void;
    fetchSchemaTemplatesOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchSchemaTemplatesAll: () => void;
    fetchSchemaTemplatesPaginated: (page: number, pageSize: number) => void;
};

export const useSchemaTemplatesWithFetch = (): UseSchemaTemplatesWithFetchReturn => {
    const {
        selectors: schemaTemplatesSelectors,
        actions: schemaTemplatesActions,
        allRecords: schemaTemplatesRecords,
        unsavedRecords: schemaTemplatesUnsavedRecords,
        selectedRecordIds: schemaTemplatesSelectedRecordIds,
        isLoading: schemaTemplatesIsLoading,
        isError: schemaTemplatesIsError,
        quickRefRecords: schemaTemplatesQuickRefRecords,
        addMatrxId: addSchemaTemplatesMatrxId,
        addMatrxIds: addSchemaTemplatesMatrxIds,
        removeMatrxId: removeSchemaTemplatesMatrxId,
        removeMatrxIds: removeSchemaTemplatesMatrxIds,
        addPkValue: addSchemaTemplatesPkValue,
        addPkValues: addSchemaTemplatesPkValues,
        removePkValue: removeSchemaTemplatesPkValue,
        removePkValues: removeSchemaTemplatesPkValues,
        isMissingRecords: isSchemaTemplatesMissingRecords,
        setShouldFetch: setSchemaTemplatesShouldFetch,
        setFetchMode: setSchemaTemplatesFetchMode,
        fetchQuickRefs: fetchSchemaTemplatesQuickRefs,
        fetchOne: fetchSchemaTemplatesOne,
        fetchOneWithFkIfk: fetchSchemaTemplatesOneWithFkIfk,
        fetchAll: fetchSchemaTemplatesAll,
        fetchPaginated: fetchSchemaTemplatesPaginated,

    } = useEntityWithFetch("schemaTemplates");

    return {
        schemaTemplatesSelectors,
        schemaTemplatesActions,
        schemaTemplatesRecords,
        schemaTemplatesUnsavedRecords,
        schemaTemplatesSelectedRecordIds,
        schemaTemplatesIsLoading,
        schemaTemplatesIsError,
        schemaTemplatesQuickRefRecords,
        addSchemaTemplatesMatrxId,
        addSchemaTemplatesMatrxIds,
        removeSchemaTemplatesMatrxId,
        removeSchemaTemplatesMatrxIds,
        addSchemaTemplatesPkValue,
        addSchemaTemplatesPkValues,
        removeSchemaTemplatesPkValue,
        removeSchemaTemplatesPkValues,
        isSchemaTemplatesMissingRecords,
        setSchemaTemplatesShouldFetch,
        setSchemaTemplatesFetchMode,
        fetchSchemaTemplatesQuickRefs,
        fetchSchemaTemplatesOne,
        fetchSchemaTemplatesOneWithFkIfk,
        fetchSchemaTemplatesAll,
        fetchSchemaTemplatesPaginated,
    };
};



type UseScrapeBaseConfigWithFetchReturn = {
    scrapeBaseConfigSelectors: EntitySelectors<"scrapeBaseConfig">;
    scrapeBaseConfigActions: EntityActions<"scrapeBaseConfig">;
    scrapeBaseConfigRecords: Record<MatrxRecordId, ScrapeBaseConfigData>;
    scrapeBaseConfigUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeBaseConfigData>>;
    scrapeBaseConfigSelectedRecordIds: MatrxRecordId[];
    scrapeBaseConfigIsLoading: boolean;
    scrapeBaseConfigIsError: boolean;
    scrapeBaseConfigQuickRefRecords: QuickReferenceRecord[];
    addScrapeBaseConfigMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeBaseConfigMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeBaseConfigMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeBaseConfigMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeBaseConfigPkValue: (pkValue: string) => void;
    addScrapeBaseConfigPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeBaseConfigPkValue: (pkValue: string) => void;
    removeScrapeBaseConfigPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeBaseConfigMissingRecords: boolean;
    setScrapeBaseConfigShouldFetch: (shouldFetch: boolean) => void;
    setScrapeBaseConfigFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeBaseConfigQuickRefs: () => void;
    fetchScrapeBaseConfigOne: (recordId: MatrxRecordId) => void;
    fetchScrapeBaseConfigOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeBaseConfigAll: () => void;
    fetchScrapeBaseConfigPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeBaseConfigWithFetch = (): UseScrapeBaseConfigWithFetchReturn => {
    const {
        selectors: scrapeBaseConfigSelectors,
        actions: scrapeBaseConfigActions,
        allRecords: scrapeBaseConfigRecords,
        unsavedRecords: scrapeBaseConfigUnsavedRecords,
        selectedRecordIds: scrapeBaseConfigSelectedRecordIds,
        isLoading: scrapeBaseConfigIsLoading,
        isError: scrapeBaseConfigIsError,
        quickRefRecords: scrapeBaseConfigQuickRefRecords,
        addMatrxId: addScrapeBaseConfigMatrxId,
        addMatrxIds: addScrapeBaseConfigMatrxIds,
        removeMatrxId: removeScrapeBaseConfigMatrxId,
        removeMatrxIds: removeScrapeBaseConfigMatrxIds,
        addPkValue: addScrapeBaseConfigPkValue,
        addPkValues: addScrapeBaseConfigPkValues,
        removePkValue: removeScrapeBaseConfigPkValue,
        removePkValues: removeScrapeBaseConfigPkValues,
        isMissingRecords: isScrapeBaseConfigMissingRecords,
        setShouldFetch: setScrapeBaseConfigShouldFetch,
        setFetchMode: setScrapeBaseConfigFetchMode,
        fetchQuickRefs: fetchScrapeBaseConfigQuickRefs,
        fetchOne: fetchScrapeBaseConfigOne,
        fetchOneWithFkIfk: fetchScrapeBaseConfigOneWithFkIfk,
        fetchAll: fetchScrapeBaseConfigAll,
        fetchPaginated: fetchScrapeBaseConfigPaginated,

    } = useEntityWithFetch("scrapeBaseConfig");

    return {
        scrapeBaseConfigSelectors,
        scrapeBaseConfigActions,
        scrapeBaseConfigRecords,
        scrapeBaseConfigUnsavedRecords,
        scrapeBaseConfigSelectedRecordIds,
        scrapeBaseConfigIsLoading,
        scrapeBaseConfigIsError,
        scrapeBaseConfigQuickRefRecords,
        addScrapeBaseConfigMatrxId,
        addScrapeBaseConfigMatrxIds,
        removeScrapeBaseConfigMatrxId,
        removeScrapeBaseConfigMatrxIds,
        addScrapeBaseConfigPkValue,
        addScrapeBaseConfigPkValues,
        removeScrapeBaseConfigPkValue,
        removeScrapeBaseConfigPkValues,
        isScrapeBaseConfigMissingRecords,
        setScrapeBaseConfigShouldFetch,
        setScrapeBaseConfigFetchMode,
        fetchScrapeBaseConfigQuickRefs,
        fetchScrapeBaseConfigOne,
        fetchScrapeBaseConfigOneWithFkIfk,
        fetchScrapeBaseConfigAll,
        fetchScrapeBaseConfigPaginated,
    };
};



type UseScrapeCachePolicyWithFetchReturn = {
    scrapeCachePolicySelectors: EntitySelectors<"scrapeCachePolicy">;
    scrapeCachePolicyActions: EntityActions<"scrapeCachePolicy">;
    scrapeCachePolicyRecords: Record<MatrxRecordId, ScrapeCachePolicyData>;
    scrapeCachePolicyUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeCachePolicyData>>;
    scrapeCachePolicySelectedRecordIds: MatrxRecordId[];
    scrapeCachePolicyIsLoading: boolean;
    scrapeCachePolicyIsError: boolean;
    scrapeCachePolicyQuickRefRecords: QuickReferenceRecord[];
    addScrapeCachePolicyMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeCachePolicyMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeCachePolicyMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeCachePolicyMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeCachePolicyPkValue: (pkValue: string) => void;
    addScrapeCachePolicyPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeCachePolicyPkValue: (pkValue: string) => void;
    removeScrapeCachePolicyPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeCachePolicyMissingRecords: boolean;
    setScrapeCachePolicyShouldFetch: (shouldFetch: boolean) => void;
    setScrapeCachePolicyFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeCachePolicyQuickRefs: () => void;
    fetchScrapeCachePolicyOne: (recordId: MatrxRecordId) => void;
    fetchScrapeCachePolicyOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeCachePolicyAll: () => void;
    fetchScrapeCachePolicyPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeCachePolicyWithFetch = (): UseScrapeCachePolicyWithFetchReturn => {
    const {
        selectors: scrapeCachePolicySelectors,
        actions: scrapeCachePolicyActions,
        allRecords: scrapeCachePolicyRecords,
        unsavedRecords: scrapeCachePolicyUnsavedRecords,
        selectedRecordIds: scrapeCachePolicySelectedRecordIds,
        isLoading: scrapeCachePolicyIsLoading,
        isError: scrapeCachePolicyIsError,
        quickRefRecords: scrapeCachePolicyQuickRefRecords,
        addMatrxId: addScrapeCachePolicyMatrxId,
        addMatrxIds: addScrapeCachePolicyMatrxIds,
        removeMatrxId: removeScrapeCachePolicyMatrxId,
        removeMatrxIds: removeScrapeCachePolicyMatrxIds,
        addPkValue: addScrapeCachePolicyPkValue,
        addPkValues: addScrapeCachePolicyPkValues,
        removePkValue: removeScrapeCachePolicyPkValue,
        removePkValues: removeScrapeCachePolicyPkValues,
        isMissingRecords: isScrapeCachePolicyMissingRecords,
        setShouldFetch: setScrapeCachePolicyShouldFetch,
        setFetchMode: setScrapeCachePolicyFetchMode,
        fetchQuickRefs: fetchScrapeCachePolicyQuickRefs,
        fetchOne: fetchScrapeCachePolicyOne,
        fetchOneWithFkIfk: fetchScrapeCachePolicyOneWithFkIfk,
        fetchAll: fetchScrapeCachePolicyAll,
        fetchPaginated: fetchScrapeCachePolicyPaginated,

    } = useEntityWithFetch("scrapeCachePolicy");

    return {
        scrapeCachePolicySelectors,
        scrapeCachePolicyActions,
        scrapeCachePolicyRecords,
        scrapeCachePolicyUnsavedRecords,
        scrapeCachePolicySelectedRecordIds,
        scrapeCachePolicyIsLoading,
        scrapeCachePolicyIsError,
        scrapeCachePolicyQuickRefRecords,
        addScrapeCachePolicyMatrxId,
        addScrapeCachePolicyMatrxIds,
        removeScrapeCachePolicyMatrxId,
        removeScrapeCachePolicyMatrxIds,
        addScrapeCachePolicyPkValue,
        addScrapeCachePolicyPkValues,
        removeScrapeCachePolicyPkValue,
        removeScrapeCachePolicyPkValues,
        isScrapeCachePolicyMissingRecords,
        setScrapeCachePolicyShouldFetch,
        setScrapeCachePolicyFetchMode,
        fetchScrapeCachePolicyQuickRefs,
        fetchScrapeCachePolicyOne,
        fetchScrapeCachePolicyOneWithFkIfk,
        fetchScrapeCachePolicyAll,
        fetchScrapeCachePolicyPaginated,
    };
};



type UseScrapeConfigurationWithFetchReturn = {
    scrapeConfigurationSelectors: EntitySelectors<"scrapeConfiguration">;
    scrapeConfigurationActions: EntityActions<"scrapeConfiguration">;
    scrapeConfigurationRecords: Record<MatrxRecordId, ScrapeConfigurationData>;
    scrapeConfigurationUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeConfigurationData>>;
    scrapeConfigurationSelectedRecordIds: MatrxRecordId[];
    scrapeConfigurationIsLoading: boolean;
    scrapeConfigurationIsError: boolean;
    scrapeConfigurationQuickRefRecords: QuickReferenceRecord[];
    addScrapeConfigurationMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeConfigurationMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeConfigurationMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeConfigurationMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeConfigurationPkValue: (pkValue: string) => void;
    addScrapeConfigurationPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeConfigurationPkValue: (pkValue: string) => void;
    removeScrapeConfigurationPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeConfigurationMissingRecords: boolean;
    setScrapeConfigurationShouldFetch: (shouldFetch: boolean) => void;
    setScrapeConfigurationFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeConfigurationQuickRefs: () => void;
    fetchScrapeConfigurationOne: (recordId: MatrxRecordId) => void;
    fetchScrapeConfigurationOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeConfigurationAll: () => void;
    fetchScrapeConfigurationPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeConfigurationWithFetch = (): UseScrapeConfigurationWithFetchReturn => {
    const {
        selectors: scrapeConfigurationSelectors,
        actions: scrapeConfigurationActions,
        allRecords: scrapeConfigurationRecords,
        unsavedRecords: scrapeConfigurationUnsavedRecords,
        selectedRecordIds: scrapeConfigurationSelectedRecordIds,
        isLoading: scrapeConfigurationIsLoading,
        isError: scrapeConfigurationIsError,
        quickRefRecords: scrapeConfigurationQuickRefRecords,
        addMatrxId: addScrapeConfigurationMatrxId,
        addMatrxIds: addScrapeConfigurationMatrxIds,
        removeMatrxId: removeScrapeConfigurationMatrxId,
        removeMatrxIds: removeScrapeConfigurationMatrxIds,
        addPkValue: addScrapeConfigurationPkValue,
        addPkValues: addScrapeConfigurationPkValues,
        removePkValue: removeScrapeConfigurationPkValue,
        removePkValues: removeScrapeConfigurationPkValues,
        isMissingRecords: isScrapeConfigurationMissingRecords,
        setShouldFetch: setScrapeConfigurationShouldFetch,
        setFetchMode: setScrapeConfigurationFetchMode,
        fetchQuickRefs: fetchScrapeConfigurationQuickRefs,
        fetchOne: fetchScrapeConfigurationOne,
        fetchOneWithFkIfk: fetchScrapeConfigurationOneWithFkIfk,
        fetchAll: fetchScrapeConfigurationAll,
        fetchPaginated: fetchScrapeConfigurationPaginated,

    } = useEntityWithFetch("scrapeConfiguration");

    return {
        scrapeConfigurationSelectors,
        scrapeConfigurationActions,
        scrapeConfigurationRecords,
        scrapeConfigurationUnsavedRecords,
        scrapeConfigurationSelectedRecordIds,
        scrapeConfigurationIsLoading,
        scrapeConfigurationIsError,
        scrapeConfigurationQuickRefRecords,
        addScrapeConfigurationMatrxId,
        addScrapeConfigurationMatrxIds,
        removeScrapeConfigurationMatrxId,
        removeScrapeConfigurationMatrxIds,
        addScrapeConfigurationPkValue,
        addScrapeConfigurationPkValues,
        removeScrapeConfigurationPkValue,
        removeScrapeConfigurationPkValues,
        isScrapeConfigurationMissingRecords,
        setScrapeConfigurationShouldFetch,
        setScrapeConfigurationFetchMode,
        fetchScrapeConfigurationQuickRefs,
        fetchScrapeConfigurationOne,
        fetchScrapeConfigurationOneWithFkIfk,
        fetchScrapeConfigurationAll,
        fetchScrapeConfigurationPaginated,
    };
};



type UseScrapeCycleRunWithFetchReturn = {
    scrapeCycleRunSelectors: EntitySelectors<"scrapeCycleRun">;
    scrapeCycleRunActions: EntityActions<"scrapeCycleRun">;
    scrapeCycleRunRecords: Record<MatrxRecordId, ScrapeCycleRunData>;
    scrapeCycleRunUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeCycleRunData>>;
    scrapeCycleRunSelectedRecordIds: MatrxRecordId[];
    scrapeCycleRunIsLoading: boolean;
    scrapeCycleRunIsError: boolean;
    scrapeCycleRunQuickRefRecords: QuickReferenceRecord[];
    addScrapeCycleRunMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeCycleRunMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeCycleRunMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeCycleRunMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeCycleRunPkValue: (pkValue: string) => void;
    addScrapeCycleRunPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeCycleRunPkValue: (pkValue: string) => void;
    removeScrapeCycleRunPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeCycleRunMissingRecords: boolean;
    setScrapeCycleRunShouldFetch: (shouldFetch: boolean) => void;
    setScrapeCycleRunFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeCycleRunQuickRefs: () => void;
    fetchScrapeCycleRunOne: (recordId: MatrxRecordId) => void;
    fetchScrapeCycleRunOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeCycleRunAll: () => void;
    fetchScrapeCycleRunPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeCycleRunWithFetch = (): UseScrapeCycleRunWithFetchReturn => {
    const {
        selectors: scrapeCycleRunSelectors,
        actions: scrapeCycleRunActions,
        allRecords: scrapeCycleRunRecords,
        unsavedRecords: scrapeCycleRunUnsavedRecords,
        selectedRecordIds: scrapeCycleRunSelectedRecordIds,
        isLoading: scrapeCycleRunIsLoading,
        isError: scrapeCycleRunIsError,
        quickRefRecords: scrapeCycleRunQuickRefRecords,
        addMatrxId: addScrapeCycleRunMatrxId,
        addMatrxIds: addScrapeCycleRunMatrxIds,
        removeMatrxId: removeScrapeCycleRunMatrxId,
        removeMatrxIds: removeScrapeCycleRunMatrxIds,
        addPkValue: addScrapeCycleRunPkValue,
        addPkValues: addScrapeCycleRunPkValues,
        removePkValue: removeScrapeCycleRunPkValue,
        removePkValues: removeScrapeCycleRunPkValues,
        isMissingRecords: isScrapeCycleRunMissingRecords,
        setShouldFetch: setScrapeCycleRunShouldFetch,
        setFetchMode: setScrapeCycleRunFetchMode,
        fetchQuickRefs: fetchScrapeCycleRunQuickRefs,
        fetchOne: fetchScrapeCycleRunOne,
        fetchOneWithFkIfk: fetchScrapeCycleRunOneWithFkIfk,
        fetchAll: fetchScrapeCycleRunAll,
        fetchPaginated: fetchScrapeCycleRunPaginated,

    } = useEntityWithFetch("scrapeCycleRun");

    return {
        scrapeCycleRunSelectors,
        scrapeCycleRunActions,
        scrapeCycleRunRecords,
        scrapeCycleRunUnsavedRecords,
        scrapeCycleRunSelectedRecordIds,
        scrapeCycleRunIsLoading,
        scrapeCycleRunIsError,
        scrapeCycleRunQuickRefRecords,
        addScrapeCycleRunMatrxId,
        addScrapeCycleRunMatrxIds,
        removeScrapeCycleRunMatrxId,
        removeScrapeCycleRunMatrxIds,
        addScrapeCycleRunPkValue,
        addScrapeCycleRunPkValues,
        removeScrapeCycleRunPkValue,
        removeScrapeCycleRunPkValues,
        isScrapeCycleRunMissingRecords,
        setScrapeCycleRunShouldFetch,
        setScrapeCycleRunFetchMode,
        fetchScrapeCycleRunQuickRefs,
        fetchScrapeCycleRunOne,
        fetchScrapeCycleRunOneWithFkIfk,
        fetchScrapeCycleRunAll,
        fetchScrapeCycleRunPaginated,
    };
};



type UseScrapeCycleTrackerWithFetchReturn = {
    scrapeCycleTrackerSelectors: EntitySelectors<"scrapeCycleTracker">;
    scrapeCycleTrackerActions: EntityActions<"scrapeCycleTracker">;
    scrapeCycleTrackerRecords: Record<MatrxRecordId, ScrapeCycleTrackerData>;
    scrapeCycleTrackerUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeCycleTrackerData>>;
    scrapeCycleTrackerSelectedRecordIds: MatrxRecordId[];
    scrapeCycleTrackerIsLoading: boolean;
    scrapeCycleTrackerIsError: boolean;
    scrapeCycleTrackerQuickRefRecords: QuickReferenceRecord[];
    addScrapeCycleTrackerMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeCycleTrackerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeCycleTrackerMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeCycleTrackerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeCycleTrackerPkValue: (pkValue: string) => void;
    addScrapeCycleTrackerPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeCycleTrackerPkValue: (pkValue: string) => void;
    removeScrapeCycleTrackerPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeCycleTrackerMissingRecords: boolean;
    setScrapeCycleTrackerShouldFetch: (shouldFetch: boolean) => void;
    setScrapeCycleTrackerFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeCycleTrackerQuickRefs: () => void;
    fetchScrapeCycleTrackerOne: (recordId: MatrxRecordId) => void;
    fetchScrapeCycleTrackerOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeCycleTrackerAll: () => void;
    fetchScrapeCycleTrackerPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeCycleTrackerWithFetch = (): UseScrapeCycleTrackerWithFetchReturn => {
    const {
        selectors: scrapeCycleTrackerSelectors,
        actions: scrapeCycleTrackerActions,
        allRecords: scrapeCycleTrackerRecords,
        unsavedRecords: scrapeCycleTrackerUnsavedRecords,
        selectedRecordIds: scrapeCycleTrackerSelectedRecordIds,
        isLoading: scrapeCycleTrackerIsLoading,
        isError: scrapeCycleTrackerIsError,
        quickRefRecords: scrapeCycleTrackerQuickRefRecords,
        addMatrxId: addScrapeCycleTrackerMatrxId,
        addMatrxIds: addScrapeCycleTrackerMatrxIds,
        removeMatrxId: removeScrapeCycleTrackerMatrxId,
        removeMatrxIds: removeScrapeCycleTrackerMatrxIds,
        addPkValue: addScrapeCycleTrackerPkValue,
        addPkValues: addScrapeCycleTrackerPkValues,
        removePkValue: removeScrapeCycleTrackerPkValue,
        removePkValues: removeScrapeCycleTrackerPkValues,
        isMissingRecords: isScrapeCycleTrackerMissingRecords,
        setShouldFetch: setScrapeCycleTrackerShouldFetch,
        setFetchMode: setScrapeCycleTrackerFetchMode,
        fetchQuickRefs: fetchScrapeCycleTrackerQuickRefs,
        fetchOne: fetchScrapeCycleTrackerOne,
        fetchOneWithFkIfk: fetchScrapeCycleTrackerOneWithFkIfk,
        fetchAll: fetchScrapeCycleTrackerAll,
        fetchPaginated: fetchScrapeCycleTrackerPaginated,

    } = useEntityWithFetch("scrapeCycleTracker");

    return {
        scrapeCycleTrackerSelectors,
        scrapeCycleTrackerActions,
        scrapeCycleTrackerRecords,
        scrapeCycleTrackerUnsavedRecords,
        scrapeCycleTrackerSelectedRecordIds,
        scrapeCycleTrackerIsLoading,
        scrapeCycleTrackerIsError,
        scrapeCycleTrackerQuickRefRecords,
        addScrapeCycleTrackerMatrxId,
        addScrapeCycleTrackerMatrxIds,
        removeScrapeCycleTrackerMatrxId,
        removeScrapeCycleTrackerMatrxIds,
        addScrapeCycleTrackerPkValue,
        addScrapeCycleTrackerPkValues,
        removeScrapeCycleTrackerPkValue,
        removeScrapeCycleTrackerPkValues,
        isScrapeCycleTrackerMissingRecords,
        setScrapeCycleTrackerShouldFetch,
        setScrapeCycleTrackerFetchMode,
        fetchScrapeCycleTrackerQuickRefs,
        fetchScrapeCycleTrackerOne,
        fetchScrapeCycleTrackerOneWithFkIfk,
        fetchScrapeCycleTrackerAll,
        fetchScrapeCycleTrackerPaginated,
    };
};



type UseScrapeDomainWithFetchReturn = {
    scrapeDomainSelectors: EntitySelectors<"scrapeDomain">;
    scrapeDomainActions: EntityActions<"scrapeDomain">;
    scrapeDomainRecords: Record<MatrxRecordId, ScrapeDomainData>;
    scrapeDomainUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeDomainData>>;
    scrapeDomainSelectedRecordIds: MatrxRecordId[];
    scrapeDomainIsLoading: boolean;
    scrapeDomainIsError: boolean;
    scrapeDomainQuickRefRecords: QuickReferenceRecord[];
    addScrapeDomainMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeDomainMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeDomainMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeDomainMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeDomainPkValue: (pkValue: string) => void;
    addScrapeDomainPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeDomainPkValue: (pkValue: string) => void;
    removeScrapeDomainPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeDomainMissingRecords: boolean;
    setScrapeDomainShouldFetch: (shouldFetch: boolean) => void;
    setScrapeDomainFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeDomainQuickRefs: () => void;
    fetchScrapeDomainOne: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainAll: () => void;
    fetchScrapeDomainPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeDomainWithFetch = (): UseScrapeDomainWithFetchReturn => {
    const {
        selectors: scrapeDomainSelectors,
        actions: scrapeDomainActions,
        allRecords: scrapeDomainRecords,
        unsavedRecords: scrapeDomainUnsavedRecords,
        selectedRecordIds: scrapeDomainSelectedRecordIds,
        isLoading: scrapeDomainIsLoading,
        isError: scrapeDomainIsError,
        quickRefRecords: scrapeDomainQuickRefRecords,
        addMatrxId: addScrapeDomainMatrxId,
        addMatrxIds: addScrapeDomainMatrxIds,
        removeMatrxId: removeScrapeDomainMatrxId,
        removeMatrxIds: removeScrapeDomainMatrxIds,
        addPkValue: addScrapeDomainPkValue,
        addPkValues: addScrapeDomainPkValues,
        removePkValue: removeScrapeDomainPkValue,
        removePkValues: removeScrapeDomainPkValues,
        isMissingRecords: isScrapeDomainMissingRecords,
        setShouldFetch: setScrapeDomainShouldFetch,
        setFetchMode: setScrapeDomainFetchMode,
        fetchQuickRefs: fetchScrapeDomainQuickRefs,
        fetchOne: fetchScrapeDomainOne,
        fetchOneWithFkIfk: fetchScrapeDomainOneWithFkIfk,
        fetchAll: fetchScrapeDomainAll,
        fetchPaginated: fetchScrapeDomainPaginated,

    } = useEntityWithFetch("scrapeDomain");

    return {
        scrapeDomainSelectors,
        scrapeDomainActions,
        scrapeDomainRecords,
        scrapeDomainUnsavedRecords,
        scrapeDomainSelectedRecordIds,
        scrapeDomainIsLoading,
        scrapeDomainIsError,
        scrapeDomainQuickRefRecords,
        addScrapeDomainMatrxId,
        addScrapeDomainMatrxIds,
        removeScrapeDomainMatrxId,
        removeScrapeDomainMatrxIds,
        addScrapeDomainPkValue,
        addScrapeDomainPkValues,
        removeScrapeDomainPkValue,
        removeScrapeDomainPkValues,
        isScrapeDomainMissingRecords,
        setScrapeDomainShouldFetch,
        setScrapeDomainFetchMode,
        fetchScrapeDomainQuickRefs,
        fetchScrapeDomainOne,
        fetchScrapeDomainOneWithFkIfk,
        fetchScrapeDomainAll,
        fetchScrapeDomainPaginated,
    };
};



type UseScrapeDomainDisallowedNotesWithFetchReturn = {
    scrapeDomainDisallowedNotesSelectors: EntitySelectors<"scrapeDomainDisallowedNotes">;
    scrapeDomainDisallowedNotesActions: EntityActions<"scrapeDomainDisallowedNotes">;
    scrapeDomainDisallowedNotesRecords: Record<MatrxRecordId, ScrapeDomainDisallowedNotesData>;
    scrapeDomainDisallowedNotesUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeDomainDisallowedNotesData>>;
    scrapeDomainDisallowedNotesSelectedRecordIds: MatrxRecordId[];
    scrapeDomainDisallowedNotesIsLoading: boolean;
    scrapeDomainDisallowedNotesIsError: boolean;
    scrapeDomainDisallowedNotesQuickRefRecords: QuickReferenceRecord[];
    addScrapeDomainDisallowedNotesMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeDomainDisallowedNotesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeDomainDisallowedNotesMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeDomainDisallowedNotesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeDomainDisallowedNotesPkValue: (pkValue: string) => void;
    addScrapeDomainDisallowedNotesPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeDomainDisallowedNotesPkValue: (pkValue: string) => void;
    removeScrapeDomainDisallowedNotesPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeDomainDisallowedNotesMissingRecords: boolean;
    setScrapeDomainDisallowedNotesShouldFetch: (shouldFetch: boolean) => void;
    setScrapeDomainDisallowedNotesFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeDomainDisallowedNotesQuickRefs: () => void;
    fetchScrapeDomainDisallowedNotesOne: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainDisallowedNotesOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainDisallowedNotesAll: () => void;
    fetchScrapeDomainDisallowedNotesPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeDomainDisallowedNotesWithFetch = (): UseScrapeDomainDisallowedNotesWithFetchReturn => {
    const {
        selectors: scrapeDomainDisallowedNotesSelectors,
        actions: scrapeDomainDisallowedNotesActions,
        allRecords: scrapeDomainDisallowedNotesRecords,
        unsavedRecords: scrapeDomainDisallowedNotesUnsavedRecords,
        selectedRecordIds: scrapeDomainDisallowedNotesSelectedRecordIds,
        isLoading: scrapeDomainDisallowedNotesIsLoading,
        isError: scrapeDomainDisallowedNotesIsError,
        quickRefRecords: scrapeDomainDisallowedNotesQuickRefRecords,
        addMatrxId: addScrapeDomainDisallowedNotesMatrxId,
        addMatrxIds: addScrapeDomainDisallowedNotesMatrxIds,
        removeMatrxId: removeScrapeDomainDisallowedNotesMatrxId,
        removeMatrxIds: removeScrapeDomainDisallowedNotesMatrxIds,
        addPkValue: addScrapeDomainDisallowedNotesPkValue,
        addPkValues: addScrapeDomainDisallowedNotesPkValues,
        removePkValue: removeScrapeDomainDisallowedNotesPkValue,
        removePkValues: removeScrapeDomainDisallowedNotesPkValues,
        isMissingRecords: isScrapeDomainDisallowedNotesMissingRecords,
        setShouldFetch: setScrapeDomainDisallowedNotesShouldFetch,
        setFetchMode: setScrapeDomainDisallowedNotesFetchMode,
        fetchQuickRefs: fetchScrapeDomainDisallowedNotesQuickRefs,
        fetchOne: fetchScrapeDomainDisallowedNotesOne,
        fetchOneWithFkIfk: fetchScrapeDomainDisallowedNotesOneWithFkIfk,
        fetchAll: fetchScrapeDomainDisallowedNotesAll,
        fetchPaginated: fetchScrapeDomainDisallowedNotesPaginated,

    } = useEntityWithFetch("scrapeDomainDisallowedNotes");

    return {
        scrapeDomainDisallowedNotesSelectors,
        scrapeDomainDisallowedNotesActions,
        scrapeDomainDisallowedNotesRecords,
        scrapeDomainDisallowedNotesUnsavedRecords,
        scrapeDomainDisallowedNotesSelectedRecordIds,
        scrapeDomainDisallowedNotesIsLoading,
        scrapeDomainDisallowedNotesIsError,
        scrapeDomainDisallowedNotesQuickRefRecords,
        addScrapeDomainDisallowedNotesMatrxId,
        addScrapeDomainDisallowedNotesMatrxIds,
        removeScrapeDomainDisallowedNotesMatrxId,
        removeScrapeDomainDisallowedNotesMatrxIds,
        addScrapeDomainDisallowedNotesPkValue,
        addScrapeDomainDisallowedNotesPkValues,
        removeScrapeDomainDisallowedNotesPkValue,
        removeScrapeDomainDisallowedNotesPkValues,
        isScrapeDomainDisallowedNotesMissingRecords,
        setScrapeDomainDisallowedNotesShouldFetch,
        setScrapeDomainDisallowedNotesFetchMode,
        fetchScrapeDomainDisallowedNotesQuickRefs,
        fetchScrapeDomainDisallowedNotesOne,
        fetchScrapeDomainDisallowedNotesOneWithFkIfk,
        fetchScrapeDomainDisallowedNotesAll,
        fetchScrapeDomainDisallowedNotesPaginated,
    };
};



type UseScrapeDomainNotesWithFetchReturn = {
    scrapeDomainNotesSelectors: EntitySelectors<"scrapeDomainNotes">;
    scrapeDomainNotesActions: EntityActions<"scrapeDomainNotes">;
    scrapeDomainNotesRecords: Record<MatrxRecordId, ScrapeDomainNotesData>;
    scrapeDomainNotesUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeDomainNotesData>>;
    scrapeDomainNotesSelectedRecordIds: MatrxRecordId[];
    scrapeDomainNotesIsLoading: boolean;
    scrapeDomainNotesIsError: boolean;
    scrapeDomainNotesQuickRefRecords: QuickReferenceRecord[];
    addScrapeDomainNotesMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeDomainNotesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeDomainNotesMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeDomainNotesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeDomainNotesPkValue: (pkValue: string) => void;
    addScrapeDomainNotesPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeDomainNotesPkValue: (pkValue: string) => void;
    removeScrapeDomainNotesPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeDomainNotesMissingRecords: boolean;
    setScrapeDomainNotesShouldFetch: (shouldFetch: boolean) => void;
    setScrapeDomainNotesFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeDomainNotesQuickRefs: () => void;
    fetchScrapeDomainNotesOne: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainNotesOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainNotesAll: () => void;
    fetchScrapeDomainNotesPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeDomainNotesWithFetch = (): UseScrapeDomainNotesWithFetchReturn => {
    const {
        selectors: scrapeDomainNotesSelectors,
        actions: scrapeDomainNotesActions,
        allRecords: scrapeDomainNotesRecords,
        unsavedRecords: scrapeDomainNotesUnsavedRecords,
        selectedRecordIds: scrapeDomainNotesSelectedRecordIds,
        isLoading: scrapeDomainNotesIsLoading,
        isError: scrapeDomainNotesIsError,
        quickRefRecords: scrapeDomainNotesQuickRefRecords,
        addMatrxId: addScrapeDomainNotesMatrxId,
        addMatrxIds: addScrapeDomainNotesMatrxIds,
        removeMatrxId: removeScrapeDomainNotesMatrxId,
        removeMatrxIds: removeScrapeDomainNotesMatrxIds,
        addPkValue: addScrapeDomainNotesPkValue,
        addPkValues: addScrapeDomainNotesPkValues,
        removePkValue: removeScrapeDomainNotesPkValue,
        removePkValues: removeScrapeDomainNotesPkValues,
        isMissingRecords: isScrapeDomainNotesMissingRecords,
        setShouldFetch: setScrapeDomainNotesShouldFetch,
        setFetchMode: setScrapeDomainNotesFetchMode,
        fetchQuickRefs: fetchScrapeDomainNotesQuickRefs,
        fetchOne: fetchScrapeDomainNotesOne,
        fetchOneWithFkIfk: fetchScrapeDomainNotesOneWithFkIfk,
        fetchAll: fetchScrapeDomainNotesAll,
        fetchPaginated: fetchScrapeDomainNotesPaginated,

    } = useEntityWithFetch("scrapeDomainNotes");

    return {
        scrapeDomainNotesSelectors,
        scrapeDomainNotesActions,
        scrapeDomainNotesRecords,
        scrapeDomainNotesUnsavedRecords,
        scrapeDomainNotesSelectedRecordIds,
        scrapeDomainNotesIsLoading,
        scrapeDomainNotesIsError,
        scrapeDomainNotesQuickRefRecords,
        addScrapeDomainNotesMatrxId,
        addScrapeDomainNotesMatrxIds,
        removeScrapeDomainNotesMatrxId,
        removeScrapeDomainNotesMatrxIds,
        addScrapeDomainNotesPkValue,
        addScrapeDomainNotesPkValues,
        removeScrapeDomainNotesPkValue,
        removeScrapeDomainNotesPkValues,
        isScrapeDomainNotesMissingRecords,
        setScrapeDomainNotesShouldFetch,
        setScrapeDomainNotesFetchMode,
        fetchScrapeDomainNotesQuickRefs,
        fetchScrapeDomainNotesOne,
        fetchScrapeDomainNotesOneWithFkIfk,
        fetchScrapeDomainNotesAll,
        fetchScrapeDomainNotesPaginated,
    };
};



type UseScrapeDomainQuickScrapeSettingsWithFetchReturn = {
    scrapeDomainQuickScrapeSettingsSelectors: EntitySelectors<"scrapeDomainQuickScrapeSettings">;
    scrapeDomainQuickScrapeSettingsActions: EntityActions<"scrapeDomainQuickScrapeSettings">;
    scrapeDomainQuickScrapeSettingsRecords: Record<MatrxRecordId, ScrapeDomainQuickScrapeSettingsData>;
    scrapeDomainQuickScrapeSettingsUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeDomainQuickScrapeSettingsData>>;
    scrapeDomainQuickScrapeSettingsSelectedRecordIds: MatrxRecordId[];
    scrapeDomainQuickScrapeSettingsIsLoading: boolean;
    scrapeDomainQuickScrapeSettingsIsError: boolean;
    scrapeDomainQuickScrapeSettingsQuickRefRecords: QuickReferenceRecord[];
    addScrapeDomainQuickScrapeSettingsMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeDomainQuickScrapeSettingsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeDomainQuickScrapeSettingsMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeDomainQuickScrapeSettingsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeDomainQuickScrapeSettingsPkValue: (pkValue: string) => void;
    addScrapeDomainQuickScrapeSettingsPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeDomainQuickScrapeSettingsPkValue: (pkValue: string) => void;
    removeScrapeDomainQuickScrapeSettingsPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeDomainQuickScrapeSettingsMissingRecords: boolean;
    setScrapeDomainQuickScrapeSettingsShouldFetch: (shouldFetch: boolean) => void;
    setScrapeDomainQuickScrapeSettingsFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeDomainQuickScrapeSettingsQuickRefs: () => void;
    fetchScrapeDomainQuickScrapeSettingsOne: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainQuickScrapeSettingsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainQuickScrapeSettingsAll: () => void;
    fetchScrapeDomainQuickScrapeSettingsPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeDomainQuickScrapeSettingsWithFetch = (): UseScrapeDomainQuickScrapeSettingsWithFetchReturn => {
    const {
        selectors: scrapeDomainQuickScrapeSettingsSelectors,
        actions: scrapeDomainQuickScrapeSettingsActions,
        allRecords: scrapeDomainQuickScrapeSettingsRecords,
        unsavedRecords: scrapeDomainQuickScrapeSettingsUnsavedRecords,
        selectedRecordIds: scrapeDomainQuickScrapeSettingsSelectedRecordIds,
        isLoading: scrapeDomainQuickScrapeSettingsIsLoading,
        isError: scrapeDomainQuickScrapeSettingsIsError,
        quickRefRecords: scrapeDomainQuickScrapeSettingsQuickRefRecords,
        addMatrxId: addScrapeDomainQuickScrapeSettingsMatrxId,
        addMatrxIds: addScrapeDomainQuickScrapeSettingsMatrxIds,
        removeMatrxId: removeScrapeDomainQuickScrapeSettingsMatrxId,
        removeMatrxIds: removeScrapeDomainQuickScrapeSettingsMatrxIds,
        addPkValue: addScrapeDomainQuickScrapeSettingsPkValue,
        addPkValues: addScrapeDomainQuickScrapeSettingsPkValues,
        removePkValue: removeScrapeDomainQuickScrapeSettingsPkValue,
        removePkValues: removeScrapeDomainQuickScrapeSettingsPkValues,
        isMissingRecords: isScrapeDomainQuickScrapeSettingsMissingRecords,
        setShouldFetch: setScrapeDomainQuickScrapeSettingsShouldFetch,
        setFetchMode: setScrapeDomainQuickScrapeSettingsFetchMode,
        fetchQuickRefs: fetchScrapeDomainQuickScrapeSettingsQuickRefs,
        fetchOne: fetchScrapeDomainQuickScrapeSettingsOne,
        fetchOneWithFkIfk: fetchScrapeDomainQuickScrapeSettingsOneWithFkIfk,
        fetchAll: fetchScrapeDomainQuickScrapeSettingsAll,
        fetchPaginated: fetchScrapeDomainQuickScrapeSettingsPaginated,

    } = useEntityWithFetch("scrapeDomainQuickScrapeSettings");

    return {
        scrapeDomainQuickScrapeSettingsSelectors,
        scrapeDomainQuickScrapeSettingsActions,
        scrapeDomainQuickScrapeSettingsRecords,
        scrapeDomainQuickScrapeSettingsUnsavedRecords,
        scrapeDomainQuickScrapeSettingsSelectedRecordIds,
        scrapeDomainQuickScrapeSettingsIsLoading,
        scrapeDomainQuickScrapeSettingsIsError,
        scrapeDomainQuickScrapeSettingsQuickRefRecords,
        addScrapeDomainQuickScrapeSettingsMatrxId,
        addScrapeDomainQuickScrapeSettingsMatrxIds,
        removeScrapeDomainQuickScrapeSettingsMatrxId,
        removeScrapeDomainQuickScrapeSettingsMatrxIds,
        addScrapeDomainQuickScrapeSettingsPkValue,
        addScrapeDomainQuickScrapeSettingsPkValues,
        removeScrapeDomainQuickScrapeSettingsPkValue,
        removeScrapeDomainQuickScrapeSettingsPkValues,
        isScrapeDomainQuickScrapeSettingsMissingRecords,
        setScrapeDomainQuickScrapeSettingsShouldFetch,
        setScrapeDomainQuickScrapeSettingsFetchMode,
        fetchScrapeDomainQuickScrapeSettingsQuickRefs,
        fetchScrapeDomainQuickScrapeSettingsOne,
        fetchScrapeDomainQuickScrapeSettingsOneWithFkIfk,
        fetchScrapeDomainQuickScrapeSettingsAll,
        fetchScrapeDomainQuickScrapeSettingsPaginated,
    };
};



type UseScrapeDomainRobotsTxtWithFetchReturn = {
    scrapeDomainRobotsTxtSelectors: EntitySelectors<"scrapeDomainRobotsTxt">;
    scrapeDomainRobotsTxtActions: EntityActions<"scrapeDomainRobotsTxt">;
    scrapeDomainRobotsTxtRecords: Record<MatrxRecordId, ScrapeDomainRobotsTxtData>;
    scrapeDomainRobotsTxtUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeDomainRobotsTxtData>>;
    scrapeDomainRobotsTxtSelectedRecordIds: MatrxRecordId[];
    scrapeDomainRobotsTxtIsLoading: boolean;
    scrapeDomainRobotsTxtIsError: boolean;
    scrapeDomainRobotsTxtQuickRefRecords: QuickReferenceRecord[];
    addScrapeDomainRobotsTxtMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeDomainRobotsTxtMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeDomainRobotsTxtMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeDomainRobotsTxtMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeDomainRobotsTxtPkValue: (pkValue: string) => void;
    addScrapeDomainRobotsTxtPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeDomainRobotsTxtPkValue: (pkValue: string) => void;
    removeScrapeDomainRobotsTxtPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeDomainRobotsTxtMissingRecords: boolean;
    setScrapeDomainRobotsTxtShouldFetch: (shouldFetch: boolean) => void;
    setScrapeDomainRobotsTxtFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeDomainRobotsTxtQuickRefs: () => void;
    fetchScrapeDomainRobotsTxtOne: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainRobotsTxtOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainRobotsTxtAll: () => void;
    fetchScrapeDomainRobotsTxtPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeDomainRobotsTxtWithFetch = (): UseScrapeDomainRobotsTxtWithFetchReturn => {
    const {
        selectors: scrapeDomainRobotsTxtSelectors,
        actions: scrapeDomainRobotsTxtActions,
        allRecords: scrapeDomainRobotsTxtRecords,
        unsavedRecords: scrapeDomainRobotsTxtUnsavedRecords,
        selectedRecordIds: scrapeDomainRobotsTxtSelectedRecordIds,
        isLoading: scrapeDomainRobotsTxtIsLoading,
        isError: scrapeDomainRobotsTxtIsError,
        quickRefRecords: scrapeDomainRobotsTxtQuickRefRecords,
        addMatrxId: addScrapeDomainRobotsTxtMatrxId,
        addMatrxIds: addScrapeDomainRobotsTxtMatrxIds,
        removeMatrxId: removeScrapeDomainRobotsTxtMatrxId,
        removeMatrxIds: removeScrapeDomainRobotsTxtMatrxIds,
        addPkValue: addScrapeDomainRobotsTxtPkValue,
        addPkValues: addScrapeDomainRobotsTxtPkValues,
        removePkValue: removeScrapeDomainRobotsTxtPkValue,
        removePkValues: removeScrapeDomainRobotsTxtPkValues,
        isMissingRecords: isScrapeDomainRobotsTxtMissingRecords,
        setShouldFetch: setScrapeDomainRobotsTxtShouldFetch,
        setFetchMode: setScrapeDomainRobotsTxtFetchMode,
        fetchQuickRefs: fetchScrapeDomainRobotsTxtQuickRefs,
        fetchOne: fetchScrapeDomainRobotsTxtOne,
        fetchOneWithFkIfk: fetchScrapeDomainRobotsTxtOneWithFkIfk,
        fetchAll: fetchScrapeDomainRobotsTxtAll,
        fetchPaginated: fetchScrapeDomainRobotsTxtPaginated,

    } = useEntityWithFetch("scrapeDomainRobotsTxt");

    return {
        scrapeDomainRobotsTxtSelectors,
        scrapeDomainRobotsTxtActions,
        scrapeDomainRobotsTxtRecords,
        scrapeDomainRobotsTxtUnsavedRecords,
        scrapeDomainRobotsTxtSelectedRecordIds,
        scrapeDomainRobotsTxtIsLoading,
        scrapeDomainRobotsTxtIsError,
        scrapeDomainRobotsTxtQuickRefRecords,
        addScrapeDomainRobotsTxtMatrxId,
        addScrapeDomainRobotsTxtMatrxIds,
        removeScrapeDomainRobotsTxtMatrxId,
        removeScrapeDomainRobotsTxtMatrxIds,
        addScrapeDomainRobotsTxtPkValue,
        addScrapeDomainRobotsTxtPkValues,
        removeScrapeDomainRobotsTxtPkValue,
        removeScrapeDomainRobotsTxtPkValues,
        isScrapeDomainRobotsTxtMissingRecords,
        setScrapeDomainRobotsTxtShouldFetch,
        setScrapeDomainRobotsTxtFetchMode,
        fetchScrapeDomainRobotsTxtQuickRefs,
        fetchScrapeDomainRobotsTxtOne,
        fetchScrapeDomainRobotsTxtOneWithFkIfk,
        fetchScrapeDomainRobotsTxtAll,
        fetchScrapeDomainRobotsTxtPaginated,
    };
};



type UseScrapeDomainSitemapWithFetchReturn = {
    scrapeDomainSitemapSelectors: EntitySelectors<"scrapeDomainSitemap">;
    scrapeDomainSitemapActions: EntityActions<"scrapeDomainSitemap">;
    scrapeDomainSitemapRecords: Record<MatrxRecordId, ScrapeDomainSitemapData>;
    scrapeDomainSitemapUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeDomainSitemapData>>;
    scrapeDomainSitemapSelectedRecordIds: MatrxRecordId[];
    scrapeDomainSitemapIsLoading: boolean;
    scrapeDomainSitemapIsError: boolean;
    scrapeDomainSitemapQuickRefRecords: QuickReferenceRecord[];
    addScrapeDomainSitemapMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeDomainSitemapMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeDomainSitemapMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeDomainSitemapMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeDomainSitemapPkValue: (pkValue: string) => void;
    addScrapeDomainSitemapPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeDomainSitemapPkValue: (pkValue: string) => void;
    removeScrapeDomainSitemapPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeDomainSitemapMissingRecords: boolean;
    setScrapeDomainSitemapShouldFetch: (shouldFetch: boolean) => void;
    setScrapeDomainSitemapFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeDomainSitemapQuickRefs: () => void;
    fetchScrapeDomainSitemapOne: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainSitemapOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeDomainSitemapAll: () => void;
    fetchScrapeDomainSitemapPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeDomainSitemapWithFetch = (): UseScrapeDomainSitemapWithFetchReturn => {
    const {
        selectors: scrapeDomainSitemapSelectors,
        actions: scrapeDomainSitemapActions,
        allRecords: scrapeDomainSitemapRecords,
        unsavedRecords: scrapeDomainSitemapUnsavedRecords,
        selectedRecordIds: scrapeDomainSitemapSelectedRecordIds,
        isLoading: scrapeDomainSitemapIsLoading,
        isError: scrapeDomainSitemapIsError,
        quickRefRecords: scrapeDomainSitemapQuickRefRecords,
        addMatrxId: addScrapeDomainSitemapMatrxId,
        addMatrxIds: addScrapeDomainSitemapMatrxIds,
        removeMatrxId: removeScrapeDomainSitemapMatrxId,
        removeMatrxIds: removeScrapeDomainSitemapMatrxIds,
        addPkValue: addScrapeDomainSitemapPkValue,
        addPkValues: addScrapeDomainSitemapPkValues,
        removePkValue: removeScrapeDomainSitemapPkValue,
        removePkValues: removeScrapeDomainSitemapPkValues,
        isMissingRecords: isScrapeDomainSitemapMissingRecords,
        setShouldFetch: setScrapeDomainSitemapShouldFetch,
        setFetchMode: setScrapeDomainSitemapFetchMode,
        fetchQuickRefs: fetchScrapeDomainSitemapQuickRefs,
        fetchOne: fetchScrapeDomainSitemapOne,
        fetchOneWithFkIfk: fetchScrapeDomainSitemapOneWithFkIfk,
        fetchAll: fetchScrapeDomainSitemapAll,
        fetchPaginated: fetchScrapeDomainSitemapPaginated,

    } = useEntityWithFetch("scrapeDomainSitemap");

    return {
        scrapeDomainSitemapSelectors,
        scrapeDomainSitemapActions,
        scrapeDomainSitemapRecords,
        scrapeDomainSitemapUnsavedRecords,
        scrapeDomainSitemapSelectedRecordIds,
        scrapeDomainSitemapIsLoading,
        scrapeDomainSitemapIsError,
        scrapeDomainSitemapQuickRefRecords,
        addScrapeDomainSitemapMatrxId,
        addScrapeDomainSitemapMatrxIds,
        removeScrapeDomainSitemapMatrxId,
        removeScrapeDomainSitemapMatrxIds,
        addScrapeDomainSitemapPkValue,
        addScrapeDomainSitemapPkValues,
        removeScrapeDomainSitemapPkValue,
        removeScrapeDomainSitemapPkValues,
        isScrapeDomainSitemapMissingRecords,
        setScrapeDomainSitemapShouldFetch,
        setScrapeDomainSitemapFetchMode,
        fetchScrapeDomainSitemapQuickRefs,
        fetchScrapeDomainSitemapOne,
        fetchScrapeDomainSitemapOneWithFkIfk,
        fetchScrapeDomainSitemapAll,
        fetchScrapeDomainSitemapPaginated,
    };
};



type UseScrapeJobWithFetchReturn = {
    scrapeJobSelectors: EntitySelectors<"scrapeJob">;
    scrapeJobActions: EntityActions<"scrapeJob">;
    scrapeJobRecords: Record<MatrxRecordId, ScrapeJobData>;
    scrapeJobUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeJobData>>;
    scrapeJobSelectedRecordIds: MatrxRecordId[];
    scrapeJobIsLoading: boolean;
    scrapeJobIsError: boolean;
    scrapeJobQuickRefRecords: QuickReferenceRecord[];
    addScrapeJobMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeJobMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeJobMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeJobMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeJobPkValue: (pkValue: string) => void;
    addScrapeJobPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeJobPkValue: (pkValue: string) => void;
    removeScrapeJobPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeJobMissingRecords: boolean;
    setScrapeJobShouldFetch: (shouldFetch: boolean) => void;
    setScrapeJobFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeJobQuickRefs: () => void;
    fetchScrapeJobOne: (recordId: MatrxRecordId) => void;
    fetchScrapeJobOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeJobAll: () => void;
    fetchScrapeJobPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeJobWithFetch = (): UseScrapeJobWithFetchReturn => {
    const {
        selectors: scrapeJobSelectors,
        actions: scrapeJobActions,
        allRecords: scrapeJobRecords,
        unsavedRecords: scrapeJobUnsavedRecords,
        selectedRecordIds: scrapeJobSelectedRecordIds,
        isLoading: scrapeJobIsLoading,
        isError: scrapeJobIsError,
        quickRefRecords: scrapeJobQuickRefRecords,
        addMatrxId: addScrapeJobMatrxId,
        addMatrxIds: addScrapeJobMatrxIds,
        removeMatrxId: removeScrapeJobMatrxId,
        removeMatrxIds: removeScrapeJobMatrxIds,
        addPkValue: addScrapeJobPkValue,
        addPkValues: addScrapeJobPkValues,
        removePkValue: removeScrapeJobPkValue,
        removePkValues: removeScrapeJobPkValues,
        isMissingRecords: isScrapeJobMissingRecords,
        setShouldFetch: setScrapeJobShouldFetch,
        setFetchMode: setScrapeJobFetchMode,
        fetchQuickRefs: fetchScrapeJobQuickRefs,
        fetchOne: fetchScrapeJobOne,
        fetchOneWithFkIfk: fetchScrapeJobOneWithFkIfk,
        fetchAll: fetchScrapeJobAll,
        fetchPaginated: fetchScrapeJobPaginated,

    } = useEntityWithFetch("scrapeJob");

    return {
        scrapeJobSelectors,
        scrapeJobActions,
        scrapeJobRecords,
        scrapeJobUnsavedRecords,
        scrapeJobSelectedRecordIds,
        scrapeJobIsLoading,
        scrapeJobIsError,
        scrapeJobQuickRefRecords,
        addScrapeJobMatrxId,
        addScrapeJobMatrxIds,
        removeScrapeJobMatrxId,
        removeScrapeJobMatrxIds,
        addScrapeJobPkValue,
        addScrapeJobPkValues,
        removeScrapeJobPkValue,
        removeScrapeJobPkValues,
        isScrapeJobMissingRecords,
        setScrapeJobShouldFetch,
        setScrapeJobFetchMode,
        fetchScrapeJobQuickRefs,
        fetchScrapeJobOne,
        fetchScrapeJobOneWithFkIfk,
        fetchScrapeJobAll,
        fetchScrapeJobPaginated,
    };
};



type UseScrapeOverrideWithFetchReturn = {
    scrapeOverrideSelectors: EntitySelectors<"scrapeOverride">;
    scrapeOverrideActions: EntityActions<"scrapeOverride">;
    scrapeOverrideRecords: Record<MatrxRecordId, ScrapeOverrideData>;
    scrapeOverrideUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeOverrideData>>;
    scrapeOverrideSelectedRecordIds: MatrxRecordId[];
    scrapeOverrideIsLoading: boolean;
    scrapeOverrideIsError: boolean;
    scrapeOverrideQuickRefRecords: QuickReferenceRecord[];
    addScrapeOverrideMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeOverrideMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeOverrideMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeOverrideMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeOverridePkValue: (pkValue: string) => void;
    addScrapeOverridePkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeOverridePkValue: (pkValue: string) => void;
    removeScrapeOverridePkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeOverrideMissingRecords: boolean;
    setScrapeOverrideShouldFetch: (shouldFetch: boolean) => void;
    setScrapeOverrideFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeOverrideQuickRefs: () => void;
    fetchScrapeOverrideOne: (recordId: MatrxRecordId) => void;
    fetchScrapeOverrideOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeOverrideAll: () => void;
    fetchScrapeOverridePaginated: (page: number, pageSize: number) => void;
};

export const useScrapeOverrideWithFetch = (): UseScrapeOverrideWithFetchReturn => {
    const {
        selectors: scrapeOverrideSelectors,
        actions: scrapeOverrideActions,
        allRecords: scrapeOverrideRecords,
        unsavedRecords: scrapeOverrideUnsavedRecords,
        selectedRecordIds: scrapeOverrideSelectedRecordIds,
        isLoading: scrapeOverrideIsLoading,
        isError: scrapeOverrideIsError,
        quickRefRecords: scrapeOverrideQuickRefRecords,
        addMatrxId: addScrapeOverrideMatrxId,
        addMatrxIds: addScrapeOverrideMatrxIds,
        removeMatrxId: removeScrapeOverrideMatrxId,
        removeMatrxIds: removeScrapeOverrideMatrxIds,
        addPkValue: addScrapeOverridePkValue,
        addPkValues: addScrapeOverridePkValues,
        removePkValue: removeScrapeOverridePkValue,
        removePkValues: removeScrapeOverridePkValues,
        isMissingRecords: isScrapeOverrideMissingRecords,
        setShouldFetch: setScrapeOverrideShouldFetch,
        setFetchMode: setScrapeOverrideFetchMode,
        fetchQuickRefs: fetchScrapeOverrideQuickRefs,
        fetchOne: fetchScrapeOverrideOne,
        fetchOneWithFkIfk: fetchScrapeOverrideOneWithFkIfk,
        fetchAll: fetchScrapeOverrideAll,
        fetchPaginated: fetchScrapeOverridePaginated,

    } = useEntityWithFetch("scrapeOverride");

    return {
        scrapeOverrideSelectors,
        scrapeOverrideActions,
        scrapeOverrideRecords,
        scrapeOverrideUnsavedRecords,
        scrapeOverrideSelectedRecordIds,
        scrapeOverrideIsLoading,
        scrapeOverrideIsError,
        scrapeOverrideQuickRefRecords,
        addScrapeOverrideMatrxId,
        addScrapeOverrideMatrxIds,
        removeScrapeOverrideMatrxId,
        removeScrapeOverrideMatrxIds,
        addScrapeOverridePkValue,
        addScrapeOverridePkValues,
        removeScrapeOverridePkValue,
        removeScrapeOverridePkValues,
        isScrapeOverrideMissingRecords,
        setScrapeOverrideShouldFetch,
        setScrapeOverrideFetchMode,
        fetchScrapeOverrideQuickRefs,
        fetchScrapeOverrideOne,
        fetchScrapeOverrideOneWithFkIfk,
        fetchScrapeOverrideAll,
        fetchScrapeOverridePaginated,
    };
};



type UseScrapeOverrideValueWithFetchReturn = {
    scrapeOverrideValueSelectors: EntitySelectors<"scrapeOverrideValue">;
    scrapeOverrideValueActions: EntityActions<"scrapeOverrideValue">;
    scrapeOverrideValueRecords: Record<MatrxRecordId, ScrapeOverrideValueData>;
    scrapeOverrideValueUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeOverrideValueData>>;
    scrapeOverrideValueSelectedRecordIds: MatrxRecordId[];
    scrapeOverrideValueIsLoading: boolean;
    scrapeOverrideValueIsError: boolean;
    scrapeOverrideValueQuickRefRecords: QuickReferenceRecord[];
    addScrapeOverrideValueMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeOverrideValueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeOverrideValueMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeOverrideValueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeOverrideValuePkValue: (pkValue: string) => void;
    addScrapeOverrideValuePkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeOverrideValuePkValue: (pkValue: string) => void;
    removeScrapeOverrideValuePkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeOverrideValueMissingRecords: boolean;
    setScrapeOverrideValueShouldFetch: (shouldFetch: boolean) => void;
    setScrapeOverrideValueFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeOverrideValueQuickRefs: () => void;
    fetchScrapeOverrideValueOne: (recordId: MatrxRecordId) => void;
    fetchScrapeOverrideValueOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeOverrideValueAll: () => void;
    fetchScrapeOverrideValuePaginated: (page: number, pageSize: number) => void;
};

export const useScrapeOverrideValueWithFetch = (): UseScrapeOverrideValueWithFetchReturn => {
    const {
        selectors: scrapeOverrideValueSelectors,
        actions: scrapeOverrideValueActions,
        allRecords: scrapeOverrideValueRecords,
        unsavedRecords: scrapeOverrideValueUnsavedRecords,
        selectedRecordIds: scrapeOverrideValueSelectedRecordIds,
        isLoading: scrapeOverrideValueIsLoading,
        isError: scrapeOverrideValueIsError,
        quickRefRecords: scrapeOverrideValueQuickRefRecords,
        addMatrxId: addScrapeOverrideValueMatrxId,
        addMatrxIds: addScrapeOverrideValueMatrxIds,
        removeMatrxId: removeScrapeOverrideValueMatrxId,
        removeMatrxIds: removeScrapeOverrideValueMatrxIds,
        addPkValue: addScrapeOverrideValuePkValue,
        addPkValues: addScrapeOverrideValuePkValues,
        removePkValue: removeScrapeOverrideValuePkValue,
        removePkValues: removeScrapeOverrideValuePkValues,
        isMissingRecords: isScrapeOverrideValueMissingRecords,
        setShouldFetch: setScrapeOverrideValueShouldFetch,
        setFetchMode: setScrapeOverrideValueFetchMode,
        fetchQuickRefs: fetchScrapeOverrideValueQuickRefs,
        fetchOne: fetchScrapeOverrideValueOne,
        fetchOneWithFkIfk: fetchScrapeOverrideValueOneWithFkIfk,
        fetchAll: fetchScrapeOverrideValueAll,
        fetchPaginated: fetchScrapeOverrideValuePaginated,

    } = useEntityWithFetch("scrapeOverrideValue");

    return {
        scrapeOverrideValueSelectors,
        scrapeOverrideValueActions,
        scrapeOverrideValueRecords,
        scrapeOverrideValueUnsavedRecords,
        scrapeOverrideValueSelectedRecordIds,
        scrapeOverrideValueIsLoading,
        scrapeOverrideValueIsError,
        scrapeOverrideValueQuickRefRecords,
        addScrapeOverrideValueMatrxId,
        addScrapeOverrideValueMatrxIds,
        removeScrapeOverrideValueMatrxId,
        removeScrapeOverrideValueMatrxIds,
        addScrapeOverrideValuePkValue,
        addScrapeOverrideValuePkValues,
        removeScrapeOverrideValuePkValue,
        removeScrapeOverrideValuePkValues,
        isScrapeOverrideValueMissingRecords,
        setScrapeOverrideValueShouldFetch,
        setScrapeOverrideValueFetchMode,
        fetchScrapeOverrideValueQuickRefs,
        fetchScrapeOverrideValueOne,
        fetchScrapeOverrideValueOneWithFkIfk,
        fetchScrapeOverrideValueAll,
        fetchScrapeOverrideValuePaginated,
    };
};



type UseScrapeParsedPageWithFetchReturn = {
    scrapeParsedPageSelectors: EntitySelectors<"scrapeParsedPage">;
    scrapeParsedPageActions: EntityActions<"scrapeParsedPage">;
    scrapeParsedPageRecords: Record<MatrxRecordId, ScrapeParsedPageData>;
    scrapeParsedPageUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeParsedPageData>>;
    scrapeParsedPageSelectedRecordIds: MatrxRecordId[];
    scrapeParsedPageIsLoading: boolean;
    scrapeParsedPageIsError: boolean;
    scrapeParsedPageQuickRefRecords: QuickReferenceRecord[];
    addScrapeParsedPageMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeParsedPageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeParsedPageMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeParsedPageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeParsedPagePkValue: (pkValue: string) => void;
    addScrapeParsedPagePkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeParsedPagePkValue: (pkValue: string) => void;
    removeScrapeParsedPagePkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeParsedPageMissingRecords: boolean;
    setScrapeParsedPageShouldFetch: (shouldFetch: boolean) => void;
    setScrapeParsedPageFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeParsedPageQuickRefs: () => void;
    fetchScrapeParsedPageOne: (recordId: MatrxRecordId) => void;
    fetchScrapeParsedPageOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeParsedPageAll: () => void;
    fetchScrapeParsedPagePaginated: (page: number, pageSize: number) => void;
};

export const useScrapeParsedPageWithFetch = (): UseScrapeParsedPageWithFetchReturn => {
    const {
        selectors: scrapeParsedPageSelectors,
        actions: scrapeParsedPageActions,
        allRecords: scrapeParsedPageRecords,
        unsavedRecords: scrapeParsedPageUnsavedRecords,
        selectedRecordIds: scrapeParsedPageSelectedRecordIds,
        isLoading: scrapeParsedPageIsLoading,
        isError: scrapeParsedPageIsError,
        quickRefRecords: scrapeParsedPageQuickRefRecords,
        addMatrxId: addScrapeParsedPageMatrxId,
        addMatrxIds: addScrapeParsedPageMatrxIds,
        removeMatrxId: removeScrapeParsedPageMatrxId,
        removeMatrxIds: removeScrapeParsedPageMatrxIds,
        addPkValue: addScrapeParsedPagePkValue,
        addPkValues: addScrapeParsedPagePkValues,
        removePkValue: removeScrapeParsedPagePkValue,
        removePkValues: removeScrapeParsedPagePkValues,
        isMissingRecords: isScrapeParsedPageMissingRecords,
        setShouldFetch: setScrapeParsedPageShouldFetch,
        setFetchMode: setScrapeParsedPageFetchMode,
        fetchQuickRefs: fetchScrapeParsedPageQuickRefs,
        fetchOne: fetchScrapeParsedPageOne,
        fetchOneWithFkIfk: fetchScrapeParsedPageOneWithFkIfk,
        fetchAll: fetchScrapeParsedPageAll,
        fetchPaginated: fetchScrapeParsedPagePaginated,

    } = useEntityWithFetch("scrapeParsedPage");

    return {
        scrapeParsedPageSelectors,
        scrapeParsedPageActions,
        scrapeParsedPageRecords,
        scrapeParsedPageUnsavedRecords,
        scrapeParsedPageSelectedRecordIds,
        scrapeParsedPageIsLoading,
        scrapeParsedPageIsError,
        scrapeParsedPageQuickRefRecords,
        addScrapeParsedPageMatrxId,
        addScrapeParsedPageMatrxIds,
        removeScrapeParsedPageMatrxId,
        removeScrapeParsedPageMatrxIds,
        addScrapeParsedPagePkValue,
        addScrapeParsedPagePkValues,
        removeScrapeParsedPagePkValue,
        removeScrapeParsedPagePkValues,
        isScrapeParsedPageMissingRecords,
        setScrapeParsedPageShouldFetch,
        setScrapeParsedPageFetchMode,
        fetchScrapeParsedPageQuickRefs,
        fetchScrapeParsedPageOne,
        fetchScrapeParsedPageOneWithFkIfk,
        fetchScrapeParsedPageAll,
        fetchScrapeParsedPagePaginated,
    };
};



type UseScrapePathPatternWithFetchReturn = {
    scrapePathPatternSelectors: EntitySelectors<"scrapePathPattern">;
    scrapePathPatternActions: EntityActions<"scrapePathPattern">;
    scrapePathPatternRecords: Record<MatrxRecordId, ScrapePathPatternData>;
    scrapePathPatternUnsavedRecords: Record<MatrxRecordId, Partial<ScrapePathPatternData>>;
    scrapePathPatternSelectedRecordIds: MatrxRecordId[];
    scrapePathPatternIsLoading: boolean;
    scrapePathPatternIsError: boolean;
    scrapePathPatternQuickRefRecords: QuickReferenceRecord[];
    addScrapePathPatternMatrxId: (recordId: MatrxRecordId) => void;
    addScrapePathPatternMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapePathPatternMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapePathPatternMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapePathPatternPkValue: (pkValue: string) => void;
    addScrapePathPatternPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapePathPatternPkValue: (pkValue: string) => void;
    removeScrapePathPatternPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapePathPatternMissingRecords: boolean;
    setScrapePathPatternShouldFetch: (shouldFetch: boolean) => void;
    setScrapePathPatternFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapePathPatternQuickRefs: () => void;
    fetchScrapePathPatternOne: (recordId: MatrxRecordId) => void;
    fetchScrapePathPatternOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapePathPatternAll: () => void;
    fetchScrapePathPatternPaginated: (page: number, pageSize: number) => void;
};

export const useScrapePathPatternWithFetch = (): UseScrapePathPatternWithFetchReturn => {
    const {
        selectors: scrapePathPatternSelectors,
        actions: scrapePathPatternActions,
        allRecords: scrapePathPatternRecords,
        unsavedRecords: scrapePathPatternUnsavedRecords,
        selectedRecordIds: scrapePathPatternSelectedRecordIds,
        isLoading: scrapePathPatternIsLoading,
        isError: scrapePathPatternIsError,
        quickRefRecords: scrapePathPatternQuickRefRecords,
        addMatrxId: addScrapePathPatternMatrxId,
        addMatrxIds: addScrapePathPatternMatrxIds,
        removeMatrxId: removeScrapePathPatternMatrxId,
        removeMatrxIds: removeScrapePathPatternMatrxIds,
        addPkValue: addScrapePathPatternPkValue,
        addPkValues: addScrapePathPatternPkValues,
        removePkValue: removeScrapePathPatternPkValue,
        removePkValues: removeScrapePathPatternPkValues,
        isMissingRecords: isScrapePathPatternMissingRecords,
        setShouldFetch: setScrapePathPatternShouldFetch,
        setFetchMode: setScrapePathPatternFetchMode,
        fetchQuickRefs: fetchScrapePathPatternQuickRefs,
        fetchOne: fetchScrapePathPatternOne,
        fetchOneWithFkIfk: fetchScrapePathPatternOneWithFkIfk,
        fetchAll: fetchScrapePathPatternAll,
        fetchPaginated: fetchScrapePathPatternPaginated,

    } = useEntityWithFetch("scrapePathPattern");

    return {
        scrapePathPatternSelectors,
        scrapePathPatternActions,
        scrapePathPatternRecords,
        scrapePathPatternUnsavedRecords,
        scrapePathPatternSelectedRecordIds,
        scrapePathPatternIsLoading,
        scrapePathPatternIsError,
        scrapePathPatternQuickRefRecords,
        addScrapePathPatternMatrxId,
        addScrapePathPatternMatrxIds,
        removeScrapePathPatternMatrxId,
        removeScrapePathPatternMatrxIds,
        addScrapePathPatternPkValue,
        addScrapePathPatternPkValues,
        removeScrapePathPatternPkValue,
        removeScrapePathPatternPkValues,
        isScrapePathPatternMissingRecords,
        setScrapePathPatternShouldFetch,
        setScrapePathPatternFetchMode,
        fetchScrapePathPatternQuickRefs,
        fetchScrapePathPatternOne,
        fetchScrapePathPatternOneWithFkIfk,
        fetchScrapePathPatternAll,
        fetchScrapePathPatternPaginated,
    };
};



type UseScrapePathPatternCachePolicyWithFetchReturn = {
    scrapePathPatternCachePolicySelectors: EntitySelectors<"scrapePathPatternCachePolicy">;
    scrapePathPatternCachePolicyActions: EntityActions<"scrapePathPatternCachePolicy">;
    scrapePathPatternCachePolicyRecords: Record<MatrxRecordId, ScrapePathPatternCachePolicyData>;
    scrapePathPatternCachePolicyUnsavedRecords: Record<MatrxRecordId, Partial<ScrapePathPatternCachePolicyData>>;
    scrapePathPatternCachePolicySelectedRecordIds: MatrxRecordId[];
    scrapePathPatternCachePolicyIsLoading: boolean;
    scrapePathPatternCachePolicyIsError: boolean;
    scrapePathPatternCachePolicyQuickRefRecords: QuickReferenceRecord[];
    addScrapePathPatternCachePolicyMatrxId: (recordId: MatrxRecordId) => void;
    addScrapePathPatternCachePolicyMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapePathPatternCachePolicyMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapePathPatternCachePolicyMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapePathPatternCachePolicyPkValue: (pkValue: string) => void;
    addScrapePathPatternCachePolicyPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapePathPatternCachePolicyPkValue: (pkValue: string) => void;
    removeScrapePathPatternCachePolicyPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapePathPatternCachePolicyMissingRecords: boolean;
    setScrapePathPatternCachePolicyShouldFetch: (shouldFetch: boolean) => void;
    setScrapePathPatternCachePolicyFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapePathPatternCachePolicyQuickRefs: () => void;
    fetchScrapePathPatternCachePolicyOne: (recordId: MatrxRecordId) => void;
    fetchScrapePathPatternCachePolicyOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapePathPatternCachePolicyAll: () => void;
    fetchScrapePathPatternCachePolicyPaginated: (page: number, pageSize: number) => void;
};

export const useScrapePathPatternCachePolicyWithFetch = (): UseScrapePathPatternCachePolicyWithFetchReturn => {
    const {
        selectors: scrapePathPatternCachePolicySelectors,
        actions: scrapePathPatternCachePolicyActions,
        allRecords: scrapePathPatternCachePolicyRecords,
        unsavedRecords: scrapePathPatternCachePolicyUnsavedRecords,
        selectedRecordIds: scrapePathPatternCachePolicySelectedRecordIds,
        isLoading: scrapePathPatternCachePolicyIsLoading,
        isError: scrapePathPatternCachePolicyIsError,
        quickRefRecords: scrapePathPatternCachePolicyQuickRefRecords,
        addMatrxId: addScrapePathPatternCachePolicyMatrxId,
        addMatrxIds: addScrapePathPatternCachePolicyMatrxIds,
        removeMatrxId: removeScrapePathPatternCachePolicyMatrxId,
        removeMatrxIds: removeScrapePathPatternCachePolicyMatrxIds,
        addPkValue: addScrapePathPatternCachePolicyPkValue,
        addPkValues: addScrapePathPatternCachePolicyPkValues,
        removePkValue: removeScrapePathPatternCachePolicyPkValue,
        removePkValues: removeScrapePathPatternCachePolicyPkValues,
        isMissingRecords: isScrapePathPatternCachePolicyMissingRecords,
        setShouldFetch: setScrapePathPatternCachePolicyShouldFetch,
        setFetchMode: setScrapePathPatternCachePolicyFetchMode,
        fetchQuickRefs: fetchScrapePathPatternCachePolicyQuickRefs,
        fetchOne: fetchScrapePathPatternCachePolicyOne,
        fetchOneWithFkIfk: fetchScrapePathPatternCachePolicyOneWithFkIfk,
        fetchAll: fetchScrapePathPatternCachePolicyAll,
        fetchPaginated: fetchScrapePathPatternCachePolicyPaginated,

    } = useEntityWithFetch("scrapePathPatternCachePolicy");

    return {
        scrapePathPatternCachePolicySelectors,
        scrapePathPatternCachePolicyActions,
        scrapePathPatternCachePolicyRecords,
        scrapePathPatternCachePolicyUnsavedRecords,
        scrapePathPatternCachePolicySelectedRecordIds,
        scrapePathPatternCachePolicyIsLoading,
        scrapePathPatternCachePolicyIsError,
        scrapePathPatternCachePolicyQuickRefRecords,
        addScrapePathPatternCachePolicyMatrxId,
        addScrapePathPatternCachePolicyMatrxIds,
        removeScrapePathPatternCachePolicyMatrxId,
        removeScrapePathPatternCachePolicyMatrxIds,
        addScrapePathPatternCachePolicyPkValue,
        addScrapePathPatternCachePolicyPkValues,
        removeScrapePathPatternCachePolicyPkValue,
        removeScrapePathPatternCachePolicyPkValues,
        isScrapePathPatternCachePolicyMissingRecords,
        setScrapePathPatternCachePolicyShouldFetch,
        setScrapePathPatternCachePolicyFetchMode,
        fetchScrapePathPatternCachePolicyQuickRefs,
        fetchScrapePathPatternCachePolicyOne,
        fetchScrapePathPatternCachePolicyOneWithFkIfk,
        fetchScrapePathPatternCachePolicyAll,
        fetchScrapePathPatternCachePolicyPaginated,
    };
};



type UseScrapePathPatternOverrideWithFetchReturn = {
    scrapePathPatternOverrideSelectors: EntitySelectors<"scrapePathPatternOverride">;
    scrapePathPatternOverrideActions: EntityActions<"scrapePathPatternOverride">;
    scrapePathPatternOverrideRecords: Record<MatrxRecordId, ScrapePathPatternOverrideData>;
    scrapePathPatternOverrideUnsavedRecords: Record<MatrxRecordId, Partial<ScrapePathPatternOverrideData>>;
    scrapePathPatternOverrideSelectedRecordIds: MatrxRecordId[];
    scrapePathPatternOverrideIsLoading: boolean;
    scrapePathPatternOverrideIsError: boolean;
    scrapePathPatternOverrideQuickRefRecords: QuickReferenceRecord[];
    addScrapePathPatternOverrideMatrxId: (recordId: MatrxRecordId) => void;
    addScrapePathPatternOverrideMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapePathPatternOverrideMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapePathPatternOverrideMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapePathPatternOverridePkValue: (pkValue: string) => void;
    addScrapePathPatternOverridePkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapePathPatternOverridePkValue: (pkValue: string) => void;
    removeScrapePathPatternOverridePkValues: (pkValues: Record<string, unknown>) => void;
    isScrapePathPatternOverrideMissingRecords: boolean;
    setScrapePathPatternOverrideShouldFetch: (shouldFetch: boolean) => void;
    setScrapePathPatternOverrideFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapePathPatternOverrideQuickRefs: () => void;
    fetchScrapePathPatternOverrideOne: (recordId: MatrxRecordId) => void;
    fetchScrapePathPatternOverrideOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapePathPatternOverrideAll: () => void;
    fetchScrapePathPatternOverridePaginated: (page: number, pageSize: number) => void;
};

export const useScrapePathPatternOverrideWithFetch = (): UseScrapePathPatternOverrideWithFetchReturn => {
    const {
        selectors: scrapePathPatternOverrideSelectors,
        actions: scrapePathPatternOverrideActions,
        allRecords: scrapePathPatternOverrideRecords,
        unsavedRecords: scrapePathPatternOverrideUnsavedRecords,
        selectedRecordIds: scrapePathPatternOverrideSelectedRecordIds,
        isLoading: scrapePathPatternOverrideIsLoading,
        isError: scrapePathPatternOverrideIsError,
        quickRefRecords: scrapePathPatternOverrideQuickRefRecords,
        addMatrxId: addScrapePathPatternOverrideMatrxId,
        addMatrxIds: addScrapePathPatternOverrideMatrxIds,
        removeMatrxId: removeScrapePathPatternOverrideMatrxId,
        removeMatrxIds: removeScrapePathPatternOverrideMatrxIds,
        addPkValue: addScrapePathPatternOverridePkValue,
        addPkValues: addScrapePathPatternOverridePkValues,
        removePkValue: removeScrapePathPatternOverridePkValue,
        removePkValues: removeScrapePathPatternOverridePkValues,
        isMissingRecords: isScrapePathPatternOverrideMissingRecords,
        setShouldFetch: setScrapePathPatternOverrideShouldFetch,
        setFetchMode: setScrapePathPatternOverrideFetchMode,
        fetchQuickRefs: fetchScrapePathPatternOverrideQuickRefs,
        fetchOne: fetchScrapePathPatternOverrideOne,
        fetchOneWithFkIfk: fetchScrapePathPatternOverrideOneWithFkIfk,
        fetchAll: fetchScrapePathPatternOverrideAll,
        fetchPaginated: fetchScrapePathPatternOverridePaginated,

    } = useEntityWithFetch("scrapePathPatternOverride");

    return {
        scrapePathPatternOverrideSelectors,
        scrapePathPatternOverrideActions,
        scrapePathPatternOverrideRecords,
        scrapePathPatternOverrideUnsavedRecords,
        scrapePathPatternOverrideSelectedRecordIds,
        scrapePathPatternOverrideIsLoading,
        scrapePathPatternOverrideIsError,
        scrapePathPatternOverrideQuickRefRecords,
        addScrapePathPatternOverrideMatrxId,
        addScrapePathPatternOverrideMatrxIds,
        removeScrapePathPatternOverrideMatrxId,
        removeScrapePathPatternOverrideMatrxIds,
        addScrapePathPatternOverridePkValue,
        addScrapePathPatternOverridePkValues,
        removeScrapePathPatternOverridePkValue,
        removeScrapePathPatternOverridePkValues,
        isScrapePathPatternOverrideMissingRecords,
        setScrapePathPatternOverrideShouldFetch,
        setScrapePathPatternOverrideFetchMode,
        fetchScrapePathPatternOverrideQuickRefs,
        fetchScrapePathPatternOverrideOne,
        fetchScrapePathPatternOverrideOneWithFkIfk,
        fetchScrapePathPatternOverrideAll,
        fetchScrapePathPatternOverridePaginated,
    };
};



type UseScrapeQuickFailureLogWithFetchReturn = {
    scrapeQuickFailureLogSelectors: EntitySelectors<"scrapeQuickFailureLog">;
    scrapeQuickFailureLogActions: EntityActions<"scrapeQuickFailureLog">;
    scrapeQuickFailureLogRecords: Record<MatrxRecordId, ScrapeQuickFailureLogData>;
    scrapeQuickFailureLogUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeQuickFailureLogData>>;
    scrapeQuickFailureLogSelectedRecordIds: MatrxRecordId[];
    scrapeQuickFailureLogIsLoading: boolean;
    scrapeQuickFailureLogIsError: boolean;
    scrapeQuickFailureLogQuickRefRecords: QuickReferenceRecord[];
    addScrapeQuickFailureLogMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeQuickFailureLogMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeQuickFailureLogMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeQuickFailureLogMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeQuickFailureLogPkValue: (pkValue: string) => void;
    addScrapeQuickFailureLogPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeQuickFailureLogPkValue: (pkValue: string) => void;
    removeScrapeQuickFailureLogPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeQuickFailureLogMissingRecords: boolean;
    setScrapeQuickFailureLogShouldFetch: (shouldFetch: boolean) => void;
    setScrapeQuickFailureLogFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeQuickFailureLogQuickRefs: () => void;
    fetchScrapeQuickFailureLogOne: (recordId: MatrxRecordId) => void;
    fetchScrapeQuickFailureLogOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeQuickFailureLogAll: () => void;
    fetchScrapeQuickFailureLogPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeQuickFailureLogWithFetch = (): UseScrapeQuickFailureLogWithFetchReturn => {
    const {
        selectors: scrapeQuickFailureLogSelectors,
        actions: scrapeQuickFailureLogActions,
        allRecords: scrapeQuickFailureLogRecords,
        unsavedRecords: scrapeQuickFailureLogUnsavedRecords,
        selectedRecordIds: scrapeQuickFailureLogSelectedRecordIds,
        isLoading: scrapeQuickFailureLogIsLoading,
        isError: scrapeQuickFailureLogIsError,
        quickRefRecords: scrapeQuickFailureLogQuickRefRecords,
        addMatrxId: addScrapeQuickFailureLogMatrxId,
        addMatrxIds: addScrapeQuickFailureLogMatrxIds,
        removeMatrxId: removeScrapeQuickFailureLogMatrxId,
        removeMatrxIds: removeScrapeQuickFailureLogMatrxIds,
        addPkValue: addScrapeQuickFailureLogPkValue,
        addPkValues: addScrapeQuickFailureLogPkValues,
        removePkValue: removeScrapeQuickFailureLogPkValue,
        removePkValues: removeScrapeQuickFailureLogPkValues,
        isMissingRecords: isScrapeQuickFailureLogMissingRecords,
        setShouldFetch: setScrapeQuickFailureLogShouldFetch,
        setFetchMode: setScrapeQuickFailureLogFetchMode,
        fetchQuickRefs: fetchScrapeQuickFailureLogQuickRefs,
        fetchOne: fetchScrapeQuickFailureLogOne,
        fetchOneWithFkIfk: fetchScrapeQuickFailureLogOneWithFkIfk,
        fetchAll: fetchScrapeQuickFailureLogAll,
        fetchPaginated: fetchScrapeQuickFailureLogPaginated,

    } = useEntityWithFetch("scrapeQuickFailureLog");

    return {
        scrapeQuickFailureLogSelectors,
        scrapeQuickFailureLogActions,
        scrapeQuickFailureLogRecords,
        scrapeQuickFailureLogUnsavedRecords,
        scrapeQuickFailureLogSelectedRecordIds,
        scrapeQuickFailureLogIsLoading,
        scrapeQuickFailureLogIsError,
        scrapeQuickFailureLogQuickRefRecords,
        addScrapeQuickFailureLogMatrxId,
        addScrapeQuickFailureLogMatrxIds,
        removeScrapeQuickFailureLogMatrxId,
        removeScrapeQuickFailureLogMatrxIds,
        addScrapeQuickFailureLogPkValue,
        addScrapeQuickFailureLogPkValues,
        removeScrapeQuickFailureLogPkValue,
        removeScrapeQuickFailureLogPkValues,
        isScrapeQuickFailureLogMissingRecords,
        setScrapeQuickFailureLogShouldFetch,
        setScrapeQuickFailureLogFetchMode,
        fetchScrapeQuickFailureLogQuickRefs,
        fetchScrapeQuickFailureLogOne,
        fetchScrapeQuickFailureLogOneWithFkIfk,
        fetchScrapeQuickFailureLogAll,
        fetchScrapeQuickFailureLogPaginated,
    };
};



type UseScrapeTaskWithFetchReturn = {
    scrapeTaskSelectors: EntitySelectors<"scrapeTask">;
    scrapeTaskActions: EntityActions<"scrapeTask">;
    scrapeTaskRecords: Record<MatrxRecordId, ScrapeTaskData>;
    scrapeTaskUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeTaskData>>;
    scrapeTaskSelectedRecordIds: MatrxRecordId[];
    scrapeTaskIsLoading: boolean;
    scrapeTaskIsError: boolean;
    scrapeTaskQuickRefRecords: QuickReferenceRecord[];
    addScrapeTaskMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeTaskMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeTaskMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeTaskMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeTaskPkValue: (pkValue: string) => void;
    addScrapeTaskPkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeTaskPkValue: (pkValue: string) => void;
    removeScrapeTaskPkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeTaskMissingRecords: boolean;
    setScrapeTaskShouldFetch: (shouldFetch: boolean) => void;
    setScrapeTaskFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeTaskQuickRefs: () => void;
    fetchScrapeTaskOne: (recordId: MatrxRecordId) => void;
    fetchScrapeTaskOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeTaskAll: () => void;
    fetchScrapeTaskPaginated: (page: number, pageSize: number) => void;
};

export const useScrapeTaskWithFetch = (): UseScrapeTaskWithFetchReturn => {
    const {
        selectors: scrapeTaskSelectors,
        actions: scrapeTaskActions,
        allRecords: scrapeTaskRecords,
        unsavedRecords: scrapeTaskUnsavedRecords,
        selectedRecordIds: scrapeTaskSelectedRecordIds,
        isLoading: scrapeTaskIsLoading,
        isError: scrapeTaskIsError,
        quickRefRecords: scrapeTaskQuickRefRecords,
        addMatrxId: addScrapeTaskMatrxId,
        addMatrxIds: addScrapeTaskMatrxIds,
        removeMatrxId: removeScrapeTaskMatrxId,
        removeMatrxIds: removeScrapeTaskMatrxIds,
        addPkValue: addScrapeTaskPkValue,
        addPkValues: addScrapeTaskPkValues,
        removePkValue: removeScrapeTaskPkValue,
        removePkValues: removeScrapeTaskPkValues,
        isMissingRecords: isScrapeTaskMissingRecords,
        setShouldFetch: setScrapeTaskShouldFetch,
        setFetchMode: setScrapeTaskFetchMode,
        fetchQuickRefs: fetchScrapeTaskQuickRefs,
        fetchOne: fetchScrapeTaskOne,
        fetchOneWithFkIfk: fetchScrapeTaskOneWithFkIfk,
        fetchAll: fetchScrapeTaskAll,
        fetchPaginated: fetchScrapeTaskPaginated,

    } = useEntityWithFetch("scrapeTask");

    return {
        scrapeTaskSelectors,
        scrapeTaskActions,
        scrapeTaskRecords,
        scrapeTaskUnsavedRecords,
        scrapeTaskSelectedRecordIds,
        scrapeTaskIsLoading,
        scrapeTaskIsError,
        scrapeTaskQuickRefRecords,
        addScrapeTaskMatrxId,
        addScrapeTaskMatrxIds,
        removeScrapeTaskMatrxId,
        removeScrapeTaskMatrxIds,
        addScrapeTaskPkValue,
        addScrapeTaskPkValues,
        removeScrapeTaskPkValue,
        removeScrapeTaskPkValues,
        isScrapeTaskMissingRecords,
        setScrapeTaskShouldFetch,
        setScrapeTaskFetchMode,
        fetchScrapeTaskQuickRefs,
        fetchScrapeTaskOne,
        fetchScrapeTaskOneWithFkIfk,
        fetchScrapeTaskAll,
        fetchScrapeTaskPaginated,
    };
};



type UseScrapeTaskResponseWithFetchReturn = {
    scrapeTaskResponseSelectors: EntitySelectors<"scrapeTaskResponse">;
    scrapeTaskResponseActions: EntityActions<"scrapeTaskResponse">;
    scrapeTaskResponseRecords: Record<MatrxRecordId, ScrapeTaskResponseData>;
    scrapeTaskResponseUnsavedRecords: Record<MatrxRecordId, Partial<ScrapeTaskResponseData>>;
    scrapeTaskResponseSelectedRecordIds: MatrxRecordId[];
    scrapeTaskResponseIsLoading: boolean;
    scrapeTaskResponseIsError: boolean;
    scrapeTaskResponseQuickRefRecords: QuickReferenceRecord[];
    addScrapeTaskResponseMatrxId: (recordId: MatrxRecordId) => void;
    addScrapeTaskResponseMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeScrapeTaskResponseMatrxId: (recordId: MatrxRecordId) => void;
    removeScrapeTaskResponseMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addScrapeTaskResponsePkValue: (pkValue: string) => void;
    addScrapeTaskResponsePkValues: (pkValues: Record<string, unknown>) => void;
    removeScrapeTaskResponsePkValue: (pkValue: string) => void;
    removeScrapeTaskResponsePkValues: (pkValues: Record<string, unknown>) => void;
    isScrapeTaskResponseMissingRecords: boolean;
    setScrapeTaskResponseShouldFetch: (shouldFetch: boolean) => void;
    setScrapeTaskResponseFetchMode: (fetchMode: FetchMode) => void;
    fetchScrapeTaskResponseQuickRefs: () => void;
    fetchScrapeTaskResponseOne: (recordId: MatrxRecordId) => void;
    fetchScrapeTaskResponseOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchScrapeTaskResponseAll: () => void;
    fetchScrapeTaskResponsePaginated: (page: number, pageSize: number) => void;
};

export const useScrapeTaskResponseWithFetch = (): UseScrapeTaskResponseWithFetchReturn => {
    const {
        selectors: scrapeTaskResponseSelectors,
        actions: scrapeTaskResponseActions,
        allRecords: scrapeTaskResponseRecords,
        unsavedRecords: scrapeTaskResponseUnsavedRecords,
        selectedRecordIds: scrapeTaskResponseSelectedRecordIds,
        isLoading: scrapeTaskResponseIsLoading,
        isError: scrapeTaskResponseIsError,
        quickRefRecords: scrapeTaskResponseQuickRefRecords,
        addMatrxId: addScrapeTaskResponseMatrxId,
        addMatrxIds: addScrapeTaskResponseMatrxIds,
        removeMatrxId: removeScrapeTaskResponseMatrxId,
        removeMatrxIds: removeScrapeTaskResponseMatrxIds,
        addPkValue: addScrapeTaskResponsePkValue,
        addPkValues: addScrapeTaskResponsePkValues,
        removePkValue: removeScrapeTaskResponsePkValue,
        removePkValues: removeScrapeTaskResponsePkValues,
        isMissingRecords: isScrapeTaskResponseMissingRecords,
        setShouldFetch: setScrapeTaskResponseShouldFetch,
        setFetchMode: setScrapeTaskResponseFetchMode,
        fetchQuickRefs: fetchScrapeTaskResponseQuickRefs,
        fetchOne: fetchScrapeTaskResponseOne,
        fetchOneWithFkIfk: fetchScrapeTaskResponseOneWithFkIfk,
        fetchAll: fetchScrapeTaskResponseAll,
        fetchPaginated: fetchScrapeTaskResponsePaginated,

    } = useEntityWithFetch("scrapeTaskResponse");

    return {
        scrapeTaskResponseSelectors,
        scrapeTaskResponseActions,
        scrapeTaskResponseRecords,
        scrapeTaskResponseUnsavedRecords,
        scrapeTaskResponseSelectedRecordIds,
        scrapeTaskResponseIsLoading,
        scrapeTaskResponseIsError,
        scrapeTaskResponseQuickRefRecords,
        addScrapeTaskResponseMatrxId,
        addScrapeTaskResponseMatrxIds,
        removeScrapeTaskResponseMatrxId,
        removeScrapeTaskResponseMatrxIds,
        addScrapeTaskResponsePkValue,
        addScrapeTaskResponsePkValues,
        removeScrapeTaskResponsePkValue,
        removeScrapeTaskResponsePkValues,
        isScrapeTaskResponseMissingRecords,
        setScrapeTaskResponseShouldFetch,
        setScrapeTaskResponseFetchMode,
        fetchScrapeTaskResponseQuickRefs,
        fetchScrapeTaskResponseOne,
        fetchScrapeTaskResponseOneWithFkIfk,
        fetchScrapeTaskResponseAll,
        fetchScrapeTaskResponsePaginated,
    };
};



type UseSubcategoryWithFetchReturn = {
    subcategorySelectors: EntitySelectors<"subcategory">;
    subcategoryActions: EntityActions<"subcategory">;
    subcategoryRecords: Record<MatrxRecordId, SubcategoryData>;
    subcategoryUnsavedRecords: Record<MatrxRecordId, Partial<SubcategoryData>>;
    subcategorySelectedRecordIds: MatrxRecordId[];
    subcategoryIsLoading: boolean;
    subcategoryIsError: boolean;
    subcategoryQuickRefRecords: QuickReferenceRecord[];
    addSubcategoryMatrxId: (recordId: MatrxRecordId) => void;
    addSubcategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeSubcategoryMatrxId: (recordId: MatrxRecordId) => void;
    removeSubcategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addSubcategoryPkValue: (pkValue: string) => void;
    addSubcategoryPkValues: (pkValues: Record<string, unknown>) => void;
    removeSubcategoryPkValue: (pkValue: string) => void;
    removeSubcategoryPkValues: (pkValues: Record<string, unknown>) => void;
    isSubcategoryMissingRecords: boolean;
    setSubcategoryShouldFetch: (shouldFetch: boolean) => void;
    setSubcategoryFetchMode: (fetchMode: FetchMode) => void;
    fetchSubcategoryQuickRefs: () => void;
    fetchSubcategoryOne: (recordId: MatrxRecordId) => void;
    fetchSubcategoryOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchSubcategoryAll: () => void;
    fetchSubcategoryPaginated: (page: number, pageSize: number) => void;
};

export const useSubcategoryWithFetch = (): UseSubcategoryWithFetchReturn => {
    const {
        selectors: subcategorySelectors,
        actions: subcategoryActions,
        allRecords: subcategoryRecords,
        unsavedRecords: subcategoryUnsavedRecords,
        selectedRecordIds: subcategorySelectedRecordIds,
        isLoading: subcategoryIsLoading,
        isError: subcategoryIsError,
        quickRefRecords: subcategoryQuickRefRecords,
        addMatrxId: addSubcategoryMatrxId,
        addMatrxIds: addSubcategoryMatrxIds,
        removeMatrxId: removeSubcategoryMatrxId,
        removeMatrxIds: removeSubcategoryMatrxIds,
        addPkValue: addSubcategoryPkValue,
        addPkValues: addSubcategoryPkValues,
        removePkValue: removeSubcategoryPkValue,
        removePkValues: removeSubcategoryPkValues,
        isMissingRecords: isSubcategoryMissingRecords,
        setShouldFetch: setSubcategoryShouldFetch,
        setFetchMode: setSubcategoryFetchMode,
        fetchQuickRefs: fetchSubcategoryQuickRefs,
        fetchOne: fetchSubcategoryOne,
        fetchOneWithFkIfk: fetchSubcategoryOneWithFkIfk,
        fetchAll: fetchSubcategoryAll,
        fetchPaginated: fetchSubcategoryPaginated,

    } = useEntityWithFetch("subcategory");

    return {
        subcategorySelectors,
        subcategoryActions,
        subcategoryRecords,
        subcategoryUnsavedRecords,
        subcategorySelectedRecordIds,
        subcategoryIsLoading,
        subcategoryIsError,
        subcategoryQuickRefRecords,
        addSubcategoryMatrxId,
        addSubcategoryMatrxIds,
        removeSubcategoryMatrxId,
        removeSubcategoryMatrxIds,
        addSubcategoryPkValue,
        addSubcategoryPkValues,
        removeSubcategoryPkValue,
        removeSubcategoryPkValues,
        isSubcategoryMissingRecords,
        setSubcategoryShouldFetch,
        setSubcategoryFetchMode,
        fetchSubcategoryQuickRefs,
        fetchSubcategoryOne,
        fetchSubcategoryOneWithFkIfk,
        fetchSubcategoryAll,
        fetchSubcategoryPaginated,
    };
};



type UseSystemFunctionWithFetchReturn = {
    systemFunctionSelectors: EntitySelectors<"systemFunction">;
    systemFunctionActions: EntityActions<"systemFunction">;
    systemFunctionRecords: Record<MatrxRecordId, SystemFunctionData>;
    systemFunctionUnsavedRecords: Record<MatrxRecordId, Partial<SystemFunctionData>>;
    systemFunctionSelectedRecordIds: MatrxRecordId[];
    systemFunctionIsLoading: boolean;
    systemFunctionIsError: boolean;
    systemFunctionQuickRefRecords: QuickReferenceRecord[];
    addSystemFunctionMatrxId: (recordId: MatrxRecordId) => void;
    addSystemFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeSystemFunctionMatrxId: (recordId: MatrxRecordId) => void;
    removeSystemFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addSystemFunctionPkValue: (pkValue: string) => void;
    addSystemFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    removeSystemFunctionPkValue: (pkValue: string) => void;
    removeSystemFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    isSystemFunctionMissingRecords: boolean;
    setSystemFunctionShouldFetch: (shouldFetch: boolean) => void;
    setSystemFunctionFetchMode: (fetchMode: FetchMode) => void;
    fetchSystemFunctionQuickRefs: () => void;
    fetchSystemFunctionOne: (recordId: MatrxRecordId) => void;
    fetchSystemFunctionOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchSystemFunctionAll: () => void;
    fetchSystemFunctionPaginated: (page: number, pageSize: number) => void;
};

export const useSystemFunctionWithFetch = (): UseSystemFunctionWithFetchReturn => {
    const {
        selectors: systemFunctionSelectors,
        actions: systemFunctionActions,
        allRecords: systemFunctionRecords,
        unsavedRecords: systemFunctionUnsavedRecords,
        selectedRecordIds: systemFunctionSelectedRecordIds,
        isLoading: systemFunctionIsLoading,
        isError: systemFunctionIsError,
        quickRefRecords: systemFunctionQuickRefRecords,
        addMatrxId: addSystemFunctionMatrxId,
        addMatrxIds: addSystemFunctionMatrxIds,
        removeMatrxId: removeSystemFunctionMatrxId,
        removeMatrxIds: removeSystemFunctionMatrxIds,
        addPkValue: addSystemFunctionPkValue,
        addPkValues: addSystemFunctionPkValues,
        removePkValue: removeSystemFunctionPkValue,
        removePkValues: removeSystemFunctionPkValues,
        isMissingRecords: isSystemFunctionMissingRecords,
        setShouldFetch: setSystemFunctionShouldFetch,
        setFetchMode: setSystemFunctionFetchMode,
        fetchQuickRefs: fetchSystemFunctionQuickRefs,
        fetchOne: fetchSystemFunctionOne,
        fetchOneWithFkIfk: fetchSystemFunctionOneWithFkIfk,
        fetchAll: fetchSystemFunctionAll,
        fetchPaginated: fetchSystemFunctionPaginated,

    } = useEntityWithFetch("systemFunction");

    return {
        systemFunctionSelectors,
        systemFunctionActions,
        systemFunctionRecords,
        systemFunctionUnsavedRecords,
        systemFunctionSelectedRecordIds,
        systemFunctionIsLoading,
        systemFunctionIsError,
        systemFunctionQuickRefRecords,
        addSystemFunctionMatrxId,
        addSystemFunctionMatrxIds,
        removeSystemFunctionMatrxId,
        removeSystemFunctionMatrxIds,
        addSystemFunctionPkValue,
        addSystemFunctionPkValues,
        removeSystemFunctionPkValue,
        removeSystemFunctionPkValues,
        isSystemFunctionMissingRecords,
        setSystemFunctionShouldFetch,
        setSystemFunctionFetchMode,
        fetchSystemFunctionQuickRefs,
        fetchSystemFunctionOne,
        fetchSystemFunctionOneWithFkIfk,
        fetchSystemFunctionAll,
        fetchSystemFunctionPaginated,
    };
};



type UseTableDataWithFetchReturn = {
    tableDataSelectors: EntitySelectors<"tableData">;
    tableDataActions: EntityActions<"tableData">;
    tableDataRecords: Record<MatrxRecordId, TableDataData>;
    tableDataUnsavedRecords: Record<MatrxRecordId, Partial<TableDataData>>;
    tableDataSelectedRecordIds: MatrxRecordId[];
    tableDataIsLoading: boolean;
    tableDataIsError: boolean;
    tableDataQuickRefRecords: QuickReferenceRecord[];
    addTableDataMatrxId: (recordId: MatrxRecordId) => void;
    addTableDataMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeTableDataMatrxId: (recordId: MatrxRecordId) => void;
    removeTableDataMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addTableDataPkValue: (pkValue: string) => void;
    addTableDataPkValues: (pkValues: Record<string, unknown>) => void;
    removeTableDataPkValue: (pkValue: string) => void;
    removeTableDataPkValues: (pkValues: Record<string, unknown>) => void;
    isTableDataMissingRecords: boolean;
    setTableDataShouldFetch: (shouldFetch: boolean) => void;
    setTableDataFetchMode: (fetchMode: FetchMode) => void;
    fetchTableDataQuickRefs: () => void;
    fetchTableDataOne: (recordId: MatrxRecordId) => void;
    fetchTableDataOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchTableDataAll: () => void;
    fetchTableDataPaginated: (page: number, pageSize: number) => void;
};

export const useTableDataWithFetch = (): UseTableDataWithFetchReturn => {
    const {
        selectors: tableDataSelectors,
        actions: tableDataActions,
        allRecords: tableDataRecords,
        unsavedRecords: tableDataUnsavedRecords,
        selectedRecordIds: tableDataSelectedRecordIds,
        isLoading: tableDataIsLoading,
        isError: tableDataIsError,
        quickRefRecords: tableDataQuickRefRecords,
        addMatrxId: addTableDataMatrxId,
        addMatrxIds: addTableDataMatrxIds,
        removeMatrxId: removeTableDataMatrxId,
        removeMatrxIds: removeTableDataMatrxIds,
        addPkValue: addTableDataPkValue,
        addPkValues: addTableDataPkValues,
        removePkValue: removeTableDataPkValue,
        removePkValues: removeTableDataPkValues,
        isMissingRecords: isTableDataMissingRecords,
        setShouldFetch: setTableDataShouldFetch,
        setFetchMode: setTableDataFetchMode,
        fetchQuickRefs: fetchTableDataQuickRefs,
        fetchOne: fetchTableDataOne,
        fetchOneWithFkIfk: fetchTableDataOneWithFkIfk,
        fetchAll: fetchTableDataAll,
        fetchPaginated: fetchTableDataPaginated,

    } = useEntityWithFetch("tableData");

    return {
        tableDataSelectors,
        tableDataActions,
        tableDataRecords,
        tableDataUnsavedRecords,
        tableDataSelectedRecordIds,
        tableDataIsLoading,
        tableDataIsError,
        tableDataQuickRefRecords,
        addTableDataMatrxId,
        addTableDataMatrxIds,
        removeTableDataMatrxId,
        removeTableDataMatrxIds,
        addTableDataPkValue,
        addTableDataPkValues,
        removeTableDataPkValue,
        removeTableDataPkValues,
        isTableDataMissingRecords,
        setTableDataShouldFetch,
        setTableDataFetchMode,
        fetchTableDataQuickRefs,
        fetchTableDataOne,
        fetchTableDataOneWithFkIfk,
        fetchTableDataAll,
        fetchTableDataPaginated,
    };
};



type UseTableFieldsWithFetchReturn = {
    tableFieldsSelectors: EntitySelectors<"tableFields">;
    tableFieldsActions: EntityActions<"tableFields">;
    tableFieldsRecords: Record<MatrxRecordId, TableFieldsData>;
    tableFieldsUnsavedRecords: Record<MatrxRecordId, Partial<TableFieldsData>>;
    tableFieldsSelectedRecordIds: MatrxRecordId[];
    tableFieldsIsLoading: boolean;
    tableFieldsIsError: boolean;
    tableFieldsQuickRefRecords: QuickReferenceRecord[];
    addTableFieldsMatrxId: (recordId: MatrxRecordId) => void;
    addTableFieldsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeTableFieldsMatrxId: (recordId: MatrxRecordId) => void;
    removeTableFieldsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addTableFieldsPkValue: (pkValue: string) => void;
    addTableFieldsPkValues: (pkValues: Record<string, unknown>) => void;
    removeTableFieldsPkValue: (pkValue: string) => void;
    removeTableFieldsPkValues: (pkValues: Record<string, unknown>) => void;
    isTableFieldsMissingRecords: boolean;
    setTableFieldsShouldFetch: (shouldFetch: boolean) => void;
    setTableFieldsFetchMode: (fetchMode: FetchMode) => void;
    fetchTableFieldsQuickRefs: () => void;
    fetchTableFieldsOne: (recordId: MatrxRecordId) => void;
    fetchTableFieldsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchTableFieldsAll: () => void;
    fetchTableFieldsPaginated: (page: number, pageSize: number) => void;
};

export const useTableFieldsWithFetch = (): UseTableFieldsWithFetchReturn => {
    const {
        selectors: tableFieldsSelectors,
        actions: tableFieldsActions,
        allRecords: tableFieldsRecords,
        unsavedRecords: tableFieldsUnsavedRecords,
        selectedRecordIds: tableFieldsSelectedRecordIds,
        isLoading: tableFieldsIsLoading,
        isError: tableFieldsIsError,
        quickRefRecords: tableFieldsQuickRefRecords,
        addMatrxId: addTableFieldsMatrxId,
        addMatrxIds: addTableFieldsMatrxIds,
        removeMatrxId: removeTableFieldsMatrxId,
        removeMatrxIds: removeTableFieldsMatrxIds,
        addPkValue: addTableFieldsPkValue,
        addPkValues: addTableFieldsPkValues,
        removePkValue: removeTableFieldsPkValue,
        removePkValues: removeTableFieldsPkValues,
        isMissingRecords: isTableFieldsMissingRecords,
        setShouldFetch: setTableFieldsShouldFetch,
        setFetchMode: setTableFieldsFetchMode,
        fetchQuickRefs: fetchTableFieldsQuickRefs,
        fetchOne: fetchTableFieldsOne,
        fetchOneWithFkIfk: fetchTableFieldsOneWithFkIfk,
        fetchAll: fetchTableFieldsAll,
        fetchPaginated: fetchTableFieldsPaginated,

    } = useEntityWithFetch("tableFields");

    return {
        tableFieldsSelectors,
        tableFieldsActions,
        tableFieldsRecords,
        tableFieldsUnsavedRecords,
        tableFieldsSelectedRecordIds,
        tableFieldsIsLoading,
        tableFieldsIsError,
        tableFieldsQuickRefRecords,
        addTableFieldsMatrxId,
        addTableFieldsMatrxIds,
        removeTableFieldsMatrxId,
        removeTableFieldsMatrxIds,
        addTableFieldsPkValue,
        addTableFieldsPkValues,
        removeTableFieldsPkValue,
        removeTableFieldsPkValues,
        isTableFieldsMissingRecords,
        setTableFieldsShouldFetch,
        setTableFieldsFetchMode,
        fetchTableFieldsQuickRefs,
        fetchTableFieldsOne,
        fetchTableFieldsOneWithFkIfk,
        fetchTableFieldsAll,
        fetchTableFieldsPaginated,
    };
};



type UseTaskAssignmentsWithFetchReturn = {
    taskAssignmentsSelectors: EntitySelectors<"taskAssignments">;
    taskAssignmentsActions: EntityActions<"taskAssignments">;
    taskAssignmentsRecords: Record<MatrxRecordId, TaskAssignmentsData>;
    taskAssignmentsUnsavedRecords: Record<MatrxRecordId, Partial<TaskAssignmentsData>>;
    taskAssignmentsSelectedRecordIds: MatrxRecordId[];
    taskAssignmentsIsLoading: boolean;
    taskAssignmentsIsError: boolean;
    taskAssignmentsQuickRefRecords: QuickReferenceRecord[];
    addTaskAssignmentsMatrxId: (recordId: MatrxRecordId) => void;
    addTaskAssignmentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeTaskAssignmentsMatrxId: (recordId: MatrxRecordId) => void;
    removeTaskAssignmentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addTaskAssignmentsPkValue: (pkValue: string) => void;
    addTaskAssignmentsPkValues: (pkValues: Record<string, unknown>) => void;
    removeTaskAssignmentsPkValue: (pkValue: string) => void;
    removeTaskAssignmentsPkValues: (pkValues: Record<string, unknown>) => void;
    isTaskAssignmentsMissingRecords: boolean;
    setTaskAssignmentsShouldFetch: (shouldFetch: boolean) => void;
    setTaskAssignmentsFetchMode: (fetchMode: FetchMode) => void;
    fetchTaskAssignmentsQuickRefs: () => void;
    fetchTaskAssignmentsOne: (recordId: MatrxRecordId) => void;
    fetchTaskAssignmentsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchTaskAssignmentsAll: () => void;
    fetchTaskAssignmentsPaginated: (page: number, pageSize: number) => void;
};

export const useTaskAssignmentsWithFetch = (): UseTaskAssignmentsWithFetchReturn => {
    const {
        selectors: taskAssignmentsSelectors,
        actions: taskAssignmentsActions,
        allRecords: taskAssignmentsRecords,
        unsavedRecords: taskAssignmentsUnsavedRecords,
        selectedRecordIds: taskAssignmentsSelectedRecordIds,
        isLoading: taskAssignmentsIsLoading,
        isError: taskAssignmentsIsError,
        quickRefRecords: taskAssignmentsQuickRefRecords,
        addMatrxId: addTaskAssignmentsMatrxId,
        addMatrxIds: addTaskAssignmentsMatrxIds,
        removeMatrxId: removeTaskAssignmentsMatrxId,
        removeMatrxIds: removeTaskAssignmentsMatrxIds,
        addPkValue: addTaskAssignmentsPkValue,
        addPkValues: addTaskAssignmentsPkValues,
        removePkValue: removeTaskAssignmentsPkValue,
        removePkValues: removeTaskAssignmentsPkValues,
        isMissingRecords: isTaskAssignmentsMissingRecords,
        setShouldFetch: setTaskAssignmentsShouldFetch,
        setFetchMode: setTaskAssignmentsFetchMode,
        fetchQuickRefs: fetchTaskAssignmentsQuickRefs,
        fetchOne: fetchTaskAssignmentsOne,
        fetchOneWithFkIfk: fetchTaskAssignmentsOneWithFkIfk,
        fetchAll: fetchTaskAssignmentsAll,
        fetchPaginated: fetchTaskAssignmentsPaginated,

    } = useEntityWithFetch("taskAssignments");

    return {
        taskAssignmentsSelectors,
        taskAssignmentsActions,
        taskAssignmentsRecords,
        taskAssignmentsUnsavedRecords,
        taskAssignmentsSelectedRecordIds,
        taskAssignmentsIsLoading,
        taskAssignmentsIsError,
        taskAssignmentsQuickRefRecords,
        addTaskAssignmentsMatrxId,
        addTaskAssignmentsMatrxIds,
        removeTaskAssignmentsMatrxId,
        removeTaskAssignmentsMatrxIds,
        addTaskAssignmentsPkValue,
        addTaskAssignmentsPkValues,
        removeTaskAssignmentsPkValue,
        removeTaskAssignmentsPkValues,
        isTaskAssignmentsMissingRecords,
        setTaskAssignmentsShouldFetch,
        setTaskAssignmentsFetchMode,
        fetchTaskAssignmentsQuickRefs,
        fetchTaskAssignmentsOne,
        fetchTaskAssignmentsOneWithFkIfk,
        fetchTaskAssignmentsAll,
        fetchTaskAssignmentsPaginated,
    };
};



type UseTaskAttachmentsWithFetchReturn = {
    taskAttachmentsSelectors: EntitySelectors<"taskAttachments">;
    taskAttachmentsActions: EntityActions<"taskAttachments">;
    taskAttachmentsRecords: Record<MatrxRecordId, TaskAttachmentsData>;
    taskAttachmentsUnsavedRecords: Record<MatrxRecordId, Partial<TaskAttachmentsData>>;
    taskAttachmentsSelectedRecordIds: MatrxRecordId[];
    taskAttachmentsIsLoading: boolean;
    taskAttachmentsIsError: boolean;
    taskAttachmentsQuickRefRecords: QuickReferenceRecord[];
    addTaskAttachmentsMatrxId: (recordId: MatrxRecordId) => void;
    addTaskAttachmentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeTaskAttachmentsMatrxId: (recordId: MatrxRecordId) => void;
    removeTaskAttachmentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addTaskAttachmentsPkValue: (pkValue: string) => void;
    addTaskAttachmentsPkValues: (pkValues: Record<string, unknown>) => void;
    removeTaskAttachmentsPkValue: (pkValue: string) => void;
    removeTaskAttachmentsPkValues: (pkValues: Record<string, unknown>) => void;
    isTaskAttachmentsMissingRecords: boolean;
    setTaskAttachmentsShouldFetch: (shouldFetch: boolean) => void;
    setTaskAttachmentsFetchMode: (fetchMode: FetchMode) => void;
    fetchTaskAttachmentsQuickRefs: () => void;
    fetchTaskAttachmentsOne: (recordId: MatrxRecordId) => void;
    fetchTaskAttachmentsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchTaskAttachmentsAll: () => void;
    fetchTaskAttachmentsPaginated: (page: number, pageSize: number) => void;
};

export const useTaskAttachmentsWithFetch = (): UseTaskAttachmentsWithFetchReturn => {
    const {
        selectors: taskAttachmentsSelectors,
        actions: taskAttachmentsActions,
        allRecords: taskAttachmentsRecords,
        unsavedRecords: taskAttachmentsUnsavedRecords,
        selectedRecordIds: taskAttachmentsSelectedRecordIds,
        isLoading: taskAttachmentsIsLoading,
        isError: taskAttachmentsIsError,
        quickRefRecords: taskAttachmentsQuickRefRecords,
        addMatrxId: addTaskAttachmentsMatrxId,
        addMatrxIds: addTaskAttachmentsMatrxIds,
        removeMatrxId: removeTaskAttachmentsMatrxId,
        removeMatrxIds: removeTaskAttachmentsMatrxIds,
        addPkValue: addTaskAttachmentsPkValue,
        addPkValues: addTaskAttachmentsPkValues,
        removePkValue: removeTaskAttachmentsPkValue,
        removePkValues: removeTaskAttachmentsPkValues,
        isMissingRecords: isTaskAttachmentsMissingRecords,
        setShouldFetch: setTaskAttachmentsShouldFetch,
        setFetchMode: setTaskAttachmentsFetchMode,
        fetchQuickRefs: fetchTaskAttachmentsQuickRefs,
        fetchOne: fetchTaskAttachmentsOne,
        fetchOneWithFkIfk: fetchTaskAttachmentsOneWithFkIfk,
        fetchAll: fetchTaskAttachmentsAll,
        fetchPaginated: fetchTaskAttachmentsPaginated,

    } = useEntityWithFetch("taskAttachments");

    return {
        taskAttachmentsSelectors,
        taskAttachmentsActions,
        taskAttachmentsRecords,
        taskAttachmentsUnsavedRecords,
        taskAttachmentsSelectedRecordIds,
        taskAttachmentsIsLoading,
        taskAttachmentsIsError,
        taskAttachmentsQuickRefRecords,
        addTaskAttachmentsMatrxId,
        addTaskAttachmentsMatrxIds,
        removeTaskAttachmentsMatrxId,
        removeTaskAttachmentsMatrxIds,
        addTaskAttachmentsPkValue,
        addTaskAttachmentsPkValues,
        removeTaskAttachmentsPkValue,
        removeTaskAttachmentsPkValues,
        isTaskAttachmentsMissingRecords,
        setTaskAttachmentsShouldFetch,
        setTaskAttachmentsFetchMode,
        fetchTaskAttachmentsQuickRefs,
        fetchTaskAttachmentsOne,
        fetchTaskAttachmentsOneWithFkIfk,
        fetchTaskAttachmentsAll,
        fetchTaskAttachmentsPaginated,
    };
};



type UseTaskCommentsWithFetchReturn = {
    taskCommentsSelectors: EntitySelectors<"taskComments">;
    taskCommentsActions: EntityActions<"taskComments">;
    taskCommentsRecords: Record<MatrxRecordId, TaskCommentsData>;
    taskCommentsUnsavedRecords: Record<MatrxRecordId, Partial<TaskCommentsData>>;
    taskCommentsSelectedRecordIds: MatrxRecordId[];
    taskCommentsIsLoading: boolean;
    taskCommentsIsError: boolean;
    taskCommentsQuickRefRecords: QuickReferenceRecord[];
    addTaskCommentsMatrxId: (recordId: MatrxRecordId) => void;
    addTaskCommentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeTaskCommentsMatrxId: (recordId: MatrxRecordId) => void;
    removeTaskCommentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addTaskCommentsPkValue: (pkValue: string) => void;
    addTaskCommentsPkValues: (pkValues: Record<string, unknown>) => void;
    removeTaskCommentsPkValue: (pkValue: string) => void;
    removeTaskCommentsPkValues: (pkValues: Record<string, unknown>) => void;
    isTaskCommentsMissingRecords: boolean;
    setTaskCommentsShouldFetch: (shouldFetch: boolean) => void;
    setTaskCommentsFetchMode: (fetchMode: FetchMode) => void;
    fetchTaskCommentsQuickRefs: () => void;
    fetchTaskCommentsOne: (recordId: MatrxRecordId) => void;
    fetchTaskCommentsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchTaskCommentsAll: () => void;
    fetchTaskCommentsPaginated: (page: number, pageSize: number) => void;
};

export const useTaskCommentsWithFetch = (): UseTaskCommentsWithFetchReturn => {
    const {
        selectors: taskCommentsSelectors,
        actions: taskCommentsActions,
        allRecords: taskCommentsRecords,
        unsavedRecords: taskCommentsUnsavedRecords,
        selectedRecordIds: taskCommentsSelectedRecordIds,
        isLoading: taskCommentsIsLoading,
        isError: taskCommentsIsError,
        quickRefRecords: taskCommentsQuickRefRecords,
        addMatrxId: addTaskCommentsMatrxId,
        addMatrxIds: addTaskCommentsMatrxIds,
        removeMatrxId: removeTaskCommentsMatrxId,
        removeMatrxIds: removeTaskCommentsMatrxIds,
        addPkValue: addTaskCommentsPkValue,
        addPkValues: addTaskCommentsPkValues,
        removePkValue: removeTaskCommentsPkValue,
        removePkValues: removeTaskCommentsPkValues,
        isMissingRecords: isTaskCommentsMissingRecords,
        setShouldFetch: setTaskCommentsShouldFetch,
        setFetchMode: setTaskCommentsFetchMode,
        fetchQuickRefs: fetchTaskCommentsQuickRefs,
        fetchOne: fetchTaskCommentsOne,
        fetchOneWithFkIfk: fetchTaskCommentsOneWithFkIfk,
        fetchAll: fetchTaskCommentsAll,
        fetchPaginated: fetchTaskCommentsPaginated,

    } = useEntityWithFetch("taskComments");

    return {
        taskCommentsSelectors,
        taskCommentsActions,
        taskCommentsRecords,
        taskCommentsUnsavedRecords,
        taskCommentsSelectedRecordIds,
        taskCommentsIsLoading,
        taskCommentsIsError,
        taskCommentsQuickRefRecords,
        addTaskCommentsMatrxId,
        addTaskCommentsMatrxIds,
        removeTaskCommentsMatrxId,
        removeTaskCommentsMatrxIds,
        addTaskCommentsPkValue,
        addTaskCommentsPkValues,
        removeTaskCommentsPkValue,
        removeTaskCommentsPkValues,
        isTaskCommentsMissingRecords,
        setTaskCommentsShouldFetch,
        setTaskCommentsFetchMode,
        fetchTaskCommentsQuickRefs,
        fetchTaskCommentsOne,
        fetchTaskCommentsOneWithFkIfk,
        fetchTaskCommentsAll,
        fetchTaskCommentsPaginated,
    };
};



type UseTasksWithFetchReturn = {
    tasksSelectors: EntitySelectors<"tasks">;
    tasksActions: EntityActions<"tasks">;
    tasksRecords: Record<MatrxRecordId, TasksData>;
    tasksUnsavedRecords: Record<MatrxRecordId, Partial<TasksData>>;
    tasksSelectedRecordIds: MatrxRecordId[];
    tasksIsLoading: boolean;
    tasksIsError: boolean;
    tasksQuickRefRecords: QuickReferenceRecord[];
    addTasksMatrxId: (recordId: MatrxRecordId) => void;
    addTasksMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeTasksMatrxId: (recordId: MatrxRecordId) => void;
    removeTasksMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addTasksPkValue: (pkValue: string) => void;
    addTasksPkValues: (pkValues: Record<string, unknown>) => void;
    removeTasksPkValue: (pkValue: string) => void;
    removeTasksPkValues: (pkValues: Record<string, unknown>) => void;
    isTasksMissingRecords: boolean;
    setTasksShouldFetch: (shouldFetch: boolean) => void;
    setTasksFetchMode: (fetchMode: FetchMode) => void;
    fetchTasksQuickRefs: () => void;
    fetchTasksOne: (recordId: MatrxRecordId) => void;
    fetchTasksOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchTasksAll: () => void;
    fetchTasksPaginated: (page: number, pageSize: number) => void;
};

export const useTasksWithFetch = (): UseTasksWithFetchReturn => {
    const {
        selectors: tasksSelectors,
        actions: tasksActions,
        allRecords: tasksRecords,
        unsavedRecords: tasksUnsavedRecords,
        selectedRecordIds: tasksSelectedRecordIds,
        isLoading: tasksIsLoading,
        isError: tasksIsError,
        quickRefRecords: tasksQuickRefRecords,
        addMatrxId: addTasksMatrxId,
        addMatrxIds: addTasksMatrxIds,
        removeMatrxId: removeTasksMatrxId,
        removeMatrxIds: removeTasksMatrxIds,
        addPkValue: addTasksPkValue,
        addPkValues: addTasksPkValues,
        removePkValue: removeTasksPkValue,
        removePkValues: removeTasksPkValues,
        isMissingRecords: isTasksMissingRecords,
        setShouldFetch: setTasksShouldFetch,
        setFetchMode: setTasksFetchMode,
        fetchQuickRefs: fetchTasksQuickRefs,
        fetchOne: fetchTasksOne,
        fetchOneWithFkIfk: fetchTasksOneWithFkIfk,
        fetchAll: fetchTasksAll,
        fetchPaginated: fetchTasksPaginated,

    } = useEntityWithFetch("tasks");

    return {
        tasksSelectors,
        tasksActions,
        tasksRecords,
        tasksUnsavedRecords,
        tasksSelectedRecordIds,
        tasksIsLoading,
        tasksIsError,
        tasksQuickRefRecords,
        addTasksMatrxId,
        addTasksMatrxIds,
        removeTasksMatrxId,
        removeTasksMatrxIds,
        addTasksPkValue,
        addTasksPkValues,
        removeTasksPkValue,
        removeTasksPkValues,
        isTasksMissingRecords,
        setTasksShouldFetch,
        setTasksFetchMode,
        fetchTasksQuickRefs,
        fetchTasksOne,
        fetchTasksOneWithFkIfk,
        fetchTasksAll,
        fetchTasksPaginated,
    };
};



type UseToolWithFetchReturn = {
    toolSelectors: EntitySelectors<"tool">;
    toolActions: EntityActions<"tool">;
    toolRecords: Record<MatrxRecordId, ToolData>;
    toolUnsavedRecords: Record<MatrxRecordId, Partial<ToolData>>;
    toolSelectedRecordIds: MatrxRecordId[];
    toolIsLoading: boolean;
    toolIsError: boolean;
    toolQuickRefRecords: QuickReferenceRecord[];
    addToolMatrxId: (recordId: MatrxRecordId) => void;
    addToolMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeToolMatrxId: (recordId: MatrxRecordId) => void;
    removeToolMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addToolPkValue: (pkValue: string) => void;
    addToolPkValues: (pkValues: Record<string, unknown>) => void;
    removeToolPkValue: (pkValue: string) => void;
    removeToolPkValues: (pkValues: Record<string, unknown>) => void;
    isToolMissingRecords: boolean;
    setToolShouldFetch: (shouldFetch: boolean) => void;
    setToolFetchMode: (fetchMode: FetchMode) => void;
    fetchToolQuickRefs: () => void;
    fetchToolOne: (recordId: MatrxRecordId) => void;
    fetchToolOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchToolAll: () => void;
    fetchToolPaginated: (page: number, pageSize: number) => void;
};

export const useToolWithFetch = (): UseToolWithFetchReturn => {
    const {
        selectors: toolSelectors,
        actions: toolActions,
        allRecords: toolRecords,
        unsavedRecords: toolUnsavedRecords,
        selectedRecordIds: toolSelectedRecordIds,
        isLoading: toolIsLoading,
        isError: toolIsError,
        quickRefRecords: toolQuickRefRecords,
        addMatrxId: addToolMatrxId,
        addMatrxIds: addToolMatrxIds,
        removeMatrxId: removeToolMatrxId,
        removeMatrxIds: removeToolMatrxIds,
        addPkValue: addToolPkValue,
        addPkValues: addToolPkValues,
        removePkValue: removeToolPkValue,
        removePkValues: removeToolPkValues,
        isMissingRecords: isToolMissingRecords,
        setShouldFetch: setToolShouldFetch,
        setFetchMode: setToolFetchMode,
        fetchQuickRefs: fetchToolQuickRefs,
        fetchOne: fetchToolOne,
        fetchOneWithFkIfk: fetchToolOneWithFkIfk,
        fetchAll: fetchToolAll,
        fetchPaginated: fetchToolPaginated,

    } = useEntityWithFetch("tool");

    return {
        toolSelectors,
        toolActions,
        toolRecords,
        toolUnsavedRecords,
        toolSelectedRecordIds,
        toolIsLoading,
        toolIsError,
        toolQuickRefRecords,
        addToolMatrxId,
        addToolMatrxIds,
        removeToolMatrxId,
        removeToolMatrxIds,
        addToolPkValue,
        addToolPkValues,
        removeToolPkValue,
        removeToolPkValues,
        isToolMissingRecords,
        setToolShouldFetch,
        setToolFetchMode,
        fetchToolQuickRefs,
        fetchToolOne,
        fetchToolOneWithFkIfk,
        fetchToolAll,
        fetchToolPaginated,
    };
};



type UseTransformerWithFetchReturn = {
    transformerSelectors: EntitySelectors<"transformer">;
    transformerActions: EntityActions<"transformer">;
    transformerRecords: Record<MatrxRecordId, TransformerData>;
    transformerUnsavedRecords: Record<MatrxRecordId, Partial<TransformerData>>;
    transformerSelectedRecordIds: MatrxRecordId[];
    transformerIsLoading: boolean;
    transformerIsError: boolean;
    transformerQuickRefRecords: QuickReferenceRecord[];
    addTransformerMatrxId: (recordId: MatrxRecordId) => void;
    addTransformerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeTransformerMatrxId: (recordId: MatrxRecordId) => void;
    removeTransformerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addTransformerPkValue: (pkValue: string) => void;
    addTransformerPkValues: (pkValues: Record<string, unknown>) => void;
    removeTransformerPkValue: (pkValue: string) => void;
    removeTransformerPkValues: (pkValues: Record<string, unknown>) => void;
    isTransformerMissingRecords: boolean;
    setTransformerShouldFetch: (shouldFetch: boolean) => void;
    setTransformerFetchMode: (fetchMode: FetchMode) => void;
    fetchTransformerQuickRefs: () => void;
    fetchTransformerOne: (recordId: MatrxRecordId) => void;
    fetchTransformerOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchTransformerAll: () => void;
    fetchTransformerPaginated: (page: number, pageSize: number) => void;
};

export const useTransformerWithFetch = (): UseTransformerWithFetchReturn => {
    const {
        selectors: transformerSelectors,
        actions: transformerActions,
        allRecords: transformerRecords,
        unsavedRecords: transformerUnsavedRecords,
        selectedRecordIds: transformerSelectedRecordIds,
        isLoading: transformerIsLoading,
        isError: transformerIsError,
        quickRefRecords: transformerQuickRefRecords,
        addMatrxId: addTransformerMatrxId,
        addMatrxIds: addTransformerMatrxIds,
        removeMatrxId: removeTransformerMatrxId,
        removeMatrxIds: removeTransformerMatrxIds,
        addPkValue: addTransformerPkValue,
        addPkValues: addTransformerPkValues,
        removePkValue: removeTransformerPkValue,
        removePkValues: removeTransformerPkValues,
        isMissingRecords: isTransformerMissingRecords,
        setShouldFetch: setTransformerShouldFetch,
        setFetchMode: setTransformerFetchMode,
        fetchQuickRefs: fetchTransformerQuickRefs,
        fetchOne: fetchTransformerOne,
        fetchOneWithFkIfk: fetchTransformerOneWithFkIfk,
        fetchAll: fetchTransformerAll,
        fetchPaginated: fetchTransformerPaginated,

    } = useEntityWithFetch("transformer");

    return {
        transformerSelectors,
        transformerActions,
        transformerRecords,
        transformerUnsavedRecords,
        transformerSelectedRecordIds,
        transformerIsLoading,
        transformerIsError,
        transformerQuickRefRecords,
        addTransformerMatrxId,
        addTransformerMatrxIds,
        removeTransformerMatrxId,
        removeTransformerMatrxIds,
        addTransformerPkValue,
        addTransformerPkValues,
        removeTransformerPkValue,
        removeTransformerPkValues,
        isTransformerMissingRecords,
        setTransformerShouldFetch,
        setTransformerFetchMode,
        fetchTransformerQuickRefs,
        fetchTransformerOne,
        fetchTransformerOneWithFkIfk,
        fetchTransformerAll,
        fetchTransformerPaginated,
    };
};



type UseUserListItemsWithFetchReturn = {
    userListItemsSelectors: EntitySelectors<"userListItems">;
    userListItemsActions: EntityActions<"userListItems">;
    userListItemsRecords: Record<MatrxRecordId, UserListItemsData>;
    userListItemsUnsavedRecords: Record<MatrxRecordId, Partial<UserListItemsData>>;
    userListItemsSelectedRecordIds: MatrxRecordId[];
    userListItemsIsLoading: boolean;
    userListItemsIsError: boolean;
    userListItemsQuickRefRecords: QuickReferenceRecord[];
    addUserListItemsMatrxId: (recordId: MatrxRecordId) => void;
    addUserListItemsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeUserListItemsMatrxId: (recordId: MatrxRecordId) => void;
    removeUserListItemsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addUserListItemsPkValue: (pkValue: string) => void;
    addUserListItemsPkValues: (pkValues: Record<string, unknown>) => void;
    removeUserListItemsPkValue: (pkValue: string) => void;
    removeUserListItemsPkValues: (pkValues: Record<string, unknown>) => void;
    isUserListItemsMissingRecords: boolean;
    setUserListItemsShouldFetch: (shouldFetch: boolean) => void;
    setUserListItemsFetchMode: (fetchMode: FetchMode) => void;
    fetchUserListItemsQuickRefs: () => void;
    fetchUserListItemsOne: (recordId: MatrxRecordId) => void;
    fetchUserListItemsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchUserListItemsAll: () => void;
    fetchUserListItemsPaginated: (page: number, pageSize: number) => void;
};

export const useUserListItemsWithFetch = (): UseUserListItemsWithFetchReturn => {
    const {
        selectors: userListItemsSelectors,
        actions: userListItemsActions,
        allRecords: userListItemsRecords,
        unsavedRecords: userListItemsUnsavedRecords,
        selectedRecordIds: userListItemsSelectedRecordIds,
        isLoading: userListItemsIsLoading,
        isError: userListItemsIsError,
        quickRefRecords: userListItemsQuickRefRecords,
        addMatrxId: addUserListItemsMatrxId,
        addMatrxIds: addUserListItemsMatrxIds,
        removeMatrxId: removeUserListItemsMatrxId,
        removeMatrxIds: removeUserListItemsMatrxIds,
        addPkValue: addUserListItemsPkValue,
        addPkValues: addUserListItemsPkValues,
        removePkValue: removeUserListItemsPkValue,
        removePkValues: removeUserListItemsPkValues,
        isMissingRecords: isUserListItemsMissingRecords,
        setShouldFetch: setUserListItemsShouldFetch,
        setFetchMode: setUserListItemsFetchMode,
        fetchQuickRefs: fetchUserListItemsQuickRefs,
        fetchOne: fetchUserListItemsOne,
        fetchOneWithFkIfk: fetchUserListItemsOneWithFkIfk,
        fetchAll: fetchUserListItemsAll,
        fetchPaginated: fetchUserListItemsPaginated,

    } = useEntityWithFetch("userListItems");

    return {
        userListItemsSelectors,
        userListItemsActions,
        userListItemsRecords,
        userListItemsUnsavedRecords,
        userListItemsSelectedRecordIds,
        userListItemsIsLoading,
        userListItemsIsError,
        userListItemsQuickRefRecords,
        addUserListItemsMatrxId,
        addUserListItemsMatrxIds,
        removeUserListItemsMatrxId,
        removeUserListItemsMatrxIds,
        addUserListItemsPkValue,
        addUserListItemsPkValues,
        removeUserListItemsPkValue,
        removeUserListItemsPkValues,
        isUserListItemsMissingRecords,
        setUserListItemsShouldFetch,
        setUserListItemsFetchMode,
        fetchUserListItemsQuickRefs,
        fetchUserListItemsOne,
        fetchUserListItemsOneWithFkIfk,
        fetchUserListItemsAll,
        fetchUserListItemsPaginated,
    };
};



type UseUserListsWithFetchReturn = {
    userListsSelectors: EntitySelectors<"userLists">;
    userListsActions: EntityActions<"userLists">;
    userListsRecords: Record<MatrxRecordId, UserListsData>;
    userListsUnsavedRecords: Record<MatrxRecordId, Partial<UserListsData>>;
    userListsSelectedRecordIds: MatrxRecordId[];
    userListsIsLoading: boolean;
    userListsIsError: boolean;
    userListsQuickRefRecords: QuickReferenceRecord[];
    addUserListsMatrxId: (recordId: MatrxRecordId) => void;
    addUserListsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeUserListsMatrxId: (recordId: MatrxRecordId) => void;
    removeUserListsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addUserListsPkValue: (pkValue: string) => void;
    addUserListsPkValues: (pkValues: Record<string, unknown>) => void;
    removeUserListsPkValue: (pkValue: string) => void;
    removeUserListsPkValues: (pkValues: Record<string, unknown>) => void;
    isUserListsMissingRecords: boolean;
    setUserListsShouldFetch: (shouldFetch: boolean) => void;
    setUserListsFetchMode: (fetchMode: FetchMode) => void;
    fetchUserListsQuickRefs: () => void;
    fetchUserListsOne: (recordId: MatrxRecordId) => void;
    fetchUserListsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchUserListsAll: () => void;
    fetchUserListsPaginated: (page: number, pageSize: number) => void;
};

export const useUserListsWithFetch = (): UseUserListsWithFetchReturn => {
    const {
        selectors: userListsSelectors,
        actions: userListsActions,
        allRecords: userListsRecords,
        unsavedRecords: userListsUnsavedRecords,
        selectedRecordIds: userListsSelectedRecordIds,
        isLoading: userListsIsLoading,
        isError: userListsIsError,
        quickRefRecords: userListsQuickRefRecords,
        addMatrxId: addUserListsMatrxId,
        addMatrxIds: addUserListsMatrxIds,
        removeMatrxId: removeUserListsMatrxId,
        removeMatrxIds: removeUserListsMatrxIds,
        addPkValue: addUserListsPkValue,
        addPkValues: addUserListsPkValues,
        removePkValue: removeUserListsPkValue,
        removePkValues: removeUserListsPkValues,
        isMissingRecords: isUserListsMissingRecords,
        setShouldFetch: setUserListsShouldFetch,
        setFetchMode: setUserListsFetchMode,
        fetchQuickRefs: fetchUserListsQuickRefs,
        fetchOne: fetchUserListsOne,
        fetchOneWithFkIfk: fetchUserListsOneWithFkIfk,
        fetchAll: fetchUserListsAll,
        fetchPaginated: fetchUserListsPaginated,

    } = useEntityWithFetch("userLists");

    return {
        userListsSelectors,
        userListsActions,
        userListsRecords,
        userListsUnsavedRecords,
        userListsSelectedRecordIds,
        userListsIsLoading,
        userListsIsError,
        userListsQuickRefRecords,
        addUserListsMatrxId,
        addUserListsMatrxIds,
        removeUserListsMatrxId,
        removeUserListsMatrxIds,
        addUserListsPkValue,
        addUserListsPkValues,
        removeUserListsPkValue,
        removeUserListsPkValues,
        isUserListsMissingRecords,
        setUserListsShouldFetch,
        setUserListsFetchMode,
        fetchUserListsQuickRefs,
        fetchUserListsOne,
        fetchUserListsOneWithFkIfk,
        fetchUserListsAll,
        fetchUserListsPaginated,
    };
};



type UseUserPreferencesWithFetchReturn = {
    userPreferencesSelectors: EntitySelectors<"userPreferences">;
    userPreferencesActions: EntityActions<"userPreferences">;
    userPreferencesRecords: Record<MatrxRecordId, UserPreferencesData>;
    userPreferencesUnsavedRecords: Record<MatrxRecordId, Partial<UserPreferencesData>>;
    userPreferencesSelectedRecordIds: MatrxRecordId[];
    userPreferencesIsLoading: boolean;
    userPreferencesIsError: boolean;
    userPreferencesQuickRefRecords: QuickReferenceRecord[];
    addUserPreferencesMatrxId: (recordId: MatrxRecordId) => void;
    addUserPreferencesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeUserPreferencesMatrxId: (recordId: MatrxRecordId) => void;
    removeUserPreferencesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addUserPreferencesPkValue: (pkValue: string) => void;
    addUserPreferencesPkValues: (pkValues: Record<string, unknown>) => void;
    removeUserPreferencesPkValue: (pkValue: string) => void;
    removeUserPreferencesPkValues: (pkValues: Record<string, unknown>) => void;
    isUserPreferencesMissingRecords: boolean;
    setUserPreferencesShouldFetch: (shouldFetch: boolean) => void;
    setUserPreferencesFetchMode: (fetchMode: FetchMode) => void;
    fetchUserPreferencesQuickRefs: () => void;
    fetchUserPreferencesOne: (recordId: MatrxRecordId) => void;
    fetchUserPreferencesOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchUserPreferencesAll: () => void;
    fetchUserPreferencesPaginated: (page: number, pageSize: number) => void;
};

export const useUserPreferencesWithFetch = (): UseUserPreferencesWithFetchReturn => {
    const {
        selectors: userPreferencesSelectors,
        actions: userPreferencesActions,
        allRecords: userPreferencesRecords,
        unsavedRecords: userPreferencesUnsavedRecords,
        selectedRecordIds: userPreferencesSelectedRecordIds,
        isLoading: userPreferencesIsLoading,
        isError: userPreferencesIsError,
        quickRefRecords: userPreferencesQuickRefRecords,
        addMatrxId: addUserPreferencesMatrxId,
        addMatrxIds: addUserPreferencesMatrxIds,
        removeMatrxId: removeUserPreferencesMatrxId,
        removeMatrxIds: removeUserPreferencesMatrxIds,
        addPkValue: addUserPreferencesPkValue,
        addPkValues: addUserPreferencesPkValues,
        removePkValue: removeUserPreferencesPkValue,
        removePkValues: removeUserPreferencesPkValues,
        isMissingRecords: isUserPreferencesMissingRecords,
        setShouldFetch: setUserPreferencesShouldFetch,
        setFetchMode: setUserPreferencesFetchMode,
        fetchQuickRefs: fetchUserPreferencesQuickRefs,
        fetchOne: fetchUserPreferencesOne,
        fetchOneWithFkIfk: fetchUserPreferencesOneWithFkIfk,
        fetchAll: fetchUserPreferencesAll,
        fetchPaginated: fetchUserPreferencesPaginated,

    } = useEntityWithFetch("userPreferences");

    return {
        userPreferencesSelectors,
        userPreferencesActions,
        userPreferencesRecords,
        userPreferencesUnsavedRecords,
        userPreferencesSelectedRecordIds,
        userPreferencesIsLoading,
        userPreferencesIsError,
        userPreferencesQuickRefRecords,
        addUserPreferencesMatrxId,
        addUserPreferencesMatrxIds,
        removeUserPreferencesMatrxId,
        removeUserPreferencesMatrxIds,
        addUserPreferencesPkValue,
        addUserPreferencesPkValues,
        removeUserPreferencesPkValue,
        removeUserPreferencesPkValues,
        isUserPreferencesMissingRecords,
        setUserPreferencesShouldFetch,
        setUserPreferencesFetchMode,
        fetchUserPreferencesQuickRefs,
        fetchUserPreferencesOne,
        fetchUserPreferencesOneWithFkIfk,
        fetchUserPreferencesAll,
        fetchUserPreferencesPaginated,
    };
};



type UseUserTablesWithFetchReturn = {
    userTablesSelectors: EntitySelectors<"userTables">;
    userTablesActions: EntityActions<"userTables">;
    userTablesRecords: Record<MatrxRecordId, UserTablesData>;
    userTablesUnsavedRecords: Record<MatrxRecordId, Partial<UserTablesData>>;
    userTablesSelectedRecordIds: MatrxRecordId[];
    userTablesIsLoading: boolean;
    userTablesIsError: boolean;
    userTablesQuickRefRecords: QuickReferenceRecord[];
    addUserTablesMatrxId: (recordId: MatrxRecordId) => void;
    addUserTablesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeUserTablesMatrxId: (recordId: MatrxRecordId) => void;
    removeUserTablesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addUserTablesPkValue: (pkValue: string) => void;
    addUserTablesPkValues: (pkValues: Record<string, unknown>) => void;
    removeUserTablesPkValue: (pkValue: string) => void;
    removeUserTablesPkValues: (pkValues: Record<string, unknown>) => void;
    isUserTablesMissingRecords: boolean;
    setUserTablesShouldFetch: (shouldFetch: boolean) => void;
    setUserTablesFetchMode: (fetchMode: FetchMode) => void;
    fetchUserTablesQuickRefs: () => void;
    fetchUserTablesOne: (recordId: MatrxRecordId) => void;
    fetchUserTablesOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchUserTablesAll: () => void;
    fetchUserTablesPaginated: (page: number, pageSize: number) => void;
};

export const useUserTablesWithFetch = (): UseUserTablesWithFetchReturn => {
    const {
        selectors: userTablesSelectors,
        actions: userTablesActions,
        allRecords: userTablesRecords,
        unsavedRecords: userTablesUnsavedRecords,
        selectedRecordIds: userTablesSelectedRecordIds,
        isLoading: userTablesIsLoading,
        isError: userTablesIsError,
        quickRefRecords: userTablesQuickRefRecords,
        addMatrxId: addUserTablesMatrxId,
        addMatrxIds: addUserTablesMatrxIds,
        removeMatrxId: removeUserTablesMatrxId,
        removeMatrxIds: removeUserTablesMatrxIds,
        addPkValue: addUserTablesPkValue,
        addPkValues: addUserTablesPkValues,
        removePkValue: removeUserTablesPkValue,
        removePkValues: removeUserTablesPkValues,
        isMissingRecords: isUserTablesMissingRecords,
        setShouldFetch: setUserTablesShouldFetch,
        setFetchMode: setUserTablesFetchMode,
        fetchQuickRefs: fetchUserTablesQuickRefs,
        fetchOne: fetchUserTablesOne,
        fetchOneWithFkIfk: fetchUserTablesOneWithFkIfk,
        fetchAll: fetchUserTablesAll,
        fetchPaginated: fetchUserTablesPaginated,

    } = useEntityWithFetch("userTables");

    return {
        userTablesSelectors,
        userTablesActions,
        userTablesRecords,
        userTablesUnsavedRecords,
        userTablesSelectedRecordIds,
        userTablesIsLoading,
        userTablesIsError,
        userTablesQuickRefRecords,
        addUserTablesMatrxId,
        addUserTablesMatrxIds,
        removeUserTablesMatrxId,
        removeUserTablesMatrxIds,
        addUserTablesPkValue,
        addUserTablesPkValues,
        removeUserTablesPkValue,
        removeUserTablesPkValues,
        isUserTablesMissingRecords,
        setUserTablesShouldFetch,
        setUserTablesFetchMode,
        fetchUserTablesQuickRefs,
        fetchUserTablesOne,
        fetchUserTablesOneWithFkIfk,
        fetchUserTablesAll,
        fetchUserTablesPaginated,
    };
};



type UseWcClaimWithFetchReturn = {
    wcClaimSelectors: EntitySelectors<"wcClaim">;
    wcClaimActions: EntityActions<"wcClaim">;
    wcClaimRecords: Record<MatrxRecordId, WcClaimData>;
    wcClaimUnsavedRecords: Record<MatrxRecordId, Partial<WcClaimData>>;
    wcClaimSelectedRecordIds: MatrxRecordId[];
    wcClaimIsLoading: boolean;
    wcClaimIsError: boolean;
    wcClaimQuickRefRecords: QuickReferenceRecord[];
    addWcClaimMatrxId: (recordId: MatrxRecordId) => void;
    addWcClaimMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWcClaimMatrxId: (recordId: MatrxRecordId) => void;
    removeWcClaimMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWcClaimPkValue: (pkValue: string) => void;
    addWcClaimPkValues: (pkValues: Record<string, unknown>) => void;
    removeWcClaimPkValue: (pkValue: string) => void;
    removeWcClaimPkValues: (pkValues: Record<string, unknown>) => void;
    isWcClaimMissingRecords: boolean;
    setWcClaimShouldFetch: (shouldFetch: boolean) => void;
    setWcClaimFetchMode: (fetchMode: FetchMode) => void;
    fetchWcClaimQuickRefs: () => void;
    fetchWcClaimOne: (recordId: MatrxRecordId) => void;
    fetchWcClaimOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWcClaimAll: () => void;
    fetchWcClaimPaginated: (page: number, pageSize: number) => void;
};

export const useWcClaimWithFetch = (): UseWcClaimWithFetchReturn => {
    const {
        selectors: wcClaimSelectors,
        actions: wcClaimActions,
        allRecords: wcClaimRecords,
        unsavedRecords: wcClaimUnsavedRecords,
        selectedRecordIds: wcClaimSelectedRecordIds,
        isLoading: wcClaimIsLoading,
        isError: wcClaimIsError,
        quickRefRecords: wcClaimQuickRefRecords,
        addMatrxId: addWcClaimMatrxId,
        addMatrxIds: addWcClaimMatrxIds,
        removeMatrxId: removeWcClaimMatrxId,
        removeMatrxIds: removeWcClaimMatrxIds,
        addPkValue: addWcClaimPkValue,
        addPkValues: addWcClaimPkValues,
        removePkValue: removeWcClaimPkValue,
        removePkValues: removeWcClaimPkValues,
        isMissingRecords: isWcClaimMissingRecords,
        setShouldFetch: setWcClaimShouldFetch,
        setFetchMode: setWcClaimFetchMode,
        fetchQuickRefs: fetchWcClaimQuickRefs,
        fetchOne: fetchWcClaimOne,
        fetchOneWithFkIfk: fetchWcClaimOneWithFkIfk,
        fetchAll: fetchWcClaimAll,
        fetchPaginated: fetchWcClaimPaginated,

    } = useEntityWithFetch("wcClaim");

    return {
        wcClaimSelectors,
        wcClaimActions,
        wcClaimRecords,
        wcClaimUnsavedRecords,
        wcClaimSelectedRecordIds,
        wcClaimIsLoading,
        wcClaimIsError,
        wcClaimQuickRefRecords,
        addWcClaimMatrxId,
        addWcClaimMatrxIds,
        removeWcClaimMatrxId,
        removeWcClaimMatrxIds,
        addWcClaimPkValue,
        addWcClaimPkValues,
        removeWcClaimPkValue,
        removeWcClaimPkValues,
        isWcClaimMissingRecords,
        setWcClaimShouldFetch,
        setWcClaimFetchMode,
        fetchWcClaimQuickRefs,
        fetchWcClaimOne,
        fetchWcClaimOneWithFkIfk,
        fetchWcClaimAll,
        fetchWcClaimPaginated,
    };
};



type UseWcImpairmentDefinitionWithFetchReturn = {
    wcImpairmentDefinitionSelectors: EntitySelectors<"wcImpairmentDefinition">;
    wcImpairmentDefinitionActions: EntityActions<"wcImpairmentDefinition">;
    wcImpairmentDefinitionRecords: Record<MatrxRecordId, WcImpairmentDefinitionData>;
    wcImpairmentDefinitionUnsavedRecords: Record<MatrxRecordId, Partial<WcImpairmentDefinitionData>>;
    wcImpairmentDefinitionSelectedRecordIds: MatrxRecordId[];
    wcImpairmentDefinitionIsLoading: boolean;
    wcImpairmentDefinitionIsError: boolean;
    wcImpairmentDefinitionQuickRefRecords: QuickReferenceRecord[];
    addWcImpairmentDefinitionMatrxId: (recordId: MatrxRecordId) => void;
    addWcImpairmentDefinitionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWcImpairmentDefinitionMatrxId: (recordId: MatrxRecordId) => void;
    removeWcImpairmentDefinitionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWcImpairmentDefinitionPkValue: (pkValue: string) => void;
    addWcImpairmentDefinitionPkValues: (pkValues: Record<string, unknown>) => void;
    removeWcImpairmentDefinitionPkValue: (pkValue: string) => void;
    removeWcImpairmentDefinitionPkValues: (pkValues: Record<string, unknown>) => void;
    isWcImpairmentDefinitionMissingRecords: boolean;
    setWcImpairmentDefinitionShouldFetch: (shouldFetch: boolean) => void;
    setWcImpairmentDefinitionFetchMode: (fetchMode: FetchMode) => void;
    fetchWcImpairmentDefinitionQuickRefs: () => void;
    fetchWcImpairmentDefinitionOne: (recordId: MatrxRecordId) => void;
    fetchWcImpairmentDefinitionOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWcImpairmentDefinitionAll: () => void;
    fetchWcImpairmentDefinitionPaginated: (page: number, pageSize: number) => void;
};

export const useWcImpairmentDefinitionWithFetch = (): UseWcImpairmentDefinitionWithFetchReturn => {
    const {
        selectors: wcImpairmentDefinitionSelectors,
        actions: wcImpairmentDefinitionActions,
        allRecords: wcImpairmentDefinitionRecords,
        unsavedRecords: wcImpairmentDefinitionUnsavedRecords,
        selectedRecordIds: wcImpairmentDefinitionSelectedRecordIds,
        isLoading: wcImpairmentDefinitionIsLoading,
        isError: wcImpairmentDefinitionIsError,
        quickRefRecords: wcImpairmentDefinitionQuickRefRecords,
        addMatrxId: addWcImpairmentDefinitionMatrxId,
        addMatrxIds: addWcImpairmentDefinitionMatrxIds,
        removeMatrxId: removeWcImpairmentDefinitionMatrxId,
        removeMatrxIds: removeWcImpairmentDefinitionMatrxIds,
        addPkValue: addWcImpairmentDefinitionPkValue,
        addPkValues: addWcImpairmentDefinitionPkValues,
        removePkValue: removeWcImpairmentDefinitionPkValue,
        removePkValues: removeWcImpairmentDefinitionPkValues,
        isMissingRecords: isWcImpairmentDefinitionMissingRecords,
        setShouldFetch: setWcImpairmentDefinitionShouldFetch,
        setFetchMode: setWcImpairmentDefinitionFetchMode,
        fetchQuickRefs: fetchWcImpairmentDefinitionQuickRefs,
        fetchOne: fetchWcImpairmentDefinitionOne,
        fetchOneWithFkIfk: fetchWcImpairmentDefinitionOneWithFkIfk,
        fetchAll: fetchWcImpairmentDefinitionAll,
        fetchPaginated: fetchWcImpairmentDefinitionPaginated,

    } = useEntityWithFetch("wcImpairmentDefinition");

    return {
        wcImpairmentDefinitionSelectors,
        wcImpairmentDefinitionActions,
        wcImpairmentDefinitionRecords,
        wcImpairmentDefinitionUnsavedRecords,
        wcImpairmentDefinitionSelectedRecordIds,
        wcImpairmentDefinitionIsLoading,
        wcImpairmentDefinitionIsError,
        wcImpairmentDefinitionQuickRefRecords,
        addWcImpairmentDefinitionMatrxId,
        addWcImpairmentDefinitionMatrxIds,
        removeWcImpairmentDefinitionMatrxId,
        removeWcImpairmentDefinitionMatrxIds,
        addWcImpairmentDefinitionPkValue,
        addWcImpairmentDefinitionPkValues,
        removeWcImpairmentDefinitionPkValue,
        removeWcImpairmentDefinitionPkValues,
        isWcImpairmentDefinitionMissingRecords,
        setWcImpairmentDefinitionShouldFetch,
        setWcImpairmentDefinitionFetchMode,
        fetchWcImpairmentDefinitionQuickRefs,
        fetchWcImpairmentDefinitionOne,
        fetchWcImpairmentDefinitionOneWithFkIfk,
        fetchWcImpairmentDefinitionAll,
        fetchWcImpairmentDefinitionPaginated,
    };
};



type UseWcInjuryWithFetchReturn = {
    wcInjurySelectors: EntitySelectors<"wcInjury">;
    wcInjuryActions: EntityActions<"wcInjury">;
    wcInjuryRecords: Record<MatrxRecordId, WcInjuryData>;
    wcInjuryUnsavedRecords: Record<MatrxRecordId, Partial<WcInjuryData>>;
    wcInjurySelectedRecordIds: MatrxRecordId[];
    wcInjuryIsLoading: boolean;
    wcInjuryIsError: boolean;
    wcInjuryQuickRefRecords: QuickReferenceRecord[];
    addWcInjuryMatrxId: (recordId: MatrxRecordId) => void;
    addWcInjuryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWcInjuryMatrxId: (recordId: MatrxRecordId) => void;
    removeWcInjuryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWcInjuryPkValue: (pkValue: string) => void;
    addWcInjuryPkValues: (pkValues: Record<string, unknown>) => void;
    removeWcInjuryPkValue: (pkValue: string) => void;
    removeWcInjuryPkValues: (pkValues: Record<string, unknown>) => void;
    isWcInjuryMissingRecords: boolean;
    setWcInjuryShouldFetch: (shouldFetch: boolean) => void;
    setWcInjuryFetchMode: (fetchMode: FetchMode) => void;
    fetchWcInjuryQuickRefs: () => void;
    fetchWcInjuryOne: (recordId: MatrxRecordId) => void;
    fetchWcInjuryOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWcInjuryAll: () => void;
    fetchWcInjuryPaginated: (page: number, pageSize: number) => void;
};

export const useWcInjuryWithFetch = (): UseWcInjuryWithFetchReturn => {
    const {
        selectors: wcInjurySelectors,
        actions: wcInjuryActions,
        allRecords: wcInjuryRecords,
        unsavedRecords: wcInjuryUnsavedRecords,
        selectedRecordIds: wcInjurySelectedRecordIds,
        isLoading: wcInjuryIsLoading,
        isError: wcInjuryIsError,
        quickRefRecords: wcInjuryQuickRefRecords,
        addMatrxId: addWcInjuryMatrxId,
        addMatrxIds: addWcInjuryMatrxIds,
        removeMatrxId: removeWcInjuryMatrxId,
        removeMatrxIds: removeWcInjuryMatrxIds,
        addPkValue: addWcInjuryPkValue,
        addPkValues: addWcInjuryPkValues,
        removePkValue: removeWcInjuryPkValue,
        removePkValues: removeWcInjuryPkValues,
        isMissingRecords: isWcInjuryMissingRecords,
        setShouldFetch: setWcInjuryShouldFetch,
        setFetchMode: setWcInjuryFetchMode,
        fetchQuickRefs: fetchWcInjuryQuickRefs,
        fetchOne: fetchWcInjuryOne,
        fetchOneWithFkIfk: fetchWcInjuryOneWithFkIfk,
        fetchAll: fetchWcInjuryAll,
        fetchPaginated: fetchWcInjuryPaginated,

    } = useEntityWithFetch("wcInjury");

    return {
        wcInjurySelectors,
        wcInjuryActions,
        wcInjuryRecords,
        wcInjuryUnsavedRecords,
        wcInjurySelectedRecordIds,
        wcInjuryIsLoading,
        wcInjuryIsError,
        wcInjuryQuickRefRecords,
        addWcInjuryMatrxId,
        addWcInjuryMatrxIds,
        removeWcInjuryMatrxId,
        removeWcInjuryMatrxIds,
        addWcInjuryPkValue,
        addWcInjuryPkValues,
        removeWcInjuryPkValue,
        removeWcInjuryPkValues,
        isWcInjuryMissingRecords,
        setWcInjuryShouldFetch,
        setWcInjuryFetchMode,
        fetchWcInjuryQuickRefs,
        fetchWcInjuryOne,
        fetchWcInjuryOneWithFkIfk,
        fetchWcInjuryAll,
        fetchWcInjuryPaginated,
    };
};



type UseWcReportWithFetchReturn = {
    wcReportSelectors: EntitySelectors<"wcReport">;
    wcReportActions: EntityActions<"wcReport">;
    wcReportRecords: Record<MatrxRecordId, WcReportData>;
    wcReportUnsavedRecords: Record<MatrxRecordId, Partial<WcReportData>>;
    wcReportSelectedRecordIds: MatrxRecordId[];
    wcReportIsLoading: boolean;
    wcReportIsError: boolean;
    wcReportQuickRefRecords: QuickReferenceRecord[];
    addWcReportMatrxId: (recordId: MatrxRecordId) => void;
    addWcReportMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWcReportMatrxId: (recordId: MatrxRecordId) => void;
    removeWcReportMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWcReportPkValue: (pkValue: string) => void;
    addWcReportPkValues: (pkValues: Record<string, unknown>) => void;
    removeWcReportPkValue: (pkValue: string) => void;
    removeWcReportPkValues: (pkValues: Record<string, unknown>) => void;
    isWcReportMissingRecords: boolean;
    setWcReportShouldFetch: (shouldFetch: boolean) => void;
    setWcReportFetchMode: (fetchMode: FetchMode) => void;
    fetchWcReportQuickRefs: () => void;
    fetchWcReportOne: (recordId: MatrxRecordId) => void;
    fetchWcReportOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWcReportAll: () => void;
    fetchWcReportPaginated: (page: number, pageSize: number) => void;
};

export const useWcReportWithFetch = (): UseWcReportWithFetchReturn => {
    const {
        selectors: wcReportSelectors,
        actions: wcReportActions,
        allRecords: wcReportRecords,
        unsavedRecords: wcReportUnsavedRecords,
        selectedRecordIds: wcReportSelectedRecordIds,
        isLoading: wcReportIsLoading,
        isError: wcReportIsError,
        quickRefRecords: wcReportQuickRefRecords,
        addMatrxId: addWcReportMatrxId,
        addMatrxIds: addWcReportMatrxIds,
        removeMatrxId: removeWcReportMatrxId,
        removeMatrxIds: removeWcReportMatrxIds,
        addPkValue: addWcReportPkValue,
        addPkValues: addWcReportPkValues,
        removePkValue: removeWcReportPkValue,
        removePkValues: removeWcReportPkValues,
        isMissingRecords: isWcReportMissingRecords,
        setShouldFetch: setWcReportShouldFetch,
        setFetchMode: setWcReportFetchMode,
        fetchQuickRefs: fetchWcReportQuickRefs,
        fetchOne: fetchWcReportOne,
        fetchOneWithFkIfk: fetchWcReportOneWithFkIfk,
        fetchAll: fetchWcReportAll,
        fetchPaginated: fetchWcReportPaginated,

    } = useEntityWithFetch("wcReport");

    return {
        wcReportSelectors,
        wcReportActions,
        wcReportRecords,
        wcReportUnsavedRecords,
        wcReportSelectedRecordIds,
        wcReportIsLoading,
        wcReportIsError,
        wcReportQuickRefRecords,
        addWcReportMatrxId,
        addWcReportMatrxIds,
        removeWcReportMatrxId,
        removeWcReportMatrxIds,
        addWcReportPkValue,
        addWcReportPkValues,
        removeWcReportPkValue,
        removeWcReportPkValues,
        isWcReportMissingRecords,
        setWcReportShouldFetch,
        setWcReportFetchMode,
        fetchWcReportQuickRefs,
        fetchWcReportOne,
        fetchWcReportOneWithFkIfk,
        fetchWcReportAll,
        fetchWcReportPaginated,
    };
};



type UseWorkflowWithFetchReturn = {
    workflowSelectors: EntitySelectors<"workflow">;
    workflowActions: EntityActions<"workflow">;
    workflowRecords: Record<MatrxRecordId, WorkflowData>;
    workflowUnsavedRecords: Record<MatrxRecordId, Partial<WorkflowData>>;
    workflowSelectedRecordIds: MatrxRecordId[];
    workflowIsLoading: boolean;
    workflowIsError: boolean;
    workflowQuickRefRecords: QuickReferenceRecord[];
    addWorkflowMatrxId: (recordId: MatrxRecordId) => void;
    addWorkflowMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWorkflowMatrxId: (recordId: MatrxRecordId) => void;
    removeWorkflowMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWorkflowPkValue: (pkValue: string) => void;
    addWorkflowPkValues: (pkValues: Record<string, unknown>) => void;
    removeWorkflowPkValue: (pkValue: string) => void;
    removeWorkflowPkValues: (pkValues: Record<string, unknown>) => void;
    isWorkflowMissingRecords: boolean;
    setWorkflowShouldFetch: (shouldFetch: boolean) => void;
    setWorkflowFetchMode: (fetchMode: FetchMode) => void;
    fetchWorkflowQuickRefs: () => void;
    fetchWorkflowOne: (recordId: MatrxRecordId) => void;
    fetchWorkflowOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWorkflowAll: () => void;
    fetchWorkflowPaginated: (page: number, pageSize: number) => void;
};

export const useWorkflowWithFetch = (): UseWorkflowWithFetchReturn => {
    const {
        selectors: workflowSelectors,
        actions: workflowActions,
        allRecords: workflowRecords,
        unsavedRecords: workflowUnsavedRecords,
        selectedRecordIds: workflowSelectedRecordIds,
        isLoading: workflowIsLoading,
        isError: workflowIsError,
        quickRefRecords: workflowQuickRefRecords,
        addMatrxId: addWorkflowMatrxId,
        addMatrxIds: addWorkflowMatrxIds,
        removeMatrxId: removeWorkflowMatrxId,
        removeMatrxIds: removeWorkflowMatrxIds,
        addPkValue: addWorkflowPkValue,
        addPkValues: addWorkflowPkValues,
        removePkValue: removeWorkflowPkValue,
        removePkValues: removeWorkflowPkValues,
        isMissingRecords: isWorkflowMissingRecords,
        setShouldFetch: setWorkflowShouldFetch,
        setFetchMode: setWorkflowFetchMode,
        fetchQuickRefs: fetchWorkflowQuickRefs,
        fetchOne: fetchWorkflowOne,
        fetchOneWithFkIfk: fetchWorkflowOneWithFkIfk,
        fetchAll: fetchWorkflowAll,
        fetchPaginated: fetchWorkflowPaginated,

    } = useEntityWithFetch("workflow");

    return {
        workflowSelectors,
        workflowActions,
        workflowRecords,
        workflowUnsavedRecords,
        workflowSelectedRecordIds,
        workflowIsLoading,
        workflowIsError,
        workflowQuickRefRecords,
        addWorkflowMatrxId,
        addWorkflowMatrxIds,
        removeWorkflowMatrxId,
        removeWorkflowMatrxIds,
        addWorkflowPkValue,
        addWorkflowPkValues,
        removeWorkflowPkValue,
        removeWorkflowPkValues,
        isWorkflowMissingRecords,
        setWorkflowShouldFetch,
        setWorkflowFetchMode,
        fetchWorkflowQuickRefs,
        fetchWorkflowOne,
        fetchWorkflowOneWithFkIfk,
        fetchWorkflowAll,
        fetchWorkflowPaginated,
    };
};



type UseWorkflowEdgeWithFetchReturn = {
    workflowEdgeSelectors: EntitySelectors<"workflowEdge">;
    workflowEdgeActions: EntityActions<"workflowEdge">;
    workflowEdgeRecords: Record<MatrxRecordId, WorkflowEdgeData>;
    workflowEdgeUnsavedRecords: Record<MatrxRecordId, Partial<WorkflowEdgeData>>;
    workflowEdgeSelectedRecordIds: MatrxRecordId[];
    workflowEdgeIsLoading: boolean;
    workflowEdgeIsError: boolean;
    workflowEdgeQuickRefRecords: QuickReferenceRecord[];
    addWorkflowEdgeMatrxId: (recordId: MatrxRecordId) => void;
    addWorkflowEdgeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWorkflowEdgeMatrxId: (recordId: MatrxRecordId) => void;
    removeWorkflowEdgeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWorkflowEdgePkValue: (pkValue: string) => void;
    addWorkflowEdgePkValues: (pkValues: Record<string, unknown>) => void;
    removeWorkflowEdgePkValue: (pkValue: string) => void;
    removeWorkflowEdgePkValues: (pkValues: Record<string, unknown>) => void;
    isWorkflowEdgeMissingRecords: boolean;
    setWorkflowEdgeShouldFetch: (shouldFetch: boolean) => void;
    setWorkflowEdgeFetchMode: (fetchMode: FetchMode) => void;
    fetchWorkflowEdgeQuickRefs: () => void;
    fetchWorkflowEdgeOne: (recordId: MatrxRecordId) => void;
    fetchWorkflowEdgeOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWorkflowEdgeAll: () => void;
    fetchWorkflowEdgePaginated: (page: number, pageSize: number) => void;
};

export const useWorkflowEdgeWithFetch = (): UseWorkflowEdgeWithFetchReturn => {
    const {
        selectors: workflowEdgeSelectors,
        actions: workflowEdgeActions,
        allRecords: workflowEdgeRecords,
        unsavedRecords: workflowEdgeUnsavedRecords,
        selectedRecordIds: workflowEdgeSelectedRecordIds,
        isLoading: workflowEdgeIsLoading,
        isError: workflowEdgeIsError,
        quickRefRecords: workflowEdgeQuickRefRecords,
        addMatrxId: addWorkflowEdgeMatrxId,
        addMatrxIds: addWorkflowEdgeMatrxIds,
        removeMatrxId: removeWorkflowEdgeMatrxId,
        removeMatrxIds: removeWorkflowEdgeMatrxIds,
        addPkValue: addWorkflowEdgePkValue,
        addPkValues: addWorkflowEdgePkValues,
        removePkValue: removeWorkflowEdgePkValue,
        removePkValues: removeWorkflowEdgePkValues,
        isMissingRecords: isWorkflowEdgeMissingRecords,
        setShouldFetch: setWorkflowEdgeShouldFetch,
        setFetchMode: setWorkflowEdgeFetchMode,
        fetchQuickRefs: fetchWorkflowEdgeQuickRefs,
        fetchOne: fetchWorkflowEdgeOne,
        fetchOneWithFkIfk: fetchWorkflowEdgeOneWithFkIfk,
        fetchAll: fetchWorkflowEdgeAll,
        fetchPaginated: fetchWorkflowEdgePaginated,

    } = useEntityWithFetch("workflowEdge");

    return {
        workflowEdgeSelectors,
        workflowEdgeActions,
        workflowEdgeRecords,
        workflowEdgeUnsavedRecords,
        workflowEdgeSelectedRecordIds,
        workflowEdgeIsLoading,
        workflowEdgeIsError,
        workflowEdgeQuickRefRecords,
        addWorkflowEdgeMatrxId,
        addWorkflowEdgeMatrxIds,
        removeWorkflowEdgeMatrxId,
        removeWorkflowEdgeMatrxIds,
        addWorkflowEdgePkValue,
        addWorkflowEdgePkValues,
        removeWorkflowEdgePkValue,
        removeWorkflowEdgePkValues,
        isWorkflowEdgeMissingRecords,
        setWorkflowEdgeShouldFetch,
        setWorkflowEdgeFetchMode,
        fetchWorkflowEdgeQuickRefs,
        fetchWorkflowEdgeOne,
        fetchWorkflowEdgeOneWithFkIfk,
        fetchWorkflowEdgeAll,
        fetchWorkflowEdgePaginated,
    };
};



type UseWorkflowNodeWithFetchReturn = {
    workflowNodeSelectors: EntitySelectors<"workflowNode">;
    workflowNodeActions: EntityActions<"workflowNode">;
    workflowNodeRecords: Record<MatrxRecordId, WorkflowNodeData>;
    workflowNodeUnsavedRecords: Record<MatrxRecordId, Partial<WorkflowNodeData>>;
    workflowNodeSelectedRecordIds: MatrxRecordId[];
    workflowNodeIsLoading: boolean;
    workflowNodeIsError: boolean;
    workflowNodeQuickRefRecords: QuickReferenceRecord[];
    addWorkflowNodeMatrxId: (recordId: MatrxRecordId) => void;
    addWorkflowNodeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWorkflowNodeMatrxId: (recordId: MatrxRecordId) => void;
    removeWorkflowNodeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWorkflowNodePkValue: (pkValue: string) => void;
    addWorkflowNodePkValues: (pkValues: Record<string, unknown>) => void;
    removeWorkflowNodePkValue: (pkValue: string) => void;
    removeWorkflowNodePkValues: (pkValues: Record<string, unknown>) => void;
    isWorkflowNodeMissingRecords: boolean;
    setWorkflowNodeShouldFetch: (shouldFetch: boolean) => void;
    setWorkflowNodeFetchMode: (fetchMode: FetchMode) => void;
    fetchWorkflowNodeQuickRefs: () => void;
    fetchWorkflowNodeOne: (recordId: MatrxRecordId) => void;
    fetchWorkflowNodeOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWorkflowNodeAll: () => void;
    fetchWorkflowNodePaginated: (page: number, pageSize: number) => void;
};

export const useWorkflowNodeWithFetch = (): UseWorkflowNodeWithFetchReturn => {
    const {
        selectors: workflowNodeSelectors,
        actions: workflowNodeActions,
        allRecords: workflowNodeRecords,
        unsavedRecords: workflowNodeUnsavedRecords,
        selectedRecordIds: workflowNodeSelectedRecordIds,
        isLoading: workflowNodeIsLoading,
        isError: workflowNodeIsError,
        quickRefRecords: workflowNodeQuickRefRecords,
        addMatrxId: addWorkflowNodeMatrxId,
        addMatrxIds: addWorkflowNodeMatrxIds,
        removeMatrxId: removeWorkflowNodeMatrxId,
        removeMatrxIds: removeWorkflowNodeMatrxIds,
        addPkValue: addWorkflowNodePkValue,
        addPkValues: addWorkflowNodePkValues,
        removePkValue: removeWorkflowNodePkValue,
        removePkValues: removeWorkflowNodePkValues,
        isMissingRecords: isWorkflowNodeMissingRecords,
        setShouldFetch: setWorkflowNodeShouldFetch,
        setFetchMode: setWorkflowNodeFetchMode,
        fetchQuickRefs: fetchWorkflowNodeQuickRefs,
        fetchOne: fetchWorkflowNodeOne,
        fetchOneWithFkIfk: fetchWorkflowNodeOneWithFkIfk,
        fetchAll: fetchWorkflowNodeAll,
        fetchPaginated: fetchWorkflowNodePaginated,

    } = useEntityWithFetch("workflowNode");

    return {
        workflowNodeSelectors,
        workflowNodeActions,
        workflowNodeRecords,
        workflowNodeUnsavedRecords,
        workflowNodeSelectedRecordIds,
        workflowNodeIsLoading,
        workflowNodeIsError,
        workflowNodeQuickRefRecords,
        addWorkflowNodeMatrxId,
        addWorkflowNodeMatrxIds,
        removeWorkflowNodeMatrxId,
        removeWorkflowNodeMatrxIds,
        addWorkflowNodePkValue,
        addWorkflowNodePkValues,
        removeWorkflowNodePkValue,
        removeWorkflowNodePkValues,
        isWorkflowNodeMissingRecords,
        setWorkflowNodeShouldFetch,
        setWorkflowNodeFetchMode,
        fetchWorkflowNodeQuickRefs,
        fetchWorkflowNodeOne,
        fetchWorkflowNodeOneWithFkIfk,
        fetchWorkflowNodeAll,
        fetchWorkflowNodePaginated,
    };
};



type UseWorkflowRelayWithFetchReturn = {
    workflowRelaySelectors: EntitySelectors<"workflowRelay">;
    workflowRelayActions: EntityActions<"workflowRelay">;
    workflowRelayRecords: Record<MatrxRecordId, WorkflowRelayData>;
    workflowRelayUnsavedRecords: Record<MatrxRecordId, Partial<WorkflowRelayData>>;
    workflowRelaySelectedRecordIds: MatrxRecordId[];
    workflowRelayIsLoading: boolean;
    workflowRelayIsError: boolean;
    workflowRelayQuickRefRecords: QuickReferenceRecord[];
    addWorkflowRelayMatrxId: (recordId: MatrxRecordId) => void;
    addWorkflowRelayMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWorkflowRelayMatrxId: (recordId: MatrxRecordId) => void;
    removeWorkflowRelayMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWorkflowRelayPkValue: (pkValue: string) => void;
    addWorkflowRelayPkValues: (pkValues: Record<string, unknown>) => void;
    removeWorkflowRelayPkValue: (pkValue: string) => void;
    removeWorkflowRelayPkValues: (pkValues: Record<string, unknown>) => void;
    isWorkflowRelayMissingRecords: boolean;
    setWorkflowRelayShouldFetch: (shouldFetch: boolean) => void;
    setWorkflowRelayFetchMode: (fetchMode: FetchMode) => void;
    fetchWorkflowRelayQuickRefs: () => void;
    fetchWorkflowRelayOne: (recordId: MatrxRecordId) => void;
    fetchWorkflowRelayOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWorkflowRelayAll: () => void;
    fetchWorkflowRelayPaginated: (page: number, pageSize: number) => void;
};

export const useWorkflowRelayWithFetch = (): UseWorkflowRelayWithFetchReturn => {
    const {
        selectors: workflowRelaySelectors,
        actions: workflowRelayActions,
        allRecords: workflowRelayRecords,
        unsavedRecords: workflowRelayUnsavedRecords,
        selectedRecordIds: workflowRelaySelectedRecordIds,
        isLoading: workflowRelayIsLoading,
        isError: workflowRelayIsError,
        quickRefRecords: workflowRelayQuickRefRecords,
        addMatrxId: addWorkflowRelayMatrxId,
        addMatrxIds: addWorkflowRelayMatrxIds,
        removeMatrxId: removeWorkflowRelayMatrxId,
        removeMatrxIds: removeWorkflowRelayMatrxIds,
        addPkValue: addWorkflowRelayPkValue,
        addPkValues: addWorkflowRelayPkValues,
        removePkValue: removeWorkflowRelayPkValue,
        removePkValues: removeWorkflowRelayPkValues,
        isMissingRecords: isWorkflowRelayMissingRecords,
        setShouldFetch: setWorkflowRelayShouldFetch,
        setFetchMode: setWorkflowRelayFetchMode,
        fetchQuickRefs: fetchWorkflowRelayQuickRefs,
        fetchOne: fetchWorkflowRelayOne,
        fetchOneWithFkIfk: fetchWorkflowRelayOneWithFkIfk,
        fetchAll: fetchWorkflowRelayAll,
        fetchPaginated: fetchWorkflowRelayPaginated,

    } = useEntityWithFetch("workflowRelay");

    return {
        workflowRelaySelectors,
        workflowRelayActions,
        workflowRelayRecords,
        workflowRelayUnsavedRecords,
        workflowRelaySelectedRecordIds,
        workflowRelayIsLoading,
        workflowRelayIsError,
        workflowRelayQuickRefRecords,
        addWorkflowRelayMatrxId,
        addWorkflowRelayMatrxIds,
        removeWorkflowRelayMatrxId,
        removeWorkflowRelayMatrxIds,
        addWorkflowRelayPkValue,
        addWorkflowRelayPkValues,
        removeWorkflowRelayPkValue,
        removeWorkflowRelayPkValues,
        isWorkflowRelayMissingRecords,
        setWorkflowRelayShouldFetch,
        setWorkflowRelayFetchMode,
        fetchWorkflowRelayQuickRefs,
        fetchWorkflowRelayOne,
        fetchWorkflowRelayOneWithFkIfk,
        fetchWorkflowRelayAll,
        fetchWorkflowRelayPaginated,
    };
};



type UseWorkflowUserInputWithFetchReturn = {
    workflowUserInputSelectors: EntitySelectors<"workflowUserInput">;
    workflowUserInputActions: EntityActions<"workflowUserInput">;
    workflowUserInputRecords: Record<MatrxRecordId, WorkflowUserInputData>;
    workflowUserInputUnsavedRecords: Record<MatrxRecordId, Partial<WorkflowUserInputData>>;
    workflowUserInputSelectedRecordIds: MatrxRecordId[];
    workflowUserInputIsLoading: boolean;
    workflowUserInputIsError: boolean;
    workflowUserInputQuickRefRecords: QuickReferenceRecord[];
    addWorkflowUserInputMatrxId: (recordId: MatrxRecordId) => void;
    addWorkflowUserInputMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeWorkflowUserInputMatrxId: (recordId: MatrxRecordId) => void;
    removeWorkflowUserInputMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addWorkflowUserInputPkValue: (pkValue: string) => void;
    addWorkflowUserInputPkValues: (pkValues: Record<string, unknown>) => void;
    removeWorkflowUserInputPkValue: (pkValue: string) => void;
    removeWorkflowUserInputPkValues: (pkValues: Record<string, unknown>) => void;
    isWorkflowUserInputMissingRecords: boolean;
    setWorkflowUserInputShouldFetch: (shouldFetch: boolean) => void;
    setWorkflowUserInputFetchMode: (fetchMode: FetchMode) => void;
    fetchWorkflowUserInputQuickRefs: () => void;
    fetchWorkflowUserInputOne: (recordId: MatrxRecordId) => void;
    fetchWorkflowUserInputOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchWorkflowUserInputAll: () => void;
    fetchWorkflowUserInputPaginated: (page: number, pageSize: number) => void;
};

export const useWorkflowUserInputWithFetch = (): UseWorkflowUserInputWithFetchReturn => {
    const {
        selectors: workflowUserInputSelectors,
        actions: workflowUserInputActions,
        allRecords: workflowUserInputRecords,
        unsavedRecords: workflowUserInputUnsavedRecords,
        selectedRecordIds: workflowUserInputSelectedRecordIds,
        isLoading: workflowUserInputIsLoading,
        isError: workflowUserInputIsError,
        quickRefRecords: workflowUserInputQuickRefRecords,
        addMatrxId: addWorkflowUserInputMatrxId,
        addMatrxIds: addWorkflowUserInputMatrxIds,
        removeMatrxId: removeWorkflowUserInputMatrxId,
        removeMatrxIds: removeWorkflowUserInputMatrxIds,
        addPkValue: addWorkflowUserInputPkValue,
        addPkValues: addWorkflowUserInputPkValues,
        removePkValue: removeWorkflowUserInputPkValue,
        removePkValues: removeWorkflowUserInputPkValues,
        isMissingRecords: isWorkflowUserInputMissingRecords,
        setShouldFetch: setWorkflowUserInputShouldFetch,
        setFetchMode: setWorkflowUserInputFetchMode,
        fetchQuickRefs: fetchWorkflowUserInputQuickRefs,
        fetchOne: fetchWorkflowUserInputOne,
        fetchOneWithFkIfk: fetchWorkflowUserInputOneWithFkIfk,
        fetchAll: fetchWorkflowUserInputAll,
        fetchPaginated: fetchWorkflowUserInputPaginated,

    } = useEntityWithFetch("workflowUserInput");

    return {
        workflowUserInputSelectors,
        workflowUserInputActions,
        workflowUserInputRecords,
        workflowUserInputUnsavedRecords,
        workflowUserInputSelectedRecordIds,
        workflowUserInputIsLoading,
        workflowUserInputIsError,
        workflowUserInputQuickRefRecords,
        addWorkflowUserInputMatrxId,
        addWorkflowUserInputMatrxIds,
        removeWorkflowUserInputMatrxId,
        removeWorkflowUserInputMatrxIds,
        addWorkflowUserInputPkValue,
        addWorkflowUserInputPkValues,
        removeWorkflowUserInputPkValue,
        removeWorkflowUserInputPkValues,
        isWorkflowUserInputMissingRecords,
        setWorkflowUserInputShouldFetch,
        setWorkflowUserInputFetchMode,
        fetchWorkflowUserInputQuickRefs,
        fetchWorkflowUserInputOne,
        fetchWorkflowUserInputOneWithFkIfk,
        fetchWorkflowUserInputAll,
        fetchWorkflowUserInputPaginated,
    };
};