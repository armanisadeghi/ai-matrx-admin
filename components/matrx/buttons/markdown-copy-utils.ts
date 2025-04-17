/**
 * Markdown Copy Utilities
 * A collection of utility functions for copying content with proper formatting
 */

// Define interface for copyToClipboard options
interface CopyOptions {
  isMarkdown?: boolean;
  formatForGoogleDocs?: boolean;
  formatJson?: boolean;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

/**
 * Converts markdown text to Google Docs-friendly HTML
 * @param {string} markdown - The markdown content to convert
 * @returns {string} - HTML formatted for Google Docs
 */
export function markdownToGoogleDocsHTML(markdown) {
    if (!markdown) return '';
    
    // Add a wrapper with explicit color style to ensure black text
    const startWrapper = '<div style="color: #000000; font-family: Arial, sans-serif;">';
    const endWrapper = '</div>';
    
    // Handle horizontal rules (must be processed first before headings and lists)
    let html = markdown.replace(/^[\-]{3,}$/gm, '<hr style="border: none; border-top: 1px solid #cccccc; margin: 15px 0;">');
    
    // Handle headings
    html = html
      .replace(/^# (.+)$/gm, '<h1 style="color: #000000; font-size: 24px; font-weight: bold;">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 style="color: #000000; font-size: 20px; font-weight: bold;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="color: #000000; font-size: 16px; font-weight: bold;">$1</h3>')
      .replace(/^#### (.+)$/gm, '<h4 style="color: #000000; font-size: 14px; font-weight: bold;">$1</h4>');
    
    // Handle basic formatting
    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color: #000000;">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em style="color: #000000;">$1</em>')
      .replace(/\_\_(.+?)\_\_/g, '<strong style="color: #000000;">$1</strong>')
      .replace(/\_(.+?)\_/g, '<em style="color: #000000;">$1</em>');
    
    // Handle bullet lists - improved with list markers
    const bulletListRegex = /^[ \t]*[\*\-\+] (.+)$/gm;
    if (bulletListRegex.test(html)) {
      html = html.replace(bulletListRegex, '<li style="color: #000000;">$1</li>');
      
      // Properly close list tags (this is critical for fixing the indentation issues)
      // First, find all adjacent list items
      let inList = false;
      let processedHtml = '';
      const lines = html.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('<li style="color: #000000;">')) {
          if (!inList) {
            // Start a new list
            processedHtml += '<ul style="color: #000000; margin-top: 8px; margin-bottom: 8px;">\n';
            inList = true;
          }
          processedHtml += line + '\n';
        } else {
          if (inList) {
            // Close the list before adding non-list content
            processedHtml += '</ul>\n';
            inList = false;
          }
          processedHtml += line + '\n';
        }
      }
      
      // Make sure to close any open list at the end
      if (inList) {
        processedHtml += '</ul>\n';
      }
      
      html = processedHtml;
    }
    
    // Handle numbered lists with proper list closing
    const numberedListRegex = /^[ \t]*\d+\. (.+)$/gm;
    if (numberedListRegex.test(html)) {
      html = html.replace(numberedListRegex, '<li style="color: #000000;">$1</li>');
      
      // Similar approach to bullet lists for proper closing of tags
      let inList = false;
      let processedHtml = '';
      const lines = html.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Only match lines that have a list item but aren't already inside a ul
        if (line.includes('<li style="color: #000000;">') && !line.includes('<ul')) {
          if (!inList) {
            // Start a new list
            processedHtml += '<ol style="color: #000000; margin-top: 8px; margin-bottom: 8px;">\n';
            inList = true;
          }
          processedHtml += line + '\n';
        } else {
          if (inList) {
            // Close the list before adding non-list content
            processedHtml += '</ol>\n';
            inList = false;
          }
          processedHtml += line + '\n';
        }
      }
      
      // Make sure to close any open list at the end
      if (inList) {
        processedHtml += '</ol>\n';
      }
      
      html = processedHtml;
    }
    
    // Handle links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #1155cc; text-decoration: underline;">$1</a>');
    
    // Handle blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote style="color: #000000; border-left: 3px solid #ccc; padding-left: 10px; margin-left: 10px;">$1</blockquote>');
    
