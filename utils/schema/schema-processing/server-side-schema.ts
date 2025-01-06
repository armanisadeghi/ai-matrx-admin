import { EntityKeys } from '@/types';
import { getGlobalCache } from './processSchema';

// Base getters
export function getEntity(entityName: EntityKeys) {
    const cache = getGlobalCache(['getEntity']);
    if (!cache) return null;
    return cache.schema[entityName];
}

export function getEntityFields(entityName: EntityKeys) {
    const entity = getEntity(entityName);
    if (!entity) return null;
    return entity.entityFields;
}

export function getEntityField(entityName: EntityKeys, fieldName: string) {
    const fields = getEntityFields(entityName);
    if (!fields) return null;
    return fields[fieldName];
}

// Entity-level metadata
export function getPrimaryKeyMetadata(entityName: EntityKeys) {
    const entity = getEntity(entityName);
    if (!entity) return null;
    return entity.primaryKeyMetadata;
}

export function getDisplayFieldMetadata(entityName: EntityKeys) {
    const entity = getEntity(entityName);
    if (!entity) return null;
    return entity.displayFieldMetadata;
}

export function getEntityComponentProps(entityName: EntityKeys) {
    const entity = getEntity(entityName);
    if (!entity) return null;
    return entity.componentProps;
}

export function getEntityRelationships(entityName: EntityKeys) {
    const entity = getEntity(entityName);
    if (!entity) return null;
    return entity.relationships;
}

// Entity naming utilities
export function getEntityDisplayName(entityName: EntityKeys) {
    const entity = getEntity(entityName);
    if (!entity?.entityNameFormats) return null;
    return entity.entityNameFormats.pretty;
}

export function getEntityDatabaseName(entityName: EntityKeys) {
    const entity = getEntity(entityName);
    if (!entity?.entityNameFormats) return null;
    return entity.entityNameFormats.database;
}

export function getAllEntityFieldNames(entityName: EntityKeys) {
    const fields = getEntityFields(entityName);
    if (!fields) return [];
    return Object.keys(fields);
}

// Field-level utilities
export function getFieldDefaultComponent(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return field.defaultComponent;
}

export function getFieldComponentProps(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return field.componentProps;
}

export function getFieldPrettyName(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field?.fieldNameFormats) return null;
    return field.fieldNameFormats.pretty;
}

export function getFieldDatabaseName(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field?.fieldNameFormats) return null;
    return field.fieldNameFormats.database;
}

export function getFieldEnumValues(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return field.enumValues;
}

// Composite utilities that combine multiple pieces of information
export function getFieldWithMetadata(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;

    return {
        ...field,
        prettyName: getFieldPrettyName(entityName, fieldName),
        databaseName: getFieldDatabaseName(entityName, fieldName),
        defaultComponent: getFieldDefaultComponent(entityName, fieldName),
        componentProps: getFieldComponentProps(entityName, fieldName),
        enumValues: getFieldEnumValues(entityName, fieldName),
    };
}

export function getEntityWithMetadata(entityName: EntityKeys) {
    const entity = getEntity(entityName);
    if (!entity) return null;

    return {
        ...entity,
        displayName: getEntityDisplayName(entityName),
        databaseName: getEntityDatabaseName(entityName),
        primaryKeyMetadata: getPrimaryKeyMetadata(entityName),
        displayFieldMetadata: getDisplayFieldMetadata(entityName),
        componentProps: getEntityComponentProps(entityName),
        relationships: getEntityRelationships(entityName),
        fieldNames: getAllEntityFieldNames(entityName),
    };
}

// Field-level detail getters
export function getFieldUniqueIds(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return {
        columnId: field.uniqueColumnId,
        fieldId: field.uniqueFieldId
    };
}

export function getFieldDataTypeInfo(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return {
        dataType: field.dataType,
        isArray: field.isArray,
        maxLength: field.maxLength,
        typeReference: field.typeReference
    };
}

