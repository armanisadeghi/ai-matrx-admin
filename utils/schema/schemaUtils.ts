// File: lib/schemaUtils.ts


import {TableSchema, globalSchemaRegistry, FieldConverter} from "@/utils/schema/schemaRegistry";
import {v4 as uuidv4} from 'uuid';

function generateJsonTemplate(tableName: string): Record<string, any> {
    const schema: TableSchema | undefined = globalSchemaRegistry[tableName];

    if (!schema) {
        console.warn(`Schema not found for table: ${tableName}`);
        return {};
    }

    const result: Record<string, any> = {};

    for (const [fieldName, converter] of Object.entries(schema.fields)) {
        // Initialize each field based on its defined type
        result[fieldName] = initializeFieldValue(converter);
    }

    return result;
}

function initializeFieldValue(converter: FieldConverter<any>): any {
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


type DataWithOptionalId = { id?: string; [key: string]: any };
type DataWithId = { id: string; [key: string]: any };

function ensureId<T extends DataWithOptionalId | DataWithOptionalId[]>(input: T):
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


export {generateJsonTemplate, ensureId};