    // Handle code blocks
    html = html.replace(/```([^`]+)```/gs, '<pre style="color: #000000; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace;"><code style="color: #000000;">$1</code></pre>');
    
    // Handle inline code
    html = html.replace(/`([^`]+)`/g, '<code style="color: #000000; background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
    
    // Handle paragraphs (for text not already in tags)
    html = html.replace(/^([^<\n].+)$/gm, '<p style="color: #000000; margin: 8px 0;">$1</p>');
    
    // Clean up multiple paragraph tags
    html = html.replace(/<\/p>\s*<p style="color: #000000; margin: 8px 0;">/g, '</p><p style="color: #000000; margin: 8px 0;">');
    
    // Wrap the entire content to ensure all text has black color
    return startWrapper + html + endWrapper;
  }
  
  /**
   * Formats JSON data for clipboard
   * @param {any} data - The JSON data to format
   * @returns {string} - Formatted JSON string
   */
  export function formatJsonForClipboard(data) {
    const cleanObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(cleanObject);
      }
      
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          try {
            // Try to parse stringified JSON and recurse
            const parsed = JSON.parse(value);
            cleaned[key] = cleanObject(parsed);
          } catch {
            // If it's not valid JSON, keep it as a string
            cleaned[key] = value;
          }
        } else {
          cleaned[key] = cleanObject(value);
        }
      }
      return cleaned;
    };
    
    // Clean the data first, then stringify without extra escapes
    const cleanedData = cleanObject(data);
    return JSON.stringify(cleanedData, null, 2);
  }
  
  /**
   * Copies content to clipboard with proper formatting
   * @param {string|object} content - The content to copy
   * @param {CopyOptions} options - Options for copying
   * @param {boolean} [options.isMarkdown=false] - Whether the content is markdown
   * @param {boolean} [options.formatForGoogleDocs=false] - Whether to format for Google Docs
   * @param {boolean} [options.formatJson=true] - Whether to format JSON
   * @param {Function} [options.onSuccess] - Callback on successful copy
   * @param {Function} [options.onError] - Callback on copy error
   * @returns {Promise<boolean>} - Whether the copy was successful
   */
  export async function copyToClipboard(content: any, options: CopyOptions = {}) {
    const {
      isMarkdown = false,
      formatForGoogleDocs = false,
      formatJson = true,
      onSuccess = () => {},
      onError = (err) => console.error("Copy failed:", err)
    } = options;
    
    try {
      // Process content based on type and formatting option
      let textToCopy;
      
      if (typeof content === 'object' && content !== null && formatJson) {
        textToCopy = formatJsonForClipboard(content);
      } else if (typeof content === 'string' && formatJson) {
        try {
          // Check if the string is JSON and format it
          const parsed = JSON.parse(content);
          textToCopy = formatJsonForClipboard(parsed);
        } catch {
          // Not valid JSON, use as is
          textToCopy = content;
        }
      } else {
        // Use string conversion for non-JSON or when formatting is disabled
        textToCopy = typeof content === 'string' ? content : JSON.stringify(content);
      }
      
      // Check if we need to handle this as markdown with Google Docs formatting
      if (isMarkdown && formatForGoogleDocs && typeof textToCopy === 'string') {
        // Convert markdown to HTML for Google Docs
        const htmlContent = markdownToGoogleDocsHTML(textToCopy);
        
        // Create clipboard item with both HTML and plain text formats
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([textToCopy], { type: 'text/plain' }) // Fallback to plain markdown
        });
        
        await navigator.clipboard.write([clipboardItem]);
      } else {
        // Use the ClipboardItem API with plain text format to ensure no styling is copied
        const clipboardItem = new ClipboardItem({
          'text/plain': new Blob([textToCopy], { type: 'text/plain' })
        });
        
        await navigator.clipboard.write([clipboardItem]);
      }
      
      onSuccess();
      return true;
    } catch (err) {
      console.error("Primary copy method failed:", err);
      
      // Fall back to the older writeText method if ClipboardItem is not supported
      try {
        const textToCopy = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        await navigator.clipboard.writeText(textToCopy);
        onSuccess();
        return true;
      } catch (fallbackErr) {
        onError(fallbackErr);
        return false;
      }
    }
  }
  
  /**
   * Creates a plain text blob from content
   * @param {string} content - The content to convert to a blob
   * @returns {Blob} - A text/plain blob
   */
  export function createPlainTextBlob(content) {
    return new Blob([content], { type: 'text/plain' });
  }
  
  /**
   * Creates an HTML blob from content
   * @param {string} html - The HTML content to convert to a blob
   * @returns {Blob} - A text/html blob
   */
  export function createHtmlBlob(html) {
    return new Blob([html], { type: 'text/html' });
  }
  
  /**
   * Strips HTML tags from a string
   * @param {string} html - The HTML to strip tags from
   * @returns {string} - Text without HTML tags
   */
  export function stripHtmlTags(html) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;
    return tempElement.textContent || tempElement.innerText || '';
  }