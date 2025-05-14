export const cleanJson = (data: any, indent = 2, returnAsString = false): any => {
  const cleanRecursively = (input: any, visited: WeakSet<object> = new WeakSet()): any => {
    // Handle null or non-object types
    if (input === null || typeof input !== 'object') {
      return input;
    }

    // Check for circular reference
    if (visited.has(input)) {
      return null; // Replace circular references with null to ensure valid JSON
    }

    // Add current object to visited set
    visited.add(input);

    // Handle strings that might be JSON
    if (typeof input === 'string') {
      try {
        return cleanRecursively(JSON.parse(input), visited);
      } catch {
        return input;
      }
    }

    // Handle arrays
    if (Array.isArray(input)) {
      return input.map(item => cleanRecursively(item, visited));
    }

    // Handle objects
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, cleanRecursively(value, visited)])
    );
  };

  const cleanedData = cleanRecursively(data);

  return returnAsString ? JSON.stringify(cleanedData, null, indent) : cleanedData;
};

export const formatJson = (data: any, indent = 2): string => {
  return cleanJson(data, indent, true);
};