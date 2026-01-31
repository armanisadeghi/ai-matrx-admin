import { createFieldId } from '@/types/schema';
import { EntityKeys } from '@/types/entityTypes';
import { initialAutomationTableSchema } from '../initialSchemas';
import { FieldOverrideName, AllEntityFieldOverrides, ProcessedField, EntityProcessedFields } from './overrideTypes';
import { applyCalculatedFields } from './fieldCalculatedOverrides';

// https://claude.ai/chat/1e5472cc-a4fa-42d6-b7a4-0dce43d400ae



// Helper to check if a value is effectively empty (reused from before)
export function isEmptyOverride(value: any): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
}

// Helper to get field-specific override
export function getFieldOverride(
    entityName: EntityKeys,
    fieldName: string,
    overrideName: FieldOverrideName,
    fieldOverrides: AllEntityFieldOverrides
): any | null {
    const entityOverrides = fieldOverrides[entityName];
    if (!entityOverrides) return null;

    const fieldOverride = entityOverrides[fieldName];
    if (!fieldOverride) return null;

    const override = fieldOverride[overrideName];
    if (isEmptyOverride(override)) return null;

    return override;
}

// Process a single field property
function processFieldProperty(
    entityName: EntityKeys,
    fieldName: string,
    propertyName: FieldOverrideName,
    originalValue: any,
    fieldOverrides: AllEntityFieldOverrides
): any {
    const override = getFieldOverride(entityName, fieldName, propertyName, fieldOverrides);
    return override ?? originalValue;
}

export function processDefaultGeneratorFunction(
    entityName: EntityKeys,
    fieldName: string,
    originalValue: any,
    fieldOverrides: AllEntityFieldOverrides
): string {
    // For now, using basic override logic. Will be enhanced later.
    const override = getFieldOverride(entityName, fieldName, 'defaultGeneratorFunction', fieldOverrides);
    return override ?? originalValue;
}

export function processValidationFunctions(entityName: EntityKeys, fieldName: string, originalValue: any[], fieldOverrides: AllEntityFieldOverrides): any[] {
    // For now, using basic override logic. Will be enhanced later.
    const override = getFieldOverride(entityName, fieldName, 'validationFunctions', fieldOverrides);
    return override ?? originalValue;
}

export function processComponentProps(
    entityName: EntityKeys,
    fieldName: string,
    originalValue: Record<string, any>,
    fieldOverrides: AllEntityFieldOverrides
): Record<string, any> {
    const override = getFieldOverride(entityName, fieldName, 'componentProps', fieldOverrides);

    if (!override) return originalValue;
    if (!originalValue) return override;

    // Special merger for componentProps
    const mergedProps: Record<string, any> = {
        ...originalValue, // Start with all original props
        ...override, // Override with any new values
    };

    // Special handling for options array if both exist
    if (originalValue.options && override.options) {
        // Override completely replaces original options
        mergedProps.options = override.options;
    }

    return mergedProps;
}

export function processForeignKeyReference(entityName: EntityKeys, fieldName: string, originalValue: any, fieldOverrides: AllEntityFieldOverrides): any {
    // For now, using basic override logic. Will be enhanced later.
    const override = getFieldOverride(entityName, fieldName, 'foreignKeyReference', fieldOverrides);
    return override ?? originalValue;
}

export function processDescription(entityName: EntityKeys, fieldName: string, originalValue: string, fieldOverrides: AllEntityFieldOverrides): string {
    // For now, using basic override logic. Will be enhanced later.
    const override = getFieldOverride(entityName, fieldName, 'description', fieldOverrides);
    return override ?? originalValue;
}

export function processFieldNameFormats(entityName: EntityKeys, fieldName: string, originalValue: any, fieldOverrides: AllEntityFieldOverrides): any {
    // For now, using basic override logic. Will be enhanced later.
    const override = getFieldOverride(entityName, fieldName, 'fieldNameFormats', fieldOverrides);
    return override ?? originalValue;
}

