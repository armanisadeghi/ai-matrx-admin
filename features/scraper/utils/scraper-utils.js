'use client';

/**
 * Safely parses JSON data
 * @param {any} jsonString - String to parse or object to return
 * @returns {object|null} Parsed object or null on error
 */
export const safeParseJSON = (jsonString) => {
  if (!jsonString) return null;
  
  if (typeof jsonString !== 'string') {
    return jsonString; // It's already an object
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("JSON parsing error:", e);
    return null;
  }
};

/**
 * Safely copies text to clipboard
 * @param {string} text - Text to copy
 * @returns {boolean} Success status
 */
export const copyToClipboard = (text) => {
  if (!text) return false;
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error("Copy to clipboard failed:", e);
    return false;
  }
};

/**
 * Extracts all relevant data from a scraper response
 * @param {object|string} pageData - Raw scraper response
 * @returns {object} Extracted data with error status
 */
export const extractScraperData = (pageData) => {
  let parsedContent = null;
  let statusValue = "unknown";
  let textData = "";
  let overview = {};
  let organizedData = {};
  let structuredData = {};
  let contentFilterDetails = [];
  let noiseRemoverDetails = [];
  let hashes = [];
  let contentOutline = [];

  try {
    // Handle string response
    if (typeof pageData === 'string') {
      try {
        const parsed = JSON.parse(pageData);
        statusValue = parsed.status || "unknown";
        
        if (parsed.parsed_content) {
          parsedContent = safeParseJSON(parsed.parsed_content);
        } else {
          parsedContent = parsed;
        }
      } catch (e) {
        console.error("Error parsing string pageData:", e);
        return {
          error: `Error parsing string content: ${e.message}`,
          isError: true
        };
      }
    } 
    // Handle object response
    else if (typeof pageData === 'object' && pageData !== null) {
      statusValue = pageData.status || "unknown";
      
      if (pageData.parsed_content) {
        parsedContent = safeParseJSON(pageData.parsed_content);
      } else {
        parsedContent = pageData;
      }
    }
    
    if (!parsedContent) {
      console.error("Failed to parse content");
      return {
        error: "Error parsing content. Data format not recognized.",
        isError: true
      };
    }

    overview = parsedContent.overview || {};
    textData = parsedContent.text_data || "";
    organizedData = parsedContent.organized_data || {};
    structuredData = parsedContent.structured_data || {};
    contentFilterDetails = parsedContent.content_filter_removal_details || [];
    noiseRemoverDetails = parsedContent.noise_remover_removal_details || [];
    hashes = parsedContent.hashes || [];
    contentOutline = parsedContent.overview.outline || [];

    const allRemovals = [
      ...(contentFilterDetails || []).map(item => ({ ...item, remover: "Content Filter" })),
      ...(noiseRemoverDetails || []).map(item => ({ ...item, remover: "Noise Remover" })),
    ];
    
    return {
      isError: false,
      statusValue,
      overview,
      textData,
      organizedData,
      structuredData,
      contentFilterDetails,
      noiseRemoverDetails,
      hashes,
      parsedContent,
      allRemovals,
      contentOutline
    };
  } catch (error) {
    console.error("Error extracting data:", error);
    return {
      error: `Error extracting data: ${error.message}`,
      isError: true
    };
  }
};

/**
 * Filters responses to exclude initialization messages
 * @param {Array} responses - Array of responses from socket
 * @returns {Array} Filtered array of content responses
 */
export const filterContentResponses = (responses) => {
  if (!responses || responses.length === 0) return [];
  
  return responses.filter(response => {
    if (!response) return false;
    
    // Skip initialization messages
    if (typeof response === 'object' && 
        response.status === 'success' && 
        response.message === 'initialized') {
      return false;
    }
    
    return true;
  });
};

/**
 * Extracts the title from a page response
 * @param {object|string} response - Page response
 * @param {number} index - Index for fallback title
 * @returns {string} Page title
 */
