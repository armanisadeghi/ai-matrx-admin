// utils/id-generator.ts

export const makeUniqueId = (prefix: string = ''): string => {
    return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

export const generateUniqueId = (prefix: string = ''): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    return `${prefix}${timestamp}-${random}`;
};
