
// Helper function defined outside component
export const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    
    // Handle special types
    if (value instanceof Date) return value.toLocaleString();
    if (Array.isArray(value)) {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return '-';
        }
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return '-';
        }
    }
    
    return String(value);
};