// Updated processField function to use specialized processors
export function processField<TEntity extends EntityKeys>(
    entityName: TEntity,
    fieldName: string,
    originalField: any,
    fieldOverrides: AllEntityFieldOverrides
): Partial<ProcessedField> {
    const baseProcessedField: Partial<ProcessedField> = {
        // Basic properties using simple processor
        uniqueColumnId: processFieldProperty(entityName, fieldName, 'uniqueColumnId', originalField.uniqueColumnId, fieldOverrides),
        uniqueFieldId: processFieldProperty(entityName, fieldName, 'uniqueFieldId', originalField.uniqueFieldId, fieldOverrides),
        dataType: processFieldProperty(entityName, fieldName, 'dataType', originalField.dataType, fieldOverrides),
        isRequired: processFieldProperty(entityName, fieldName, 'isRequired', originalField.isRequired, fieldOverrides),
        maxLength: processFieldProperty(entityName, fieldName, 'maxLength', originalField.maxLength, fieldOverrides),
        isArray: processFieldProperty(entityName, fieldName, 'isArray', originalField.isArray, fieldOverrides),
        defaultValue: processFieldProperty(entityName, fieldName, 'defaultValue', originalField.defaultValue, fieldOverrides),
        isPrimaryKey: processFieldProperty(entityName, fieldName, 'isPrimaryKey', originalField.isPrimaryKey, fieldOverrides),
        isDisplayField: processFieldProperty(entityName, fieldName, 'isDisplayField', originalField.isDisplayField, fieldOverrides),

        // Specialized processors
        defaultGeneratorFunction: processDefaultGeneratorFunction(entityName, fieldName, originalField.defaultGeneratorFunction, fieldOverrides),
        validationFunctions: processValidationFunctions(entityName, fieldName, originalField.validationFunctions, fieldOverrides),
        componentProps: processComponentProps(entityName, fieldName, originalField.componentProps, fieldOverrides),
        foreignKeyReference: processForeignKeyReference(entityName, fieldName, originalField.foreignKeyReference, fieldOverrides),
        description: processDescription(entityName, fieldName, originalField.description, fieldOverrides),
        fieldNameFormats: processFieldNameFormats(entityName, fieldName, originalField.fieldNameFormats, fieldOverrides),

        // Remaining basic properties
        exclusionRules: processFieldProperty(entityName, fieldName, 'exclusionRules', originalField.exclusionRules, fieldOverrides),
        defaultComponent: processFieldProperty(entityName, fieldName, 'defaultComponent', originalField.defaultComponent, fieldOverrides),
        structure: processFieldProperty(entityName, fieldName, 'structure', originalField.structure, fieldOverrides),
        isNative: processFieldProperty(entityName, fieldName, 'isNative', originalField.isNative, fieldOverrides),
        typeReference: processFieldProperty(entityName, fieldName, 'typeReference', originalField.typeReference, fieldOverrides),
        enumValues: processFieldProperty(entityName, fieldName, 'enumValues', originalField.enumValues, fieldOverrides),
        entityName: processFieldProperty(entityName, fieldName, 'entityName', originalField.entityName, fieldOverrides),
        databaseTable: processFieldProperty(entityName, fieldName, 'databaseTable', originalField.databaseTable, fieldOverrides),
    };

    return applyCalculatedFields(baseProcessedField, entityName, fieldName, fieldOverrides) as ProcessedField;
}

// Updated processEntityFields function to use the new field processor
export function processEntityFields<TEntity extends EntityKeys>(
    entityName: TEntity,
    entityDef: typeof initialAutomationTableSchema[EntityKeys],
    fieldOverrides: AllEntityFieldOverrides
) {
    const processedFields: Record<string, Partial<ProcessedField>> = {};

    Object.entries(entityDef.entityFields).forEach(([fieldName, fieldDef]) => {
        const processedField = processField(entityName, fieldName, fieldDef, fieldOverrides);

        const fieldId = createFieldId(entityName, fieldName);  // changed to remove field__id concept but it will cause problems with global cache slice.

        processedFields[fieldName] = processedField;
    });

    return processedFields as EntityProcessedFields<TEntity>;
}
