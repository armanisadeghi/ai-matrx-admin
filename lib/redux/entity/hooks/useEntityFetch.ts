import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { EntityKeys, EntityData, EntityDataWithKey } from "@/types/entityTypes";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {  MatrxRecordId } from "../types/stateTypes";
import { Callback, callbackManager } from "@/utils/callbackManager";
import { createEntitySelectors } from "../selectors";
import { getEntitySlice } from "../entitySlice";
import { getEntityMetadata } from "../utils/direct-schema";



const entityDefaultSettings = {
    maxQuickReferenceRecords: 1000,
};

type ComparisonOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "between";

interface FilterCondition {
    field: string;
    operator: ComparisonOperator;
    value: unknown;
    or?: FilterCondition[];
    and?: FilterCondition[];
}
interface FilterPayload {
    conditions: FilterCondition[];
    replace?: boolean;
    temporary?: boolean;
}

interface SortPayload {
    field: string;
    direction: "asc" | "desc";
    append?: boolean;
}

interface FetchRecordsPayload {
    page: number;
    pageSize: number;
    callbackId?: string;
    options?: {
        maxCount?: number;
        filters?: FilterPayload;
        sort?: SortPayload;
    };
}

interface PaginationState {
    pageIndex: number;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    maxCount?: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export const useEntityFetch = (entityName: EntityKeys) => {

    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityName), [entityName]);
    const actions = useMemo(() => getEntitySlice(entityName).actions, [entityName]);
    const allFetchedRecords = useAppSelector(selectors.selectAllRecords) as Record<MatrxRecordId, EntityData<EntityKeys>>;
    const allFetchedRecordsArray = useAppSelector(selectors.selectRecordsArray) as EntityDataWithKey<EntityKeys>[];

    const fetchQuickRefs = useCallback((): void => {
        dispatch(actions.fetchQuickReference({ maxRecords: entityDefaultSettings.maxQuickReferenceRecords }));
    }, [dispatch, actions]);

    const fetchOne = useCallback(
        (matrxRecordId: MatrxRecordId, callback?: Callback) => {
            const callbackId = callback ? callbackManager.register(callback) : null;
            dispatch(actions.fetchOne({ matrxRecordId, callbackId }));
        },
        [dispatch, actions]
    );

    const fetchOneWithFkIfk = useCallback(
        (matrxRecordId: MatrxRecordId, callback?: Callback) => {
            const callbackId = callback ? callbackManager.register(callback) : null;
            dispatch(actions.fetchOneWithFkIfk({ matrxRecordId, callbackId }));
        },
        [dispatch, actions]
    );

    const fetchAll = React.useCallback(
        (callback?: Callback) => {
            const callbackId = callback ? callbackManager.register(callback) : null;
            dispatch(actions.fetchAll({ callbackId }));
        },
        [actions, dispatch]
    );

    const fetchPaginated = useCallback(
        (page: number, pageSize: number, options?: FetchRecordsPayload["options"]) => {
            dispatch(actions.fetchRecords({ page, pageSize, options }));
        },
        [dispatch, actions]
    );

    return {
        fetchQuickRefs,
        fetchOne,
        fetchOneWithFkIfk,
        fetchAll,
        fetchPaginated,
        allFetchedRecords,
        allFetchedRecordsArray,
    };
};

export const useFetchPaginated = (entityName: EntityKeys) => {
    const [maxCount, setMaxCount] = useState(entityDefaultSettings.maxQuickReferenceRecords);

    const metadata = getEntityMetadata(entityName);
    const displayField = metadata?.displayFieldMetadata.fieldName;
    const pkMeta = metadata?.primaryKeyMetadata;
    const fields = metadata?.entityFields;

    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityName), [entityName]);
    const actions = useMemo(() => getEntitySlice(entityName).actions, [entityName]);

    const allFetchedRecords = useAppSelector(selectors.selectAllRecords) as Record<MatrxRecordId, EntityData<EntityKeys>>;
    const currentPageRecords = useAppSelector(selectors.selectCurrentPage) as EntityData<EntityKeys>[];
    const paginationInfo = useAppSelector(selectors.selectPaginationInfo) as PaginationState;
    const currentPageWithRecordId = useAppSelector(selectors.selectCurrentPageWithRecordId) as EntityDataWithKey<EntityKeys>[];
    const currentFilters = useAppSelector(selectors.selectCurrentFilters) as FilterPayload;
    const filteredRecords = useAppSelector(selectors.selectFilteredRecords) as EntityData<EntityKeys>[];

    const options: FetchRecordsPayload["options"] = useMemo(() => ({
        maxCount: maxCount,
        filters: currentFilters,
        sort: {
            field: displayField,
            direction: "desc",
        },
    }), [currentFilters, maxCount]);

    
    const setPage = useCallback((page: number) => {
        dispatch(actions.setPage(page));
    }, [dispatch, actions]);

    const setPageSize = useCallback((pageSize: number) => {
        dispatch(actions.setPageSize(pageSize));
    }, [dispatch, actions]);


    const fetchPaginated = useCallback(
        (page: number, pageSize: number,) => {
            dispatch(actions.setPage(page));
            dispatch(actions.setPageSize(pageSize));
            dispatch(actions.fetchRecords({ page, pageSize, options }));
        },
        [dispatch, actions]
    );

    return {
        allFetchedRecords,
        currentPageRecords,
        paginationInfo,
        currentPageWithRecordId,
        currentFilters,
        filteredRecords,
        setPage,
        setPageSize,
        fetchPaginated,
        maxCount,
        setMaxCount,
    };
};
