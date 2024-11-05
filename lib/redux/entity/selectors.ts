// lib/redux/entity/selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import { EntityKeys, EntityData } from "@/types/entityTypes";
import { RootState } from "@/lib/redux/store";
import { EntityState, MatrxRecordId } from "@/lib/redux/entity/types";
import { createRecordKey } from "@/lib/redux/entity/utils";

export const createEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    // Base entity selector
    const selectEntity = (state: RootState): EntityState<TEntity> => {
        return state.entities[entityKey] as EntityState<TEntity>;
    };

    // Core Data Selectors
    const selectAllRecords = createSelector(
        [selectEntity],
        (entity) => entity.records
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

    // Selection Selectors
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

    // Pagination Selectors
    const selectPaginationInfo = createSelector(
        [selectEntity],
        (entity) => entity.pagination
    );

    const selectCurrentPage = createSelector(
        [selectEntity, selectAllRecords],
        (entity, records) => {
            const { page, pageSize } = entity.pagination;
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
                            case 'eq': return value === condition.value;
                            case 'neq': return value !== condition.value;
                            case 'gt': return value > condition.value;
                            case 'gte': return value >= condition.value;
                            case 'lt': return value < condition.value;
                            case 'lte': return value <= condition.value;
                            case 'like': return String(value).includes(String(condition.value));
                            case 'ilike': return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
                            case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
                            case 'between':
                                return Array.isArray(condition.value) &&
                                    value >= condition.value[0] &&
                                    value <= condition.value[1];
                            default: return true;
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

    return {
        selectEntity,
        selectAllRecords,
        selectRecordByPrimaryKey,
        selectRecordsByPrimaryKeys,
        selectQuickReference,
        selectQuickReferenceByPrimaryKey,
        selectSelectedRecords,
        selectActiveRecord,
        selectSelectionMode,
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
    };
};
