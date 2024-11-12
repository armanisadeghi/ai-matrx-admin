// lib/redux/entity/selectors.ts

import {createSelector} from '@reduxjs/toolkit';
import {EntityKeys, EntityData} from "@/types/entityTypes";
import {RootState} from "@/lib/redux/store";
import {EntityState, MatrxRecordId} from "@/lib/redux/entity/types";
import {createRecordKey} from "@/lib/redux/entity/utils";

export const createEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    if (!entityKey) return null;

    const selectEntity = (state: RootState): EntityState<TEntity> => {
        return state.entities[entityKey] || {} as EntityState<TEntity>;
    };

    const selectAllRecords = createSelector(
        [selectEntity],
        (entity) => entity?.records || {}
    );

    const selectEntityDisplayName = createSelector(
        [selectEntity],
        (entity) => {
            return entity.entityMetadata.displayName;
        }
    );

    const selectRecordByPrimaryKey = createSelector(
        [selectEntity, (_: RootState, primaryKeyValues: Record<string, MatrxRecordId>) => primaryKeyValues],
        (entity, primaryKeyValues) => {
            const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
            return entity.records[recordKey];
        }
    );

    const selectRecordsByPrimaryKeys = createSelector(
        [selectEntity, (_: RootState, primaryKeyValuesList: Record<string, MatrxRecordId>[]) => primaryKeyValuesList],
        (entity, primaryKeyValuesList) => {
            return primaryKeyValuesList
                .map(primaryKeyValues => {
                    const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
                    return entity.records[recordKey];
                })
                .filter(Boolean);
        }
    );

    // Quick Reference Selectors
    const selectQuickReference = createSelector(
        [selectEntity],
        (entity) => entity.quickReference.records
    );

    const selectQuickReferenceByPrimaryKey = createSelector(
        [selectQuickReference, (_: RootState, primaryKeyValues: Record<string, MatrxRecordId>) => primaryKeyValues],
        (records, primaryKeyValues) => records.find(record => {
            return Object.entries(primaryKeyValues).every(([key, value]) => record.primaryKeyValues[key] === value);
        })
    );



    // Selection Selectors ==================================================

    const selectSelectedRecordIds = createSelector(
        [selectEntity],
        (entity) => entity.selection.selectedRecords
    );


    const selectSelectedRecords = createSelector(
        [selectEntity],
        (entity) => {
            return Array.from(entity.selection.selectedRecords)
                .map(recordKey => entity.records[recordKey])
                .filter(Boolean);
        }
    );

    const selectActiveRecord = createSelector(
        [selectEntity],
        (entity) => entity.selection.activeRecord
    );

    const selectSelectionMode = createSelector(
        [selectEntity],
        (entity) => entity.selection.selectionMode
    );

    const selectSelectionSummary = createSelector(
        [selectSelectedRecords, selectActiveRecord, selectSelectionMode],
        (selectedRecords, activeRecord, mode) => ({
            count: selectedRecords.length,
            hasSelection: selectedRecords.length > 0,
            hasSingleSelection: selectedRecords.length === 1,
            hasMultipleSelection: selectedRecords.length > 1,
            activeRecord,
            mode
        })
    );

    const selectIsRecordSelected = createSelector(
        [selectEntity, (_: RootState, record: EntityData<TEntity>) => record],
        (entity, record) => {
            const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, record);
            return entity.selection.selectedRecords.includes(recordKey);
        }
    );

    const selectIsRecordActive = createSelector(
        [selectActiveRecord, (_: RootState, record: EntityData<TEntity>) => record],
        (activeRecord, record) => activeRecord === record
    );


    // === End Selection Selectors ==================================================



    // Pagination Selectors
    const selectPaginationInfo = createSelector(
        [selectEntity],
        (entity) => entity.pagination
    );

    const selectCurrentPage = createSelector(
        [selectEntity, selectAllRecords],
        (entity, records) => {
            const {page, pageSize} = entity.pagination;
            const startIndex = (page - 1) * pageSize;
            return Object.values(records).slice(startIndex, startIndex + pageSize);
        }
    );

    // Filter Selectors
    const selectCurrentFilters = createSelector(
        [selectEntity],
        (entity) => entity.filters
    );

    const selectFilteredRecords = createSelector(
        [selectAllRecords, selectCurrentFilters],
        (records, filters) => {
            let result = Object.values(records);

            // Apply filters
            if (filters.conditions.length > 0) {
                result = result.filter(record =>
                    filters.conditions.every(condition => {
                        const value = record[condition.field];
                        switch (condition.operator) {
                            case 'eq':
                                return value === condition.value;
                            case 'neq':
                                return value !== condition.value;
                            case 'gt':
                                return value > condition.value;
                            case 'gte':
                                return value >= condition.value;
                            case 'lt':
                                return value < condition.value;
                            case 'lte':
                                return value <= condition.value;
                            case 'like':
                                return String(value).includes(String(condition.value));
                            case 'ilike':
                                return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
                            case 'in':
                                return Array.isArray(condition.value) && condition.value.includes(value);
                            case 'between':
                                return Array.isArray(condition.value) &&
                                    value >= condition.value[0] &&
                                    value <= condition.value[1];
                            default:
                                return true;
                        }
                    })
                );
            }

            // Apply sorting
            if (filters.sort.length > 0) {
                result = [...result].sort((a, b) => {
                    for (const sort of filters.sort) {
                        const aValue = a[sort.field];
                        const bValue = b[sort.field];
                        if (aValue !== bValue) {
                            return sort.direction === 'asc'
                                   ? (aValue > bValue ? 1 : -1)
                                   : (aValue < bValue ? 1 : -1);
                        }
                    }
                    return 0;
                });
            }

            return result;
        }
    );

    // State Selectors
    const selectLoadingState = createSelector(
        [selectEntity],
        (entity) => entity.loading
    );

    const selectError = createSelector(
        [selectLoadingState],
        (loading) => loading.error
    );

    const selectIsStale = createSelector(
        [selectEntity],
        (entity) => entity.cache.stale
    );

    const selectHasUnsavedChanges = createSelector(
        [selectEntity],
        (entity) => entity.flags.hasUnsavedChanges
    );

    const selectIsValidated = createSelector(
        [selectEntity],
        (entity) => entity.flags.isValidated
    );

    const selectFetchOneSuccess = createSelector(
        [selectEntity],
        (entity) => entity.flags.fetchOneSuccess
    );

    // Metadata Selectors
    const selectEntityMetadata = createSelector(
        [selectEntity],
        (entity) => entity.entityMetadata
    );

    const selectPrimaryKeyMetadata = createSelector(
        [selectEntityMetadata],
        (metadata) => metadata.primaryKeyMetadata
    );

    const selectDisplayField = createSelector(
        [selectEntityMetadata],
        (metadata) => metadata.fields.find(f => f.isDisplayField)?.name || metadata.primaryKeyMetadata.fields[0]
    );

    // History Selectors
    const selectHistory = createSelector(
        [selectEntity],
        (entity) => entity.history
    );

    const selectFieldInfo = createSelector(
        [selectEntityMetadata],
        (metadata) => metadata.fields.map(field => ({
            name: field.name,
            displayName: field.displayName,
            isPrimaryKey: field.isPrimaryKey,
            isDisplayField: field.isDisplayField,
            dataType: field.dataType,
            isArray: field.isArray,
            structure: field.structure,
            isNative: field.isNative,
            defaultComponent: field.defaultComponent,
            componentProps: field.componentProps,
            isRequired: field.isRequired,
            maxLength: field.maxLength,
            defaultValue: field.defaultValue,
            defaultGeneratorFunction: field.defaultGeneratorFunction,
            validationFunctions: field.validationFunctions,
            exclusionRules: field.exclusionRules,
            enumValues: field.enumValues,
            databaseTable: field.databaseTable
        }))
    );

    // For select components (value/label pairs)
    const selectFieldOptions = createSelector(
        [selectFieldInfo],
        (fields) => fields.map(field => ({
            value: field.name,
            label: field.displayName
        }))
    );

