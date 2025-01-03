// @/utils/prop-utils.ts

/**
 * Safely extracts a typed value from componentProps
 * @param props The componentProps object
 * @param key The key to look for in the props
 * @param defaultValue The default value to return if the prop doesn't exist or is invalid
 * @returns The typed value or the default value
 */
export function getPropValue<T>(
    props: Record<string, unknown> | undefined,
    key: string,
    defaultValue: T
): T {
    if (!props || !(key in props)) {
        return defaultValue;
    }

    const value = props[key];

    // Type guard function to check if the value matches the default value type
    const isMatchingType = (val: unknown): val is T => {
        // Handle array type checking
        if (Array.isArray(defaultValue)) {
            return Array.isArray(val);
        }
        // Handle primitive type checking
        return typeof val === typeof defaultValue;
    };

    return isMatchingType(value) ? value : defaultValue;
}

/**
 * Type-safe way to extract an array prop
 * @param props The componentProps object
 * @param key The key to look for in the props
 * @param defaultValue The default array to return if the prop doesn't exist or is invalid
 */
export function getArrayProp<T>(
    props: Record<string, unknown> | undefined,
    key: string,
    defaultValue: T[]
): T[] {
    const value = props?.[key];
    if (!Array.isArray(value)) {
        return defaultValue;
    }
    return value as T[];
}

/**
 * Type-safe way to extract an enum prop
 * @param props The componentProps object
 * @param key The key to look for in the props
 * @param defaultValue The default value to return if the prop doesn't exist or is invalid
 * @param validValues Array of valid values for this enum
 */
export function getEnumProp<T extends string>(
    props: Record<string, unknown> | undefined,
    key: string,
    defaultValue: T,
    validValues: readonly T[]
): T {
    const value = getPropValue(props, key, defaultValue);
    return typeof value === 'string' && validValues.includes(value as T) 
        ? value as T 
        : defaultValue;
}