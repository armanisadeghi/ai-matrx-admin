// lib/redux/entity/selectors.ts

import {createSelector} from '@reduxjs/toolkit';
import {EntityKeys, EntityData} from "@/types/entityTypes";
import {RootState} from "@/lib/redux/store";
import {
    EntityDataWithId,
    EntityOperationMode,
    EntityState,
    EntityStatus,
    MatrxRecordId
} from "@/lib/redux/entity/types/stateTypes";
import {createRecordKey, getRecordIdByRecord, parseRecordKeys} from "@/lib/redux/entity/utils/stateHelpUtils";
import EntityLogger from "@/lib/redux/entity/utils/entityLogger";
import {mapFieldDataToFormField} from "@/lib/redux/entity/utils/tempFormHelper";

const trace = "ENTITY SELECTORS";

export const createEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    if (!entityKey) return null;
    const entityLogger = EntityLogger.createLoggerWithDefaults(trace, entityKey);

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

    const selectRecordByKey = createSelector(
        [selectEntity, (_: RootState, recordKey: MatrxRecordId) => recordKey],
        (entity, recordKey) => {
            return entity.records[recordKey] || null;
        }
    );

    const selectFieldByKey = createSelector(
        [selectEntity, (_: RootState, recordKey: MatrxRecordId, field: string) => ({recordKey, field})],
        (entity, {recordKey, field}) => {
            const record = entity.records[recordKey];
            return record ? record[field] || null : null;
        }
    );

    const selectFieldValueByRecordKey = createSelector(
        [selectEntity, (_: RootState, recordKey: MatrxRecordId, field: string) => ({recordKey, field})],
        (entity, {recordKey, field}) => {
            const record = entity.records[recordKey];
            return record ? record[field] || null : null;
        }
    );


    const selectRecordsForFetching = (matrxRecordIds: MatrxRecordId[]) => createSelector(
        [selectAllRecords],
        (existingRecords) => {
            const filteredRecordIds = matrxRecordIds.filter((recordId) => !recordId.startsWith('new-record-'));
            const existingRecordIds = filteredRecordIds.filter((recordId) => !!existingRecords[recordId]);
            const recordIdsNotInState = filteredRecordIds.filter((recordId) => !existingRecords[recordId]);
            const primaryKeysToFetch = parseRecordKeys(recordIdsNotInState);

            return {
                existingRecords: existingRecordIds,
                recordIdsNotInState: recordIdsNotInState,
                primaryKeysToFetch
            };
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
            return primaryKeyValuesList.map(primaryKeyValues => {
                const recordKey = createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
                return entity.records[recordKey];
            }).filter(Boolean); // Ensure stable reference
        }
    );

    const selectMatrxRecordIdByPrimaryKey = createSelector(
        [selectEntity, (_: RootState, primaryKeyValues: Record<string, MatrxRecordId>) => primaryKeyValues],
        (entity, primaryKeyValues): MatrxRecordId => {
            return createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
        }
    );
    const selectMatrxRecordIdFromValue = createSelector(
        [selectEntity, (_: RootState, value: any) => value],
        (entity, value): MatrxRecordId | null => {
            if (value === undefined || value === null) {
                return null;
            }
            const primaryKeyField = entity.entityMetadata.primaryKeyMetadata.fields[0];
            if (!primaryKeyField) {
                return null;
            }
            const record = {[primaryKeyField]: value};
            try {
                return createRecordKey(entity.entityMetadata.primaryKeyMetadata, record);
            } catch (e) {
                return null;
            }
        }
    );


    const selectMatrxRecordIdByValues = createSelector(
        [selectEntity, (_: RootState, values: any[]) => values],
        (entity, values): MatrxRecordId => {
            const primaryKeyFields = Object.keys(entity.entityMetadata.primaryKeyMetadata);
            if (values.length !== primaryKeyFields.length) {
                throw new Error(`Expected ${primaryKeyFields.length} values but received ${values.length}`);
            }

            const primaryKeyValues = primaryKeyFields.reduce((acc, field, index) => {
                acc[field] = values[index];
                return acc;
            }, {} as Record<string, any>);

            return createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
        }
    );

    const selectMatrxRecordIdByKeyValuePairs = createSelector(
        [selectEntity, (_: RootState, keyValuePairs: Array<[string, any]>) => keyValuePairs],
        (entity, keyValuePairs): MatrxRecordId => {
            const primaryKeyFields = Object.keys(entity.entityMetadata.primaryKeyMetadata);
            const providedFields = keyValuePairs.map(([field]) => field);

            if (!primaryKeyFields.every(field => providedFields.includes(field))) {
                throw new Error('Missing required primary key fields');
            }

            const primaryKeyValues = Object.fromEntries(keyValuePairs);
            return createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues);
        }
    );

    const selectMatrxRecordIdsByPrimaryKeys = createSelector(
        [selectEntity, (_: RootState, primaryKeyValuesList: Record<string, MatrxRecordId>[]) => primaryKeyValuesList],
        (entity, primaryKeyValuesList) => {
            return primaryKeyValuesList.map(primaryKeyValues =>
                createRecordKey(entity.entityMetadata.primaryKeyMetadata, primaryKeyValues)
            );
        }
    );


    // Quick Reference Selectors
    const selectQuickReference = createSelector(
        [selectEntity],
        (entity) => entity.quickReference.records
    );

    const selectIsQuickReferenceFetchComplete = createSelector(
        [selectEntity],
        (entity) => entity.quickReference.fetchComplete
    );

    const selectQuickReferenceState = createSelector(
        [selectEntity],
        (entity) => entity.quickReference
    );


    const selectQuickReferenceByPrimaryKey = createSelector(
        [selectQuickReference, (_: RootState, primaryKeyValues: Record<string, MatrxRecordId>) => primaryKeyValues],
        (records, primaryKeyValues) => records.find(record => {
            return Object.entries(primaryKeyValues).every(([key, value]) => record.primaryKeyValues[key] === value);
        })
    );


