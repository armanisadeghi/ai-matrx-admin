// File: lib/schemaUtils.ts


import {getSchema, globalSchemaRegistry} from "@/utils/schema/schemaRegistry";
import {v4 as uuidv4} from "uuid";
import {initialSchemas} from "@/utils/schema/initialSchemas";
import {TableSchema} from "@/types/tableSchemaTypes";



export function resolveTableName<T extends keyof typeof initialSchemas>(
    table: FrontendTableNames,
    variant: keyof typeof initialSchemas[T]['name']
): string {
    const tableSchema = globalSchemaRegistry[table as string];
    return <string>tableSchema.name[variant as keyof AltOptions];
}





export function generateJsonTemplate(tableName: string): Record<string, any> {
    console.log("generateJsonTemplate: Called with tableName:", tableName);

    const schema: TableSchema | undefined = getSchema(tableName);
    console.log("generateJsonTemplate: Found schema:", schema);

    if (!schema) {
        console.warn(`generateJsonTemplate: Schema not found for table: ${tableName}`);
        return {};
    }

    console.log("generateJsonTemplate: Found schema:", schema);

    const result: Record<string, any> = {};

    for (const [fieldName, converter] of Object.entries(schema.fields)) {
        console.log(`generateJsonTemplate: Processing field: ${fieldName} with type: ${converter.type}`);
        result[fieldName] = initializeFieldValue(converter);
    }

    console.log("generateJsonTemplate: Generated template:", result);
    return result;
}

export function initializeFieldValue(converter: FieldConverter<any>): any {
    switch (converter.type) {
        case 'string':
            return '';
        case 'number':
            return 0;
        case 'boolean':
            return false;
        case 'array':
            return [];
        case 'object':
            return {};
        case 'null':
            return null;
        case 'undefined':
            return undefined;
        case 'function':
            return () => {
            };
        case 'symbol':
            return Symbol();
        case 'bigint':
            return BigInt(0);
        case 'date':
            return new Date();
        case 'map':
            return new Map();
        case 'set':
            return new Set();
        case 'tuple':
            return [];
        case 'enum':
        case 'union':
        case 'intersection':
        case 'literal':
        case 'void':
        case 'any':
            return null; // or a default value if specific to your case
        case 'never':
            throw new Error('Cannot initialize a value for "never" type');
        default:
            return null;
    }
}


export type DataWithOptionalId = { id?: string; [key: string]: any };
export type DataWithId = { id: string; [key: string]: any };

export function ensureId<T extends DataWithOptionalId | DataWithOptionalId[]>(input: T):
    T extends DataWithOptionalId[] ? DataWithId[] : DataWithId {
    if (Array.isArray(input)) {
        return input.map((item) => ({
            ...item,
            id: item.id ?? uuidv4(),
        })) as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
    } else {
        if ('id' in input && typeof input.id === 'string') {
            return input as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
        }
        return {...input, id: uuidv4()} as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
    }
}



// 1. Get the pretty name for the table
export function getPrettyNameForTable(tableName: string): string | undefined {
    const schema = getSchema(tableName);
    return schema?.name.pretty;
}

// 2. Get all non-FK/IFK fields with their frontend names, types, and pretty names
export function getNonFkFields(tableName: string): Array<{ name: string; pretty: string; type: string }> {
    const schema = getSchema(tableName);
    if (!schema) return [];

    return Object.entries(schema.fields)
        .filter(([_, field]) => field.structure.structure === 'simple')
        .map(([fieldName, field]) => ({
            name: field.alts.frontend,
            pretty: field.alts.pretty,
            type: field.type
        }));
}

// 3. Get a list of foreign keys
export function getForeignKeys(tableName: string): Array<{ name: string; pretty: string; type: string }> {
    const schema = getSchema(tableName);
    if (!schema) return [];

    return Object.entries(schema.fields)
        .filter(([_, field]) => field.structure.structure === 'foreignKey')
        .map(([fieldName, field]) => ({
            name: field.alts.frontend,
            pretty: field.alts.pretty,
            type: field.type
        }));
}

// 4. Get a list of inverse foreign keys
export function getInverseForeignKeys(tableName: string): Array<{ name: string; pretty: string; type: string }> {
    const schema = getSchema(tableName);
    if (!schema) return [];

    return Object.entries(schema.fields)
        .filter(([_, field]) => field.structure.structure === 'inverseForeignKey')
        .map(([fieldName, field]) => ({
            name: field.alts.frontend,
            pretty: field.alts.pretty,
            type: field.type
        }));
}

// 5. Get a list of both FK and IFK fields
export function getAllKeys(tableName: string): Array<{ name: string; pretty: string; type: string; structure: string }> {
    const schema = getSchema(tableName);
    if (!schema) return [];

    return Object.entries(schema.fields)
        .filter(([_, field]) => field.structure.structure === 'foreignKey' || field.structure.structure === 'inverseForeignKey')
        .map(([fieldName, field]) => ({
            name: field.alts.frontend,
            pretty: field.alts.pretty,
            type: field.type,
            structure: field.structure.structure
        }));
}

// 6. Get a list of all fields, specifying which are simple, FK, or IFK
export function getAllFields(tableName: string): Array<{ name: string; pretty: string; type: string; structure: string }> {
    const schema = getSchema(tableName);
    if (!schema) return [];

    return Object.entries(schema.fields).map(([fieldName, field]) => ({
        name: field.alts.frontend,
        pretty: field.alts.pretty,
        type: field.type,
        structure: field.structure.structure
    }));
}
