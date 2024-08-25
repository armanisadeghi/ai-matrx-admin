// File: objectConverterTwo.ts

import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';

type DbRegisteredFunctionType = {
    id?: string;
    name: string;
    module_path: string;
    class_name?: string;
    description?: string;
    return_broker?: string;
    arg?: any;
    system_function?: any[];
    recipe_function?: any[];
};

type ConversionMap<T, U> = {
    [K in keyof T]: keyof U;
};

const registeredFunctionConversionMap: ConversionMap<RegisteredFunctionType, DbRegisteredFunctionType> = {
    id: 'id',
    name: 'name',
    modulePath: 'module_path',
    className: 'class_name',
    description: 'description',
    returnBroker: 'return_broker',
    arg: 'arg',
    systemFunction: 'system_function',
    recipeFunction: 'recipe_function',
};

function convertToDbStandard<T extends object, U extends object>(
    data: T,
    conversionMap: ConversionMap<T, U>
): U {
    const result = {} as U;
    for (const key in data) {
        const dbKey = conversionMap[key as keyof T] as keyof U;
        if (dbKey) {
            result[dbKey] = data[key as keyof T] as any;
        }
    }
    return result;
}

function convertToUiStandard<T extends object, U extends object>(
    data: T,
    conversionMap: ConversionMap<U, T>
): U {
    const result = {} as U;
    for (const key in data) {
        const uiKey = Object.keys(conversionMap).find(
            (k) => conversionMap[k as keyof U] === key
        ) as keyof U;
        if (uiKey) {
            result[uiKey] = data[key as keyof T] as any;
        }
    }
    return result;
}

export function toDbStandardRegisteredFunction(
    data: Partial<RegisteredFunctionType>
): DbRegisteredFunctionType {
    return convertToDbStandard(data, registeredFunctionConversionMap);
}

export function toUiStandardRegisteredFunction(
    data: DbRegisteredFunctionType
): RegisteredFunctionType {
    return convertToUiStandard(data, registeredFunctionConversionMap);
}

export function toDbStandardRegisteredFunctionArray(
    data: Partial<RegisteredFunctionType>[]
): DbRegisteredFunctionType[] {
    return data.map((item) => toDbStandardRegisteredFunction(item));
}

export function toUiStandardRegisteredFunctionArray(
    data: DbRegisteredFunctionType[]
): RegisteredFunctionType[] {
    return data.map((item) => toUiStandardRegisteredFunction(item));
}
