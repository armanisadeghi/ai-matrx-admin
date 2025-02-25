export const cleanJson = (data: any, indent = 2, returnAsString = false): any => {
    const cleanRecursively = (input: any): any => {
      if (typeof input === 'string') {
        try {
          return cleanRecursively(JSON.parse(input));
        } catch {
          return input;
        }
      }
      
      if (Array.isArray(input)) {
        return input.map(item => cleanRecursively(item));
      }
      
      if (typeof input === 'object' && input !== null) {
        return Object.fromEntries(
          Object.entries(input).map(([key, value]) => [key, cleanRecursively(value)])
        );
      }
      
      return input;
    };
  
    const cleanedData = cleanRecursively(data);
    
    return returnAsString ? JSON.stringify(cleanedData, null, indent) : cleanedData;
  };
  
  export const formatJson = (data: any, indent = 2): string => {
    return cleanJson(data, indent, true);
  };