// File: objectConverterFour.ts

type ConversionMap = {
    [key: string]: string;
};

type TableConversionMap = {
    [tableName: string]: {
        toDb: ConversionMap;
        toUi: ConversionMap;
        toDbP: ConversionMap;
        toUiP: ConversionMap;
    };
};

const conversionMaps: TableConversionMap = {
    registered_function: {
        toDb: {
            id: 'id',
            name: 'name',
            modulePath: 'module_path',
            className: 'class_name',
            description: 'description',
            returnBroker: 'return_broker',
            arg: 'arg',
            systemFunction: 'system_function',
            recipeFunction: 'recipe_function',
        },
        toUi: {
            id: 'id',
            name: 'name',
            module_path: 'modulePath',
            class_name: 'className',
            description: 'description',
            return_broker: 'returnBroker',
            arg: 'arg',
            system_function: 'systemFunction',
            recipe_function: 'recipeFunction',
        },
        toDbP: {
            id: 'p_id',
            name: 'p_name',
            modulePath: 'p_module_path',
            className: 'p_class_name',
            description: 'p_description',
            returnBroker: 'p_return_broker',
            arg: 'p_arg',
            systemFunction: 'p_system_function',
            recipeFunction: 'p_recipe_function',
        },
        toUiP: {
            p_id: 'id',
            p_name: 'name',
            p_module_path: 'modulePath',
            p_class_name: 'className',
            p_description: 'description',
            p_return_broker: 'returnBroker',
            p_arg: 'arg',
            p_system_function: 'systemFunction',
            p_recipe_function: 'recipeFunction',
        },
    },
    // Add more tables here as needed
};

function convertObject<T extends object>(
    obj: T,
    conversionMap: ConversionMap
): { [key: string]: any } {
    const result: { [key: string]: any } = {};
    for (const key in obj) {
        const newKey = conversionMap[key] || key;
        result[newKey] = obj[key];
    }
    return result;
}

export function toDbStandard<T extends object>(
    tableName: keyof typeof conversionMaps,
    data: T
): { [key: string]: any } {
    return convertObject(data, conversionMaps[tableName].toDb);
}

export function toUiStandard<T extends object>(
    tableName: keyof typeof conversionMaps,
    data: T
): { [key: string]: any } {
    return convertObject(data, conversionMaps[tableName].toUi);
}

export function toDbStandardArray<T extends object>(
    tableName: keyof typeof conversionMaps,
    data: T[]
): { [key: string]: any }[] {
    return data.map(item => toDbStandard(tableName, item));
}

export function toUiStandardArray<T extends object>(
    tableName: keyof typeof conversionMaps,
    data: T[]
): { [key: string]: any }[] {
    return data.map(item => toUiStandard(tableName, item));
}
