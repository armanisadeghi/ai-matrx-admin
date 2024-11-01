// lib/redux/schema/utils.ts

export type KeyMapping = { [oldKey: string]: string };

export function replaceKeysInObject<T extends Record<string, any>>(
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

export function convertDataFormat<T extends Record<string, any>>(
    data: T | T[],
    entityNameMapping: KeyMapping,
    fieldNameMapping: KeyMapping
): T | T[] {
    // First convert entity names if present
    const entityConverted = replaceKeysInObject(data, entityNameMapping);

    // Then convert field names
    return replaceKeysInObject(entityConverted, fieldNameMapping);
}


export function replaceKeysInString(data: string, keyMapping: KeyMapping): string {
    return Object.keys(keyMapping).reduce((acc, key) => {
        const regex = new RegExp(key, "g");
        return acc.replace(regex, keyMapping[key]);
    }, data);
}

export function createKeyMappingFromFormat(
    sourceFormat: Record<string, string>,
    targetFormat: Record<string, string>
): KeyMapping {
    return Object.entries(sourceFormat).reduce((acc, [key, value]) => {
        if (targetFormat[key]) {
            acc[value] = targetFormat[key];
        }
        return acc;
    }, {} as KeyMapping);
}

