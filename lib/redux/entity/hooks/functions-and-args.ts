
import {
    ArgData,
    RegisteredFunctionData,
} from "@/types";
import { MatrxRecordId, QuickReferenceRecord } from "../types/stateTypes";
import { EntitySelectors } from "../selectors";
import { EntityActions } from "../slice";
import { FetchMode } from "../actions";
import { useEntityWithFetch } from "./useAllData";


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
