/**
 * Normalizes legacy model control keys and prompt settings keys to their
 * current backend equivalents.
 *
 * This runs once at the Redux boundary (hydrate / fetch) so downstream code
 * never encounters deprecated field names.
 *
 * Legacy → Current mapping:
 *   max_tokens      → max_output_tokens
 *   output_format   → response_format   (string → { type: string } when applicable)
 *   n               → count
 */

const LEGACY_KEY_MAP: Record<string, string> = {
    max_tokens: 'max_output_tokens',
    n: 'count',
};

function normalizeResponseFormat(value: unknown): unknown {
    if (typeof value === 'string') {
        if (value === 'text' || value === '') return undefined;
        return { type: value };
    }
    return value;
}

/**
 * Normalize a single model's `controls` JSONB blob in-place.
 *
 * For each top-level key in controls:
 * - Renames legacy keys (max_tokens, output_format, n)
 * - Converts output_format string defaults to { type: string } dicts
 *
 * If the target key already exists, the legacy key is silently dropped
 * (the modern key wins).
 */
function normalizeControls(controls: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(controls)) {
        if (key === 'output_format') {
            if (!('response_format' in controls)) {
                const controlDef = value as Record<string, unknown> | null;
                if (controlDef && typeof controlDef === 'object') {
                    const normalized = { ...controlDef };
                    if (normalized.default !== undefined) {
                        const converted = normalizeResponseFormat(normalized.default);
                        if (converted === undefined) {
                            delete normalized.default;
                        } else {
                            normalized.default = converted;
                        }
                    }
                    result['response_format'] = normalized;
                }
            }
            continue;
        }

        const mappedKey = LEGACY_KEY_MAP[key];
        if (mappedKey) {
            if (!(mappedKey in controls)) {
                result[mappedKey] = value;
            }
            continue;
        }

        result[key] = value;
    }

    return result;
}

interface HasControls {
    controls: Record<string, unknown> | null;
}

/**
 * Normalize a full model record fresh from the database.
 * Normalizes legacy keys inside `controls`.
 */
export function normalizeModel<T extends HasControls>(model: T): T {
    const normalized = { ...model };

    if (normalized.controls && typeof normalized.controls === 'object') {
        normalized.controls = normalizeControls(
            normalized.controls as Record<string, unknown>,
        );
    }

    return normalized;
}

/**
 * Normalize a batch of models (array version of normalizeModel).
 */
export function normalizeModels<T extends HasControls>(models: T[]): T[] {
    return models.map(normalizeModel);
}

/**
 * Normalize a prompt settings object from the database.
 * Converts legacy keys so downstream code only sees modern names.
 */
export function normalizePromptSettings(
    settings: Record<string, unknown>,
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(settings)) {
        if (key === 'output_format') {
            if (!('response_format' in settings)) {
                const converted = normalizeResponseFormat(value);
                if (converted !== undefined) {
                    result['response_format'] = converted;
                }
            }
            continue;
        }

        const mappedKey = LEGACY_KEY_MAP[key];
        if (mappedKey) {
            if (!(mappedKey in settings)) {
                result[mappedKey] = value;
            }
            continue;
        }

        result[key] = value;
    }

    return result;
}