// Selection Selectors ==================================================

    const selectSelectionState = createSelector(
        [selectEntity],
        (entity) => entity.selection
    );

    const selectSelectedRecordIds = createSelector(
        [selectSelectionState],
        (selection) => selection.selectedRecords || []
    );

    const selectSelectedRecords = createSelector(
        [selectEntity, selectSelectedRecordIds],
        (entity, selectedIds) => {
            if (!selectedIds.length) return [];
            return selectedIds
                .map(recordKey => entity.records[recordKey])
                .filter(Boolean);
        }
    );

    const selectSelectedRecordsWithKey = createSelector(
        [selectEntity, selectSelectedRecordIds],
        (entity, selectedIds) => {
            if (!selectedIds.length || !entity?.records) return {};

            return selectedIds.reduce((acc, recordKey) => {
                const record = entity.records[recordKey];
                if (record) {
                    acc[recordKey] = record;
                }
                return acc;
            }, {} as Record<string, NonNullable<typeof entity.records[keyof typeof entity.records]>>);
        }
    );

    const selectActiveRecordId = createSelector(
        [selectSelectionState],
        (selection) => selection.activeRecord ?? null
    );

    const selectSelectionMode = createSelector(
        [selectSelectionState],
        (selection) => selection.selectionMode
    );

    const selectIsRecordSelected = createSelector(
        [selectSelectedRecordIds, (_: RootState, recordId: MatrxRecordId) => recordId],
        (selectedIds, recordId) => selectedIds.includes(recordId)
    );

    const selectIsRecordActive = createSelector(
        [selectActiveRecordId, (_: RootState, recordId: MatrxRecordId) => recordId],
        (activeRecord, recordId) => activeRecord === recordId
    );

    const selectSelectionSummary = createSelector(
        [selectSelectedRecords, selectActiveRecordId, selectSelectionMode],
        (selectedRecords, activeRecord, mode) => {
            const count = selectedRecords.length;
            return {
                count,
                hasSelection: count > 0,
                hasSingleSelection: count === 1,
                hasMultipleSelection: count > 1,
                activeRecord,
                mode
            };
        }
    );

    const selectActiveRecord = createSelector(
        [selectEntity, selectActiveRecordId],
        (entity, activeRecordId) => {
            return activeRecordId ? entity.records[activeRecordId] : null;
        }
    );

    const selectActiveRecordWithId = createSelector(
        [selectEntity, selectActiveRecordId],
        (entity, activeRecordId) => {
            if (activeRecordId?.toString().startsWith('new-record-')) {
                return {
                    matrxRecordId: activeRecordId,
                    record: null
                };
            }
            if (!activeRecordId || !entity.records[activeRecordId]) {
                return {matrxRecordId: null, record: null};
            }
            return {
                matrxRecordId: activeRecordId,
                record: entity.records[activeRecordId]
            };
        }
    );

    // === End Selection Selectors ==================================================

    const selectRecordIdByRecord = createSelector(
        [selectEntity, (_: RootState, record: EntityData<TEntity>) => record],
        (entityState, record) => getRecordIdByRecord(entityState, record)
    );

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

    const selectCurrentPageWithRecordId = createSelector(
        [selectEntity, selectAllRecords],
        (entity, records): EntityDataWithId<TEntity>[] => {
            const {page, pageSize} = entity.pagination;
            const startIndex = (page - 1) * pageSize;

            return Object.entries(records)
                .slice(startIndex, startIndex + pageSize)
                .map(([recordKey, record]) => ({
                    ...record,
                    matrxRecordId: recordKey
                }));
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

    const selectErrorState = createSelector(
        [selectLoadingState],
        (loading) => loading.error
    );

    const selectIsStale = createSelector(
        [selectEntity],
        (entity) => entity.cache.stale
    );


    const selectEntityFlags = createSelector(
        [selectEntity],
        (entity) => entity.flags
    );

    const selectHasUnsavedChanges = createSelector(
        [selectEntity],
        (entity) => entity.flags.hasUnsavedChanges
    );

    const selectOperationMode = createSelector(
        [selectEntity],
        (entity) => entity.flags.operationMode
    );

    const selectIsValidated = createSelector(
        [selectEntity],
        (entity) => entity.flags.isValidated
    );

    const selectFetchOneStatus = createSelector(
        [selectEntity],
        (entity) => entity.flags.operationFlags.FETCH_ONE_STATUS
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
        (metadata) => metadata?.fields || []
    );

    const selectFieldNames = createSelector(
        [selectFieldInfo],
        (fields) => fields.map(field => field.name)
    );

    const selectFlexFormField = createSelector(
        [selectFieldInfo],
        (fields) => {
            if (!fields?.length) return [];

            return fields.map(field => ({
                ...field,
                label: field.displayName,
                type: mapFieldDataToFormField(field.dataType)
            }));
        }
    );


    // For select components (value/label pairs)
    const selectFieldOptions = createSelector(
        [selectFieldInfo],
        (fields) => fields.map(field => ({
            value: field.name,
            label: field.displayName
        }))
    );

    const selectDefaultValues = createSelector(
        [selectFieldInfo],
        (fieldInfo) =>
            fieldInfo.reduce(
                (acc, field) => ({
                    ...acc,
                    [field.name]: field.defaultValue,
                }),
                {} as Record<string, any>
            )
    );

    // Create separate selectors for expensive computations
    const selectRecordPair = createSelector(
        [
            selectEntity,
            (_: RootState, recordId: MatrxRecordId) => recordId,
            (state: RootState) => state,
        ],
        (entity, recordId, state) => {
            const originalRecord = entity.records[recordId] || null;
            const unsavedRecord = recordId ? selectUnsavedRecordById(state, recordId) : null;
            const isNewRecord = !originalRecord && !!unsavedRecord;
            return {originalRecord, unsavedRecord, isNewRecord};
        }
    );

    const selectChangedFieldsSet = createSelector(
        [
            selectRecordPair,
            selectFieldInfo,
        ],
        ({originalRecord, unsavedRecord, isNewRecord}, fieldInfo) => {
            if (isNewRecord) {
                return new Set(fieldInfo.map(field => field.name));
            }

            return new Set(
                fieldInfo
                    .filter(field =>
                        originalRecord &&
                        unsavedRecord &&
                        originalRecord[field.name] !== unsavedRecord[field.name]
                    )
                    .map(field => field.name)
            );
        }
    );

    const selectChangedFieldData = createSelector(
        [
            selectRecordPair,
            selectChangedFieldsSet,
        ],
        ({unsavedRecord, isNewRecord}, changedFields) => {
            // If it's a new record, include all fields from unsavedRecord
            if (isNewRecord && unsavedRecord) {
                return {...unsavedRecord};
            }

            // For updates, only include changed fields
            if (unsavedRecord) {
                return Array.from(changedFields).reduce((acc, fieldName) => ({
                    ...acc,
                    [fieldName]: unsavedRecord[fieldName]
                }), {});
            }

            return {};
        }
    );


    const selectFieldComparisons = createSelector(
        [
            selectRecordPair,
            selectChangedFieldsSet,
            selectFieldInfo,
        ],
        ({originalRecord, unsavedRecord, isNewRecord}, changedFields, fieldInfo) => {
            return fieldInfo.map(field => ({
                name: field.name,
                displayName: field.displayName,
                hasChanged: isNewRecord || changedFields.has(field.name),
                originalValue: originalRecord?.[field.name],
                newValue: unsavedRecord?.[field.name],
            }));
        }
    );

    // Main selector maintains same interface but uses optimized sub-selectors
    const selectChangeComparisonById = createSelector(
        [
            selectEntity,
            (_: RootState, recordId: MatrxRecordId) => recordId,
            selectFieldInfo,
            (state: RootState) => state,
        ],
        (entity, recordId, fieldInfo, state) => {
            const {originalRecord, unsavedRecord, isNewRecord} = selectRecordPair(state, recordId);
            const changedFields = selectChangedFieldsSet(state, recordId);
            const fieldComparisons = selectFieldComparisons(state, recordId);
            const changedFieldData = selectChangedFieldData(state, recordId);

            return {
                matrxRecordId: recordId,
                originalRecord,
                unsavedRecord,
                fieldInfo: fieldComparisons,
                changedFields,
                changedFieldData,
                hasChanges: isNewRecord || changedFields.size > 0,
                isNewRecord,
                displayName: unsavedRecord?.[selectDisplayField(state)] ??
                    originalRecord?.[selectDisplayField(state)]
            };
        }
    );


    const selectChangeComparison = createSelector(
        [
            selectActiveRecordWithId,
            selectFieldInfo,
            (state) => state,
        ],
        (activeRecordData, fieldInfo, state) => {
            if (!activeRecordData.matrxRecordId) return null;
            return selectChangeComparisonById(state, activeRecordData.matrxRecordId);
        }
    );

    const selectPendingOperations = createSelector(
        [selectEntity],
        (entity) => entity.pendingOperations
    );

    const selectTableColumns = createSelector(
        [selectFieldInfo],
        (fields) => {
            if (!fields?.length) return [];

            return fields.map(field => ({
                ...field,
                key: field.name,
                title: field.displayName
            }));
        }
    );


    const selectCombinedRecordsWithFieldInfo = createSelector(
        [selectEntity, selectFieldInfo, selectDisplayField],
        (entity, fieldInfo, displayField) => {
            const keyedSelectedRecords = Array.from(entity.selection.selectedRecords).reduce(
                (acc, recordKey) => {
                    const record = entity.records[recordKey];
                    if (record) {
                        acc[recordKey] = record;
                    }
                    return acc;
                },
                {} as Record<string, typeof entity.records[keyof typeof entity.records]>
            );

            return {
                records: keyedSelectedRecords,
                fieldInfo,
                displayField,
            };
        }
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
        [selectLoadingState, selectIsStale, selectHasUnsavedChanges, selectOperationMode],
        (loading, isStale, hasUnsavedChanges, operationMode) => ({
            isLoading: loading.loading,
            isError: !!loading.error,
            errorMessage: loading.error?.message,
            lastOperation: loading.lastOperation,
            isStale,
            hasUnsavedChanges,
            operationMode,
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

    const selectResponseTimeMetrics = createSelector(
        [selectPerformanceMetrics],
        (metrics) => metrics?.responseTimes ?? []
    );

    const selectThroughputMetrics = createSelector(
        [selectPerformanceMetrics],
        (metrics) => metrics?.throughput ?? []
    );

    // Cache-specific selectors
    const selectCacheHitRate = createSelector(
        [selectCacheStats],
        (stats) => stats.hitRate ?? []
    );

    const selectCacheSize = createSelector(
        [selectCacheStats],
        (stats) => stats.size ?? []
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


    const selectUnsavedRecords = createSelector(
        [selectEntity],
        (entity) => entity.unsavedRecords
    );

    const selectUnsavedRecordById = createSelector(
        [selectUnsavedRecords, (_, recordId: MatrxRecordId) => recordId],
        (unsavedRecords, recordId) => unsavedRecords[recordId]
    );

    const selectEffectiveRecordById = createSelector(
        [selectUnsavedRecords, selectRecordByKey, (_, recordId: MatrxRecordId) => recordId],
        (unsavedRecords, records, recordId) => {
            if (!unsavedRecords || !records) return null;
            return unsavedRecords[recordId] || records[recordId] || null;
        }
    );

    const selectIsTemporaryRecordId = createSelector(
        [(_, recordId: MatrxRecordId) => recordId],
        (recordId) => recordId.startsWith('new-record-')
    );

    const selectEffectiveRecordOrDefaults = createSelector(
        [
            selectEntity,
            selectDefaultValues,
            (_, recordId: MatrxRecordId) => recordId
        ],
        (entity, defaultValues, recordId) => {
            const isTemporary = recordId.startsWith('new-record-');
            const record = entity.unsavedRecords?.[recordId] || entity.records?.[recordId];

            if (!record) {
                return defaultValues;
            }

            if (isTemporary) {
                return {
                    ...defaultValues,
                    ...record
                };
            }

            return record;
        }
    );


    const selectFieldMetadata = createSelector(
        [selectFieldInfo, (_: RootState, fieldName: string) => fieldName],
        (fields, fieldName) => fields.find(f => f.name === fieldName)
    );

    const selectRecord = createSelector(
        [selectAllRecords, (_: RootState, recordKey: MatrxRecordId) => recordKey],
        (records, recordKey) => records[recordKey]
    );

    const selectEntityFieldDetails = createSelector(
        [
            selectFieldMetadata,
            selectRecord,
            (_: RootState, recordKey: MatrxRecordId, fieldName: string) => ({recordKey, fieldName})
        ],
        (fieldMetadata, record, {fieldName}) => {
            if (!fieldMetadata) {
                return null;
            }

            return {
                ...fieldMetadata,
                valueFromDb: record ? record[fieldName] : undefined
            };
        }
    );

    const selectFieldValue = createSelector(
        [
            (state: RootState, recordKey: MatrxRecordId, _fieldName: string) => selectRecord(state, recordKey),
            (_: RootState, _recordKey: MatrxRecordId, fieldName: string) => fieldName
        ],
        (record, fieldName) => record ? record[fieldName] : undefined
    );


    const selectFieldIdentifiers = createSelector(
        [selectFieldInfo],
        (fields) => fields.map(field => {
            console.log("field: ", field);
            console.log("uniqueFieldId: ", field.uniqueFieldId);
            const parts = field.uniqueFieldId.split(':');

            return {
                uniqueFieldId: field.uniqueFieldId,
                entityName: parts[1] || '',
                fieldName: parts[2] || ''
            };
        })
    );

    const selectFieldIdentifiersByName = createSelector(
        [selectFieldIdentifiers, (_: RootState, fieldName: string) => fieldName],
        (identifiers, fieldName) => identifiers.find(id => id.fieldName === fieldName)
    );


    const selectEntityOperationMode = createSelector(
        [selectEntityFlags],
        (flags): EntityOperationMode | undefined => flags?.operationMode
    );


    const selectEntityStatus = createSelector(
        [selectLoadingState],
        (loadingState): EntityStatus => {
            if (!loadingState?.initialized) return 'initialized';
            if (loadingState.error) return 'error';
            if (loadingState.loading) return 'loading';
            return 'other';
        }
    );


    const selectFieldGroups = createSelector(
        [selectFieldInfo],
        (fields) => ({
            nativeFields: fields.filter(field => field.isNative),
            relationshipFields: fields.filter(field => !field.isNative)
        })
    );

    const selectNativeFields = createSelector(
        [selectFieldGroups],
        (groups) => groups.nativeFields
    );

    const selectRelationshipFields = createSelector(
        [selectFieldGroups],
        (groups) => groups.relationshipFields
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
        selectErrorState,
        selectIsStale,
        selectHasUnsavedChanges,
        selectEntityFlags,
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
        selectActiveRecordId,
        selectSelectionMode,
        selectSelectionSummary,
        selectIsRecordSelected,
        selectIsRecordActive,

        // Convenience Additions
        selectEntityDisplayName,
        selectIsValidated,
        selectFetchOneStatus,
        selectRecordByKey,
        selectRecordsForFetching,
        selectActiveRecord,
        selectIsQuickReferenceFetchComplete,
        selectQuickReferenceState,

        selectRecordIdByRecord,

        selectSelectedRecordsWithKey,
        selectCombinedRecordsWithFieldInfo,
        selectActiveRecordWithId,
        selectDefaultValues,

        selectFlexFormField,

        selectMatrxRecordIdByPrimaryKey,
        selectMatrxRecordIdsByPrimaryKeys,

        selectMatrxRecordIdFromValue,
        selectMatrxRecordIdByValues,
        selectMatrxRecordIdByKeyValuePairs,

        selectFieldByKey,
        selectCurrentPageWithRecordId,

        selectOperationMode,
        selectUnsavedRecordById,
        selectEffectiveRecordById,
        selectIsTemporaryRecordId,

        selectChangeComparison,
        selectPendingOperations,
        selectEffectiveRecordOrDefaults,


        selectFieldValueByRecordKey,

        selectFieldMetadata,
        selectRecord,
        selectEntityFieldDetails,

        selectFieldNames,

        selectFieldIdentifiers,
        selectFieldIdentifiersByName,
        selectEntityOperationMode,
        selectEntityStatus,

        selectFieldValue,

        selectFieldGroups,
        selectNativeFields,
        selectRelationshipFields,

        selectRecordPair,
        selectChangedFieldsSet,
        selectFieldComparisons,
        selectChangeComparisonById,

    };
};
