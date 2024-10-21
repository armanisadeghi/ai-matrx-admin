import {CustomTableSchema} from "@/types/tableSchemaTypes";
import {
    AutomationTableName,
    AutomationViewName,
    BaseEntitySchema,
    DataFormat,
    TableField,
    TableSchema
} from "@/types/AutomationTypes";
import {tableSchemas, viewSchemas} from "@/utils/schema/initialSchemas";


export function initializeTableSchema(schema: TableSchema): TableSchema {
    const fieldNameMappings: Record<string, Record<DataFormat, string>> = {};

    for (const [fieldKey, field] of Object.entries(schema.entityFields)) {
        fieldNameMappings[fieldKey] = {
            frontend: field.fieldNameVariations.frontendName,
            backend: field.fieldNameVariations.backendName,
            database: field.fieldNameVariations.databaseName,
            pretty: field.fieldNameVariations.prettyName,
            component: field.fieldNameVariations.componentName,
            kebab: field.fieldNameVariations.kebabName,
        };
    }

    const precomputedFormats: Record<DataFormat, TableSchema> = {} as Record<DataFormat, TableSchema>;

    const formats: DataFormat[] = ['frontend', 'backend', 'database', 'pretty', 'component', 'kebab'];

    formats.forEach(format => {
        const transformedFields: Record<string, TableField> = {};

        for (const [fieldKey, field] of Object.entries(schema.entityFields)) {
            const transformedFieldName = field.fieldNameVariations[`${format}Name`];
            transformedFields[fieldKey] = {
                ...field,
                [`${format}FieldName`]: transformedFieldName,
            };
        }

        precomputedFormats[format] = {
            ...schema,
            schemaType: 'table',
            [`${format}TableName`]: schema.entityNameVariations[`${format}Name`],
            entityFields: transformedFields,
            fieldNameMappings,
        };
    });

    // precomputedFormats['custom'] = applyCustomFormat(schema, 'custom'); // TODO: Add Back after Type Fixes

    return {
        ...schema,
        precomputedFormats,
        fieldNameMappings,
    };
}

export function getPrecomputedFormat(schema: BaseEntitySchema, format: DataFormat): BaseEntitySchema {
    return schema.precomputedFormats ? schema.precomputedFormats[format] : schema;
}

export function translateFieldName(schema: BaseEntitySchema, fieldName: string, fromFormat: DataFormat, toFormat: DataFormat): string | undefined {
    const mappings = schema.fieldNameMappings[fieldName];
    if (!mappings) {
        console.warn(`Field name '${fieldName}' not found in schema.`);
        return undefined;
    }
    return mappings[toFormat];
}

const formatCache: Record<string, BaseEntitySchema> = {};

export function applyFormat(schema: BaseEntitySchema, format: DataFormat): BaseEntitySchema {
    const cacheKey = `${schema.entityNameVariations.frontendName}-${format}`;
    if (formatCache[cacheKey]) {
        return formatCache[cacheKey];
    }

    const transformedFields: Record<string, TableField> = {};

    for (const [fieldKey, field] of Object.entries(schema.entityFields)) {
        const transformedFieldName = translateFieldName(schema, fieldKey, 'frontend', format);
        transformedFields[fieldKey] = {
            ...field,
            [`${format}FieldName`]: transformedFieldName,
        };
    }

    const result = {
        ...schema,
        [`${format}TableName`]: schema.entityNameVariations[`${format}Name`],
        entityFields: transformedFields,
    };

    formatCache[cacheKey] = result;
    return result;
}


/*  // TODO: Add Back after Type Fixes
function applyCustomFormat(schema: TableSchema, customFormat: DataFormat): CustomTableSchema {
    const customName = `custom_${schema.entityNameVariations[customFormat] || schema.entityNameVariations.frontend}`;
    const transformedFields = {};

    for (const [fieldKey, field] of Object.entries(schema.entityFields)) {
        transformedFields[fieldKey] = {
            ...field,
            customFieldName: field.fieldNameVariations[customFormat] || field.fieldNameVariations.frontend,
            customFormat
        };
    }

    return {
        ...schema,
        customName,
        customFormat,
        entityFields: transformedFields
    };
}
*/






export function getTableField(tableName: AutomationTableName, fieldName: string) {
    const tableSchema = tableSchemas[tableName];
    return tableSchema?.entityFields[fieldName] ?? null;
}

export function getViewField(viewName: AutomationViewName, fieldName: string) {
    const viewSchema = viewSchemas[viewName];
    return viewSchema?.entityFields[fieldName] ?? null;
}


