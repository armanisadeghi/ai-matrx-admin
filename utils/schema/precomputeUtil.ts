import {
    AutomationCustomName,
    AutomationTableName, AutomationViewName,
    NameFormat,
    OptionalNameFormats,
    RequiredNameFormats
} from "@/types/AutomationSchemaTypes";
import {
    AnySchema,
    TableField,
    TableSchema, CustomSchema, ViewField,
} from "@/types/AutomationTypes";
import {automationTableSchema, automationviewSchemas} from "@/utils/schema/initialSchemas";

// Helper type for precomputed formats
type PrecomputedSchema<T extends AnySchema> = Omit<T, 'precomputedFormats'> & {
    [K in `${NameFormat}TableName`]?: string;
};

export function initializeTableSchema(schema: TableSchema<AutomationTableName>): TableSchema<AutomationTableName> {
    const fieldNameMappings: Record<string, Partial<Record<NameFormat, string>>> = {};

    // Handle required and optional formats separately
    for (const [fieldKey, field] of Object.entries(schema.entityFields)) {
        fieldNameMappings[fieldKey] = {
            // Required formats
            frontend: field.fieldNameVariations.frontend,
            backend: field.fieldNameVariations.backend,
            database: field.fieldNameVariations.database,
            pretty: field.fieldNameVariations.pretty,
            component: field.fieldNameVariations.component,

            // Optional formats
            ...(field.fieldNameVariations.kebab && { kebab: field.fieldNameVariations.kebab }),
            ...(field.fieldNameVariations.sqlFunctionRef && { sqlFunctionRef: field.fieldNameVariations.sqlFunctionRef }),
            ...(field.fieldNameVariations.RestAPI && { RestAPI: field.fieldNameVariations.RestAPI }),
            ...(field.fieldNameVariations.GraphQL && { GraphQL: field.fieldNameVariations.GraphQL }),
            ...(field.fieldNameVariations.custom && { custom: field.fieldNameVariations.custom })
        };
    }

    const precomputedFormats: Partial<Record<NameFormat, PrecomputedSchema<typeof schema>>> = {};

    // Handle required formats first
    const requiredFormats: RequiredNameFormats[] = ['frontend', 'backend', 'database', 'pretty', 'component'];
    const optionalFormats: OptionalNameFormats[] = ['kebab', 'sqlFunctionRef', 'RestAPI', 'GraphQL', 'custom'];

    [...requiredFormats, ...optionalFormats].forEach(format => {
        if (format in schema.entityNameVariations) {
            const transformedFields: Record<string, TableField> = {};

            for (const [fieldKey, field] of Object.entries(schema.entityFields)) {
                const transformedFieldName = field.fieldNameVariations[format];
                if (transformedFieldName) {
                    transformedFields[fieldKey] = {
                        ...field,
                        fieldNameVariations: {
                            ...field.fieldNameVariations,
                            [format]: transformedFieldName
                        }
                    };
                }
            }

            precomputedFormats[format] = {
                ...schema,
                schemaType: 'table',
                [`${format}TableName`]: schema.entityNameVariations[format],
                entityFields: transformedFields,
                fieldNameMappings
            } as PrecomputedSchema<typeof schema>;
        }
    });

    return {
        ...schema,
        precomputedFormats,
        fieldNameMappings,
    };
}

export function getPrecomputedFormat<T extends AnySchema>(
    schema: T,
    format: NameFormat
): T | undefined {
    return schema.precomputedFormats?.[format] as T | undefined;
}

export function translateFieldName(
    schema: AnySchema,
    fieldName: string,
    fromFormat: NameFormat,
    toFormat: NameFormat
): string | undefined {
    const mappings = schema.fieldNameMappings?.[fieldName];
    if (!mappings) {
        console.warn(`Field name '${fieldName}' not found in schema.`);
        return undefined;
    }
    return mappings[toFormat];
}

const formatCache: Record<string, AnySchema> = {};

export function applyFormat<T extends AnySchema>(
    schema: T,
    format: NameFormat
): T {
    const cacheKey = `${schema.entityNameVariations.frontend}-${format}`;
    if (formatCache[cacheKey]) {
        return formatCache[cacheKey] as T;
    }

    const transformedFields: Record<string, TableField> = {};

    for (const [fieldKey, field] of Object.entries(schema.entityFields)) {
        const transformedFieldName = translateFieldName(schema, fieldKey, 'frontend', format);
        if (transformedFieldName) {
            transformedFields[fieldKey] = {
                ...field,
                fieldNameVariations: {
                    ...field.fieldNameVariations,
                    [format]: transformedFieldName
                }
            };
        }
    }

    const result = {
        ...schema,
        [`${format}TableName`]: schema.entityNameVariations[format],
        entityFields: transformedFields,
    } as T;

    formatCache[cacheKey] = result;
    return result;
}

export function applyCustomFormat(
    schema: TableSchema<AutomationTableName>,
    customFormat: NameFormat
): CustomSchema<AutomationCustomName> {
    const customName = `custom_${schema.entityNameVariations[customFormat] || schema.entityNameVariations.frontend}`;
    const transformedFields: Record<string, TableField> = {};

    for (const [fieldKey, field] of Object.entries(schema.entityFields)) {
        transformedFields[fieldKey] = {
            ...field,
            fieldNameVariations: {
                ...field.fieldNameVariations,
                custom: field.fieldNameVariations[customFormat] || field.fieldNameVariations.frontend
            }
        };
    }

    return {
        ...schema,
        schemaType: 'custom',
        entityNameVariations: {
            ...schema.entityNameVariations,
            custom: customName
        },
        entityFields: transformedFields,
        defaultFetchStrategy: 'none'
    } as CustomSchema<AutomationCustomName>;
}

// Lookup utilities
export function getTableField<T extends AutomationTableName>(
    tableName: T,
    fieldName: string
): TableField | null {
    const tableSchema = automationTableSchema[tableName];
    return tableSchema?.entityFields[fieldName] ?? null;
}

export function getViewField<T extends AutomationViewName>(
    viewName: T,
    fieldName: string
): ViewField | null {
    const viewSchema = automationviewSchemas[viewName];
    return viewSchema?.entityFields[fieldName] ?? null;
}
