// lib/redux/hooks/useGlobalCache.ts

import { useMemo } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { RootState } from '@/lib/redux/store';
import {
    EntityKeys,
    EntityFieldKeys,
} from '@/types/entityTypes';
import { NameFormat } from '@/types/AutomationSchemaTypes';
import {
    selectSchema,
    selectEntityNames,
    selectEntities,
    selectIsInitialized,
    selectEntityNameToCanonical,
    selectFieldNameToCanonical,
    selectEntityNameFormats,
    selectFieldNameFormats,
    selectEntityNameToDatabase,
    selectEntityNameToBackend,
    selectFieldNameToDatabase,
    selectFieldNameToBackend,
    selectEntity,
    selectEntityFields,
    selectField,
    selectEntityPrimaryKeyField,
    selectEntityDisplayField,
    selectEntityFieldNameToDatabaseMap,
    selectEntityRelationships,
    selectRelatedEntities,
    selectEntityDatabaseName,
    selectEntityBackendName,
    selectEntityCanonicalName,
    selectEntityPrettyName,
    selectEntityAnyName,
    selectFieldDatabaseName,
    selectFieldBackendName,
    selectFieldFrontendName,
    selectFieldPrettyName,
    selectAllFieldPrettyNames,
    selectFieldAnyName,
    selectEntitySchema,
    selectFieldSchema,
    selectReplaceKeysInObject,
    safeSelectReplaceKeysInObjectWithErrorControl,
    selectConvertDataFormat,
    selectDatabaseConversion,
    selectBackendConversion,
    selectPrettyEntityMapping,
    selectPrettyFieldMapping,
    selectPrettyConversion,
    selectAnyEntityMapping,
    selectAnyFieldMapping,
    selectAnyObjectFormatConversion,
    selectUnknownToAnyObjectFormatConversion,
    selectFrontendConversion,
    selectCanonicalConversion,
    selectQueryDatabaseConversion,
    selectPayloadOptionsDatabaseConversion,
    selectUnifiedQueryDatabaseConversion,
    selectFormattedEntityOptions,
    selectFieldNameMappingForEntity,
} from './globalCacheSelectors';
import { KeyMapping, UnifiedQueryOptions } from './globalCacheSelectors';

