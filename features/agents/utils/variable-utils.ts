/**
 * Utility functions for handling agent variables.
 */

/**
 * Sanitizes a variable name for use in {{variable_name}} placeholders.
 *
 * Rules:
 *   - Trim whitespace
 *   - Lowercase
 *   - Replace spaces and dashes with underscores
 *   - Remove non-alphanumeric/underscore characters
 *   - Collapse consecutive underscores to one
 *   - Strip leading/trailing underscores
 */
export const sanitizeVariableName = (input: string): string => {
  const trimmed = input.trim();
  const lowercased = trimmed.toLowerCase();
  const underscored = lowercased.replace(/[\s-]+/g, "_");
  const cleaned = underscored.replace(/[^a-z0-9_]/g, "");
  const single = cleaned.replace(/_+/g, "_");
  return single.replace(/^_+|_+$/g, "");
};

/**
 * Returns true when the sanitized form differs from a simple lowercase of the input.
 * Use to decide whether to show the user a "will be saved as X" preview.
 */
export const shouldShowSanitizationPreview = (input: string): boolean => {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return sanitizeVariableName(input) !== trimmed.toLowerCase();
};

/**
 * Checks whether a variable name appears as {{variableName}} in a text string.
 */
export const isVariableUsedInText = (
  variableName: string,
  text: string,
): boolean => text.includes(`{{${variableName}}}`);

/**
 * Extracts unique variable names referenced in text via {{name}} syntax.
 * Returns the names in order of first appearance, trimmed.
 */
export const extractVariableReferences = (text: string): string[] => {
  const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const name = m[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
};

/**
 * Converts a sanitized variable name back to a human-readable display label.
 *   user_name       → "User Name"
 *   favorite_color  → "Favorite Color"
 *   age             → "Age"
 */
export const formatVariableDisplayName = (name: string): string =>
  name
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();

/**
 * Formats a resolved variables record into display lines for the user bubble.
 * Returns an empty string when there are no non-empty values.
 *
 *   { user_name: "Mike", age: 26 }  →  "User Name: Mike\nAge: 26"
 */
export const formatVariablesForDisplay = (
  variables: Record<string, unknown>,
): string =>
  Object.entries(variables)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${formatVariableDisplayName(k)}: ${String(v)}`)
    .join("\n");
