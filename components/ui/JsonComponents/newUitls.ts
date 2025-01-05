// jsonUtils.ts
import JSON5 from 'json5';

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
}

export interface ParseResult {
  data: any;
  error?: string;
}

export const jsonUtils = {
  /**
   * Core parsing function - uses JSON5 for more permissive parsing
   */
  parse(input: any): ParseResult {
    try {
      // Already an object
      if (typeof input === 'object' && input !== null) {
        return { data: input };
      }

      // Empty/null checks
      if (input === null || input === undefined || input === '') {
        return { data: {} };
      }

      // Convert to string and parse with JSON5
      const stringValue = String(input).trim();
      const data = JSON5.parse(stringValue);
      return { data };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Invalid JSON'
      };
    }
  },

  /**
   * Stringify with formatting options
   */
  stringify(data: any, pretty = true): string {
    if (data === undefined) return '';
    if (data === null) return 'null';

    try {
      return pretty ? JSON5.stringify(data, null, 2) : JSON5.stringify(data);
    } catch (err) {
      return String(data);
    }
  },

  /**
   * Validate JSON and return any errors
   */
  validate(input: any): ValidationError[] {
    try {
      if (typeof input === 'object') {
        JSON5.stringify(input);
        return [];
      }

      JSON5.parse(String(input));
      return [];
    } catch (err) {
      const error = err as Error;
      const match = error.message.match(/line (\d+) column (\d+)/);
      
      return [{
        message: error.message,
        line: match ? parseInt(match[1], 10) : undefined,
        column: match ? parseInt(match[2], 10) : undefined
      }];
    }
  },

  /**
   * Transform operations on JSON objects
   */
  transform(
    data: any,
    operation: 'edit' | 'add' | 'delete',
    path: string[],
    value?: any
  ): any {
    const result = { ...data };
    let current = result;
    const lastIndex = path.length - 1;

    for (let i = 0; i < lastIndex; i++) {
      const key = path[i];
      current[key] = { ...current[key] };
      current = current[key];
    }

    const lastKey = path[lastIndex];
    switch (operation) {
      case 'edit':
        current[lastKey] = value;
        break;
      case 'add':
        if (Array.isArray(current)) {
          current.splice(parseInt(lastKey), 0, value);
        } else {
          current[lastKey] = value;
        }
        break;
      case 'delete':
        if (Array.isArray(current)) {
          current.splice(parseInt(lastKey), 1);
        } else {
          delete current[lastKey];
        }
        break;
    }

    return result;
  },

  /**
   * Tree navigation helpers
   */
  tree: {
    getAllKeys(obj: any, prefix = ''): string[] {
      if (!obj || typeof obj !== 'object') {
        return [];
      }
  
      return Object.entries(obj).reduce((keys: string[], [key, value]) => {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        keys.push(currentPath);
        
        if (value && typeof value === 'object') {
          keys.push(...this.getAllKeys(value, currentPath));
        }
        
        return keys;
      }, []);
    },

    getValueAtPath(obj: any, path: string[]): any {
      return path.reduce((current, key) => 
        current && typeof current === 'object' ? current[key] : undefined, 
        obj
      );
    }
  }
};

// Export the default instance
export default jsonUtils;

// Also export individual functions for convenience
export const { parse, stringify, validate, transform } = jsonUtils;