/**
 * Document Text Extraction Utility
 * 
 * Simple utility for extracting text from PDF and image files using the API.
 * Uses centralized auth handling via useApiAuth hook.
 * 
 * Backend URL is passed dynamically to support admin localhost override.
 */

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

/**
 * Extract text from a PDF or image file
 * 
 * @param file - The PDF or image File object to extract text from
 * @param headers - Auth headers from useApiAuth
 * @param backendUrl - Backend URL (localhost or production)
 * @returns Promise with extraction result
 * 
 * @example
 * ```ts
 * const { getHeaders, waitForAuth } = useApiAuth();
 * await waitForAuth();
 * const headers = getHeaders();
 * const backendUrl = getBackendUrl(); // from your component
 * 
 * const result = await extractTextFromPdf(file, headers, backendUrl);
 * if (result.success) {
 *   console.log(result.text);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function extractTextFromPdf(
  file: File,
  headers: Record<string, string>,
  backendUrl: string
): Promise<PdfExtractionResult> {
  // Validate file type
  const isValidFile = file.type === 'application/pdf' || file.type.startsWith('image/');
  if (!isValidFile) {
    return {
      success: false,
      text: '',
      filename: file.name,
      error: `Unsupported file type: ${file.type}. Supported types: PDF and images.`,
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${backendUrl}/api/utilities/pdf/extract-text`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type - browser will set it with boundary for FormData
        ...Object.fromEntries(
          Object.entries(headers).filter(([key]) => key.toLowerCase() !== 'content-type')
        ),
      },
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        text: '',
        filename: file.name,
        error: responseData.detail || `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        rawResponse: responseData,
      };
    }

    // Extract text from response
    let extractedText = '';
    let textFieldUsed = '';

    if (typeof responseData === 'string') {
      extractedText = responseData;
      textFieldUsed = 'direct_string';
    } else if (responseData.text_content) {
      extractedText = responseData.text_content;
      textFieldUsed = 'text_content';
    } else if (responseData.text) {
      extractedText = responseData.text;
      textFieldUsed = 'text';
    } else if (responseData.content) {
      extractedText = responseData.content;
      textFieldUsed = 'content';
    }

    return {
      success: true,
      text: extractedText,
      filename: responseData.filename || file.name,
      statusCode: response.status,
      textFieldUsed,
      rawResponse: responseData,
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