export function getFieldValidationInfo(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return {
        isRequired: field.isRequired,
        validationFunctions: field.validationFunctions,
        exclusionRules: field.exclusionRules
    };
}

export function getFieldDefaultInfo(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return {
        defaultValue: field.defaultValue,
        defaultGeneratorFunction: field.defaultGeneratorFunction
    };
}

export function getFieldKeyInfo(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return {
        isPrimaryKey: field.isPrimaryKey,
        isDisplayField: field.isDisplayField,
        isNative: field.isNative
    };
}

export function getFieldStructureInfo(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return {
        structure: field.structure,
        foreignKeyReference: field.foreignKeyReference,
        databaseTable: field.databaseTable
    };
}

export function getFieldComponentInfo(entityName: EntityKeys, fieldName: string) {
    const field = getEntityField(entityName, fieldName);
    if (!field) return null;
    return {
        defaultComponent: field.defaultComponent,
        componentProps: field.componentProps
    };
}

// Entity-level aggregation functions
export function getEntityPrimaryKeyField(entityName: EntityKeys) {
    const fields = getEntityFields(entityName);
    if (!fields) return null;
    return Object.entries(fields).find(([_, field]) => field.isPrimaryKey)?.[0];
}

export function getEntityDisplayField(entityName: EntityKeys) {
    const fields = getEntityFields(entityName);
    if (!fields) return null;
    return Object.entries(fields).find(([_, field]) => field.isDisplayField)?.[0];
}

export function getEntityRequiredFields(entityName: EntityKeys) {
    const fields = getEntityFields(entityName);
    if (!fields) return [];
    return Object.entries(fields)
        .filter(([_, field]) => field.isRequired)
        .map(([fieldName]) => fieldName);
}

export function getEntityDefaultValues(entityName: EntityKeys) {
    const fields = getEntityFields(entityName);
    if (!fields) return {};
    
    return Object.entries(fields)
        .reduce((acc, [fieldName, field]) => {
            if (field.defaultValue !== undefined && field.defaultValue !== null) {
                acc[fieldName] = field.defaultValue;
            }
            return acc;
        }, {} as Record<string, any>);
}

export function getEntityNativeFields(entityName: EntityKeys) {
    const fields = getEntityFields(entityName);
    if (!fields) return [];
    return Object.entries(fields)
        .filter(([_, field]) => field.isNative)
        .map(([fieldName]) => fieldName);
}

export function getEntityForeignFields(entityName: EntityKeys) {
    const fields = getEntityFields(entityName);
    if (!fields) return [];
    return Object.entries(fields)
        .filter(([_, field]) => !field.isNative)
        .map(([fieldName]) => fieldName);
}

// Composite function to get all field classifications
export function getEntityFieldClassifications(entityName: EntityKeys) {
    return {
        primaryKey: getEntityPrimaryKeyField(entityName),
        displayField: getEntityDisplayField(entityName),
        requiredFields: getEntityRequiredFields(entityName),
        defaultValues: getEntityDefaultValues(entityName),
        nativeFields: getEntityNativeFields(entityName),
        foreignFields: getEntityForeignFields(entityName)
    };
}

// Helper function to get complete field metadata
export function getCompleteFieldMetadata(entityName: EntityKeys, fieldName: string) {
    return {
        ids: getFieldUniqueIds(entityName, fieldName),
        dataType: getFieldDataTypeInfo(entityName, fieldName),
        validation: getFieldValidationInfo(entityName, fieldName),
        defaults: getFieldDefaultInfo(entityName, fieldName),
        keys: getFieldKeyInfo(entityName, fieldName),
        structure: getFieldStructureInfo(entityName, fieldName),
        component: getFieldComponentInfo(entityName, fieldName),
        naming: {
            prettyName: getFieldPrettyName(entityName, fieldName),
            databaseName: getFieldDatabaseName(entityName, fieldName)
        }
    };
}