// For table headers
    const selectTableColumns = createSelector(
        [selectFieldInfo],
        (fields) => fields.map(field => ({
            key: field.name,
            title: field.displayName,
            isPrimaryKey: field.isPrimaryKey,
            isDisplayField: field.isDisplayField,
            dataType: field.dataType,
            isArray: field.isArray,
            structure: field.structure,
            isNative: field.isNative,
            defaultComponent: field.defaultComponent,
            componentProps: field.componentProps,
            isRequired: field.isRequired,
            maxLength: field.maxLength,
            defaultValue: field.defaultValue,
            defaultGeneratorFunction: field.defaultGeneratorFunction,
            validationFunctions: field.validationFunctions,
            exclusionRules: field.exclusionRules,
            enumValues: field.enumValues,
            databaseTable: field.databaseTable
        }))
    );

// Filtered and paginated data combined
    const selectCurrentPageFiltered = createSelector(
        [selectFilteredRecords, selectPaginationInfo],
        (filteredRecords, pagination) => {
            const {page, pageSize} = pagination;
            const startIndex = (page - 1) * pageSize;
            return filteredRecords.slice(startIndex, startIndex + pageSize);
        }
    );

// Record with display values resolved
    const selectRecordWithDisplay = createSelector(
        [
            selectEntity,
            (_: RootState, recordKey: string) => recordKey,
            selectFieldInfo
        ],
        (entity, recordKey, fields) => {
            const record = entity.records[recordKey];
            if (!record) return null;

            return fields.reduce((acc, field) => {
                acc[field.name] = {
                    value: record[field.name],
                    displayValue: String(record[field.name]),
                    fieldInfo: field
                };
                return acc;
            }, {} as Record<string, { value: any; displayValue: string; fieldInfo: typeof fields[0] }>);
        }
    );

