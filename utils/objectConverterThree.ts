// File: objectConverterThree.ts

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
            id: "id",
            name: "name",
            module_path: "modulePath",
            class_name: "className",
            description: "description",
            broker: "returnBroker",
            arg: "arg",
            system_function: "systemFunction",
            recipe_function: "recipeFunction",
        },
        rpc: {
            id: "rf_id",
            name: "rf_name",
            module_path: "rf_modulePath",
            class_name: "rf_className",
            description: "rf_description",
            broker: "rf_returnBroker",
            arg: "rf_arg",
            system_function: "rf_systemFunction",
            recipe_function: "rf_recipeFunction",
        },
    },
    arg: {
        basic: {
            id: "id",
            name: "name",
            required: "required",
            default: "default",
            data_type: "dataType",
            ready: "ready",
            registered_function: "registeredFunction",
        },
        rpc: {
            id: "p_id",
            name: "p_name",
            required: "p_required",
            default: "p_default",
            dataType: "p_dataType",
            ready: "p_ready",
            registeredFunction: "p_registeredFunction",

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
