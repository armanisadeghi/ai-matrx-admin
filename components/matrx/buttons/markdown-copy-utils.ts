/**
 * Markdown Copy Utilities
 * A collection of utility functions for copying content with proper formatting
 */

// Import WordPress utility function
import { markdownToWordPressHTML } from './markdown-wordpress-utils';

// Define interface for copyToClipboard options
interface CopyOptions {
  isMarkdown?: boolean;
  formatForGoogleDocs?: boolean;
  formatForWordPress?: boolean;
  formatJson?: boolean;
  showHtmlPreview?: boolean;
  onSuccess?: () => void;
  onError?: (err: any) => void;
  onShowHtmlPreview?: (html: string) => void;
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
    
    // Remove <thinking> tags and all their content when formatting for Google Docs
    let html = markdown.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    
    // Handle horizontal rules (must be processed first before headings and lists)
    html = html.replace(/^[\-]{3,}$/gm, '<hr style="border: none; border-top: 1px solid #cccccc; margin: 15px 0;">');
    
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
    
    // Handle nested lists with proper indentation and nesting structure
    const lines = html.split('\n');
    let processedHtml = '';
    let listStack = []; // Stack to track nested lists: {type: 'ul'|'ol', indent: number, hasContent: boolean}
    let lastListItem = ''; // Track the last list item for proper nesting
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const originalLine = line;
      
      // Check for numbered list items with indentation detection
      const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        const indent = numberedMatch[1].length;
        const content = numberedMatch[3];
        
        // Close nested lists that are at deeper indentation levels
        while (listStack.length > 0 && listStack[listStack.length - 1].indent > indent) {
          const closingList = listStack.pop();
          processedHtml += closingList.type === 'ol' ? '</ol>' : '</ul>';
          if (lastListItem) {
            processedHtml += '</li>\n';
            lastListItem = '';
          }
        }
        
        // Close the current list item if we have one at the same level
        if (lastListItem && listStack.length > 0 && listStack[listStack.length - 1].indent === indent) {
          processedHtml += '</li>\n';
        }
        
        // Start new numbered list if needed
        if (listStack.length === 0 || listStack[listStack.length - 1].indent !== indent || listStack[listStack.length - 1].type !== 'ol') {
          processedHtml += '<ol style="color: #000000; margin-top: 8px; margin-bottom: 8px;">\n';
          listStack.push({type: 'ol', indent: indent, hasContent: false});
        }
        
        processedHtml += `<li style="color: #000000;">${content}`;
        lastListItem = 'ol';
        continue;
      }
      
      // Check for bullet list items with indentation detection
      const bulletMatch = line.match(/^(\s*)[\*\-\+]\s+(.+)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1].length;
        const content = bulletMatch[2];
        
        // If this bullet is more indented than the current level, it's nested
        if (listStack.length > 0 && indent > listStack[listStack.length - 1].indent) {
          // Start nested bullet list
          processedHtml += '\n<ul style="color: #000000; margin-top: 4px; margin-bottom: 4px;">\n';
          listStack.push({type: 'ul', indent: indent, hasContent: false});
          processedHtml += `<li style="color: #000000;">${content}</li>\n`;
        } else {
          // Close deeper nested lists
          while (listStack.length > 0 && listStack[listStack.length - 1].indent > indent) {
            const closingList = listStack.pop();
            processedHtml += closingList.type === 'ol' ? '</ol>' : '</ul>';
            if (lastListItem) {
              processedHtml += '</li>\n';
              lastListItem = '';
            }
          }
          
          // Close current list item if at same level
          if (lastListItem && listStack.length > 0 && listStack[listStack.length - 1].indent === indent) {
            processedHtml += '</li>\n';
          }
          
          // Start new bullet list if needed
          if (listStack.length === 0 || listStack[listStack.length - 1].indent !== indent || listStack[listStack.length - 1].type !== 'ul') {
            processedHtml += '<ul style="color: #000000; margin-top: 8px; margin-bottom: 8px;">\n';
            listStack.push({type: 'ul', indent: indent, hasContent: false});
          }
          
          processedHtml += `<li style="color: #000000;">${content}</li>\n`;
          lastListItem = '';
        }
        continue;
      }
      
      // Non-list content - close all open lists
      if (line.trim() !== '') {
        // Close any open list item first
        if (lastListItem) {
          processedHtml += '</li>\n';
          lastListItem = '';
        }
        
        // Close all open lists
        while (listStack.length > 0) {
          const closingList = listStack.pop();
          processedHtml += closingList.type === 'ol' ? '</ol>\n' : '</ul>\n';
        }
      }
      
      processedHtml += originalLine + '\n';
    }
    
    // Close any remaining open list item and lists
    if (lastListItem) {
      processedHtml += '</li>\n';
    }
    while (listStack.length > 0) {
      const closingList = listStack.pop();
      processedHtml += closingList.type === 'ol' ? '</ol>\n' : '</ul>\n';
    }
    
    html = processedHtml;
    
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
   * @param {boolean} [options.formatForWordPress=false] - Whether to format for WordPress
   * @param {boolean} [options.showHtmlPreview=false] - Whether to show HTML preview instead of copying
   * @param {boolean} [options.formatJson=true] - Whether to format JSON
   * @param {Function} [options.onSuccess] - Callback on successful copy
   * @param {Function} [options.onError] - Callback on copy error
   * @param {Function} [options.onShowHtmlPreview] - Callback to show HTML preview
   * @returns {Promise<boolean>} - Whether the copy was successful
   */
  export async function copyToClipboard(content: any, options: CopyOptions = {}) {
    const {
      isMarkdown = false,
      formatForGoogleDocs = false,
      formatForWordPress = false,
      showHtmlPreview = false,
      formatJson = true,
      onSuccess = () => {},
      onError = (err) => console.error("Copy failed:", err),
      onShowHtmlPreview = () => {}
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
      
      // Check if we need to handle this as markdown with special formatting
      if (isMarkdown && (formatForGoogleDocs || formatForWordPress) && typeof textToCopy === 'string') {
        let htmlContent;
        
        if (formatForGoogleDocs) {
          // Convert markdown to HTML for Google Docs
          htmlContent = markdownToGoogleDocsHTML(textToCopy);
        } else if (formatForWordPress) {
          // Convert markdown to HTML for WordPress
          htmlContent = markdownToWordPressHTML(textToCopy);
        }
        
        // If showHtmlPreview is requested, call the callback instead of copying
        if (showHtmlPreview && onShowHtmlPreview) {
          onShowHtmlPreview(htmlContent);
          onSuccess();
          return true;
        }
        
        // Create clipboard item with both HTML and plain text formats
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([textToCopy], { type: 'text/plain' })
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
        const fallbackText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        await navigator.clipboard.writeText(fallbackText);
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