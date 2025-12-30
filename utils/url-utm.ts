/**
 * URL UTM Management Utility
 * 
 * Ensures all outgoing links have the correct UTM source parameter
 * and removes any existing utm_source to prevent conflicts.
 */

/**
 * Adds or replaces utm_source parameter in a URL
 * @param url - The URL to modify
 * @param utmSource - The UTM source value (default: 'aimatrx')
 * @returns The modified URL with the correct utm_source parameter
 */
export function addUtmSource(url: string, utmSource: string = 'aimatrx'): string {
  // Validate input
  if (!url || typeof url !== 'string') {
    return url;
  }

  try {
    // Handle relative URLs and invalid URLs gracefully
    // Don't modify internal links or invalid URLs
    if (url.startsWith('#') || url.startsWith('/') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return url;
    }

    // Try to parse as URL
    const urlObj = new URL(url);
    
    // Remove any existing utm_source parameter (case-insensitive)
    const params = urlObj.searchParams;
    const paramsToRemove: string[] = [];
    
    // Find all utm_source parameters (handle case variations)
    params.forEach((value, key) => {
      if (key.toLowerCase() === 'utm_source') {
        paramsToRemove.push(key);
      }
    });
    
    // Remove found parameters
    paramsToRemove.forEach(param => params.delete(param));
    
    // Add our utm_source
    params.set('utm_source', utmSource);
    
    // Return the modified URL
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, try to handle it as a simple string
    // This handles edge cases where the URL might not be perfectly formed
    try {
      // Check if it looks like a URL
      if (!url.includes('://') && !url.startsWith('www.')) {
        return url; // Not a URL, return as-is
      }
      
      // Try to fix common issues
      let fixedUrl = url;
      if (url.startsWith('www.')) {
        fixedUrl = 'https://' + url;
      }
      
      const urlObj = new URL(fixedUrl);
      const params = urlObj.searchParams;
      
      // Remove existing utm_source
      const paramsToRemove: string[] = [];
      params.forEach((value, key) => {
        if (key.toLowerCase() === 'utm_source') {
          paramsToRemove.push(key);
        }
      });
      paramsToRemove.forEach(param => params.delete(param));
      
      // Add our utm_source
      params.set('utm_source', utmSource);
      
      return urlObj.toString();
    } catch (innerError) {
      // If all parsing attempts fail, return the original URL
      // Better to show a working link without UTM than to break it
      console.warn('[addUtmSource] Failed to parse URL:', url, innerError);
      return url;
    }
  }
}

/**
 * Process multiple URLs in bulk
 * Useful for batch processing
 */
export function addUtmSourceToUrls(urls: string[], utmSource: string = 'aimatrx'): string[] {
  return urls.map(url => addUtmSource(url, utmSource));
}

