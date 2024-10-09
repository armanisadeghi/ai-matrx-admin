// types/FlexibleId.ts

export type FlexibleId = string | number;

export const flexibleIdToString = (id: FlexibleId): string => id.toString();
export const flexibleIdToNumber = (id: FlexibleId): number => {
    if (typeof id === 'number') return id;
    const num = Number(id);
    return isNaN(num) ? -1 : num; // Return -1 for invalid number strings
};

export const isValidFlexibleId = (id: FlexibleId): boolean => {
    if (typeof id === 'number') return !isNaN(id);
    return id.trim() !== '';
};

export const compareFlexibleIds = (id1: FlexibleId, id2: FlexibleId): boolean => {
    if (typeof id1 === 'number' && typeof id2 === 'number') return id1 === id2;
    return flexibleIdToString(id1) === flexibleIdToString(id2);
};
