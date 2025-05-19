import { Extractor } from "../../custom-views/registry";
import { AppDispatch } from "@/lib/redux/store";
import { brokerActions } from "@/lib/redux/brokerSlice";

/**
 * Safely extracts a value from an object using a path string
 * Supports basic dot notation and array indexing with special handling for wildcard paths
 */
function extractValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  // Special case for app suggestion entries
  if (path === 'data["extracted"]["suggestions"]') {
    if (!obj.data?.extracted?.suggestions || !Array.isArray(obj.data.extracted.suggestions)) {
      return undefined;
    }
    
    const suggestions = obj.data.extracted.suggestions;
    return suggestions;
  }

  // Special case for the specific image description path format we're using
  // Directly handle data["extracted"]["suggestions"][?]["image_description"]
  if (path === 'data["extracted"]["suggestions"][?]["image_description"]') {
    if (!obj.data?.extracted?.suggestions || !Array.isArray(obj.data.extracted.suggestions)) {
      return undefined;
    }
    
    const suggestions = obj.data.extracted.suggestions;
    
    // Extract just the image_description from each suggestion
    return suggestions.map(item => item.image_description);
  }

  // General case for wildcard array access
  if (path.includes('[?]')) {
    // This handles wildcard array notation 
    const parts = path.split('[?]');
    const basePath = parts[0];
    const remainingPath = parts[1];
    
    // Get the array at the base path
    const baseArray = extractValueByPath(obj, basePath);
    
    if (!Array.isArray(baseArray)) {
      return undefined;
    }
    
    // Return all items with the remaining path
    return baseArray.map((item, index) => {
      if (remainingPath) {
        // Fix the remaining path format - it comes in as ]["image_description"]
        // Convert it to a proper key name by removing brackets and quotes
        const propertyName = remainingPath.replace(/^\]\["/, '').replace(/"\]$/, '');
        return item?.[propertyName]; 
      }
      return item;
    });
  }

  // Handle regular path notation
  try {
    // Convert path with brackets notation to valid JavaScript
    // e.g., data["extracted"]["suggestions"] becomes obj.data.extracted.suggestions
    const normalizedPath = path
      .replace(/\[["']([^[\]"']+)["']\]/g, '.$1')  // Convert ["key"] to .key
      .replace(/^\./g, '');                        // Remove leading dot if present

    const result = normalizedPath.split('.').reduce((current, key) => {
      // Handle numeric array indices
      if (/^\d+$/.test(key)) {
        return current?.[parseInt(key, 10)];
      }
      return current?.[key];
    }, obj);
    
    return result;
  } catch (error) {
    return undefined;
  }
}

/**
 * Process extractors and dispatch broker actions
 */
export function processExtractors(
  data: any,
  extractors: Extractor[] | undefined,
  dispatch: AppDispatch,
  sourceId?: string
): void {
  if (!extractors || !Array.isArray(extractors) || extractors.length === 0) {
    return;
  }

  extractors.forEach(extractor => {
    try {
      const { brokerId, path, type } = extractor;
      const extractedValue = extractValueByPath(data, path);

      if (extractedValue === undefined) {
        return;
      }

      switch (type) {
        case "list":
          if (Array.isArray(extractedValue)) {
            // For list type, create a broker for each item with index
            extractedValue.forEach((item, index) => {
              const indexedBrokerId = `${brokerId}-${index + 1}`;
              
              // Single console log to show the exact value being dispatched
              console.log(`Dispatching to broker ${indexedBrokerId}:`, item);
              
              dispatch(brokerActions.setValue({
                brokerId: indexedBrokerId,
                value: item
              }));
            });
          }
          break;

        case "map":
          if (extractedValue && typeof extractedValue === 'object') {
            // For map type, create a broker for each key-value pair
            Object.entries(extractedValue).forEach(([key, value]) => {
              const keyedBrokerId = `${brokerId}-${key}`;
              dispatch(brokerActions.setValue({
                brokerId: keyedBrokerId,
                value
              }));
            });
          }
          break;
          
        case "single":
          // For single items, just use the broker ID as is
          dispatch(brokerActions.setValue({
            brokerId,
            value: extractedValue
          }));
          break;
          
        case "text":
          // For text type, handle both single values and arrays of text
          if (Array.isArray(extractedValue)) {
            extractedValue.forEach((item, index) => {
              const textBrokerId = `${brokerId}-${index + 1}`;
              dispatch(brokerActions.setValue({
                brokerId: textBrokerId,
                value: String(item)
              }));
            });
          } else {
            dispatch(brokerActions.setValue({
              brokerId,
              value: String(extractedValue)
            }));
          }
          break;
      }
    } catch (error) {
      // Keep only essential error logging
      console.error(`Error processing extractor:`, error);
    }
  });
} 