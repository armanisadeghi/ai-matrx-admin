import { PayloadAction } from "@reduxjs/toolkit";
import { Draft } from "immer";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { EntityState, MatrxRecordId, QuickReferenceRecord, QueryOptions } from "@/lib/redux/entity/types/stateTypes";
import {
    createRecordKey,
    resetFlag,
    setLoading,
    setSuccess,
    addRecordToSelection,
    removeSelections,
    setNewActiveRecord,
} from "@/lib/redux/entity/utils/stateHelpUtils";
import EntityLogger from "../utils/entityLogger";
import {
    ExecuteCustomQueryPayload,
    FetchAllPayload,
    FetchOnePayload,
    FetchOneWithFkIfkPayload,
    FetchQuickReferencePayload,
    FetchRecordsPayload,
    GetOrFetchSelectedRecordsPayload,
} from "@/lib/redux/entity/actions";
import { Callback } from "@/utils/callbackManager";

const INFO = "info";
const DEBUG = "debug";
const VERBOSE = "verbose";

export const fetchReducers = <TEntity extends EntityKeys>(entityKey: TEntity, entityLogger: EntityLogger) => ({
    fetchOne: (state: EntityState<TEntity>, action: PayloadAction<FetchOnePayload>) => {
        entityLogger.log(DEBUG, "fetchOne", action.payload);
        setLoading(state, "FETCH_ONE");
    },
    fetchOneSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
        entityLogger.log(DEBUG, "fetchOneSuccess", action.payload);

        const record = action.payload;
        const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
        state.records[recordKey] = record;
        setSuccess(state, "FETCH_ONE");

        addRecordToSelection(state, entityKey, recordKey);
        state.cache.stale = false;
    },

    resetFetchOneStatus: (state) => {
        entityLogger.log(DEBUG, "resetFetchOneStatus");
        resetFlag(state, "FETCH_ONE");
    },

    fetchRecords: (state: EntityState<TEntity>, action: PayloadAction<FetchRecordsPayload>) => {
        entityLogger.log(DEBUG, "fetchRecords", action.payload);
        setLoading(state, "FETCH_RECORDS");
    },
    fetchRecordsSuccess: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            data: Draft<EntityData<TEntity>>[];
            page: number;
            pageSize: number;
            totalCount: number;
        }>
    ) => {
        const { data, page, pageSize, totalCount } = action.payload;
        const { primaryKeyMetadata } = state.entityMetadata;

        entityLogger.log(DEBUG, "fetchRecordsSuccess", { data, page, pageSize, totalCount });

        data.forEach((record) => {
            const recordKey = createRecordKey(primaryKeyMetadata, record);
            state.records[recordKey] = record;
        });

        state.pagination.page = page;
        state.pagination.pageSize = pageSize;
        state.pagination.totalCount = totalCount;
        state.pagination.totalPages = Math.ceil(totalCount / pageSize);
        state.pagination.hasNextPage = page * pageSize < totalCount;
        state.pagination.hasPreviousPage = page > 1;

        setSuccess(state, "FETCH_RECORDS");
        state.cache.stale = false;
    },
    fetchRecordsRejected: (
        state: EntityState<TEntity>,
        action: PayloadAction<{
            message: string;
            code?: number;
            details?: any;
        }>
    ) => {
        state.loading.loading = false;
        state.loading.error = action.payload;
        state.loading.lastOperation = "FETCH_RECORDS";

        entityLogger.log("error", "fetchRecordsRejected", action.payload);
    },

    fetchOneWithFkIfk: (state: EntityState<TEntity>, action: PayloadAction<FetchOneWithFkIfkPayload>) => {
        entityLogger.log(DEBUG, "------ > fetchOneWithFkIfk set to loading", action.payload);
        setLoading(state, "FETCH_ONE_WITH_FK_IFK");
    },

    fetchOneWithFkIfkSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
        const record = action.payload;
        const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
        state.records[recordKey] = record;
        setSuccess(state, "FETCH_ONE_WITH_FK_IFK");
        entityLogger.log(DEBUG, "fetchOneWithFkIfkSuccess set to success", action.payload);
        state.cache.stale = false;
    },

    resetFetchOneWithFkIfkStatus: (state) => {
        resetFlag(state, "FETCH_ONE_WITH_FK_IFK");
        entityLogger.log(DEBUG, "resetFetchOneWithFkIfkStatus flag reset.");
    },

    fetchedAsRelatedSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>[]>) => {
        const { primaryKeyMetadata } = state.entityMetadata;
        entityLogger.log(DEBUG, "fetchedAsRelatedSuccess triggerd", action.payload);

        removeSelections(state);
        entityLogger.log(DEBUG, "Removed all selections");

        action.payload.forEach((record) => {
            const recordKey = createRecordKey(primaryKeyMetadata, record);
            entityLogger.log(DEBUG, "Adding record to selection", recordKey);
            state.records[recordKey] = record;
            addRecordToSelection(state, entityKey, recordKey);
        });
        setSuccess(state, "FETCHED_AS_RELATED");
        entityLogger.log(DEBUG, "fetchedAsRelatedSuccess set to success");
        state.cache.stale = false;
    },

    // Fetch All Management ========================================
    fetchAll: (state: EntityState<TEntity>, action: PayloadAction<FetchAllPayload>) => {
        entityLogger.log(DEBUG, "fetchAll", action.payload);
        setLoading(state, "FETCH_ALL");
    },
    fetchAllSuccess: (state: EntityState<TEntity>, action: PayloadAction<Draft<EntityData<TEntity>>[]>) => {
        const { primaryKeyMetadata } = state.entityMetadata;
        entityLogger.log(DEBUG, "fetchAllSuccess", action.payload);

        state.records = {};
        action.payload.forEach((record) => {
            const recordKey = createRecordKey(primaryKeyMetadata, record);
            state.records[recordKey] = record;
        });

        setSuccess(state, "FETCH_ALL");
        state.cache.stale = false;
    },

    // Custom Query Management ========================================
    executeCustomQuery: (state: EntityState<TEntity>, action: PayloadAction<ExecuteCustomQueryPayload>) => {
        entityLogger.log(DEBUG, "executeCustomQuery", action.payload);
        setLoading(state, "CUSTOM");
    },
    executeCustomQuerySuccess: (state: EntityState<TEntity>, action: PayloadAction<Draft<EntityData<TEntity>>[]>) => {
        entityLogger.log(DEBUG, "executeCustomQuerySuccess", action.payload);

        state.records = {};
        action.payload.forEach((record) => {
            const recordKey: MatrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
            state.records[recordKey] = record;
        });

        setSuccess(state, "CUSTOM");
    },

    fetchQuickReference: (state: EntityState<TEntity>, action: PayloadAction<FetchQuickReferencePayload>) => {
        entityLogger.log(DEBUG, "fetchQuickReference", action.payload);
        setLoading(state, "FETCH_QUICK_REFERENCE");
    },
    fetchQuickReferenceSuccess: (state: EntityState<TEntity>, action: PayloadAction<QuickReferenceRecord[]>) => {
        entityLogger.log(DEBUG, "fetchQuickReferenceSuccess", action.payload);

        state.quickReference.records = action.payload;
        state.quickReference.lastUpdated = new Date().toISOString();
        state.quickReference.fetchComplete = true;

        setSuccess(state, "FETCH_QUICK_REFERENCE");
    },
    setQuickReference: (state: EntityState<TEntity>, action: PayloadAction<QuickReferenceRecord[]>) => {
        entityLogger.log(DEBUG, "setQuickReference", action.payload);

        state.quickReference.records = action.payload;
        state.quickReference.lastUpdated = new Date().toISOString();
        state.quickReference.fetchComplete = true;
    },
    addQuickReferenceRecords: (state: EntityState<TEntity>, action: PayloadAction<QuickReferenceRecord[]>) => {
        entityLogger.log(DEBUG, "addQuickReferenceRecord", action.payload);
        action.payload.forEach((newRecord) => {
            const existingIndex = state.quickReference.records.findIndex((record) => record.recordKey === newRecord.recordKey);
            if (existingIndex !== -1) {
                state.quickReference.records[existingIndex] = newRecord;
                entityLogger.log(DEBUG, "Replaced existing quick reference record", newRecord);
            } else {
                state.quickReference.records.push(newRecord);
                entityLogger.log(DEBUG, "Added new quick reference record", newRecord);
            }
        });
        state.quickReference.lastUpdated = new Date().toISOString();
    },

    getOrFetchSelectedRecords: (state: EntityState<TEntity>, action: PayloadAction<GetOrFetchSelectedRecordsPayload>) => {
        entityLogger.log(DEBUG, "getOrFetchSelectedRecords", action.payload);
        setLoading(state, "GET_OR_FETCH_RECORDS");
    },

    getOrFetchSelectedRecordsSuccess: (state: EntityState<TEntity>, action: PayloadAction) => {
        entityLogger.log(DEBUG, "getOrFetchSelectedRecordsSuccess", action.payload);
        setSuccess(state, "GET_OR_FETCH_RECORDS");
    },

    fetchSelectedRecords: (state: EntityState<TEntity>, action: PayloadAction<QueryOptions<TEntity> & { callbackId?: Callback }>) => {
        entityLogger.log(DEBUG, "fetchSelectedRecords", action.payload);
        setLoading(state, "FETCH_RECORDS");
    },

    fetchSelectedRecordsSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>[]>) => {
        const { primaryKeyMetadata } = state.entityMetadata;
        entityLogger.log(DEBUG, "fetchSelectedRecordsSuccess", action.payload);

        action.payload.forEach((record) => {
            const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, record);
            state.records[recordKey] = record;
            setNewActiveRecord(state, recordKey);
        });
        setSuccess(state, "FETCH_RECORDS");
    },
});
