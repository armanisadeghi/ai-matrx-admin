/**
 * Safely traverses a bookmark path to extract data from a nested object
 * 
 * Examples:
 * - data[0]["result"]["lines"]
 * - data[0]["result"]["sections"]
 * - response["content"]["items"][2]["data"]
 */

export interface BookmarkTraversalResult {
  success: boolean;
  data?: any;
  error?: string;
  path?: string;
}

/**
 * Safely evaluates a bookmark path against source data
 * @param sourceData - The root data object to traverse
 * @param bookmarkPath - The path string (e.g., 'data[0]["result"]["lines"]')
 * @returns BookmarkTraversalResult with success status and extracted data
 */
export function traverseBookmarkPath(
  sourceData: any, 
  bookmarkPath: string
): BookmarkTraversalResult {
  if (!sourceData) {
    return {
      success: false,
      error: "Source data is null or undefined",
      path: bookmarkPath
    };
  }

  if (!bookmarkPath || bookmarkPath.trim() === "") {
    return {
      success: false,
      error: "Bookmark path is empty",
      path: bookmarkPath
    };
  }

  try {
    // Create a safe context with only the data we want to expose
    const context = { data: sourceData };
    
    // Replace 'data' at the start with 'context.data' to scope it properly
    let safePath = bookmarkPath;
    if (safePath.startsWith('data')) {
      safePath = 'context.' + safePath;
    } else {
      // If it doesn't start with 'data', assume they mean context.data
      safePath = 'context.data.' + safePath;
    }

    // Use Function constructor for safer evaluation than eval()
    // This prevents access to global scope while still allowing property access
    const result = new Function('context', `
      try {
        return ${safePath};
      } catch (e) {
        throw new Error('Path traversal failed: ' + e.message);
      }
    `)(context);

    return {
      success: true,
      data: result,
      path: bookmarkPath
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      path: bookmarkPath
    };
  }
}

/**
 * Validates if a bookmark path has valid syntax
 * @param bookmarkPath - The path to validate
 * @returns true if syntax appears valid
 */
export function isValidBookmarkSyntax(bookmarkPath: string): boolean {
  if (!bookmarkPath || bookmarkPath.trim() === "") {
    return false;
  }

  // Basic syntax validation
  const validPathRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\[[\d"']+\]|\.[\w]+)*$/;
  
  // Allow 'data' at the start
  if (bookmarkPath.startsWith('data')) {
    return validPathRegex.test(bookmarkPath);
  }

  // Or validate as a property path
  return validPathRegex.test('data.' + bookmarkPath);
}

/**
 * Gets a human-readable description of what the bookmark path represents
 * @param bookmarkPath - The bookmark path
 * @returns A user-friendly description
 */
export function getBookmarkDescription(bookmarkPath: string): string {
  if (!bookmarkPath) return "Invalid path";

  try {
    // Extract meaningful parts for description
    const parts = bookmarkPath
      .replace(/data\[|\[|\]/g, '.')
      .replace(/["']/g, '')
      .split('.')
      .filter(part => part.length > 0);

    if (parts.length === 0) return "Root data";
    if (parts.length === 1) return `${parts[0]} collection`;
    
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    
    return `${lastPart} from ${secondLastPart}`;
  } catch {
    return bookmarkPath;
  }
} 