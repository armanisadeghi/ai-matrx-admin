// File location: features/registered-function/objectConverter.ts

import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';

export function dbToUi(data: Partial<any>): RegisteredFunctionType {
    return {
        ...data,
        id: data.id || '',
        name: data.name || '',
        modulePath: data.module_path || '',
        className: data.class_name || '',
        description: data.description || '',
        returnBroker: data.broker || '',
        arg: data.arg || '',
        systemFunction: data.system_function || [],
        recipeFunction: data.recipe_function || [],
    };
}

export function uiToDb(data: Partial<RegisteredFunctionType>): any {
    return {
        ...data,
        id: data.id || '',
        name: data.name || '',
        module_path: data.modulePath || '',
        class_name: data.className || '',
        description: data.description || '',
        broker: data.returnBroker || '',
        arg: data.arg || '',
        system_function: data.systemFunction || [],
        recipe_function: data.recipeFunction || [],
    };
}

function uiToRpc(data: Partial<RegisteredFunctionType>): any {
    return {
        ...data,
        p_id: data.id || '',
        p_name: data.name || '',
        p_module_path: data.modulePath || '',
        p_class_name: data.className || '',
        p_description: data.description || '',
        p_broker: data.returnBroker || '',
        p_arg: data.arg || '',
        system_function: data.systemFunction || [],
        recipe_function: data.recipeFunction || [],
    };
}

export function dbToUiArray(dataArray: Partial<any>[]): RegisteredFunctionType[] {
    return dataArray.map(dbToUi);
}

export function uiToDbArray(dataArray: Partial<RegisteredFunctionType>[]): any[] {
    return dataArray.map(uiToDb);
}

function uiToRpcArray(dataArray: Partial<RegisteredFunctionType>[]): any[] {
    return dataArray.map(uiToRpc);
}
