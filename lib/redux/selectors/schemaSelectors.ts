import {RootState} from "@/lib/redux/store";

/*
Available Selectors and Their Usage

selectConvertObjectToEntityName: Converts entity names to their canonical form based on entityNameToCanonical in your Redux state.
selectConvertFieldNames: Converts field names to their canonical form for a specific entity based on fieldNameToCanonical.
selectConvertEntityNameFormat: Converts entity names to a specified format (e.g., frontend, backend, etc.).
selectConvertFieldNameFormat: Converts field names to a specified format for a specific entity.
getSchema: Retrieves the automation schema from your Redux state.
isSchemaInitialized: Checks if the schema is initialized in your Redux state.
 */

export const getSchema = (state: RootState) => state.schema.automationSchema;
export const getEntityFormats = (state: RootState) => state.schema.entityNameFormats;
export const getFieldFormats = (state: RootState) => state.schema.fieldNameFormats;
export const isSchemaInitialized = (state: RootState) => state.schema.isInitialized;


// Entity Name to Canonical Conversion Selector (Single Value)
export const selectValueVariationToEntityName = (state: RootState) => {
    const keyMapping = state.schema.entityNameToCanonical;
    if (!keyMapping) return null;

    return (data: string) => replaceKeysInString(data, keyMapping);
};

// Field Name to Canonical Conversion Selector (Single Value)
export const selectValueVariationToEntityFieldName = (state: RootState, entityName: string) => {
    const keyMapping = state.schema.fieldNameToCanonical?.[entityName];
    if (!keyMapping) return null;

    return (data: string) => replaceKeysInString(data, keyMapping);
};



export const selectObjectVariationToEntityNames = (state: RootState) => {
    const keyMapping = state.schema.entityNameToCanonical;
    if (!keyMapping) return null;

    return <T extends Record<string, any>>(data: T | T[]) =>
        replaceKeysInObject(data, keyMapping);
};


export const selectObjectVariationToEntityFieldNames = (state: RootState, entityName: string) => {
    const keyMapping = state.schema.fieldNameToCanonical?.[entityName];
    if (!keyMapping) return null;

    return <T extends Record<string, any>>(data: T | T[]) =>
        replaceKeysInObject(data, keyMapping);
};


export const selectValueToEntityVariation = (state: RootState, format: string) => {
    const formatMap = selectEntityNameFormatMap(state, format);
    if (!formatMap) return null;

    return (data: string) => replaceKeysInString(data, formatMap);
};

export const selectValueToFieldVariation = (state: RootState, entityName: string, format: string) => {
    const formatMap = selectFieldNameFormatMap(state, entityName, format);
    if (!formatMap) return null;

    return (data: string) => replaceKeysInString(data, formatMap);
};



export const selectConvertEntityNameFormat = (state: RootState, format: string) => {
    const formatMap = selectEntityNameFormatMap(state, format);
    if (!formatMap) return null;

    return <T extends Record<string, any>>(data: T | T[]) =>
        replaceKeysInObject(data, formatMap);
};

// 5. Field Name Format Map Selector
export const selectFieldNameFormatMap = (state: RootState, entityName: string, format: string): KeyMapping | null => {
    const fieldFormats = state.schema.fieldNameFormats?.[entityName];
    if (!fieldFormats) return null;

    const formatMap: KeyMapping = {};
    Object.entries(fieldFormats).forEach(([canonicalField, formats]) => {
        if (formats[format]) {
            formatMap[canonicalField] = formats[format];
        }
    });
    return formatMap;
};

// 6. Convert Field Name Format Selector
export const selectConvertFieldNameFormat = (state: RootState, entityName: string, format: string) => {
    const formatMap = selectFieldNameFormatMap(state, entityName, format);
    if (!formatMap) return null;

    return <T extends Record<string, any>>(data: T | T[]) =>
        replaceKeysInObject(data, formatMap);
};

export const selectEntityNameFormatMap = (state: RootState, format: string): KeyMapping | null => {
    const entityNameFormats = state.schema.entityNameFormats;
    if (!entityNameFormats) return null;

    const formatMap: KeyMapping = {};
    Object.entries(entityNameFormats).forEach(([canonicalName, formats]) => {
        if (formats[format]) {
            formatMap[canonicalName] = formats[format];
        }
    });
    return formatMap;
};

type KeyMapping = { [oldKey: string]: string };


function replaceKeysInObject<T extends Record<string, any>>(
    data: T | T[],
    keyMapping: KeyMapping
): T | T[] {
    const replaceKeys = (obj: T): T => {
        return Object.keys(obj).reduce((acc, key) => {
            const newKey = keyMapping[key] || key;
            (acc as Record<string, any>)[newKey] = obj[key];
            return acc;
        }, {} as T);
    };

    if (Array.isArray(data)) {
        return data.map(replaceKeys);
    }

    return replaceKeys(data);
}

function replaceKeysInString(data: string, keyMapping: KeyMapping): string {
    return Object.keys(keyMapping).reduce((acc, key) => {
        const regex = new RegExp(key, 'g');
        return acc.replace(regex, keyMapping[key]);
    }, data);
}


// Converts data to the 'database' format for both entities and fields
export function toDatabaseFormat<T extends Record<string, any>>(state: RootState, entityName: string, data: T | T[]): T | T[] {
    const convertEntityName = selectConvertEntityNameFormat(state, "database");
    const convertFieldName = selectConvertFieldNameFormat(state, entityName, "database");

    let convertedData = data;
    if (convertEntityName) convertedData = convertEntityName(convertedData);
    if (convertFieldName) convertedData = convertFieldName(convertedData);

    return convertedData;
}

// Converts data to the 'frontend' format for both entities and fields, using canonical names
export function toFrontendFormat<T extends Record<string, any>>(state: RootState, entityName: string, data: T | T[]): T | T[] {
    const convertEntityName = selectObjectVariationToEntityNames(state);
    const convertFieldName = selectObjectVariationToEntityFieldNames(state, entityName);

    let convertedData = data;
    if (convertEntityName) convertedData = convertEntityName(convertedData);
    if (convertFieldName) convertedData = convertFieldName(convertedData);

    return convertedData;
}

// Converts data to the 'pretty' format for both entities and fields
export function toPrettyFormat<T extends Record<string, any>>(state: RootState, entityName: string, data: T | T[]): T | T[] {
    const convertEntityName = selectConvertEntityNameFormat(state, "pretty");
    const convertFieldName = selectConvertFieldNameFormat(state, entityName, "pretty");

    let convertedData = data;
    if (convertEntityName) convertedData = convertEntityName(convertedData);
    if (convertFieldName) convertedData = convertFieldName(convertedData);

    return convertedData;
}

// Converts data to the 'sqlFunctionRef' format for both entities and fields
export function toSqlFunctionRefFormat<T extends Record<string, any>>(state: RootState, entityName: string, data: T | T[]): T | T[] {
    const convertEntityName = selectConvertEntityNameFormat(state, "sqlFunctionRef");
    const convertFieldName = selectConvertFieldNameFormat(state, entityName, "sqlFunctionRef");

    let convertedData = data;
    if (convertEntityName) convertedData = convertEntityName(convertedData);
    if (convertFieldName) convertedData = convertFieldName(convertedData);

    return convertedData;
}
