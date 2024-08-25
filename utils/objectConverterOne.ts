// File: objectConverterOne.ts

type ConversionMap = {
    [key: string]: string | { dbStandard: string; uiStandard: string };
};

type SubTypeConversionMap = {
    [subType: string]: ConversionMap;
};

type TableConversionMap = {
    [tableName: string]: SubTypeConversionMap;
};

const conversionMaps: TableConversionMap = {
    registeredFunction: {
        basic: {
            id: { dbStandard: "id", uiStandard: "id" },
            name: { dbStandard: "name", uiStandard: "name" },
            module_path: { dbStandard: "module_path", uiStandard: "modulePath" },
            class_name: { dbStandard: "class_name", uiStandard: "className" },
            description: { dbStandard: "description", uiStandard: "description" },
            broker: { dbStandard: "broker", uiStandard: "returnBroker" },
            arg: { dbStandard: "arg", uiStandard: "arg" },
            system_function: { dbStandard: "system_function", uiStandard: "systemFunction" },
            recipe_function: { dbStandard: "recipe_function", uiStandard: "recipeFunction" },
        },
        rpc: {
            id: { dbStandard: "rf_id", uiStandard: "id" },
            name: { dbStandard: "rf_name", uiStandard: "name" },
            module_path: { dbStandard: "rf_module_path", uiStandard: "modulePath" },
            class_name: { dbStandard: "rf_class_name", uiStandard: "className" },
            description: { dbStandard: "rf_description", uiStandard: "description" },
            broker: { dbStandard: "rf_broker", uiStandard: "returnBroker" },
            arg: { dbStandard: "rf_arg", uiStandard: "arg" },
            system_function: { dbStandard: "rf_system_function", uiStandard: "systemFunction" },
            recipe_function: { dbStandard: "rf_recipe_function", uiStandard: "recipeFunction" },
        },
    },
    arg: {
        basic: {
            id: { dbStandard: "id", uiStandard: "id" },
            name: { dbStandard: "name", uiStandard: "name" },
            required: { dbStandard: "required", uiStandard: "required" },
            default: { dbStandard: "default", uiStandard: "default" },
            data_type: { dbStandard: "data_type", uiStandard: "dataType" },
            ready: { dbStandard: "ready", uiStandard: "ready" },
            registered_function: { dbStandard: "registered_function", uiStandard: "registeredFunction" },
        },
        rpc: {
            id: { dbStandard: "p_id", uiStandard: "id" },
            name: { dbStandard: "p_name", uiStandard: "name" },
            required: { dbStandard: "p_required", uiStandard: "required" },
            default: { dbStandard: "p_default", uiStandard: "default" },
            data_type: { dbStandard: "p_data_type", uiStandard: "dataType" },
            ready: { dbStandard: "p_ready", uiStandard: "ready" },
            registered_function: { dbStandard: "p_registered_function", uiStandard: "registeredFunction" },
        },
    },
};

type ConversionDirection = "toUiStandard" | "toDbStandard";

function convertKeys<T extends object>(
    obj: T,
    conversionMap: ConversionMap,
    direction: ConversionDirection
): { [K in keyof T]: any } {
    const result: { [K in keyof T]: any } = {} as { [K in keyof T]: any };

    for (const key in obj) {
        const value = obj[key];
        let newKey: string;

        if (typeof conversionMap[key] === "string") {
            newKey = direction === "toUiStandard" ? conversionMap[key] as string : key;
        } else if (typeof conversionMap[key] === "object") {
            const mapObj = conversionMap[key] as { dbStandard: string; uiStandard: string };
            newKey = direction === "toUiStandard" ? mapObj.uiStandard : mapObj.dbStandard;
        } else {
            newKey = key;
        }

        result[newKey as keyof T] = value;
    }

    return result;
}

export function convertObject<T extends object>(
    tableName: keyof typeof conversionMaps,
    subType: string,
    obj: T,
    direction: ConversionDirection
): { [K in keyof T]: any } {
    const conversionMap = conversionMaps[tableName][subType];
    return convertKeys(obj, conversionMap, direction);
}

export function convertObjects<T extends object>(
    tableName: keyof typeof conversionMaps,
    subType: string,
    objects: T[],
    direction: ConversionDirection
): { [K in keyof T]: any }[] {
    return objects.map((obj) => convertObject(tableName, subType, obj, direction));
}


export function toDbStandardBasic<T extends object>(data: T): { [K in keyof T]: any } {
    return convertObject('registeredFunction', 'basic', data, 'toDbStandard');
}

export function toUiStandardBasic<T extends object>(data: T): { [K in keyof T]: any } {
    return convertObject('registeredFunction', 'basic', data, 'toUiStandard');
}

export function toDbStandardRpc<T extends object>(data: T): { [K in keyof T]: any } {
    return convertObject('registeredFunction', 'rpc', data, 'toDbStandard');
}

export function toUiStandardRpc<T extends object>(data: T): { [K in keyof T]: any } {
    return convertObject('registeredFunction', 'rpc', data, 'toUiStandard');
}

// Helper functions for arrays
export function toDbStandardBasicArray<T extends object>(data: T[]): { [K in keyof T]: any }[] {
    return convertObjects('registeredFunction', 'basic', data, 'toDbStandard');
}

export function toUiStandardBasicArray<T extends object>(data: T[]): { [K in keyof T]: any }[] {
    return convertObjects('registeredFunction', 'basic', data, 'toUiStandard');
}

export function toDbStandardRpcArray<T extends object>(data: T[]): { [K in keyof T]: any }[] {
    return convertObjects('registeredFunction', 'rpc', data, 'toDbStandard');
}

export function toUiStandardRpcArray<T extends object>(data: T[]): { [K in keyof T]: any }[] {
    return convertObjects('registeredFunction', 'rpc', data, 'toUiStandard');
}

