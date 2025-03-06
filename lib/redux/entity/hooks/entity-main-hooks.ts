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
    WcInjuryData,
    WcReportData,
    RecipeMessageReorderQueueData,
    MessageData,
    ConversationData,
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
    addactionMatrxId: (recordId: MatrxRecordId) => void;
    addactionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeactionMatrxId: (recordId: MatrxRecordId) => void;
    removeactionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addactionPkValue: (pkValue: string) => void;
    addactionPkValues: (pkValues: Record<string, unknown>) => void;
    removeactionPkValue: (pkValue: string) => void;
    removeactionPkValues: (pkValues: Record<string, unknown>) => void;
    isactionMissingRecords: boolean;
    setactionShouldFetch: (shouldFetch: boolean) => void;
    setactionFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addactionMatrxId,
        addMatrxIds: addactionMatrxIds,
        removeMatrxId: removeactionMatrxId,
        removeMatrxIds: removeactionMatrxIds,
        addPkValue: addactionPkValue,
        addPkValues: addactionPkValues,
        removePkValue: removeactionPkValue,
        removePkValues: removeactionPkValues,
        isMissingRecords: isactionMissingRecords,
        setShouldFetch: setactionShouldFetch,
        setFetchMode: setactionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addactionMatrxId,
        addactionMatrxIds,
        removeactionMatrxId,
        removeactionMatrxIds,
        addactionPkValue,
        addactionPkValues,
        removeactionPkValue,
        removeactionPkValues,
        isactionMissingRecords,
        setactionShouldFetch,
        setactionFetchMode,
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

