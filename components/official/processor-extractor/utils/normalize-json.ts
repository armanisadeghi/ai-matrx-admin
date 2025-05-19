/**
 * Recursively normalizes any data structure to a proper JavaScript object.
 * Handles nested JSON strings, circular references, and various data types.
 *
 * @param {any} data - The data to normalize (string, object, array, etc.)
 * @param {Set} [visited=new Set()] - Set of visited objects (for circular reference detection)
 * @returns {any} - A properly normalized JavaScript object
 */
export const normalizeToObject = (data, visited = new Set()) => {
    // Handle null or undefined
    if (data === null || data === undefined) {
        return data;
    }

    // Handle primitive types (they don't need normalization)
    if (typeof data !== "object" && typeof data !== "string") {
        return data;
    }

    // Handle string that might be JSON
    if (typeof data === "string") {
        try {
            // Try to parse it as JSON
            const parsed = JSON.parse(data);
            // If parsing succeeded, normalize the parsed result recursively
            return normalizeToObject(parsed, visited);
        } catch (e) {
            // If it's not valid JSON, return the original string
            return data;
        }
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map((item) => normalizeToObject(item, new Set(visited)));
    }

    // Handle Date objects (convert to ISO string)
    if (data instanceof Date) {
        return data.toISOString();
    }

    // At this point, we're dealing with a regular object

    // Check for circular references
    if (visited.has(data)) {
        return "[Circular Reference]";
    }

    // Add this object to the visited set
    visited.add(data);

    // Clone the object
    const result = {};

    // Process each property
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];

            // Special handling for properties that might be JSON strings
            if (typeof value === "string") {
                try {
                    // Try to parse the string value as JSON
                    const parsedValue = JSON.parse(value);
                    // If parsing succeeded, normalize the parsed result recursively
                    result[key] = normalizeToObject(parsedValue, new Set(visited));
                } catch (e) {
                    // If it's not valid JSON, keep the original string
                    result[key] = value;
                }
            } else {
                // For non-string properties, normalize recursively
                result[key] = normalizeToObject(value, new Set(visited));
            }
        }
    }

    return result;
};



/**
 * Creates a fully normalized version of data that is both consistently
 * structured AND safely traversable with paths
 *
 * @param {any} data - The data to normalize
 * @returns {Object} - A normalized and path-safe object
 */
export const createNormalizedData = (data) => {
  // First normalize to a proper object
  const normalized = normalizeToObject(data);

  // If we want to ensure specific fields are stringified, we can do it here
  // For example, ensuring parsed_content is a proper object, not a string
  if (normalized && normalized.parsed_content && typeof normalized.parsed_content === "string") {
      try {
          normalized.parsed_content = JSON.parse(normalized.parsed_content);
      } catch (e) {
          // Keep as string if parsing fails
      }
  }

  return normalized;
};


