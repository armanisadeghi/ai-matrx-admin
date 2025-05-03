/**
 * Converts a string to kebab-case
 * Handles camelCase, PascalCase, snake_case, and space-separated strings
 * @param str The string to convert
 * @returns The kebab-case version of the string
 */
export const convertToKebabCase = (str: string): string => {
  if (!str) return '';
  
  return str
    .trim()
    // Convert camelCase or PascalCase to kebab-case
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    // Convert snake_case to kebab-case
    .replace(/_/g, '-')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Convert to lowercase
    .toLowerCase()
    // Remove any characters that aren't alphanumeric or hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple hyphens with a single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
};

/**
 * Checks if a string is a valid slug
 * Valid slugs contain only lowercase letters, numbers, and hyphens
 * @param str The string to check
 * @returns Whether the string is a valid slug
 */
export const isValidSlug = (str: string): boolean => {
  if (!str) return false;
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(str);
}; 