type UseAiProviderWithFetchReturn = {
    aiProviderSelectors: EntitySelectors<"aiProvider">;
    aiProviderActions: EntityActions<"aiProvider">;
    aiProviderRecords: Record<MatrxRecordId, AiProviderData>;
    aiProviderUnsavedRecords: Record<MatrxRecordId, Partial<AiProviderData>>;
    aiProviderSelectedRecordIds: MatrxRecordId[];
    aiProviderIsLoading: boolean;
    aiProviderIsError: boolean;
    aiProviderQuickRefRecords: QuickReferenceRecord[];
    addaiProviderMatrxId: (recordId: MatrxRecordId) => void;
    addaiProviderMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaiProviderMatrxId: (recordId: MatrxRecordId) => void;
    removeaiProviderMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaiProviderPkValue: (pkValue: string) => void;
    addaiProviderPkValues: (pkValues: Record<string, unknown>) => void;
    removeaiProviderPkValue: (pkValue: string) => void;
    removeaiProviderPkValues: (pkValues: Record<string, unknown>) => void;
    isaiProviderMissingRecords: boolean;
    setaiProviderShouldFetch: (shouldFetch: boolean) => void;
    setaiProviderFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addaiProviderMatrxId,
        addMatrxIds: addaiProviderMatrxIds,
        removeMatrxId: removeaiProviderMatrxId,
        removeMatrxIds: removeaiProviderMatrxIds,
        addPkValue: addaiProviderPkValue,
        addPkValues: addaiProviderPkValues,
        removePkValue: removeaiProviderPkValue,
        removePkValues: removeaiProviderPkValues,
        isMissingRecords: isaiProviderMissingRecords,
        setShouldFetch: setaiProviderShouldFetch,
        setFetchMode: setaiProviderFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addaiProviderMatrxId,
        addaiProviderMatrxIds,
        removeaiProviderMatrxId,
        removeaiProviderMatrxIds,
        addaiProviderPkValue,
        addaiProviderPkValues,
        removeaiProviderPkValue,
        removeaiProviderPkValues,
        isaiProviderMissingRecords,
        setaiProviderShouldFetch,
        setaiProviderFetchMode,
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

type UseAppletWithFetchReturn = {
    appletSelectors: EntitySelectors<"applet">;
    appletActions: EntityActions<"applet">;
    appletRecords: Record<MatrxRecordId, AppletData>;
    appletUnsavedRecords: Record<MatrxRecordId, Partial<AppletData>>;
    appletSelectedRecordIds: MatrxRecordId[];
    appletIsLoading: boolean;
    appletIsError: boolean;
    appletQuickRefRecords: QuickReferenceRecord[];
    addappletMatrxId: (recordId: MatrxRecordId) => void;
    addappletMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeappletMatrxId: (recordId: MatrxRecordId) => void;
    removeappletMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addappletPkValue: (pkValue: string) => void;
    addappletPkValues: (pkValues: Record<string, unknown>) => void;
    removeappletPkValue: (pkValue: string) => void;
    removeappletPkValues: (pkValues: Record<string, unknown>) => void;
    isappletMissingRecords: boolean;
    setappletShouldFetch: (shouldFetch: boolean) => void;
    setappletFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addappletMatrxId,
        addMatrxIds: addappletMatrxIds,
        removeMatrxId: removeappletMatrxId,
        removeMatrxIds: removeappletMatrxIds,
        addPkValue: addappletPkValue,
        addPkValues: addappletPkValues,
        removePkValue: removeappletPkValue,
        removePkValues: removeappletPkValues,
        isMissingRecords: isappletMissingRecords,
        setShouldFetch: setappletShouldFetch,
        setFetchMode: setappletFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addappletMatrxId,
        addappletMatrxIds,
        removeappletMatrxId,
        removeappletMatrxIds,
        addappletPkValue,
        addappletPkValues,
        removeappletPkValue,
        removeappletPkValues,
        isappletMissingRecords,
        setappletShouldFetch,
        setappletFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addargMatrxId: (recordId: MatrxRecordId) => void;
    addargMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeargMatrxId: (recordId: MatrxRecordId) => void;
    removeargMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addargPkValue: (pkValue: string) => void;
    addargPkValues: (pkValues: Record<string, unknown>) => void;
    removeargPkValue: (pkValue: string) => void;
    removeargPkValues: (pkValues: Record<string, unknown>) => void;
    isargMissingRecords: boolean;
    setargShouldFetch: (shouldFetch: boolean) => void;
    setargFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addargMatrxId,
        addMatrxIds: addargMatrxIds,
        removeMatrxId: removeargMatrxId,
        removeMatrxIds: removeargMatrxIds,
        addPkValue: addargPkValue,
        addPkValues: addargPkValues,
        removePkValue: removeargPkValue,
        removePkValues: removeargPkValues,
        isMissingRecords: isargMissingRecords,
        setShouldFetch: setargShouldFetch,
        setFetchMode: setargFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addargMatrxId,
        addargMatrxIds,
        removeargMatrxId,
        removeargMatrxIds,
        addargPkValue,
        addargPkValues,
        removeargPkValue,
        removeargPkValues,
        isargMissingRecords,
        setargShouldFetch,
        setargFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addaudioLabelMatrxId: (recordId: MatrxRecordId) => void;
    addaudioLabelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaudioLabelMatrxId: (recordId: MatrxRecordId) => void;
    removeaudioLabelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaudioLabelPkValue: (pkValue: string) => void;
    addaudioLabelPkValues: (pkValues: Record<string, unknown>) => void;
    removeaudioLabelPkValue: (pkValue: string) => void;
    removeaudioLabelPkValues: (pkValues: Record<string, unknown>) => void;
    isaudioLabelMissingRecords: boolean;
    setaudioLabelShouldFetch: (shouldFetch: boolean) => void;
    setaudioLabelFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addaudioLabelMatrxId,
        addMatrxIds: addaudioLabelMatrxIds,
        removeMatrxId: removeaudioLabelMatrxId,
        removeMatrxIds: removeaudioLabelMatrxIds,
        addPkValue: addaudioLabelPkValue,
        addPkValues: addaudioLabelPkValues,
        removePkValue: removeaudioLabelPkValue,
        removePkValues: removeaudioLabelPkValues,
        isMissingRecords: isaudioLabelMissingRecords,
        setShouldFetch: setaudioLabelShouldFetch,
        setFetchMode: setaudioLabelFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addaudioLabelMatrxId,
        addaudioLabelMatrxIds,
        removeaudioLabelMatrxId,
        removeaudioLabelMatrxIds,
        addaudioLabelPkValue,
        addaudioLabelPkValues,
        removeaudioLabelPkValue,
        removeaudioLabelPkValues,
        isaudioLabelMissingRecords,
        setaudioLabelShouldFetch,
        setaudioLabelFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addaudioRecordingMatrxId: (recordId: MatrxRecordId) => void;
    addaudioRecordingMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaudioRecordingMatrxId: (recordId: MatrxRecordId) => void;
    removeaudioRecordingMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaudioRecordingPkValue: (pkValue: string) => void;
    addaudioRecordingPkValues: (pkValues: Record<string, unknown>) => void;
    removeaudioRecordingPkValue: (pkValue: string) => void;
    removeaudioRecordingPkValues: (pkValues: Record<string, unknown>) => void;
    isaudioRecordingMissingRecords: boolean;
    setaudioRecordingShouldFetch: (shouldFetch: boolean) => void;
    setaudioRecordingFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addaudioRecordingMatrxId,
        addMatrxIds: addaudioRecordingMatrxIds,
        removeMatrxId: removeaudioRecordingMatrxId,
        removeMatrxIds: removeaudioRecordingMatrxIds,
        addPkValue: addaudioRecordingPkValue,
        addPkValues: addaudioRecordingPkValues,
        removePkValue: removeaudioRecordingPkValue,
        removePkValues: removeaudioRecordingPkValues,
        isMissingRecords: isaudioRecordingMissingRecords,
        setShouldFetch: setaudioRecordingShouldFetch,
        setFetchMode: setaudioRecordingFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addaudioRecordingMatrxId,
        addaudioRecordingMatrxIds,
        removeaudioRecordingMatrxId,
        removeaudioRecordingMatrxIds,
        addaudioRecordingPkValue,
        addaudioRecordingPkValues,
        removeaudioRecordingPkValue,
        removeaudioRecordingPkValues,
        isaudioRecordingMissingRecords,
        setaudioRecordingShouldFetch,
        setaudioRecordingFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addaudioRecordingUsersMatrxId: (recordId: MatrxRecordId) => void;
    addaudioRecordingUsersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeaudioRecordingUsersMatrxId: (recordId: MatrxRecordId) => void;
    removeaudioRecordingUsersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addaudioRecordingUsersPkValue: (pkValue: string) => void;
    addaudioRecordingUsersPkValues: (pkValues: Record<string, unknown>) => void;
    removeaudioRecordingUsersPkValue: (pkValue: string) => void;
    removeaudioRecordingUsersPkValues: (pkValues: Record<string, unknown>) => void;
    isaudioRecordingUsersMissingRecords: boolean;
    setaudioRecordingUsersShouldFetch: (shouldFetch: boolean) => void;
    setaudioRecordingUsersFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addaudioRecordingUsersMatrxId,
        addMatrxIds: addaudioRecordingUsersMatrxIds,
        removeMatrxId: removeaudioRecordingUsersMatrxId,
        removeMatrxIds: removeaudioRecordingUsersMatrxIds,
        addPkValue: addaudioRecordingUsersPkValue,
        addPkValues: addaudioRecordingUsersPkValues,
        removePkValue: removeaudioRecordingUsersPkValue,
        removePkValues: removeaudioRecordingUsersPkValues,
        isMissingRecords: isaudioRecordingUsersMissingRecords,
        setShouldFetch: setaudioRecordingUsersShouldFetch,
        setFetchMode: setaudioRecordingUsersFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addaudioRecordingUsersMatrxId,
        addaudioRecordingUsersMatrxIds,
        removeaudioRecordingUsersMatrxId,
        removeaudioRecordingUsersMatrxIds,
        addaudioRecordingUsersPkValue,
        addaudioRecordingUsersPkValues,
        removeaudioRecordingUsersPkValue,
        removeaudioRecordingUsersPkValues,
        isaudioRecordingUsersMissingRecords,
        setaudioRecordingUsersShouldFetch,
        setaudioRecordingUsersFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addautomationBoundaryBrokerMatrxId: (recordId: MatrxRecordId) => void;
    addautomationBoundaryBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeautomationBoundaryBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removeautomationBoundaryBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addautomationBoundaryBrokerPkValue: (pkValue: string) => void;
    addautomationBoundaryBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removeautomationBoundaryBrokerPkValue: (pkValue: string) => void;
    removeautomationBoundaryBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isautomationBoundaryBrokerMissingRecords: boolean;
    setautomationBoundaryBrokerShouldFetch: (shouldFetch: boolean) => void;
    setautomationBoundaryBrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addautomationBoundaryBrokerMatrxId,
        addMatrxIds: addautomationBoundaryBrokerMatrxIds,
        removeMatrxId: removeautomationBoundaryBrokerMatrxId,
        removeMatrxIds: removeautomationBoundaryBrokerMatrxIds,
        addPkValue: addautomationBoundaryBrokerPkValue,
        addPkValues: addautomationBoundaryBrokerPkValues,
        removePkValue: removeautomationBoundaryBrokerPkValue,
        removePkValues: removeautomationBoundaryBrokerPkValues,
        isMissingRecords: isautomationBoundaryBrokerMissingRecords,
        setShouldFetch: setautomationBoundaryBrokerShouldFetch,
        setFetchMode: setautomationBoundaryBrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addautomationBoundaryBrokerMatrxId,
        addautomationBoundaryBrokerMatrxIds,
        removeautomationBoundaryBrokerMatrxId,
        removeautomationBoundaryBrokerMatrxIds,
        addautomationBoundaryBrokerPkValue,
        addautomationBoundaryBrokerPkValues,
        removeautomationBoundaryBrokerPkValue,
        removeautomationBoundaryBrokerPkValues,
        isautomationBoundaryBrokerMissingRecords,
        setautomationBoundaryBrokerShouldFetch,
        setautomationBoundaryBrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addautomationMatrixMatrxId: (recordId: MatrxRecordId) => void;
    addautomationMatrixMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeautomationMatrixMatrxId: (recordId: MatrxRecordId) => void;
    removeautomationMatrixMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addautomationMatrixPkValue: (pkValue: string) => void;
    addautomationMatrixPkValues: (pkValues: Record<string, unknown>) => void;
    removeautomationMatrixPkValue: (pkValue: string) => void;
    removeautomationMatrixPkValues: (pkValues: Record<string, unknown>) => void;
    isautomationMatrixMissingRecords: boolean;
    setautomationMatrixShouldFetch: (shouldFetch: boolean) => void;
    setautomationMatrixFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addautomationMatrixMatrxId,
        addMatrxIds: addautomationMatrixMatrxIds,
        removeMatrxId: removeautomationMatrixMatrxId,
        removeMatrxIds: removeautomationMatrixMatrxIds,
        addPkValue: addautomationMatrixPkValue,
        addPkValues: addautomationMatrixPkValues,
        removePkValue: removeautomationMatrixPkValue,
        removePkValues: removeautomationMatrixPkValues,
        isMissingRecords: isautomationMatrixMissingRecords,
        setShouldFetch: setautomationMatrixShouldFetch,
        setFetchMode: setautomationMatrixFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addautomationMatrixMatrxId,
        addautomationMatrixMatrxIds,
        removeautomationMatrixMatrxId,
        removeautomationMatrixMatrxIds,
        addautomationMatrixPkValue,
        addautomationMatrixPkValues,
        removeautomationMatrixPkValue,
        removeautomationMatrixPkValues,
        isautomationMatrixMissingRecords,
        setautomationMatrixShouldFetch,
        setautomationMatrixFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addbrokerMatrxId: (recordId: MatrxRecordId) => void;
    addbrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removebrokerMatrxId: (recordId: MatrxRecordId) => void;
    removebrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addbrokerPkValue: (pkValue: string) => void;
    addbrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removebrokerPkValue: (pkValue: string) => void;
    removebrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isbrokerMissingRecords: boolean;
    setbrokerShouldFetch: (shouldFetch: boolean) => void;
    setbrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addbrokerMatrxId,
        addMatrxIds: addbrokerMatrxIds,
        removeMatrxId: removebrokerMatrxId,
        removeMatrxIds: removebrokerMatrxIds,
        addPkValue: addbrokerPkValue,
        addPkValues: addbrokerPkValues,
        removePkValue: removebrokerPkValue,
        removePkValues: removebrokerPkValues,
        isMissingRecords: isbrokerMissingRecords,
        setShouldFetch: setbrokerShouldFetch,
        setFetchMode: setbrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addbrokerMatrxId,
        addbrokerMatrxIds,
        removebrokerMatrxId,
        removebrokerMatrxIds,
        addbrokerPkValue,
        addbrokerPkValues,
        removebrokerPkValue,
        removebrokerPkValues,
        isbrokerMissingRecords,
        setbrokerShouldFetch,
        setbrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addbrokerValueMatrxId: (recordId: MatrxRecordId) => void;
    addbrokerValueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removebrokerValueMatrxId: (recordId: MatrxRecordId) => void;
    removebrokerValueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addbrokerValuePkValue: (pkValue: string) => void;
    addbrokerValuePkValues: (pkValues: Record<string, unknown>) => void;
    removebrokerValuePkValue: (pkValue: string) => void;
    removebrokerValuePkValues: (pkValues: Record<string, unknown>) => void;
    isbrokerValueMissingRecords: boolean;
    setbrokerValueShouldFetch: (shouldFetch: boolean) => void;
    setbrokerValueFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addbrokerValueMatrxId,
        addMatrxIds: addbrokerValueMatrxIds,
        removeMatrxId: removebrokerValueMatrxId,
        removeMatrxIds: removebrokerValueMatrxIds,
        addPkValue: addbrokerValuePkValue,
        addPkValues: addbrokerValuePkValues,
        removePkValue: removebrokerValuePkValue,
        removePkValues: removebrokerValuePkValues,
        isMissingRecords: isbrokerValueMissingRecords,
        setShouldFetch: setbrokerValueShouldFetch,
        setFetchMode: setbrokerValueFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addbrokerValueMatrxId,
        addbrokerValueMatrxIds,
        removebrokerValueMatrxId,
        removebrokerValueMatrxIds,
        addbrokerValuePkValue,
        addbrokerValuePkValues,
        removebrokerValuePkValue,
        removebrokerValuePkValues,
        isbrokerValueMissingRecords,
        setbrokerValueShouldFetch,
        setbrokerValueFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addbucketStructuresMatrxId: (recordId: MatrxRecordId) => void;
    addbucketStructuresMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removebucketStructuresMatrxId: (recordId: MatrxRecordId) => void;
    removebucketStructuresMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addbucketStructuresPkValue: (pkValue: string) => void;
    addbucketStructuresPkValues: (pkValues: Record<string, unknown>) => void;
    removebucketStructuresPkValue: (pkValue: string) => void;
    removebucketStructuresPkValues: (pkValues: Record<string, unknown>) => void;
    isbucketStructuresMissingRecords: boolean;
    setbucketStructuresShouldFetch: (shouldFetch: boolean) => void;
    setbucketStructuresFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addbucketStructuresMatrxId,
        addMatrxIds: addbucketStructuresMatrxIds,
        removeMatrxId: removebucketStructuresMatrxId,
        removeMatrxIds: removebucketStructuresMatrxIds,
        addPkValue: addbucketStructuresPkValue,
        addPkValues: addbucketStructuresPkValues,
        removePkValue: removebucketStructuresPkValue,
        removePkValues: removebucketStructuresPkValues,
        isMissingRecords: isbucketStructuresMissingRecords,
        setShouldFetch: setbucketStructuresShouldFetch,
        setFetchMode: setbucketStructuresFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addbucketStructuresMatrxId,
        addbucketStructuresMatrxIds,
        removebucketStructuresMatrxId,
        removebucketStructuresMatrxIds,
        addbucketStructuresPkValue,
        addbucketStructuresPkValues,
        removebucketStructuresPkValue,
        removebucketStructuresPkValues,
        isbucketStructuresMissingRecords,
        setbucketStructuresShouldFetch,
        setbucketStructuresFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addbucketTreeStructuresMatrxId: (recordId: MatrxRecordId) => void;
    addbucketTreeStructuresMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removebucketTreeStructuresMatrxId: (recordId: MatrxRecordId) => void;
    removebucketTreeStructuresMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addbucketTreeStructuresPkValue: (pkValue: string) => void;
    addbucketTreeStructuresPkValues: (pkValues: Record<string, unknown>) => void;
    removebucketTreeStructuresPkValue: (pkValue: string) => void;
    removebucketTreeStructuresPkValues: (pkValues: Record<string, unknown>) => void;
    isbucketTreeStructuresMissingRecords: boolean;
    setbucketTreeStructuresShouldFetch: (shouldFetch: boolean) => void;
    setbucketTreeStructuresFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addbucketTreeStructuresMatrxId,
        addMatrxIds: addbucketTreeStructuresMatrxIds,
        removeMatrxId: removebucketTreeStructuresMatrxId,
        removeMatrxIds: removebucketTreeStructuresMatrxIds,
        addPkValue: addbucketTreeStructuresPkValue,
        addPkValues: addbucketTreeStructuresPkValues,
        removePkValue: removebucketTreeStructuresPkValue,
        removePkValues: removebucketTreeStructuresPkValues,
        isMissingRecords: isbucketTreeStructuresMissingRecords,
        setShouldFetch: setbucketTreeStructuresShouldFetch,
        setFetchMode: setbucketTreeStructuresFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addbucketTreeStructuresMatrxId,
        addbucketTreeStructuresMatrxIds,
        removebucketTreeStructuresMatrxId,
        removebucketTreeStructuresMatrxIds,
        addbucketTreeStructuresPkValue,
        addbucketTreeStructuresPkValues,
        removebucketTreeStructuresPkValue,
        removebucketTreeStructuresPkValues,
        isbucketTreeStructuresMissingRecords,
        setbucketTreeStructuresShouldFetch,
        setbucketTreeStructuresFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addcategoryMatrxId: (recordId: MatrxRecordId) => void;
    addcategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removecategoryMatrxId: (recordId: MatrxRecordId) => void;
    removecategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addcategoryPkValue: (pkValue: string) => void;
    addcategoryPkValues: (pkValues: Record<string, unknown>) => void;
    removecategoryPkValue: (pkValue: string) => void;
    removecategoryPkValues: (pkValues: Record<string, unknown>) => void;
    iscategoryMissingRecords: boolean;
    setcategoryShouldFetch: (shouldFetch: boolean) => void;
    setcategoryFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addcategoryMatrxId,
        addMatrxIds: addcategoryMatrxIds,
        removeMatrxId: removecategoryMatrxId,
        removeMatrxIds: removecategoryMatrxIds,
        addPkValue: addcategoryPkValue,
        addPkValues: addcategoryPkValues,
        removePkValue: removecategoryPkValue,
        removePkValues: removecategoryPkValues,
        isMissingRecords: iscategoryMissingRecords,
        setShouldFetch: setcategoryShouldFetch,
        setFetchMode: setcategoryFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addcategoryMatrxId,
        addcategoryMatrxIds,
        removecategoryMatrxId,
        removecategoryMatrxIds,
        addcategoryPkValue,
        addcategoryPkValues,
        removecategoryPkValue,
        removecategoryPkValues,
        iscategoryMissingRecords,
        setcategoryShouldFetch,
        setcategoryFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addcompiledRecipeMatrxId: (recordId: MatrxRecordId) => void;
    addcompiledRecipeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removecompiledRecipeMatrxId: (recordId: MatrxRecordId) => void;
    removecompiledRecipeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addcompiledRecipePkValue: (pkValue: string) => void;
    addcompiledRecipePkValues: (pkValues: Record<string, unknown>) => void;
    removecompiledRecipePkValue: (pkValue: string) => void;
    removecompiledRecipePkValues: (pkValues: Record<string, unknown>) => void;
    iscompiledRecipeMissingRecords: boolean;
    setcompiledRecipeShouldFetch: (shouldFetch: boolean) => void;
    setcompiledRecipeFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addcompiledRecipeMatrxId,
        addMatrxIds: addcompiledRecipeMatrxIds,
        removeMatrxId: removecompiledRecipeMatrxId,
        removeMatrxIds: removecompiledRecipeMatrxIds,
        addPkValue: addcompiledRecipePkValue,
        addPkValues: addcompiledRecipePkValues,
        removePkValue: removecompiledRecipePkValue,
        removePkValues: removecompiledRecipePkValues,
        isMissingRecords: iscompiledRecipeMissingRecords,
        setShouldFetch: setcompiledRecipeShouldFetch,
        setFetchMode: setcompiledRecipeFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addcompiledRecipeMatrxId,
        addcompiledRecipeMatrxIds,
        removecompiledRecipeMatrxId,
        removecompiledRecipeMatrxIds,
        addcompiledRecipePkValue,
        addcompiledRecipePkValues,
        removecompiledRecipePkValue,
        removecompiledRecipePkValues,
        iscompiledRecipeMissingRecords,
        setcompiledRecipeShouldFetch,
        setcompiledRecipeFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addconversationMatrxId: (recordId: MatrxRecordId) => void;
    addconversationMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeconversationMatrxId: (recordId: MatrxRecordId) => void;
    removeconversationMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addconversationPkValue: (pkValue: string) => void;
    addconversationPkValues: (pkValues: Record<string, unknown>) => void;
    removeconversationPkValue: (pkValue: string) => void;
    removeconversationPkValues: (pkValues: Record<string, unknown>) => void;
    isconversationMissingRecords: boolean;
    setconversationShouldFetch: (shouldFetch: boolean) => void;
    setconversationFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addconversationMatrxId,
        addMatrxIds: addconversationMatrxIds,
        removeMatrxId: removeconversationMatrxId,
        removeMatrxIds: removeconversationMatrxIds,
        addPkValue: addconversationPkValue,
        addPkValues: addconversationPkValues,
        removePkValue: removeconversationPkValue,
        removePkValues: removeconversationPkValues,
        isMissingRecords: isconversationMissingRecords,
        setShouldFetch: setconversationShouldFetch,
        setFetchMode: setconversationFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addconversationMatrxId,
        addconversationMatrxIds,
        removeconversationMatrxId,
        removeconversationMatrxIds,
        addconversationPkValue,
        addconversationPkValues,
        removeconversationPkValue,
        removeconversationPkValues,
        isconversationMissingRecords,
        setconversationShouldFetch,
        setconversationFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    adddataBrokerMatrxId: (recordId: MatrxRecordId) => void;
    adddataBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removedataBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removedataBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    adddataBrokerPkValue: (pkValue: string) => void;
    adddataBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removedataBrokerPkValue: (pkValue: string) => void;
    removedataBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isdataBrokerMissingRecords: boolean;
    setdataBrokerShouldFetch: (shouldFetch: boolean) => void;
    setdataBrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: adddataBrokerMatrxId,
        addMatrxIds: adddataBrokerMatrxIds,
        removeMatrxId: removedataBrokerMatrxId,
        removeMatrxIds: removedataBrokerMatrxIds,
        addPkValue: adddataBrokerPkValue,
        addPkValues: adddataBrokerPkValues,
        removePkValue: removedataBrokerPkValue,
        removePkValues: removedataBrokerPkValues,
        isMissingRecords: isdataBrokerMissingRecords,
        setShouldFetch: setdataBrokerShouldFetch,
        setFetchMode: setdataBrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        adddataBrokerMatrxId,
        adddataBrokerMatrxIds,
        removedataBrokerMatrxId,
        removedataBrokerMatrxIds,
        adddataBrokerPkValue,
        adddataBrokerPkValues,
        removedataBrokerPkValue,
        removedataBrokerPkValues,
        isdataBrokerMissingRecords,
        setdataBrokerShouldFetch,
        setdataBrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    adddataInputComponentMatrxId: (recordId: MatrxRecordId) => void;
    adddataInputComponentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removedataInputComponentMatrxId: (recordId: MatrxRecordId) => void;
    removedataInputComponentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    adddataInputComponentPkValue: (pkValue: string) => void;
    adddataInputComponentPkValues: (pkValues: Record<string, unknown>) => void;
    removedataInputComponentPkValue: (pkValue: string) => void;
    removedataInputComponentPkValues: (pkValues: Record<string, unknown>) => void;
    isdataInputComponentMissingRecords: boolean;
    setdataInputComponentShouldFetch: (shouldFetch: boolean) => void;
    setdataInputComponentFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: adddataInputComponentMatrxId,
        addMatrxIds: adddataInputComponentMatrxIds,
        removeMatrxId: removedataInputComponentMatrxId,
        removeMatrxIds: removedataInputComponentMatrxIds,
        addPkValue: adddataInputComponentPkValue,
        addPkValues: adddataInputComponentPkValues,
        removePkValue: removedataInputComponentPkValue,
        removePkValues: removedataInputComponentPkValues,
        isMissingRecords: isdataInputComponentMissingRecords,
        setShouldFetch: setdataInputComponentShouldFetch,
        setFetchMode: setdataInputComponentFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        adddataInputComponentMatrxId,
        adddataInputComponentMatrxIds,
        removedataInputComponentMatrxId,
        removedataInputComponentMatrxIds,
        adddataInputComponentPkValue,
        adddataInputComponentPkValues,
        removedataInputComponentPkValue,
        removedataInputComponentPkValues,
        isdataInputComponentMissingRecords,
        setdataInputComponentShouldFetch,
        setdataInputComponentFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    adddataOutputComponentMatrxId: (recordId: MatrxRecordId) => void;
    adddataOutputComponentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removedataOutputComponentMatrxId: (recordId: MatrxRecordId) => void;
    removedataOutputComponentMatrxIds: (recordIds: MatrxRecordId[]) => void;
    adddataOutputComponentPkValue: (pkValue: string) => void;
    adddataOutputComponentPkValues: (pkValues: Record<string, unknown>) => void;
    removedataOutputComponentPkValue: (pkValue: string) => void;
    removedataOutputComponentPkValues: (pkValues: Record<string, unknown>) => void;
    isdataOutputComponentMissingRecords: boolean;
    setdataOutputComponentShouldFetch: (shouldFetch: boolean) => void;
    setdataOutputComponentFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: adddataOutputComponentMatrxId,
        addMatrxIds: adddataOutputComponentMatrxIds,
        removeMatrxId: removedataOutputComponentMatrxId,
        removeMatrxIds: removedataOutputComponentMatrxIds,
        addPkValue: adddataOutputComponentPkValue,
        addPkValues: adddataOutputComponentPkValues,
        removePkValue: removedataOutputComponentPkValue,
        removePkValues: removedataOutputComponentPkValues,
        isMissingRecords: isdataOutputComponentMissingRecords,
        setShouldFetch: setdataOutputComponentShouldFetch,
        setFetchMode: setdataOutputComponentFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        adddataOutputComponentMatrxId,
        adddataOutputComponentMatrxIds,
        removedataOutputComponentMatrxId,
        removedataOutputComponentMatrxIds,
        adddataOutputComponentPkValue,
        adddataOutputComponentPkValues,
        removedataOutputComponentPkValue,
        removedataOutputComponentPkValues,
        isdataOutputComponentMissingRecords,
        setdataOutputComponentShouldFetch,
        setdataOutputComponentFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    adddisplayOptionMatrxId: (recordId: MatrxRecordId) => void;
    adddisplayOptionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removedisplayOptionMatrxId: (recordId: MatrxRecordId) => void;
    removedisplayOptionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    adddisplayOptionPkValue: (pkValue: string) => void;
    adddisplayOptionPkValues: (pkValues: Record<string, unknown>) => void;
    removedisplayOptionPkValue: (pkValue: string) => void;
    removedisplayOptionPkValues: (pkValues: Record<string, unknown>) => void;
    isdisplayOptionMissingRecords: boolean;
    setdisplayOptionShouldFetch: (shouldFetch: boolean) => void;
    setdisplayOptionFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: adddisplayOptionMatrxId,
        addMatrxIds: adddisplayOptionMatrxIds,
        removeMatrxId: removedisplayOptionMatrxId,
        removeMatrxIds: removedisplayOptionMatrxIds,
        addPkValue: adddisplayOptionPkValue,
        addPkValues: adddisplayOptionPkValues,
        removePkValue: removedisplayOptionPkValue,
        removePkValues: removedisplayOptionPkValues,
        isMissingRecords: isdisplayOptionMissingRecords,
        setShouldFetch: setdisplayOptionShouldFetch,
        setFetchMode: setdisplayOptionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        adddisplayOptionMatrxId,
        adddisplayOptionMatrxIds,
        removedisplayOptionMatrxId,
        removedisplayOptionMatrxIds,
        adddisplayOptionPkValue,
        adddisplayOptionPkValues,
        removedisplayOptionPkValue,
        removedisplayOptionPkValues,
        isdisplayOptionMissingRecords,
        setdisplayOptionShouldFetch,
        setdisplayOptionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addemailsMatrxId: (recordId: MatrxRecordId) => void;
    addemailsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeemailsMatrxId: (recordId: MatrxRecordId) => void;
    removeemailsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addemailsPkValue: (pkValue: string) => void;
    addemailsPkValues: (pkValues: Record<string, unknown>) => void;
    removeemailsPkValue: (pkValue: string) => void;
    removeemailsPkValues: (pkValues: Record<string, unknown>) => void;
    isemailsMissingRecords: boolean;
    setemailsShouldFetch: (shouldFetch: boolean) => void;
    setemailsFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addemailsMatrxId,
        addMatrxIds: addemailsMatrxIds,
        removeMatrxId: removeemailsMatrxId,
        removeMatrxIds: removeemailsMatrxIds,
        addPkValue: addemailsPkValue,
        addPkValues: addemailsPkValues,
        removePkValue: removeemailsPkValue,
        removePkValues: removeemailsPkValues,
        isMissingRecords: isemailsMissingRecords,
        setShouldFetch: setemailsShouldFetch,
        setFetchMode: setemailsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addemailsMatrxId,
        addemailsMatrxIds,
        removeemailsMatrxId,
        removeemailsMatrxIds,
        addemailsPkValue,
        addemailsPkValues,
        removeemailsPkValue,
        removeemailsPkValues,
        isemailsMissingRecords,
        setemailsShouldFetch,
        setemailsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addextractorMatrxId: (recordId: MatrxRecordId) => void;
    addextractorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeextractorMatrxId: (recordId: MatrxRecordId) => void;
    removeextractorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addextractorPkValue: (pkValue: string) => void;
    addextractorPkValues: (pkValues: Record<string, unknown>) => void;
    removeextractorPkValue: (pkValue: string) => void;
    removeextractorPkValues: (pkValues: Record<string, unknown>) => void;
    isextractorMissingRecords: boolean;
    setextractorShouldFetch: (shouldFetch: boolean) => void;
    setextractorFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addextractorMatrxId,
        addMatrxIds: addextractorMatrxIds,
        removeMatrxId: removeextractorMatrxId,
        removeMatrxIds: removeextractorMatrxIds,
        addPkValue: addextractorPkValue,
        addPkValues: addextractorPkValues,
        removePkValue: removeextractorPkValue,
        removePkValues: removeextractorPkValues,
        isMissingRecords: isextractorMissingRecords,
        setShouldFetch: setextractorShouldFetch,
        setFetchMode: setextractorFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addextractorMatrxId,
        addextractorMatrxIds,
        removeextractorMatrxId,
        removeextractorMatrxIds,
        addextractorPkValue,
        addextractorPkValues,
        removeextractorPkValue,
        removeextractorPkValues,
        isextractorMissingRecords,
        setextractorShouldFetch,
        setextractorFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addfileStructureMatrxId: (recordId: MatrxRecordId) => void;
    addfileStructureMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removefileStructureMatrxId: (recordId: MatrxRecordId) => void;
    removefileStructureMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addfileStructurePkValue: (pkValue: string) => void;
    addfileStructurePkValues: (pkValues: Record<string, unknown>) => void;
    removefileStructurePkValue: (pkValue: string) => void;
    removefileStructurePkValues: (pkValues: Record<string, unknown>) => void;
    isfileStructureMissingRecords: boolean;
    setfileStructureShouldFetch: (shouldFetch: boolean) => void;
    setfileStructureFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addfileStructureMatrxId,
        addMatrxIds: addfileStructureMatrxIds,
        removeMatrxId: removefileStructureMatrxId,
        removeMatrxIds: removefileStructureMatrxIds,
        addPkValue: addfileStructurePkValue,
        addPkValues: addfileStructurePkValues,
        removePkValue: removefileStructurePkValue,
        removePkValues: removefileStructurePkValues,
        isMissingRecords: isfileStructureMissingRecords,
        setShouldFetch: setfileStructureShouldFetch,
        setFetchMode: setfileStructureFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addfileStructureMatrxId,
        addfileStructureMatrxIds,
        removefileStructureMatrxId,
        removefileStructureMatrxIds,
        addfileStructurePkValue,
        addfileStructurePkValues,
        removefileStructurePkValue,
        removefileStructurePkValues,
        isfileStructureMissingRecords,
        setfileStructureShouldFetch,
        setfileStructureFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addflashcardDataMatrxId: (recordId: MatrxRecordId) => void;
    addflashcardDataMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeflashcardDataMatrxId: (recordId: MatrxRecordId) => void;
    removeflashcardDataMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addflashcardDataPkValue: (pkValue: string) => void;
    addflashcardDataPkValues: (pkValues: Record<string, unknown>) => void;
    removeflashcardDataPkValue: (pkValue: string) => void;
    removeflashcardDataPkValues: (pkValues: Record<string, unknown>) => void;
    isflashcardDataMissingRecords: boolean;
    setflashcardDataShouldFetch: (shouldFetch: boolean) => void;
    setflashcardDataFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addflashcardDataMatrxId,
        addMatrxIds: addflashcardDataMatrxIds,
        removeMatrxId: removeflashcardDataMatrxId,
        removeMatrxIds: removeflashcardDataMatrxIds,
        addPkValue: addflashcardDataPkValue,
        addPkValues: addflashcardDataPkValues,
        removePkValue: removeflashcardDataPkValue,
        removePkValues: removeflashcardDataPkValues,
        isMissingRecords: isflashcardDataMissingRecords,
        setShouldFetch: setflashcardDataShouldFetch,
        setFetchMode: setflashcardDataFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addflashcardDataMatrxId,
        addflashcardDataMatrxIds,
        removeflashcardDataMatrxId,
        removeflashcardDataMatrxIds,
        addflashcardDataPkValue,
        addflashcardDataPkValues,
        removeflashcardDataPkValue,
        removeflashcardDataPkValues,
        isflashcardDataMissingRecords,
        setflashcardDataShouldFetch,
        setflashcardDataFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addflashcardHistoryMatrxId: (recordId: MatrxRecordId) => void;
    addflashcardHistoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeflashcardHistoryMatrxId: (recordId: MatrxRecordId) => void;
    removeflashcardHistoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addflashcardHistoryPkValue: (pkValue: string) => void;
    addflashcardHistoryPkValues: (pkValues: Record<string, unknown>) => void;
    removeflashcardHistoryPkValue: (pkValue: string) => void;
    removeflashcardHistoryPkValues: (pkValues: Record<string, unknown>) => void;
    isflashcardHistoryMissingRecords: boolean;
    setflashcardHistoryShouldFetch: (shouldFetch: boolean) => void;
    setflashcardHistoryFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addflashcardHistoryMatrxId,
        addMatrxIds: addflashcardHistoryMatrxIds,
        removeMatrxId: removeflashcardHistoryMatrxId,
        removeMatrxIds: removeflashcardHistoryMatrxIds,
        addPkValue: addflashcardHistoryPkValue,
        addPkValues: addflashcardHistoryPkValues,
        removePkValue: removeflashcardHistoryPkValue,
        removePkValues: removeflashcardHistoryPkValues,
        isMissingRecords: isflashcardHistoryMissingRecords,
        setShouldFetch: setflashcardHistoryShouldFetch,
        setFetchMode: setflashcardHistoryFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addflashcardHistoryMatrxId,
        addflashcardHistoryMatrxIds,
        removeflashcardHistoryMatrxId,
        removeflashcardHistoryMatrxIds,
        addflashcardHistoryPkValue,
        addflashcardHistoryPkValues,
        removeflashcardHistoryPkValue,
        removeflashcardHistoryPkValues,
        isflashcardHistoryMissingRecords,
        setflashcardHistoryShouldFetch,
        setflashcardHistoryFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addflashcardImagesMatrxId: (recordId: MatrxRecordId) => void;
    addflashcardImagesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeflashcardImagesMatrxId: (recordId: MatrxRecordId) => void;
    removeflashcardImagesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addflashcardImagesPkValue: (pkValue: string) => void;
    addflashcardImagesPkValues: (pkValues: Record<string, unknown>) => void;
    removeflashcardImagesPkValue: (pkValue: string) => void;
    removeflashcardImagesPkValues: (pkValues: Record<string, unknown>) => void;
    isflashcardImagesMissingRecords: boolean;
    setflashcardImagesShouldFetch: (shouldFetch: boolean) => void;
    setflashcardImagesFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addflashcardImagesMatrxId,
        addMatrxIds: addflashcardImagesMatrxIds,
        removeMatrxId: removeflashcardImagesMatrxId,
        removeMatrxIds: removeflashcardImagesMatrxIds,
        addPkValue: addflashcardImagesPkValue,
        addPkValues: addflashcardImagesPkValues,
        removePkValue: removeflashcardImagesPkValue,
        removePkValues: removeflashcardImagesPkValues,
        isMissingRecords: isflashcardImagesMissingRecords,
        setShouldFetch: setflashcardImagesShouldFetch,
        setFetchMode: setflashcardImagesFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addflashcardImagesMatrxId,
        addflashcardImagesMatrxIds,
        removeflashcardImagesMatrxId,
        removeflashcardImagesMatrxIds,
        addflashcardImagesPkValue,
        addflashcardImagesPkValues,
        removeflashcardImagesPkValue,
        removeflashcardImagesPkValues,
        isflashcardImagesMissingRecords,
        setflashcardImagesShouldFetch,
        setflashcardImagesFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addflashcardSetRelationsMatrxId: (recordId: MatrxRecordId) => void;
    addflashcardSetRelationsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeflashcardSetRelationsMatrxId: (recordId: MatrxRecordId) => void;
    removeflashcardSetRelationsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addflashcardSetRelationsPkValue: (pkValue: string) => void;
    addflashcardSetRelationsPkValues: (pkValues: Record<string, unknown>) => void;
    removeflashcardSetRelationsPkValue: (pkValue: string) => void;
    removeflashcardSetRelationsPkValues: (pkValues: Record<string, unknown>) => void;
    isflashcardSetRelationsMissingRecords: boolean;
    setflashcardSetRelationsShouldFetch: (shouldFetch: boolean) => void;
    setflashcardSetRelationsFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addflashcardSetRelationsMatrxId,
        addMatrxIds: addflashcardSetRelationsMatrxIds,
        removeMatrxId: removeflashcardSetRelationsMatrxId,
        removeMatrxIds: removeflashcardSetRelationsMatrxIds,
        addPkValue: addflashcardSetRelationsPkValue,
        addPkValues: addflashcardSetRelationsPkValues,
        removePkValue: removeflashcardSetRelationsPkValue,
        removePkValues: removeflashcardSetRelationsPkValues,
        isMissingRecords: isflashcardSetRelationsMissingRecords,
        setShouldFetch: setflashcardSetRelationsShouldFetch,
        setFetchMode: setflashcardSetRelationsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addflashcardSetRelationsMatrxId,
        addflashcardSetRelationsMatrxIds,
        removeflashcardSetRelationsMatrxId,
        removeflashcardSetRelationsMatrxIds,
        addflashcardSetRelationsPkValue,
        addflashcardSetRelationsPkValues,
        removeflashcardSetRelationsPkValue,
        removeflashcardSetRelationsPkValues,
        isflashcardSetRelationsMissingRecords,
        setflashcardSetRelationsShouldFetch,
        setflashcardSetRelationsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addflashcardSetsMatrxId: (recordId: MatrxRecordId) => void;
    addflashcardSetsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeflashcardSetsMatrxId: (recordId: MatrxRecordId) => void;
    removeflashcardSetsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addflashcardSetsPkValue: (pkValue: string) => void;
    addflashcardSetsPkValues: (pkValues: Record<string, unknown>) => void;
    removeflashcardSetsPkValue: (pkValue: string) => void;
    removeflashcardSetsPkValues: (pkValues: Record<string, unknown>) => void;
    isflashcardSetsMissingRecords: boolean;
    setflashcardSetsShouldFetch: (shouldFetch: boolean) => void;
    setflashcardSetsFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addflashcardSetsMatrxId,
        addMatrxIds: addflashcardSetsMatrxIds,
        removeMatrxId: removeflashcardSetsMatrxId,
        removeMatrxIds: removeflashcardSetsMatrxIds,
        addPkValue: addflashcardSetsPkValue,
        addPkValues: addflashcardSetsPkValues,
        removePkValue: removeflashcardSetsPkValue,
        removePkValues: removeflashcardSetsPkValues,
        isMissingRecords: isflashcardSetsMissingRecords,
        setShouldFetch: setflashcardSetsShouldFetch,
        setFetchMode: setflashcardSetsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addflashcardSetsMatrxId,
        addflashcardSetsMatrxIds,
        removeflashcardSetsMatrxId,
        removeflashcardSetsMatrxIds,
        addflashcardSetsPkValue,
        addflashcardSetsPkValues,
        removeflashcardSetsPkValue,
        removeflashcardSetsPkValues,
        isflashcardSetsMissingRecords,
        setflashcardSetsShouldFetch,
        setflashcardSetsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addmessageMatrxId: (recordId: MatrxRecordId) => void;
    addmessageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removemessageMatrxId: (recordId: MatrxRecordId) => void;
    removemessageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addmessagePkValue: (pkValue: string) => void;
    addmessagePkValues: (pkValues: Record<string, unknown>) => void;
    removemessagePkValue: (pkValue: string) => void;
    removemessagePkValues: (pkValues: Record<string, unknown>) => void;
    ismessageMissingRecords: boolean;
    setmessageShouldFetch: (shouldFetch: boolean) => void;
    setmessageFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addmessageMatrxId,
        addMatrxIds: addmessageMatrxIds,
        removeMatrxId: removemessageMatrxId,
        removeMatrxIds: removemessageMatrxIds,
        addPkValue: addmessagePkValue,
        addPkValues: addmessagePkValues,
        removePkValue: removemessagePkValue,
        removePkValues: removemessagePkValues,
        isMissingRecords: ismessageMissingRecords,
        setShouldFetch: setmessageShouldFetch,
        setFetchMode: setmessageFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addmessageMatrxId,
        addmessageMatrxIds,
        removemessageMatrxId,
        removemessageMatrxIds,
        addmessagePkValue,
        addmessagePkValues,
        removemessagePkValue,
        removemessagePkValues,
        ismessageMissingRecords,
        setmessageShouldFetch,
        setmessageFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addmessageBrokerMatrxId: (recordId: MatrxRecordId) => void;
    addmessageBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removemessageBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removemessageBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addmessageBrokerPkValue: (pkValue: string) => void;
    addmessageBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removemessageBrokerPkValue: (pkValue: string) => void;
    removemessageBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    ismessageBrokerMissingRecords: boolean;
    setmessageBrokerShouldFetch: (shouldFetch: boolean) => void;
    setmessageBrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addmessageBrokerMatrxId,
        addMatrxIds: addmessageBrokerMatrxIds,
        removeMatrxId: removemessageBrokerMatrxId,
        removeMatrxIds: removemessageBrokerMatrxIds,
        addPkValue: addmessageBrokerPkValue,
        addPkValues: addmessageBrokerPkValues,
        removePkValue: removemessageBrokerPkValue,
        removePkValues: removemessageBrokerPkValues,
        isMissingRecords: ismessageBrokerMissingRecords,
        setShouldFetch: setmessageBrokerShouldFetch,
        setFetchMode: setmessageBrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addmessageBrokerMatrxId,
        addmessageBrokerMatrxIds,
        removemessageBrokerMatrxId,
        removemessageBrokerMatrxIds,
        addmessageBrokerPkValue,
        addmessageBrokerPkValues,
        removemessageBrokerPkValue,
        removemessageBrokerPkValues,
        ismessageBrokerMissingRecords,
        setmessageBrokerShouldFetch,
        setmessageBrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addmessageTemplateMatrxId: (recordId: MatrxRecordId) => void;
    addmessageTemplateMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removemessageTemplateMatrxId: (recordId: MatrxRecordId) => void;
    removemessageTemplateMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addmessageTemplatePkValue: (pkValue: string) => void;
    addmessageTemplatePkValues: (pkValues: Record<string, unknown>) => void;
    removemessageTemplatePkValue: (pkValue: string) => void;
    removemessageTemplatePkValues: (pkValues: Record<string, unknown>) => void;
    ismessageTemplateMissingRecords: boolean;
    setmessageTemplateShouldFetch: (shouldFetch: boolean) => void;
    setmessageTemplateFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addmessageTemplateMatrxId,
        addMatrxIds: addmessageTemplateMatrxIds,
        removeMatrxId: removemessageTemplateMatrxId,
        removeMatrxIds: removemessageTemplateMatrxIds,
        addPkValue: addmessageTemplatePkValue,
        addPkValues: addmessageTemplatePkValues,
        removePkValue: removemessageTemplatePkValue,
        removePkValues: removemessageTemplatePkValues,
        isMissingRecords: ismessageTemplateMissingRecords,
        setShouldFetch: setmessageTemplateShouldFetch,
        setFetchMode: setmessageTemplateFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addmessageTemplateMatrxId,
        addmessageTemplateMatrxIds,
        removemessageTemplateMatrxId,
        removemessageTemplateMatrxIds,
        addmessageTemplatePkValue,
        addmessageTemplatePkValues,
        removemessageTemplatePkValue,
        removemessageTemplatePkValues,
        ismessageTemplateMissingRecords,
        setmessageTemplateShouldFetch,
        setmessageTemplateFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addprocessorMatrxId: (recordId: MatrxRecordId) => void;
    addprocessorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeprocessorMatrxId: (recordId: MatrxRecordId) => void;
    removeprocessorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addprocessorPkValue: (pkValue: string) => void;
    addprocessorPkValues: (pkValues: Record<string, unknown>) => void;
    removeprocessorPkValue: (pkValue: string) => void;
    removeprocessorPkValues: (pkValues: Record<string, unknown>) => void;
    isprocessorMissingRecords: boolean;
    setprocessorShouldFetch: (shouldFetch: boolean) => void;
    setprocessorFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addprocessorMatrxId,
        addMatrxIds: addprocessorMatrxIds,
        removeMatrxId: removeprocessorMatrxId,
        removeMatrxIds: removeprocessorMatrxIds,
        addPkValue: addprocessorPkValue,
        addPkValues: addprocessorPkValues,
        removePkValue: removeprocessorPkValue,
        removePkValues: removeprocessorPkValues,
        isMissingRecords: isprocessorMissingRecords,
        setShouldFetch: setprocessorShouldFetch,
        setFetchMode: setprocessorFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addprocessorMatrxId,
        addprocessorMatrxIds,
        removeprocessorMatrxId,
        removeprocessorMatrxIds,
        addprocessorPkValue,
        addprocessorPkValues,
        removeprocessorPkValue,
        removeprocessorPkValues,
        isprocessorMissingRecords,
        setprocessorShouldFetch,
        setprocessorFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addprojectMembersMatrxId: (recordId: MatrxRecordId) => void;
    addprojectMembersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeprojectMembersMatrxId: (recordId: MatrxRecordId) => void;
    removeprojectMembersMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addprojectMembersPkValue: (pkValue: string) => void;
    addprojectMembersPkValues: (pkValues: Record<string, unknown>) => void;
    removeprojectMembersPkValue: (pkValue: string) => void;
    removeprojectMembersPkValues: (pkValues: Record<string, unknown>) => void;
    isprojectMembersMissingRecords: boolean;
    setprojectMembersShouldFetch: (shouldFetch: boolean) => void;
    setprojectMembersFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addprojectMembersMatrxId,
        addMatrxIds: addprojectMembersMatrxIds,
        removeMatrxId: removeprojectMembersMatrxId,
        removeMatrxIds: removeprojectMembersMatrxIds,
        addPkValue: addprojectMembersPkValue,
        addPkValues: addprojectMembersPkValues,
        removePkValue: removeprojectMembersPkValue,
        removePkValues: removeprojectMembersPkValues,
        isMissingRecords: isprojectMembersMissingRecords,
        setShouldFetch: setprojectMembersShouldFetch,
        setFetchMode: setprojectMembersFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addprojectMembersMatrxId,
        addprojectMembersMatrxIds,
        removeprojectMembersMatrxId,
        removeprojectMembersMatrxIds,
        addprojectMembersPkValue,
        addprojectMembersPkValues,
        removeprojectMembersPkValue,
        removeprojectMembersPkValues,
        isprojectMembersMissingRecords,
        setprojectMembersShouldFetch,
        setprojectMembersFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addprojectsMatrxId: (recordId: MatrxRecordId) => void;
    addprojectsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeprojectsMatrxId: (recordId: MatrxRecordId) => void;
    removeprojectsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addprojectsPkValue: (pkValue: string) => void;
    addprojectsPkValues: (pkValues: Record<string, unknown>) => void;
    removeprojectsPkValue: (pkValue: string) => void;
    removeprojectsPkValues: (pkValues: Record<string, unknown>) => void;
    isprojectsMissingRecords: boolean;
    setprojectsShouldFetch: (shouldFetch: boolean) => void;
    setprojectsFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addprojectsMatrxId,
        addMatrxIds: addprojectsMatrxIds,
        removeMatrxId: removeprojectsMatrxId,
        removeMatrxIds: removeprojectsMatrxIds,
        addPkValue: addprojectsPkValue,
        addPkValues: addprojectsPkValues,
        removePkValue: removeprojectsPkValue,
        removePkValues: removeprojectsPkValues,
        isMissingRecords: isprojectsMissingRecords,
        setShouldFetch: setprojectsShouldFetch,
        setFetchMode: setprojectsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addprojectsMatrxId,
        addprojectsMatrxIds,
        removeprojectsMatrxId,
        removeprojectsMatrxIds,
        addprojectsPkValue,
        addprojectsPkValues,
        removeprojectsPkValue,
        removeprojectsPkValues,
        isprojectsMissingRecords,
        setprojectsShouldFetch,
        setprojectsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipePkValue: (pkValue: string) => void;
    addrecipePkValues: (pkValues: Record<string, unknown>) => void;
    removerecipePkValue: (pkValue: string) => void;
    removerecipePkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeMissingRecords: boolean;
    setrecipeShouldFetch: (shouldFetch: boolean) => void;
    setrecipeFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeMatrxId,
        addMatrxIds: addrecipeMatrxIds,
        removeMatrxId: removerecipeMatrxId,
        removeMatrxIds: removerecipeMatrxIds,
        addPkValue: addrecipePkValue,
        addPkValues: addrecipePkValues,
        removePkValue: removerecipePkValue,
        removePkValues: removerecipePkValues,
        isMissingRecords: isrecipeMissingRecords,
        setShouldFetch: setrecipeShouldFetch,
        setFetchMode: setrecipeFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeMatrxId,
        addrecipeMatrxIds,
        removerecipeMatrxId,
        removerecipeMatrxIds,
        addrecipePkValue,
        addrecipePkValues,
        removerecipePkValue,
        removerecipePkValues,
        isrecipeMissingRecords,
        setrecipeShouldFetch,
        setrecipeFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeBrokerMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeBrokerMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeBrokerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipeBrokerPkValue: (pkValue: string) => void;
    addrecipeBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    removerecipeBrokerPkValue: (pkValue: string) => void;
    removerecipeBrokerPkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeBrokerMissingRecords: boolean;
    setrecipeBrokerShouldFetch: (shouldFetch: boolean) => void;
    setrecipeBrokerFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeBrokerMatrxId,
        addMatrxIds: addrecipeBrokerMatrxIds,
        removeMatrxId: removerecipeBrokerMatrxId,
        removeMatrxIds: removerecipeBrokerMatrxIds,
        addPkValue: addrecipeBrokerPkValue,
        addPkValues: addrecipeBrokerPkValues,
        removePkValue: removerecipeBrokerPkValue,
        removePkValues: removerecipeBrokerPkValues,
        isMissingRecords: isrecipeBrokerMissingRecords,
        setShouldFetch: setrecipeBrokerShouldFetch,
        setFetchMode: setrecipeBrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeBrokerMatrxId,
        addrecipeBrokerMatrxIds,
        removerecipeBrokerMatrxId,
        removerecipeBrokerMatrxIds,
        addrecipeBrokerPkValue,
        addrecipeBrokerPkValues,
        removerecipeBrokerPkValue,
        removerecipeBrokerPkValues,
        isrecipeBrokerMissingRecords,
        setrecipeBrokerShouldFetch,
        setrecipeBrokerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeDisplayMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeDisplayMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeDisplayMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeDisplayMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipeDisplayPkValue: (pkValue: string) => void;
    addrecipeDisplayPkValues: (pkValues: Record<string, unknown>) => void;
    removerecipeDisplayPkValue: (pkValue: string) => void;
    removerecipeDisplayPkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeDisplayMissingRecords: boolean;
    setrecipeDisplayShouldFetch: (shouldFetch: boolean) => void;
    setrecipeDisplayFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeDisplayMatrxId,
        addMatrxIds: addrecipeDisplayMatrxIds,
        removeMatrxId: removerecipeDisplayMatrxId,
        removeMatrxIds: removerecipeDisplayMatrxIds,
        addPkValue: addrecipeDisplayPkValue,
        addPkValues: addrecipeDisplayPkValues,
        removePkValue: removerecipeDisplayPkValue,
        removePkValues: removerecipeDisplayPkValues,
        isMissingRecords: isrecipeDisplayMissingRecords,
        setShouldFetch: setrecipeDisplayShouldFetch,
        setFetchMode: setrecipeDisplayFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeDisplayMatrxId,
        addrecipeDisplayMatrxIds,
        removerecipeDisplayMatrxId,
        removerecipeDisplayMatrxIds,
        addrecipeDisplayPkValue,
        addrecipeDisplayPkValues,
        removerecipeDisplayPkValue,
        removerecipeDisplayPkValues,
        isrecipeDisplayMissingRecords,
        setrecipeDisplayShouldFetch,
        setrecipeDisplayFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeFunctionMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeFunctionMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipeFunctionPkValue: (pkValue: string) => void;
    addrecipeFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    removerecipeFunctionPkValue: (pkValue: string) => void;
    removerecipeFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeFunctionMissingRecords: boolean;
    setrecipeFunctionShouldFetch: (shouldFetch: boolean) => void;
    setrecipeFunctionFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeFunctionMatrxId,
        addMatrxIds: addrecipeFunctionMatrxIds,
        removeMatrxId: removerecipeFunctionMatrxId,
        removeMatrxIds: removerecipeFunctionMatrxIds,
        addPkValue: addrecipeFunctionPkValue,
        addPkValues: addrecipeFunctionPkValues,
        removePkValue: removerecipeFunctionPkValue,
        removePkValues: removerecipeFunctionPkValues,
        isMissingRecords: isrecipeFunctionMissingRecords,
        setShouldFetch: setrecipeFunctionShouldFetch,
        setFetchMode: setrecipeFunctionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeFunctionMatrxId,
        addrecipeFunctionMatrxIds,
        removerecipeFunctionMatrxId,
        removerecipeFunctionMatrxIds,
        addrecipeFunctionPkValue,
        addrecipeFunctionPkValues,
        removerecipeFunctionPkValue,
        removerecipeFunctionPkValues,
        isrecipeFunctionMissingRecords,
        setrecipeFunctionShouldFetch,
        setrecipeFunctionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeMessageMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeMessageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeMessageMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeMessageMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipeMessagePkValue: (pkValue: string) => void;
    addrecipeMessagePkValues: (pkValues: Record<string, unknown>) => void;
    removerecipeMessagePkValue: (pkValue: string) => void;
    removerecipeMessagePkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeMessageMissingRecords: boolean;
    setrecipeMessageShouldFetch: (shouldFetch: boolean) => void;
    setrecipeMessageFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeMessageMatrxId,
        addMatrxIds: addrecipeMessageMatrxIds,
        removeMatrxId: removerecipeMessageMatrxId,
        removeMatrxIds: removerecipeMessageMatrxIds,
        addPkValue: addrecipeMessagePkValue,
        addPkValues: addrecipeMessagePkValues,
        removePkValue: removerecipeMessagePkValue,
        removePkValues: removerecipeMessagePkValues,
        isMissingRecords: isrecipeMessageMissingRecords,
        setShouldFetch: setrecipeMessageShouldFetch,
        setFetchMode: setrecipeMessageFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeMessageMatrxId,
        addrecipeMessageMatrxIds,
        removerecipeMessageMatrxId,
        removerecipeMessageMatrxIds,
        addrecipeMessagePkValue,
        addrecipeMessagePkValues,
        removerecipeMessagePkValue,
        removerecipeMessagePkValues,
        isrecipeMessageMissingRecords,
        setrecipeMessageShouldFetch,
        setrecipeMessageFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeMessageReorderQueueMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeMessageReorderQueueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeMessageReorderQueueMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeMessageReorderQueueMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipeMessageReorderQueuePkValue: (pkValue: string) => void;
    addrecipeMessageReorderQueuePkValues: (pkValues: Record<string, unknown>) => void;
    removerecipeMessageReorderQueuePkValue: (pkValue: string) => void;
    removerecipeMessageReorderQueuePkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeMessageReorderQueueMissingRecords: boolean;
    setrecipeMessageReorderQueueShouldFetch: (shouldFetch: boolean) => void;
    setrecipeMessageReorderQueueFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeMessageReorderQueueMatrxId,
        addMatrxIds: addrecipeMessageReorderQueueMatrxIds,
        removeMatrxId: removerecipeMessageReorderQueueMatrxId,
        removeMatrxIds: removerecipeMessageReorderQueueMatrxIds,
        addPkValue: addrecipeMessageReorderQueuePkValue,
        addPkValues: addrecipeMessageReorderQueuePkValues,
        removePkValue: removerecipeMessageReorderQueuePkValue,
        removePkValues: removerecipeMessageReorderQueuePkValues,
        isMissingRecords: isrecipeMessageReorderQueueMissingRecords,
        setShouldFetch: setrecipeMessageReorderQueueShouldFetch,
        setFetchMode: setrecipeMessageReorderQueueFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeMessageReorderQueueMatrxId,
        addrecipeMessageReorderQueueMatrxIds,
        removerecipeMessageReorderQueueMatrxId,
        removerecipeMessageReorderQueueMatrxIds,
        addrecipeMessageReorderQueuePkValue,
        addrecipeMessageReorderQueuePkValues,
        removerecipeMessageReorderQueuePkValue,
        removerecipeMessageReorderQueuePkValues,
        isrecipeMessageReorderQueueMissingRecords,
        setrecipeMessageReorderQueueShouldFetch,
        setrecipeMessageReorderQueueFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeModelMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeModelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeModelMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeModelMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipeModelPkValue: (pkValue: string) => void;
    addrecipeModelPkValues: (pkValues: Record<string, unknown>) => void;
    removerecipeModelPkValue: (pkValue: string) => void;
    removerecipeModelPkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeModelMissingRecords: boolean;
    setrecipeModelShouldFetch: (shouldFetch: boolean) => void;
    setrecipeModelFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeModelMatrxId,
        addMatrxIds: addrecipeModelMatrxIds,
        removeMatrxId: removerecipeModelMatrxId,
        removeMatrxIds: removerecipeModelMatrxIds,
        addPkValue: addrecipeModelPkValue,
        addPkValues: addrecipeModelPkValues,
        removePkValue: removerecipeModelPkValue,
        removePkValues: removerecipeModelPkValues,
        isMissingRecords: isrecipeModelMissingRecords,
        setShouldFetch: setrecipeModelShouldFetch,
        setFetchMode: setrecipeModelFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeModelMatrxId,
        addrecipeModelMatrxIds,
        removerecipeModelMatrxId,
        removerecipeModelMatrxIds,
        addrecipeModelPkValue,
        addrecipeModelPkValues,
        removerecipeModelPkValue,
        removerecipeModelPkValues,
        isrecipeModelMissingRecords,
        setrecipeModelShouldFetch,
        setrecipeModelFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeProcessorMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeProcessorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeProcessorMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeProcessorMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipeProcessorPkValue: (pkValue: string) => void;
    addrecipeProcessorPkValues: (pkValues: Record<string, unknown>) => void;
    removerecipeProcessorPkValue: (pkValue: string) => void;
    removerecipeProcessorPkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeProcessorMissingRecords: boolean;
    setrecipeProcessorShouldFetch: (shouldFetch: boolean) => void;
    setrecipeProcessorFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeProcessorMatrxId,
        addMatrxIds: addrecipeProcessorMatrxIds,
        removeMatrxId: removerecipeProcessorMatrxId,
        removeMatrxIds: removerecipeProcessorMatrxIds,
        addPkValue: addrecipeProcessorPkValue,
        addPkValues: addrecipeProcessorPkValues,
        removePkValue: removerecipeProcessorPkValue,
        removePkValues: removerecipeProcessorPkValues,
        isMissingRecords: isrecipeProcessorMissingRecords,
        setShouldFetch: setrecipeProcessorShouldFetch,
        setFetchMode: setrecipeProcessorFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeProcessorMatrxId,
        addrecipeProcessorMatrxIds,
        removerecipeProcessorMatrxId,
        removerecipeProcessorMatrxIds,
        addrecipeProcessorPkValue,
        addrecipeProcessorPkValues,
        removerecipeProcessorPkValue,
        removerecipeProcessorPkValues,
        isrecipeProcessorMissingRecords,
        setrecipeProcessorShouldFetch,
        setrecipeProcessorFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addrecipeToolMatrxId: (recordId: MatrxRecordId) => void;
    addrecipeToolMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removerecipeToolMatrxId: (recordId: MatrxRecordId) => void;
    removerecipeToolMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addrecipeToolPkValue: (pkValue: string) => void;
    addrecipeToolPkValues: (pkValues: Record<string, unknown>) => void;
    removerecipeToolPkValue: (pkValue: string) => void;
    removerecipeToolPkValues: (pkValues: Record<string, unknown>) => void;
    isrecipeToolMissingRecords: boolean;
    setrecipeToolShouldFetch: (shouldFetch: boolean) => void;
    setrecipeToolFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addrecipeToolMatrxId,
        addMatrxIds: addrecipeToolMatrxIds,
        removeMatrxId: removerecipeToolMatrxId,
        removeMatrxIds: removerecipeToolMatrxIds,
        addPkValue: addrecipeToolPkValue,
        addPkValues: addrecipeToolPkValues,
        removePkValue: removerecipeToolPkValue,
        removePkValues: removerecipeToolPkValues,
        isMissingRecords: isrecipeToolMissingRecords,
        setShouldFetch: setrecipeToolShouldFetch,
        setFetchMode: setrecipeToolFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addrecipeToolMatrxId,
        addrecipeToolMatrxIds,
        removerecipeToolMatrxId,
        removerecipeToolMatrxIds,
        addrecipeToolPkValue,
        addrecipeToolPkValues,
        removerecipeToolPkValue,
        removerecipeToolPkValues,
        isrecipeToolMissingRecords,
        setrecipeToolShouldFetch,
        setrecipeToolFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addregisteredFunctionMatrxId: (recordId: MatrxRecordId) => void;
    addregisteredFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeregisteredFunctionMatrxId: (recordId: MatrxRecordId) => void;
    removeregisteredFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addregisteredFunctionPkValue: (pkValue: string) => void;
    addregisteredFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    removeregisteredFunctionPkValue: (pkValue: string) => void;
    removeregisteredFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    isregisteredFunctionMissingRecords: boolean;
    setregisteredFunctionShouldFetch: (shouldFetch: boolean) => void;
    setregisteredFunctionFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addregisteredFunctionMatrxId,
        addMatrxIds: addregisteredFunctionMatrxIds,
        removeMatrxId: removeregisteredFunctionMatrxId,
        removeMatrxIds: removeregisteredFunctionMatrxIds,
        addPkValue: addregisteredFunctionPkValue,
        addPkValues: addregisteredFunctionPkValues,
        removePkValue: removeregisteredFunctionPkValue,
        removePkValues: removeregisteredFunctionPkValues,
        isMissingRecords: isregisteredFunctionMissingRecords,
        setShouldFetch: setregisteredFunctionShouldFetch,
        setFetchMode: setregisteredFunctionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addregisteredFunctionMatrxId,
        addregisteredFunctionMatrxIds,
        removeregisteredFunctionMatrxId,
        removeregisteredFunctionMatrxIds,
        addregisteredFunctionPkValue,
        addregisteredFunctionPkValues,
        removeregisteredFunctionPkValue,
        removeregisteredFunctionPkValues,
        isregisteredFunctionMissingRecords,
        setregisteredFunctionShouldFetch,
        setregisteredFunctionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addsubcategoryMatrxId: (recordId: MatrxRecordId) => void;
    addsubcategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removesubcategoryMatrxId: (recordId: MatrxRecordId) => void;
    removesubcategoryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addsubcategoryPkValue: (pkValue: string) => void;
    addsubcategoryPkValues: (pkValues: Record<string, unknown>) => void;
    removesubcategoryPkValue: (pkValue: string) => void;
    removesubcategoryPkValues: (pkValues: Record<string, unknown>) => void;
    issubcategoryMissingRecords: boolean;
    setsubcategoryShouldFetch: (shouldFetch: boolean) => void;
    setsubcategoryFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addsubcategoryMatrxId,
        addMatrxIds: addsubcategoryMatrxIds,
        removeMatrxId: removesubcategoryMatrxId,
        removeMatrxIds: removesubcategoryMatrxIds,
        addPkValue: addsubcategoryPkValue,
        addPkValues: addsubcategoryPkValues,
        removePkValue: removesubcategoryPkValue,
        removePkValues: removesubcategoryPkValues,
        isMissingRecords: issubcategoryMissingRecords,
        setShouldFetch: setsubcategoryShouldFetch,
        setFetchMode: setsubcategoryFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addsubcategoryMatrxId,
        addsubcategoryMatrxIds,
        removesubcategoryMatrxId,
        removesubcategoryMatrxIds,
        addsubcategoryPkValue,
        addsubcategoryPkValues,
        removesubcategoryPkValue,
        removesubcategoryPkValues,
        issubcategoryMissingRecords,
        setsubcategoryShouldFetch,
        setsubcategoryFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addsystemFunctionMatrxId: (recordId: MatrxRecordId) => void;
    addsystemFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removesystemFunctionMatrxId: (recordId: MatrxRecordId) => void;
    removesystemFunctionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addsystemFunctionPkValue: (pkValue: string) => void;
    addsystemFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    removesystemFunctionPkValue: (pkValue: string) => void;
    removesystemFunctionPkValues: (pkValues: Record<string, unknown>) => void;
    issystemFunctionMissingRecords: boolean;
    setsystemFunctionShouldFetch: (shouldFetch: boolean) => void;
    setsystemFunctionFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addsystemFunctionMatrxId,
        addMatrxIds: addsystemFunctionMatrxIds,
        removeMatrxId: removesystemFunctionMatrxId,
        removeMatrxIds: removesystemFunctionMatrxIds,
        addPkValue: addsystemFunctionPkValue,
        addPkValues: addsystemFunctionPkValues,
        removePkValue: removesystemFunctionPkValue,
        removePkValues: removesystemFunctionPkValues,
        isMissingRecords: issystemFunctionMissingRecords,
        setShouldFetch: setsystemFunctionShouldFetch,
        setFetchMode: setsystemFunctionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addsystemFunctionMatrxId,
        addsystemFunctionMatrxIds,
        removesystemFunctionMatrxId,
        removesystemFunctionMatrxIds,
        addsystemFunctionPkValue,
        addsystemFunctionPkValues,
        removesystemFunctionPkValue,
        removesystemFunctionPkValues,
        issystemFunctionMissingRecords,
        setsystemFunctionShouldFetch,
        setsystemFunctionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addtaskAssignmentsMatrxId: (recordId: MatrxRecordId) => void;
    addtaskAssignmentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removetaskAssignmentsMatrxId: (recordId: MatrxRecordId) => void;
    removetaskAssignmentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addtaskAssignmentsPkValue: (pkValue: string) => void;
    addtaskAssignmentsPkValues: (pkValues: Record<string, unknown>) => void;
    removetaskAssignmentsPkValue: (pkValue: string) => void;
    removetaskAssignmentsPkValues: (pkValues: Record<string, unknown>) => void;
    istaskAssignmentsMissingRecords: boolean;
    settaskAssignmentsShouldFetch: (shouldFetch: boolean) => void;
    settaskAssignmentsFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addtaskAssignmentsMatrxId,
        addMatrxIds: addtaskAssignmentsMatrxIds,
        removeMatrxId: removetaskAssignmentsMatrxId,
        removeMatrxIds: removetaskAssignmentsMatrxIds,
        addPkValue: addtaskAssignmentsPkValue,
        addPkValues: addtaskAssignmentsPkValues,
        removePkValue: removetaskAssignmentsPkValue,
        removePkValues: removetaskAssignmentsPkValues,
        isMissingRecords: istaskAssignmentsMissingRecords,
        setShouldFetch: settaskAssignmentsShouldFetch,
        setFetchMode: settaskAssignmentsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addtaskAssignmentsMatrxId,
        addtaskAssignmentsMatrxIds,
        removetaskAssignmentsMatrxId,
        removetaskAssignmentsMatrxIds,
        addtaskAssignmentsPkValue,
        addtaskAssignmentsPkValues,
        removetaskAssignmentsPkValue,
        removetaskAssignmentsPkValues,
        istaskAssignmentsMissingRecords,
        settaskAssignmentsShouldFetch,
        settaskAssignmentsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addtaskAttachmentsMatrxId: (recordId: MatrxRecordId) => void;
    addtaskAttachmentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removetaskAttachmentsMatrxId: (recordId: MatrxRecordId) => void;
    removetaskAttachmentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addtaskAttachmentsPkValue: (pkValue: string) => void;
    addtaskAttachmentsPkValues: (pkValues: Record<string, unknown>) => void;
    removetaskAttachmentsPkValue: (pkValue: string) => void;
    removetaskAttachmentsPkValues: (pkValues: Record<string, unknown>) => void;
    istaskAttachmentsMissingRecords: boolean;
    settaskAttachmentsShouldFetch: (shouldFetch: boolean) => void;
    settaskAttachmentsFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addtaskAttachmentsMatrxId,
        addMatrxIds: addtaskAttachmentsMatrxIds,
        removeMatrxId: removetaskAttachmentsMatrxId,
        removeMatrxIds: removetaskAttachmentsMatrxIds,
        addPkValue: addtaskAttachmentsPkValue,
        addPkValues: addtaskAttachmentsPkValues,
        removePkValue: removetaskAttachmentsPkValue,
        removePkValues: removetaskAttachmentsPkValues,
        isMissingRecords: istaskAttachmentsMissingRecords,
        setShouldFetch: settaskAttachmentsShouldFetch,
        setFetchMode: settaskAttachmentsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addtaskAttachmentsMatrxId,
        addtaskAttachmentsMatrxIds,
        removetaskAttachmentsMatrxId,
        removetaskAttachmentsMatrxIds,
        addtaskAttachmentsPkValue,
        addtaskAttachmentsPkValues,
        removetaskAttachmentsPkValue,
        removetaskAttachmentsPkValues,
        istaskAttachmentsMissingRecords,
        settaskAttachmentsShouldFetch,
        settaskAttachmentsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addtaskCommentsMatrxId: (recordId: MatrxRecordId) => void;
    addtaskCommentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removetaskCommentsMatrxId: (recordId: MatrxRecordId) => void;
    removetaskCommentsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addtaskCommentsPkValue: (pkValue: string) => void;
    addtaskCommentsPkValues: (pkValues: Record<string, unknown>) => void;
    removetaskCommentsPkValue: (pkValue: string) => void;
    removetaskCommentsPkValues: (pkValues: Record<string, unknown>) => void;
    istaskCommentsMissingRecords: boolean;
    settaskCommentsShouldFetch: (shouldFetch: boolean) => void;
    settaskCommentsFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addtaskCommentsMatrxId,
        addMatrxIds: addtaskCommentsMatrxIds,
        removeMatrxId: removetaskCommentsMatrxId,
        removeMatrxIds: removetaskCommentsMatrxIds,
        addPkValue: addtaskCommentsPkValue,
        addPkValues: addtaskCommentsPkValues,
        removePkValue: removetaskCommentsPkValue,
        removePkValues: removetaskCommentsPkValues,
        isMissingRecords: istaskCommentsMissingRecords,
        setShouldFetch: settaskCommentsShouldFetch,
        setFetchMode: settaskCommentsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addtaskCommentsMatrxId,
        addtaskCommentsMatrxIds,
        removetaskCommentsMatrxId,
        removetaskCommentsMatrxIds,
        addtaskCommentsPkValue,
        addtaskCommentsPkValues,
        removetaskCommentsPkValue,
        removetaskCommentsPkValues,
        istaskCommentsMissingRecords,
        settaskCommentsShouldFetch,
        settaskCommentsFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addtasksMatrxId: (recordId: MatrxRecordId) => void;
    addtasksMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removetasksMatrxId: (recordId: MatrxRecordId) => void;
    removetasksMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addtasksPkValue: (pkValue: string) => void;
    addtasksPkValues: (pkValues: Record<string, unknown>) => void;
    removetasksPkValue: (pkValue: string) => void;
    removetasksPkValues: (pkValues: Record<string, unknown>) => void;
    istasksMissingRecords: boolean;
    settasksShouldFetch: (shouldFetch: boolean) => void;
    settasksFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addtasksMatrxId,
        addMatrxIds: addtasksMatrxIds,
        removeMatrxId: removetasksMatrxId,
        removeMatrxIds: removetasksMatrxIds,
        addPkValue: addtasksPkValue,
        addPkValues: addtasksPkValues,
        removePkValue: removetasksPkValue,
        removePkValues: removetasksPkValues,
        isMissingRecords: istasksMissingRecords,
        setShouldFetch: settasksShouldFetch,
        setFetchMode: settasksFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addtasksMatrxId,
        addtasksMatrxIds,
        removetasksMatrxId,
        removetasksMatrxIds,
        addtasksPkValue,
        addtasksPkValues,
        removetasksPkValue,
        removetasksPkValues,
        istasksMissingRecords,
        settasksShouldFetch,
        settasksFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addtoolMatrxId: (recordId: MatrxRecordId) => void;
    addtoolMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removetoolMatrxId: (recordId: MatrxRecordId) => void;
    removetoolMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addtoolPkValue: (pkValue: string) => void;
    addtoolPkValues: (pkValues: Record<string, unknown>) => void;
    removetoolPkValue: (pkValue: string) => void;
    removetoolPkValues: (pkValues: Record<string, unknown>) => void;
    istoolMissingRecords: boolean;
    settoolShouldFetch: (shouldFetch: boolean) => void;
    settoolFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addtoolMatrxId,
        addMatrxIds: addtoolMatrxIds,
        removeMatrxId: removetoolMatrxId,
        removeMatrxIds: removetoolMatrxIds,
        addPkValue: addtoolPkValue,
        addPkValues: addtoolPkValues,
        removePkValue: removetoolPkValue,
        removePkValues: removetoolPkValues,
        isMissingRecords: istoolMissingRecords,
        setShouldFetch: settoolShouldFetch,
        setFetchMode: settoolFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addtoolMatrxId,
        addtoolMatrxIds,
        removetoolMatrxId,
        removetoolMatrxIds,
        addtoolPkValue,
        addtoolPkValues,
        removetoolPkValue,
        removetoolPkValues,
        istoolMissingRecords,
        settoolShouldFetch,
        settoolFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addtransformerMatrxId: (recordId: MatrxRecordId) => void;
    addtransformerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removetransformerMatrxId: (recordId: MatrxRecordId) => void;
    removetransformerMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addtransformerPkValue: (pkValue: string) => void;
    addtransformerPkValues: (pkValues: Record<string, unknown>) => void;
    removetransformerPkValue: (pkValue: string) => void;
    removetransformerPkValues: (pkValues: Record<string, unknown>) => void;
    istransformerMissingRecords: boolean;
    settransformerShouldFetch: (shouldFetch: boolean) => void;
    settransformerFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addtransformerMatrxId,
        addMatrxIds: addtransformerMatrxIds,
        removeMatrxId: removetransformerMatrxId,
        removeMatrxIds: removetransformerMatrxIds,
        addPkValue: addtransformerPkValue,
        addPkValues: addtransformerPkValues,
        removePkValue: removetransformerPkValue,
        removePkValues: removetransformerPkValues,
        isMissingRecords: istransformerMissingRecords,
        setShouldFetch: settransformerShouldFetch,
        setFetchMode: settransformerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addtransformerMatrxId,
        addtransformerMatrxIds,
        removetransformerMatrxId,
        removetransformerMatrxIds,
        addtransformerPkValue,
        addtransformerPkValues,
        removetransformerPkValue,
        removetransformerPkValues,
        istransformerMissingRecords,
        settransformerShouldFetch,
        settransformerFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    adduserPreferencesMatrxId: (recordId: MatrxRecordId) => void;
    adduserPreferencesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removeuserPreferencesMatrxId: (recordId: MatrxRecordId) => void;
    removeuserPreferencesMatrxIds: (recordIds: MatrxRecordId[]) => void;
    adduserPreferencesPkValue: (pkValue: string) => void;
    adduserPreferencesPkValues: (pkValues: Record<string, unknown>) => void;
    removeuserPreferencesPkValue: (pkValue: string) => void;
    removeuserPreferencesPkValues: (pkValues: Record<string, unknown>) => void;
    isuserPreferencesMissingRecords: boolean;
    setuserPreferencesShouldFetch: (shouldFetch: boolean) => void;
    setuserPreferencesFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: adduserPreferencesMatrxId,
        addMatrxIds: adduserPreferencesMatrxIds,
        removeMatrxId: removeuserPreferencesMatrxId,
        removeMatrxIds: removeuserPreferencesMatrxIds,
        addPkValue: adduserPreferencesPkValue,
        addPkValues: adduserPreferencesPkValues,
        removePkValue: removeuserPreferencesPkValue,
        removePkValues: removeuserPreferencesPkValues,
        isMissingRecords: isuserPreferencesMissingRecords,
        setShouldFetch: setuserPreferencesShouldFetch,
        setFetchMode: setuserPreferencesFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        adduserPreferencesMatrxId,
        adduserPreferencesMatrxIds,
        removeuserPreferencesMatrxId,
        removeuserPreferencesMatrxIds,
        adduserPreferencesPkValue,
        adduserPreferencesPkValues,
        removeuserPreferencesPkValue,
        removeuserPreferencesPkValues,
        isuserPreferencesMissingRecords,
        setuserPreferencesShouldFetch,
        setuserPreferencesFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addwcClaimMatrxId: (recordId: MatrxRecordId) => void;
    addwcClaimMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removewcClaimMatrxId: (recordId: MatrxRecordId) => void;
    removewcClaimMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addwcClaimPkValue: (pkValue: string) => void;
    addwcClaimPkValues: (pkValues: Record<string, unknown>) => void;
    removewcClaimPkValue: (pkValue: string) => void;
    removewcClaimPkValues: (pkValues: Record<string, unknown>) => void;
    iswcClaimMissingRecords: boolean;
    setwcClaimShouldFetch: (shouldFetch: boolean) => void;
    setwcClaimFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addwcClaimMatrxId,
        addMatrxIds: addwcClaimMatrxIds,
        removeMatrxId: removewcClaimMatrxId,
        removeMatrxIds: removewcClaimMatrxIds,
        addPkValue: addwcClaimPkValue,
        addPkValues: addwcClaimPkValues,
        removePkValue: removewcClaimPkValue,
        removePkValues: removewcClaimPkValues,
        isMissingRecords: iswcClaimMissingRecords,
        setShouldFetch: setwcClaimShouldFetch,
        setFetchMode: setwcClaimFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addwcClaimMatrxId,
        addwcClaimMatrxIds,
        removewcClaimMatrxId,
        removewcClaimMatrxIds,
        addwcClaimPkValue,
        addwcClaimPkValues,
        removewcClaimPkValue,
        removewcClaimPkValues,
        iswcClaimMissingRecords,
        setwcClaimShouldFetch,
        setwcClaimFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addwcImpairmentDefinitionMatrxId: (recordId: MatrxRecordId) => void;
    addwcImpairmentDefinitionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removewcImpairmentDefinitionMatrxId: (recordId: MatrxRecordId) => void;
    removewcImpairmentDefinitionMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addwcImpairmentDefinitionPkValue: (pkValue: string) => void;
    addwcImpairmentDefinitionPkValues: (pkValues: Record<string, unknown>) => void;
    removewcImpairmentDefinitionPkValue: (pkValue: string) => void;
    removewcImpairmentDefinitionPkValues: (pkValues: Record<string, unknown>) => void;
    iswcImpairmentDefinitionMissingRecords: boolean;
    setwcImpairmentDefinitionShouldFetch: (shouldFetch: boolean) => void;
    setwcImpairmentDefinitionFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addwcImpairmentDefinitionMatrxId,
        addMatrxIds: addwcImpairmentDefinitionMatrxIds,
        removeMatrxId: removewcImpairmentDefinitionMatrxId,
        removeMatrxIds: removewcImpairmentDefinitionMatrxIds,
        addPkValue: addwcImpairmentDefinitionPkValue,
        addPkValues: addwcImpairmentDefinitionPkValues,
        removePkValue: removewcImpairmentDefinitionPkValue,
        removePkValues: removewcImpairmentDefinitionPkValues,
        isMissingRecords: iswcImpairmentDefinitionMissingRecords,
        setShouldFetch: setwcImpairmentDefinitionShouldFetch,
        setFetchMode: setwcImpairmentDefinitionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addwcImpairmentDefinitionMatrxId,
        addwcImpairmentDefinitionMatrxIds,
        removewcImpairmentDefinitionMatrxId,
        removewcImpairmentDefinitionMatrxIds,
        addwcImpairmentDefinitionPkValue,
        addwcImpairmentDefinitionPkValues,
        removewcImpairmentDefinitionPkValue,
        removewcImpairmentDefinitionPkValues,
        iswcImpairmentDefinitionMissingRecords,
        setwcImpairmentDefinitionShouldFetch,
        setwcImpairmentDefinitionFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addwcInjuryMatrxId: (recordId: MatrxRecordId) => void;
    addwcInjuryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removewcInjuryMatrxId: (recordId: MatrxRecordId) => void;
    removewcInjuryMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addwcInjuryPkValue: (pkValue: string) => void;
    addwcInjuryPkValues: (pkValues: Record<string, unknown>) => void;
    removewcInjuryPkValue: (pkValue: string) => void;
    removewcInjuryPkValues: (pkValues: Record<string, unknown>) => void;
    iswcInjuryMissingRecords: boolean;
    setwcInjuryShouldFetch: (shouldFetch: boolean) => void;
    setwcInjuryFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addwcInjuryMatrxId,
        addMatrxIds: addwcInjuryMatrxIds,
        removeMatrxId: removewcInjuryMatrxId,
        removeMatrxIds: removewcInjuryMatrxIds,
        addPkValue: addwcInjuryPkValue,
        addPkValues: addwcInjuryPkValues,
        removePkValue: removewcInjuryPkValue,
        removePkValues: removewcInjuryPkValues,
        isMissingRecords: iswcInjuryMissingRecords,
        setShouldFetch: setwcInjuryShouldFetch,
        setFetchMode: setwcInjuryFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addwcInjuryMatrxId,
        addwcInjuryMatrxIds,
        removewcInjuryMatrxId,
        removewcInjuryMatrxIds,
        addwcInjuryPkValue,
        addwcInjuryPkValues,
        removewcInjuryPkValue,
        removewcInjuryPkValues,
        iswcInjuryMissingRecords,
        setwcInjuryShouldFetch,
        setwcInjuryFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
    addwcReportMatrxId: (recordId: MatrxRecordId) => void;
    addwcReportMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removewcReportMatrxId: (recordId: MatrxRecordId) => void;
    removewcReportMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addwcReportPkValue: (pkValue: string) => void;
    addwcReportPkValues: (pkValues: Record<string, unknown>) => void;
    removewcReportPkValue: (pkValue: string) => void;
    removewcReportPkValues: (pkValues: Record<string, unknown>) => void;
    iswcReportMissingRecords: boolean;
    setwcReportShouldFetch: (shouldFetch: boolean) => void;
    setwcReportFetchMode: (fetchMode: FetchMode) => void;
    fetchQuickRefs: () => void;
    fetchOne: (recordId: MatrxRecordId) => void;
    fetchOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchAll: () => void;
    fetchPaginated: (page: number, pageSize: number) => void;
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
        addMatrxId: addwcReportMatrxId,
        addMatrxIds: addwcReportMatrxIds,
        removeMatrxId: removewcReportMatrxId,
        removeMatrxIds: removewcReportMatrxIds,
        addPkValue: addwcReportPkValue,
        addPkValues: addwcReportPkValues,
        removePkValue: removewcReportPkValue,
        removePkValues: removewcReportPkValues,
        isMissingRecords: iswcReportMissingRecords,
        setShouldFetch: setwcReportShouldFetch,
        setFetchMode: setwcReportFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
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
        addwcReportMatrxId,
        addwcReportMatrxIds,
        removewcReportMatrxId,
        removewcReportMatrxIds,
        addwcReportPkValue,
        addwcReportPkValues,
        removewcReportPkValue,
        removewcReportPkValues,
        iswcReportMissingRecords,
        setwcReportShouldFetch,
        setwcReportFetchMode,
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
    };
};
