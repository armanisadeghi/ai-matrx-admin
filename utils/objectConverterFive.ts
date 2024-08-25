// File: objectConverter.ts

type ConversionMap = Record<string, string>;

const snakeToCamel = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
const camelToSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

function convertKeys(obj: Record<string, any>, converter: (key: string) => string): Record<string, any> {
    return Object.keys(obj).reduce((result, key) => {
        result[converter(key)] = obj[key];
        return result;
    }, {} as Record<string, any>);
}

export function toDbStandard<T extends Record<string, any>>(data: T): Record<string, any> {
    return convertKeys(data, camelToSnake);
}

export function toUiStandard<T extends Record<string, any>>(data: T): Record<string, any> {
    return convertKeys(data, snakeToCamel);
}

export function toDbStandardArray<T extends Record<string, any>>(data: T[]): Record<string, any>[] {
    return data.map(toDbStandard);
}

export function toUiStandardArray<T extends Record<string, any>>(data: T[]): Record<string, any>[] {
    return data.map(toUiStandard);
}

// For cases where simple camelCase to snake_case conversion isn't enough
export function customConvert<T extends Record<string, any>>(
    data: T,
    conversionMap: ConversionMap
): Record<string, any> {
    return Object.keys(data).reduce((result, key) => {
        const newKey = conversionMap[key] || key;
        result[newKey] = data[key];
        return result;
    }, {} as Record<string, any>);
}
