// File: objectConverter.ts

type ConversionMap<T, U> = {
    [K in keyof T]: keyof U;
};

export function createConverter<T extends Record<string, any>, U extends Record<string, any>>(conversionMap: ConversionMap<T, U>) {
    return {
        toDb: (data: Partial<T>): Partial<U> => {
            const result: Partial<U> = {};
            for (const key in data) {
                if (key in conversionMap) {
                    const dbKey = conversionMap[key] as keyof U;
                    result[dbKey] = data[key] as any;
                }
            }
            return result;
        },
        toUi: (data: Partial<U>): Partial<T> => {
            const result: Partial<T> = {};
            for (const uiKey in conversionMap) {
                const dbKey = conversionMap[uiKey as keyof T];
                if (dbKey in data) {
                    result[uiKey as keyof T] = data[dbKey] as any;
                }
            }
            return result;
        }
    };
}