export const useSchema = () => {
    // Direct State Access Selectors
    const schema = useAppSelector(selectSchema);
    const entityNames = useAppSelector(selectEntityNames);
    const entities = useAppSelector(selectEntities);
    const isInitialized = useAppSelector(selectIsInitialized);

    // Direct conversion map selectors
    const entityNameToCanonical = useAppSelector(selectEntityNameToCanonical);
    const fieldNameToCanonical = useAppSelector(selectFieldNameToCanonical);
    const entityNameFormats = useAppSelector(selectEntityNameFormats);
    const fieldNameFormats = useAppSelector(selectFieldNameFormats);
    const entityNameToDatabase = useAppSelector(selectEntityNameToDatabase);
    const entityNameToBackend = useAppSelector(selectEntityNameToBackend);
    const fieldNameToDatabase = useAppSelector(selectFieldNameToDatabase);
    const fieldNameToBackend = useAppSelector(selectFieldNameToBackend);

    // Selectors for useful merged, preformatted data
    const entityNameAndPrettyName = useAppSelector(selectFormattedEntityOptions);

    // Core Derived Selectors

    // Get entity by name
    const getEntity = (entityName: EntityKeys): SchemaEntity | undefined => {
        const selector = useMemo(
            () => (state: RootState) => selectEntity(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get fields of an entity
    const getEntityFields = (entityName: EntityKeys): SchemaField[] => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityFields(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    const getFieldNameMappingForEntity = (entityName: EntityKeys) => {
        const selector = useMemo(
            () => (state: RootState) => selectFieldNameMappingForEntity(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Combine the fields and field name mappings into a flat structure
    const createTypedEntityFields = (entityName: EntityKeys) => {
        return useMemo(() => {
            const fields = getEntityFields(entityName);
            const fieldNameMappings = getFieldNameMappingForEntity(entityName);

            // Map over each field and combine base field data with name variations
            return fields.map((field) => {
                const fieldName = field.fieldName;
                const nameFormats = fieldNameMappings[fieldName] || {};

                // Create the flat structure by combining field data and name formats
                return {
                    ...field,
                    ...nameFormats,
                };
            });
        }, [entityName, getEntityFields, getFieldNameMappingForEntity]);
    };



    // Get a specific field of an entity
    const getField = (entityName: EntityKeys, fieldName: string): SchemaField | undefined => {
        const selector = useMemo(
            () => (state: RootState) => selectField(state, { entityName, fieldName }),
            [entityName, fieldName]
        );
        return useAppSelector(selector);
    };

    // Get primary key field of an entity
    const getEntityPrimaryKeyField = (entityName: EntityKeys): string | undefined => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityPrimaryKeyField(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get display field of an entity
    const getEntityDisplayField = (entityName: EntityKeys): string | undefined => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityDisplayField(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get field name to database mapping for an entity
    const getEntityFieldNameToDatabaseMap = (entityName: EntityKeys): Record<string, string> => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityFieldNameToDatabaseMap(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get relationships of an entity
    const getEntityRelationships = (entityName: EntityKeys): any[] => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityRelationships(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get related entities
    const getRelatedEntities = (entityName: EntityKeys): any[] => {
        const selector = useMemo(
            () => (state: RootState) => selectRelatedEntities(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get database name of an entity
    const getEntityDatabaseName = (entityName: EntityKeys): string => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityDatabaseName(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get backend name of an entity
    const getEntityBackendName = (entityName: EntityKeys): string => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityBackendName(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get canonical name of an entity from any alias
    const getEntityCanonicalName = (entityAlias: string): EntityKeys => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityCanonicalName(state, entityAlias),
            [entityAlias]
        );
        return useAppSelector(selector);
    };

    // Get pretty name of an entity
    const getEntityPrettyName = (entityName: EntityKeys): string => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityPrettyName(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get any formatted name of an entity
    const getEntityAnyName = (entityName: EntityKeys, format: NameFormat): string => {
        const selector = useMemo(
            () => (state: RootState) => selectEntityAnyName(state, { entityName, format }),
            [entityName, format]
        );
        return useAppSelector(selector);
    };

    // Get database name of a field
    const getFieldDatabaseName = (entityName: EntityKeys, fieldName: string): string => {
        const selector = useMemo(
            () => (state: RootState) => selectFieldDatabaseName(state, { entityName, fieldName }),
            [entityName, fieldName]
        );
        return useAppSelector(selector);
    };

    // Get backend name of a field
    const getFieldBackendName = (entityName: EntityKeys, fieldName: string): string => {
        const selector = useMemo(
            () => (state: RootState) => selectFieldBackendName(state, { entityName, fieldName }),
            [entityName, fieldName]
        );
        return useAppSelector(selector);
    };

    // Get frontend name of a field
    const getFieldFrontendName = (entityName: EntityKeys, fieldName: string): string => {
        const selector = useMemo(
            () => (state: RootState) => selectFieldFrontendName(state, { entityName, fieldName }),
            [entityName, fieldName]
        );
        return useAppSelector(selector);
    };

    // Get pretty name of a field
    const getFieldPrettyName = (entityName: EntityKeys, fieldName: string): string => {
        const selector = useMemo(
            () => (state: RootState) => selectFieldPrettyName(state, { entityName, fieldName }),
            [entityName, fieldName]
        );
        return useAppSelector(selector);
    };

    // Get all pretty names of fields in an entity
    const getAllFieldPrettyNames = (entityName: EntityKeys): Record<string, string> => {
        const selector = useMemo(
            () => (state: RootState) => selectAllFieldPrettyNames(state, { entityName }),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get any formatted name of a field
    const getFieldAnyName = (
        entityName: EntityKeys,
        fieldName: string,
        format: NameFormat
    ): string => {
        const selector = useMemo(
            () => (state: RootState) => selectFieldAnyName(state, { entityName, fieldName, format }),
            [entityName, fieldName, format]
        );
        return useAppSelector(selector);
    };

    // Get schema of an entity
    const getEntitySchema = (entityName: EntityKeys): SchemaEntity | undefined => {
        const selector = useMemo(
            () => (state: RootState) => selectEntitySchema(state, { entityName }),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Get schema of a field
    const getFieldSchema = (
        entityName: EntityKeys,
        fieldName: EntityFieldKeys<EntityKeys>
    ): SchemaField | undefined => {
        const selector = useMemo(
            () => (state: RootState) => selectFieldSchema(state, { entityName, fieldName }),
            [entityName, fieldName]
        );
        return useAppSelector(selector);
    };

    // Replace keys in object using key mapping
    const replaceKeysInObject = (data: any, keyMapping: KeyMapping): any => {
        const selector = useMemo(
            () => (state: RootState) => selectReplaceKeysInObject(state, data, keyMapping),
            [data, keyMapping]
        );
        return useAppSelector(selector);
    };

    // Safely replace keys in object with error control
    const safeReplaceKeysInObject = (data: any, keyMapping: KeyMapping): any => {
        const selector = useMemo(
            () =>
                (state: RootState) =>
                    safeSelectReplaceKeysInObjectWithErrorControl(state, data, keyMapping),
            [data, keyMapping]
        );
        return useAppSelector(selector);
    };

    // Convert data format using entity and field name mappings
    const convertDataFormat = (
        data: any,
        entityNameMapping: KeyMapping,
        fieldNameMapping: KeyMapping
    ): any => {
        const selector = useMemo(
            () => (state: RootState) => selectConvertDataFormat(state, data, entityNameMapping, fieldNameMapping),
            [data, entityNameMapping, fieldNameMapping]
        );
        return useAppSelector(selector);
    };

    // Database conversion for data
    const getDatabaseConversion = (entityName: EntityKeys, data: any): any => {
        const selector = useMemo(
            () => (state: RootState) => selectDatabaseConversion(state, { entityName, data }),
            [entityName, data]
        );
        return useAppSelector(selector);
    };

    // Backend conversion for data
    const getBackendConversion = (entityName: EntityKeys, data: any): any => {
        const selector = useMemo(
            () => (state: RootState) => selectBackendConversion(state, { entityName, data }),
            [entityName, data]
        );
        return useAppSelector(selector);
    };

    // Get pretty entity mapping
    const prettyEntityMapping = useAppSelector(selectPrettyEntityMapping);

    // Get pretty field mapping for an entity
    const getPrettyFieldMapping = (entityName: EntityKeys): Record<string, string> => {
        const selector = useMemo(
            () => (state: RootState) => selectPrettyFieldMapping(state, entityName),
            [entityName]
        );
        return useAppSelector(selector);
    };

    // Pretty conversion for data
    const getPrettyConversion = (entityName: EntityKeys, data: any): any => {
        const selector = useMemo(
            () => (state: RootState) => selectPrettyConversion(state, { entityName, data }),
            [entityName, data]
        );
        return useAppSelector(selector);
    };

    // Get any entity mapping with specified format
    const getAnyEntityMapping = (format: NameFormat): Record<string, string> => {
        const selector = useMemo(
            () => (state: RootState) => selectAnyEntityMapping(state, format),
            [format]
        );
        return useAppSelector(selector);
    };

    // Get any field mapping for an entity with specified format
    const getAnyFieldMapping = (entityName: EntityKeys, format: NameFormat): Record<string, string> => {
        const selector = useMemo(
            () => (state: RootState) => selectAnyFieldMapping(state, entityName, format),
            [entityName, format]
        );
        return useAppSelector(selector);
    };

    // Convert object format to any specified format
    const getAnyObjectFormatConversion = (
        entityName: EntityKeys,
        data: any,
        format: NameFormat
    ): any => {
        const selector = useMemo(
            () => (state: RootState) => selectAnyObjectFormatConversion(state, { entityName, data, format }),
            [entityName, data, format]
        );
        return useAppSelector(selector);
    };

    // Convert unknown entity alias to any object format
    const getUnknownToAnyObjectFormatConversion = (
        entityAlias: string,
        data: any,
        targetFormat: NameFormat
    ): any => {
        const selector = useMemo(
            () => (state: RootState) => selectUnknownToAnyObjectFormatConversion(state, { entityAlias, data, targetFormat }),
            [entityAlias, data, targetFormat]
        );
        return useAppSelector(selector);
    };

    // Frontend conversion for data
    const getFrontendConversion = (entityName: EntityKeys, data: any): any => {
        const selector = useMemo(
            () => (state: RootState) => selectFrontendConversion(state, { entityName, data }),
            [entityName, data]
        );
        return useAppSelector(selector);
    };

    // Canonical conversion for data
    const getCanonicalConversion = (entityName: EntityKeys, data: any): any => {
        const selector = useMemo(
            () => (state: RootState) => selectCanonicalConversion(state, { entityName, data }),
            [entityName, data]
        );
        return useAppSelector(selector);
    };

    // Convert query options for database
    const getQueryDatabaseConversion = (
        entityName: EntityKeys,
        options?: QueryOptions<EntityKeys>
    ): QueryOptions<EntityKeys> => {
        const selector = useMemo(
            () => (state: RootState) => selectQueryDatabaseConversion(state, { entityName, options }),
            [entityName, options]
        );
        return useAppSelector(selector);
    };

    // Convert payload options for database
    const getPayloadOptionsDatabaseConversion = (
        entityName: EntityKeys,
        options?: QueryOptions<EntityKeys>
    ): QueryOptions<EntityKeys> | undefined => {
        const selector = useMemo(
            () => (state: RootState) => selectPayloadOptionsDatabaseConversion(state, { entityName, options }),
            [entityName, options]
        );
        return useAppSelector(selector);
    };

    // Convert unified query options for database
    const getUnifiedQueryDatabaseConversion = (
        entityName: EntityKeys,
        options?: UnifiedQueryOptions<EntityKeys>
    ): UnifiedQueryOptions<EntityKeys> | undefined => {
        const selector = useMemo(
            () => (state: RootState) => selectUnifiedQueryDatabaseConversion(state, { entityName, options }),
            [entityName, options]
        );
        return useAppSelector(selector);
    };

    // useSchema hook return object
    return {
        // Direct State Access Selectors
        schema,
        entityNames,
        entities,
        fields,
        fieldsByEntity,
        isInitialized,

        // Direct conversion map selectors
        entityNameToCanonical,
        fieldNameToCanonical,
        entityNameFormats,
        fieldNameFormats,
        entityNameToDatabase,
        entityNameToBackend,
        fieldNameToDatabase,
        fieldNameToBackend,

        // Useful merged, preformatted data
        entityNameAndPrettyName,
        getFieldNameMappingForEntity,
        createTypedEntityFields,


        // Core Derived Selectors
        getEntity,
        getEntityFields,
        getField,
        getEntityPrimaryKeyField,
        getEntityDisplayField,
        getEntityFieldNameToDatabaseMap,
        getEntityRelationships,
        getRelatedEntities,
        getEntityDatabaseName,
        getEntityBackendName,
        getEntityCanonicalName,
        getEntityPrettyName,
        getEntityAnyName,
        getFieldDatabaseName,
        getFieldBackendName,
        getFieldFrontendName,
        getFieldPrettyName,
        getAllFieldPrettyNames,
        getFieldAnyName,
        getEntitySchema,
        getFieldSchema,

        // Data Conversion Selectors
        replaceKeysInObject,
        safeReplaceKeysInObject,
        convertDataFormat,
        getDatabaseConversion,
        getBackendConversion,
        prettyEntityMapping,
        getPrettyFieldMapping,
        getPrettyConversion,
        getAnyEntityMapping,
        getAnyFieldMapping,
        getAnyObjectFormatConversion,
        getUnknownToAnyObjectFormatConversion,
        getFrontendConversion,
        getCanonicalConversion,
        getQueryDatabaseConversion,
        getPayloadOptionsDatabaseConversion,
        getUnifiedQueryDatabaseConversion,
    };
};
