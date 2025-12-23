import { PromptSettings } from "../types/core";

/**
 * Filter settings to only include enabled and non-null values
 * Used before API submission to ensure clean payloads
 * 
 * @param settings - The full settings object
 * @param enabledKeys - Optional set of keys that are explicitly enabled (for opt-in controls)
 * @returns Filtered settings object with only valid, enabled values
 */
export function filterEnabledSettings(
    settings: PromptSettings,
    enabledKeys?: Set<string>
): PromptSettings {
    const filtered: Record<string, any> = {};

    Object.entries(settings).forEach(([key, value]) => {
        // Skip null or undefined values
        if (value === null || value === undefined) {
            return;
        }

        // If enabledKeys is provided, only include keys that are in the set
        if (enabledKeys && !enabledKeys.has(key)) {
            return;
        }

        // Include the value
        filtered[key] = value;
    });

    return filtered as PromptSettings;
}

/**
 * Remove null and undefined values from settings
 * Simpler version that doesn't check enabledKeys
 * 
 * @param settings - The settings object to clean
 * @returns Settings with null/undefined values removed
 */
export function removeNullSettings(settings: PromptSettings): PromptSettings {
    const cleaned: Record<string, any> = {};

    Object.entries(settings).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            cleaned[key] = value;
        }
    });

    return cleaned as PromptSettings;
}

/**
 * Get unrecognized settings keys that aren't in the normalized controls
 * 
 * @param settings - The settings object
 * @param recognizedKeys - Set of keys that are recognized/handled by the UI
 * @returns Array of unrecognized setting keys
 */
export function getUnrecognizedSettings(
    settings: PromptSettings,
    recognizedKeys: Set<string>
): string[] {
    const unrecognized: string[] = [];

    Object.keys(settings).forEach((key) => {
        if (!recognizedKeys.has(key) && settings[key as keyof PromptSettings] !== null && settings[key as keyof PromptSettings] !== undefined) {
            unrecognized.push(key);
        }
    });

    return unrecognized;
}
