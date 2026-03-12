import type { AiModelRow } from '../types';
import type { AiModelFilters } from '../hooks/useTabUrlState';

export function applyFiltersForCount(
    models: AiModelRow[],
    q: string,
    filters: AiModelFilters,
): number {
    let result = models;

    if (q) {
        const lq = q.toLowerCase();
        result = result.filter(
            (m) =>
                (m.name ?? '').toLowerCase().includes(lq) ||
                (m.common_name ?? '').toLowerCase().includes(lq) ||
                (m.provider ?? '').toLowerCase().includes(lq) ||
                (m.model_class ?? '').toLowerCase().includes(lq) ||
                (m.api_class ?? '').toLowerCase().includes(lq),
        );
    }

    if (filters.provider) {
        result = result.filter((m) => m.provider === filters.provider);
    }
    if (filters.is_deprecated !== undefined) {
        result = result.filter((m) => (m.is_deprecated ?? false) === filters.is_deprecated);
    }
    if (filters.is_primary !== undefined) {
        result = result.filter((m) => (m.is_primary ?? false) === filters.is_primary);
    }
    if (filters.is_premium !== undefined) {
        result = result.filter((m) => (m.is_premium ?? false) === filters.is_premium);
    }
    if (filters.api_class) {
        const lc = filters.api_class.toLowerCase();
        result = result.filter((m) => (m.api_class ?? '').toLowerCase().includes(lc));
    }

    return result.length;
}
