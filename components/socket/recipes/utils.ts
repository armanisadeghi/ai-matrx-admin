
export function getDisplayValue(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number') {
        return value.toString();
    }

    if (Array.isArray(value)) {
        return value.join(', '); // Convert array to a comma-separated string
    }

    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value); // Convert object to JSON string
    }

    // Fallback for unsupported types
    return '';
}


export function getFormattedTitle(name: string | null | undefined, officialName: string | null | undefined): string {
    let source = name || officialName || 'Unknown';
    source = source.replace(/_\d{4,5}$/, '');
    return source
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, (word) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
}
