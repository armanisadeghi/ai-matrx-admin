export function resolveStyle(value: string | undefined, fallback: string): string {
    if (!value || value === 'default') return fallback;
    return value;
}
