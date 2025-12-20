/**
 * Document Text Extraction Utility
 * 
 * Simple utility for extracting text from PDF and image files using the API.
 * Can be called from anywhere in the app on the client side.
 */

// Helper to check if file type is valid for extraction
const isValidExtractionFile = (file: File): boolean => {
  if (file.type === 'application/pdf') return true;
  if (file.type.startsWith('image/')) return true;
  return false;
};

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  filename: string;
  pageCount?: number;
  error?: string;
  rawResponse?: any;
  statusCode?: number;
  textFieldUsed?: string;
}

export interface PdfExtractionOptions {
  authToken?: string;
  serverUrl?: string;
  includeRawResponse?: boolean; // For admin/debug purposes
}

/**
 * Extract text from a PDF or image file
 * 
 * @param file - The PDF or image File object to extract text from
 * @param options - Optional configuration (auth token, server URL)
 * @returns Promise with extraction result
 * 
 * @example
 * ```ts
 * const result = await extractTextFromPdf(file);
 * if (result.success) {
 *   console.log(result.text);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function extractTextFromPdf(
  file: File,
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  try {
    // Validate input
    if (!file) {
      return {
        success: false,
        text: '',
        filename: '',
        error: 'No file provided',
      };
    }

    if (!isValidExtractionFile(file)) {
      return {
        success: false,
        text: '',
        filename: file.name,
        error: 'File must be a PDF or image (JPEG, PNG, GIF, WebP, HEIC)',
      };
    }

    // Get server URL
    const serverUrl = options.serverUrl || 
                     process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 
                     'http://localhost:8000';
    
    const endpoint = `${serverUrl}/api/pdf/extract-text`;

    // Prepare request
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (options.authToken) {
      headers['Authorization'] = `Bearer ${options.authToken}`;
    }

    // Make API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    // Handle response
    const statusCode = response.status;
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        text: '',
        filename: file.name,
        error: `API error (${response.status}): ${errorText}`,
        statusCode,
      };
    }

    const data = await response.json();

    // Extract text from response (check multiple possible field names)
    const fieldChecks = [
      { key: 'text_content', value: data.text_content },
      { key: 'text', value: data.text },
      { key: 'content', value: data.content },
      { key: 'extracted_text', value: data.extracted_text },
    ];

    const matchedField = fieldChecks.find(f => f.value);
    const text = matchedField?.value || '';

    if (!text) {
      return {
        success: false,
        text: '',
        filename: file.name,
        error: 'No text content found in API response',
        statusCode,
        rawResponse: options.includeRawResponse ? data : undefined,
      };
    }

    // Clean up text
    const cleanedText = text.trim().replace(/\n{3,}/g, '\n\n');

    return {
      success: true,
      text: cleanedText,
      filename: data.filename || file.name,
      pageCount: data.page_count || data.pages || data.num_pages,
      statusCode,
      rawResponse: options.includeRawResponse ? data : undefined,
      textFieldUsed: matchedField?.key,
    };

  } catch (error) {
    return {
      success: false,
      text: '',
      filename: file.name,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Extract text from multiple PDF or image files
 * 
 * @param files - Array of PDF or image File objects
 * @param options - Optional configuration
 * @returns Promise with array of extraction results
 * 
 * @example
 * ```ts
 * const results = await extractTextFromMultiplePdfs([file1, file2]);
 * results.forEach(result => {
 *   if (result.success) {
 *     console.log(`${result.filename}: ${result.text.length} chars`);
 *   }
 * });
 * ```
 */
export async function extractTextFromMultiplePdfs(
  files: File[],
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult[]> {
  return Promise.all(
    files.map(file => extractTextFromPdf(file, options))
  );
}

