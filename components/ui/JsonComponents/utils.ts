// utils/jsonFormatting.ts

/**
 * Checks if a string matches ISO date format
 */
export const isISODate = (str: string): boolean => {
    if (typeof str !== 'string') return false;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
    return isoDateRegex.test(str);
};

/**
 * Format values consistently for display, handling special cases like dates
 */
export const formatValue = (val: any): string => {
    if (val === null) return 'null';
    if (typeof val === 'string' && isISODate(val)) {
        return JSON.stringify(new Date(val).toISOString());
    }
    return JSON.stringify(val);
};

/**
 * Get the appropriate text color class based on value type
 */
export const getValueColorClass = (value: any, disabled: boolean): string => {
    if (disabled) return 'text-muted-foreground';

    if (value === null) return 'text-red-500';

    const colorMap = {
        string: 'text-green-500',
        number: 'text-blue-500',
        boolean: 'text-yellow-500'
    };

    return colorMap[typeof value] || '';
};

/**
 * Check if an array is small and simple enough to render inline
 */
export const isSimpleArray = (value: any[]): boolean => {
    return value.length <= 4 && value.every(item =>
        typeof item !== 'object' ||
        (item === null) ||
        (typeof item === 'object' && Object.keys(item).length === 0)
    );
};

export const stabilizeData = (data: any): any => {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
        if (isoDateRegex.test(data)) {
            return new Date(data).toISOString().split('.')[0] + 'Z';
        }
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => stabilizeData(item));
    }

    if (typeof data === 'object') {
        const stabilized: Record<string, any> = {};
        for (const key of Object.keys(data).sort()) { // Sort keys for stable order
            stabilized[key] = stabilizeData(data[key]);
        }
        return stabilized;
    }

    return data;
};

