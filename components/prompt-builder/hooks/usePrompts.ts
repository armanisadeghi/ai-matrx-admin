import { EntityActions, EntitySelectors, FetchMode, useEntityToasts } from "@/lib/redux";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import { MatrxRecordId } from "@/types";
import { useEntityWithFetch } from "@/lib/redux/entity/hooks/useAllData";
import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { v4 as uuidv4 } from "uuid";
import { useCallbackManager } from "@/hooks/useCallbackManager";

export type PromptMessage = {
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
}

export type PromptVariable = {
    name: string;
    defaultValue: string;
}

export type PromptsData = {
    id: string;
    createdAt: Date;
    name?: string;
    userId?: string;
    tools?: Record<string, unknown>;
    updatedAt?: Date;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    messages?: PromptMessage[];
    variableDefaults?: PromptVariable[]; // Array of { name, defaultValue }
}


export type SimplePromptsData = {
    id: string;
    name?: string;
    tools?: string[];
    messages?: PromptMessage[];
    variableDefaults?: PromptVariable[];
}

type UsePromptsWithFetchReturn = {
    promptsSelectors: EntitySelectors<"prompts">;
    promptsActions: EntityActions<"prompts">;
    promptsRecords: Record<MatrxRecordId, PromptsData>;
    promptsUnsavedRecords: Record<MatrxRecordId, Partial<PromptsData>>;
    promptsSelectedRecordIds: MatrxRecordId[];
    promptsIsLoading: boolean;
    promptsIsError: boolean;
    promptsQuickRefRecords: QuickReferenceRecord[];
    addPromptsMatrxId: (recordId: MatrxRecordId) => void;
    addPromptsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    removePromptsMatrxId: (recordId: MatrxRecordId) => void;
    removePromptsMatrxIds: (recordIds: MatrxRecordId[]) => void;
    addPromptsPkValue: (pkValue: string) => void;
    addPromptsPkValues: (pkValues: Record<string, unknown>) => void;
    removePromptsPkValue: (pkValue: string) => void;
    removePromptsPkValues: (pkValues: Record<string, unknown>) => void;
    isPromptsMissingRecords: boolean;
    setPromptsShouldFetch: (shouldFetch: boolean) => void;
    setPromptsFetchMode: (fetchMode: FetchMode) => void;
    fetchPromptsQuickRefs: () => void;
    fetchPromptsOne: (recordId: MatrxRecordId) => void;
    fetchPromptsOneWithFkIfk: (recordId: MatrxRecordId) => void;
    fetchPromptsAll: () => void;
    fetchPromptsPaginated: (page: number, pageSize: number) => void;
    createPrompt: (data: Partial<PromptsData>) => Promise<{ matrxRecordId: MatrxRecordId, id: string }>;
    updatePrompt: (matrxRecordId: MatrxRecordId, data: Partial<PromptsData>) => void;
};

interface CustomPromise extends Promise<any> {
    callbackId?: string;
}




export const usePromptsWithFetch = (): UsePromptsWithFetchReturn => {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const {
        selectors: promptsSelectors,
        actions: promptsActions,
        allRecords: promptsRecords,
        unsavedRecords: promptsUnsavedRecords,
        selectedRecordIds: promptsSelectedRecordIds,
        isLoading: promptsIsLoading,
        isError: promptsIsError,
        quickRefRecords: promptsQuickRefRecords,
        addMatrxId: addPromptsMatrxId,
        addMatrxIds: addPromptsMatrxIds,
        removeMatrxId: removePromptsMatrxId,
        removeMatrxIds: removePromptsMatrxIds,
        addPkValue: addPromptsPkValue,
        addPkValues: addPromptsPkValues,
        removePkValue: removePromptsPkValue,
        removePkValues: removePromptsPkValues,
        isMissingRecords: isPromptsMissingRecords,
        setShouldFetch: setPromptsShouldFetch,
        setFetchMode: setPromptsFetchMode,
        fetchQuickRefs: fetchPromptsQuickRefs,
        fetchOne: fetchPromptsOne,
        fetchOneWithFkIfk: fetchPromptsOneWithFkIfk,
        fetchAll: fetchPromptsAll,
        fetchPaginated: fetchPromptsPaginated,
    } = useEntityWithFetch("prompts");

    useEffect(() => {
        fetchPromptsAll();
    }, [fetchPromptsAll]);

    const entityToasts = useEntityToasts("prompts");
    const createCallback = useCallbackManager();

    const createPrompt = useCallback(
        async (data: Partial<PromptsData>): Promise<{ matrxRecordId: MatrxRecordId, id: string }> => {
            try {
                const id = uuidv4();
                const matrxRecordId = `id:${id}`;
                const callbackPromise = createCallback() as CustomPromise;

                dispatch(
                    promptsActions.directCreateRecord({
                        matrxRecordId,
                        data: {
                            ...data,
                            id,
                        },
                        callbackId: callbackPromise.callbackId,
                    })
                );

                await callbackPromise;

                entityToasts.handleCreateSuccess();
                return { matrxRecordId, id };
            } catch (error) {
                entityToasts.handleError(error as Error, 'create');
                throw error;
            }
        },
        [dispatch, promptsActions, createCallback, entityToasts]
    );

    const updatePrompt = (id: string, data: Partial<PromptsData>) => {
        const payload = {
            matrxRecordId: `id:${id}`,
            data,
        };

        dispatch(promptsActions.directUpdateRecord(payload));
    };

    return {
        promptsSelectors,
        promptsActions,
        promptsRecords: promptsRecords as unknown as Record<MatrxRecordId, PromptsData>,
        promptsUnsavedRecords: promptsUnsavedRecords as unknown as Record<MatrxRecordId, Partial<PromptsData>>,
        promptsSelectedRecordIds,
        promptsIsLoading,
        promptsIsError,
        promptsQuickRefRecords,
        addPromptsMatrxId,
        addPromptsMatrxIds,
        removePromptsMatrxId,
        removePromptsMatrxIds,
        addPromptsPkValue,
        addPromptsPkValues,
        removePromptsPkValue,
        removePromptsPkValues,
        isPromptsMissingRecords,
        setPromptsShouldFetch,
        setPromptsFetchMode,
        fetchPromptsQuickRefs,
        fetchPromptsOne,
        fetchPromptsOneWithFkIfk,
        fetchPromptsAll,
        fetchPromptsPaginated,
        createPrompt,
        updatePrompt,
    };
};
