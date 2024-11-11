// utils/formatName.ts
/**
 * Converts camelCase, kebab-case, or snake_case to a human-readable format
 * with words properly capitalized and spaced.
 *
 * @param name - The string to format.
 * @returns A formatted name with words capitalized and spaces inserted.
 */
export function formatName(name: string): string {
    if (typeof name !== "string") return name;

    // Convert kebab-case and snake_case to spaces
    const formatted = name
        .replace(/[-_]/g, " ")              // Replace kebab-case and snake_case with spaces
        .replace(/([a-z])([A-Z])/g, "$1 $2") // Add spaces before uppercase letters in camelCase
        .toLowerCase()                      // Convert entire string to lowercase
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize the first letter of each word

    return formatted.trim();
}
