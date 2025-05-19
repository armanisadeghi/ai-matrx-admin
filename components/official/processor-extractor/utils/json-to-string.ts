/**
 * Robust JSON Normalization Utility
 *
 * This utility ensures consistent handling of JSON data by normalizing
 * strings, objects, and nested structures into standardized formats.
 */

const KNOWN_STRING_PROPERTIES = ["parsed_content", "content", "json", "data", "payload", "config", "settings", "metadata"];

/**
 * Determines if a property should be converted to a JSON string based on naming conventions
 * You can customize this function by providing custom patterns
 *
 * @param {string} propertyName - The name of the property
 * @param {string[]} [patterns] - Custom patterns to check against (optional)
 * @returns {boolean} - True if the property should be stringified
 */
const shouldStringifyProperty = (propertyName, patterns) => {
    // Common naming patterns for properties that might need to be stringified
    const patternsThatShouldBeStrings = patterns || KNOWN_STRING_PROPERTIES;

    // Check if the property name contains any of the patterns
    return patternsThatShouldBeStrings.some((pattern) => propertyName.toLowerCase().includes(pattern));
};


/**
 * Normalizes data and ensures all nested objects are converted to JSON strings
 * where they should be strings. This is useful for preparing an object to be
 * transmitted through an API or saved to a database.
 *
 * @param {any} data - The data to stringify
 * @param {Set} [visited=new Set()] - Set of visited objects (for circular reference detection)
 * @returns {any} - Data with properly stringified nested objects
 */
export const normalizeToString = (data, visited = new Set()) => {
    // Handle null or undefined
    if (data === null || data === undefined) {
        return data;
    }

    // Handle primitive types (they don't need normalization)
    if (typeof data !== "object") {
        return data;
    }

    // Handle Date objects (convert to ISO string)
    if (data instanceof Date) {
        return data.toISOString();
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map((item) => normalizeToString(item, new Set(visited)));
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

            if (typeof value === "object" && value !== null) {
                // For objects and arrays, decide if they should be stringified
                if (shouldStringifyProperty(key, undefined)) {
                    // Convert to JSON string
                    result[key] = JSON.stringify(normalizeToString(value, new Set(visited)));
                } else {
                    // Keep as an object but normalize its contents
                    result[key] = normalizeToString(value, new Set(visited));
                }
            } else {
                // For non-object properties, keep as is
                result[key] = value;
            }
        }
    }

    return result;
};





/**
 * Safely converts any value to a JSON string, handling circular references
 *
 * @param {any} value - The value to convert to a JSON string
 * @returns {string} - A JSON string representation of the value
 */
export const safeStringify = (value) => {
    try {
        // Use a cache to detect circular references
        const cache = new Set();

        return JSON.stringify(
            value,
            (key, value) => {
                if (typeof value === "object" && value !== null) {
                    if (cache.has(value)) {
                        return "[Circular Reference]";
                    }
                    cache.add(value);
                }
                return value;
            },
            2
        );
    } catch (error) {
        console.error("Error stringifying value:", error);
        return JSON.stringify({ error: "Error converting value to JSON" });
    }
};

/**
 * Safely parses a JSON string, returning null if parsing fails
 *
 * @param {string} jsonString - The JSON string to parse
 * @returns {Object|null} - The parsed object or null if parsing fails
 */
export const safeParse = (jsonString) => {
    if (typeof jsonString !== "string") {
        return jsonString; // Return as is if not a string
    }

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error parsing JSON string:", error);
        return null;
    }
};
