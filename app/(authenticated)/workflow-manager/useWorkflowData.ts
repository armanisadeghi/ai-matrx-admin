import { MatrxRecordId } from "@/types/entityTypes";
import { WorkflowData } from "./types";
import { useEntityWithFetch } from "@/lib/redux/entity/hooks/useAllData";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import { EntitySelectors, EntityActions, FetchMode } from "@/lib/redux";

export type UseWorkflowWithFetchReturn = {
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