// Quick access to important metadata combinations
    const selectMetadataSummary = createSelector(
        [selectEntityMetadata],
        (metadata) => ({
            displayName: metadata.displayName,
            primaryKeys: metadata.primaryKeyMetadata.fields,
            displayField: metadata.fields.find(f => f.isDisplayField)?.name,
            totalFields: metadata.fields.length,
            schemaType: metadata.schemaType
        })
    );

// Cache and loading state combined
    const selectDataState = createSelector(
        [selectLoadingState, selectIsStale, selectHasUnsavedChanges],
        (loading, isStale, hasUnsavedChanges) => ({
            isLoading: loading.loading,
            isError: !!loading.error,
            errorMessage: loading.error?.message,
            lastOperation: loading.lastOperation,
            isStale,
            hasUnsavedChanges,
            needsAttention: isStale || hasUnsavedChanges || !!loading.error
        })
    );

// Pagination with additional computed properties
    const selectPaginationExtended = createSelector(
        [selectPaginationInfo, selectFilteredRecords],
        (pagination, filteredRecords) => ({
            ...pagination,
            totalFilteredRecords: filteredRecords.length,
            currentPageRecords: filteredRecords.length > 0
                                ? Math.min(pagination.pageSize, filteredRecords.length - (pagination.page - 1) * pagination.pageSize)
                                : 0,
            isFirstPage: pagination.page === 1,
            isLastPage: pagination.page === pagination.totalPages,
            pageOptions: Array.from({length: pagination.totalPages}, (_, i) => ({
                value: i + 1,
                label: `Page ${i + 1}`
            }))
        })
    );

// History state with additional information
    const selectHistoryState = createSelector(
        [selectHistory],
        (history) => ({
            canUndo: history.past.length > 0,
            canRedo: history.future.length > 0,
            lastAction: history.past[history.past.length - 1],
            nextAction: history.future[history.future.length - 1],
            totalActions: history.past.length + history.future.length,
            lastSaved: history.lastSaved
        })
    );

    const selectMetrics = createSelector(
        [selectEntity],
        (entity) => entity.metrics
    );

    const selectOperationCounts = createSelector(
        [selectMetrics],
        (metrics) => metrics.operationCounts
    );

    const selectPerformanceMetrics = createSelector(
        [selectMetrics],
        (metrics) => metrics.performanceMetrics
    );

    const selectCacheStats = createSelector(
        [selectMetrics],
        (metrics) => metrics.cacheStats
    );

    const selectErrorRates = createSelector(
        [selectMetrics],
        (metrics) => metrics.errorRates
    );

    const selectMetricsLastUpdated = createSelector(
        [selectMetrics],
        (metrics) => metrics.lastUpdated
    );

    // Performance-specific selectors
    const selectResponseTimeMetrics = createSelector(
        [selectPerformanceMetrics],
        (metrics) => metrics.responseTimes
    );

    const selectThroughputMetrics = createSelector(
        [selectPerformanceMetrics],
        (metrics) => metrics.throughput
    );

    // Cache-specific selectors
    const selectCacheHitRate = createSelector(
        [selectCacheStats],
        (stats) => stats.hitRate
    );

    const selectCacheSize = createSelector(
        [selectCacheStats],
        (stats) => stats.size
    );

    // Error-specific selectors
    const selectErrorTimeline = createSelector(
        [selectErrorRates],
        (rates) => rates.timeline
    );

    const selectErrorDistribution = createSelector(
        [selectErrorRates],
        (rates) => rates.distribution
    );

    const selectRecentErrors = createSelector(
        [selectErrorRates],
        (rates) => rates.recent
    );





    return {
        selectEntity,
        selectAllRecords,
        selectRecordByPrimaryKey,
        selectRecordsByPrimaryKeys,
        selectQuickReference,
        selectQuickReferenceByPrimaryKey,
        selectPaginationInfo,
        selectCurrentPage,
        selectCurrentFilters,
        selectFilteredRecords,
        selectLoadingState,
        selectError,
        selectIsStale,
        selectHasUnsavedChanges,
        selectEntityMetadata,
        selectPrimaryKeyMetadata,
        selectDisplayField,
        selectHistory,
        selectFieldInfo,
        selectFieldOptions,
        selectTableColumns,
        selectCurrentPageFiltered,
        selectRecordWithDisplay,
        selectMetadataSummary,
        selectDataState,
        selectPaginationExtended,
        selectHistoryState,
        // Newly added selectors
        selectMetrics,
        selectOperationCounts,
        selectPerformanceMetrics,
        selectCacheStats,
        selectErrorRates,
        selectMetricsLastUpdated,
        selectResponseTimeMetrics,
        selectThroughputMetrics,
        selectCacheHitRate,
        selectCacheSize,
        selectErrorTimeline,
        selectErrorDistribution,
        selectRecentErrors,

        // Selection Management
        selectSelectedRecordIds,
        selectSelectedRecords,
        selectActiveRecord,
        selectSelectionMode,
        selectSelectionSummary,
        selectIsRecordSelected,
        selectIsRecordActive,

        // Convenience Additions
        selectEntityDisplayName,
        selectIsValidated,
        selectFetchOneSuccess,
    };
};