export const extractPageTitle = (response, index) => {
  let defaultTitle = `Page ${index + 1}`;
  
  try {
    if (typeof response === 'string') {
      const parsed = JSON.parse(response);
      if (parsed.parsed_content) {
        const content = safeParseJSON(parsed.parsed_content);
        return content?.overview?.page_title || defaultTitle;
      }
    } else if (response?.parsed_content) {
      const content = safeParseJSON(response.parsed_content);
      return content?.overview?.page_title || defaultTitle;
    }
  } catch (e) {
    console.log("Error getting page title:", e);
  }
  
  return defaultTitle;
};

/**
 * Safely accesses a potentially nested property
 * @param {object} obj - Object to access
 * @param {string} path - Dot notation path (e.g. "overview.page_title")
 * @param {any} defaultValue - Default value if path doesn't exist
 * @returns {any} Property value or default
 */
export const getNestedProperty = (obj, path, defaultValue = null) => {
  if (!obj || !path) return defaultValue;
  
  try {
    const properties = path.split('.');
    let value = obj;
    
    for (const prop of properties) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[prop];
    }
    
    return value !== undefined ? value : defaultValue;
  } catch (e) {
    console.error("Error accessing nested property:", e);
    return defaultValue;
  }
};

/**
 * Process organized data to format it for display
 * @param {object} organizedData - Organized data section
 * @returns {Array} Array of processed sections with headings and content
 */
export const processOrganizedData = (organizedData) => {
  if (!organizedData || Object.keys(organizedData).length === 0) {
    return [];
  }
  
  return Object.keys(organizedData).map(heading => {
    if (!organizedData[heading] || organizedData[heading].length === 0) {
      return null;
    }
    
    // Extract heading level and text
    const headingMatch = heading.match(/H(\d+):/);
    const level = headingMatch ? parseInt(headingMatch[1]) : 2;
    const text = heading.includes(': ') ? heading.split(': ')[1] : heading;
    
    // Process content items
    const content = organizedData[heading].map(item => {
      if (typeof item === 'string') {
        return { type: 'paragraph', content: item };
      } else if (typeof item === 'object' && item !== null) {
        if (item.Lists && Array.isArray(item.Lists)) {
          return { type: 'list', items: item.Lists };
        } else {
          return { type: 'unknown', keys: Object.keys(item) };
        }
      }
      return null;
    }).filter(Boolean);
    
    return {
      heading: {
        level,
        text
      },
      content
    };
  }).filter(Boolean);
};

/**
 * Formats text data by splitting into lines
 * @param {string} textData - Raw text data
 * @returns {Array} Array of text lines
 */
export const formatTextData = (textData) => {
  if (!textData || textData.length === 0) {
    return [];
  }
  
  return textData.split("\n")
    .filter(line => line.trim().length > 0)
    .map(line => line.trim());
};

/**
 * Safely stringifies an object for display
 * @param {any} data - Data to stringify
 * @param {number} indent - Indentation spaces
 * @returns {string} Stringified representation or error message
 */
export const safeStringify = (data, indent = 2) => {
  try {
    return typeof data === 'string' ? data : JSON.stringify(data, null, indent);
  } catch (e) {
    console.error("Error stringifying data:", e);
    return `[Error stringifying data: ${e.message}]`;
  }
};

/**
 * Truncates text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
};

/**
 * Formats the type of a value for display
 * @param {any} value - Value to check
 * @returns {string} Human-readable type description
 */
export const formatValueType = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  const type = typeof value;
  
  if (type === 'object') {
    if (Array.isArray(value)) {
      return `array[${value.length}]`;
    }
    return `object{${Object.keys(value).length}}`;
  }
  
  return type;
};

/**
 * Determines if scraper data is still loading
 * @param {any} streamingResponse - Current streaming response
 * @returns {boolean} True if data is loading
 */
export const isScraperLoading = (streamingResponse) => {
  return Boolean(streamingResponse) && (
    typeof streamingResponse === 'string' || 
    (typeof streamingResponse === 'object' && streamingResponse !== null)
  );
};