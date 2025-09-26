/**
 * Markdown WordPress Utilities
 * A collection of utility functions for copying content formatted for WordPress with matrx- classes
 */

// Define interface for copyToClipboard options
interface CopyOptions {
  isMarkdown?: boolean;
  formatForWordPress?: boolean;
  formatJson?: boolean;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

/**
 * Converts markdown text to WordPress-friendly HTML with matrx- classes
 * @param {string} markdown - The markdown content to convert
 * @returns {string} - Clean HTML formatted for WordPress with matrx- classes
 */
export function markdownToWordPressHTML(markdown) {
    if (!markdown) return '';
    
    // Use simpler wrapper like Google Docs version for better compatibility
    const startWrapper = '<div>';
    const endWrapper = '</div>';
    
    // Remove <thinking> tags and all their content when formatting for WordPress
    let html = markdown.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    
    // Handle horizontal rules (must be processed first before headings and lists)
    html = html.replace(/^[\-]{3,}$/gm, '<hr class="matrx-hr">');
    
    // Handle headings
    html = html
      .replace(/^# (.+)$/gm, '<h1 class="matrx-h1">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="matrx-h2">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="matrx-h3">$1</h3>')
      .replace(/^#### (.+)$/gm, '<h4 class="matrx-h4">$1</h4>')
      .replace(/^##### (.+)$/gm, '<h5 class="matrx-h5">$1</h5>')
      .replace(/^###### (.+)$/gm, '<h6 class="matrx-h6">$1</h6>');
    
    // Handle basic formatting
    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong class="matrx-strong">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="matrx-em">$1</em>')
      .replace(/\_\_(.+?)\_\_/g, '<strong class="matrx-strong">$1</strong>')
      .replace(/\_(.+?)\_/g, '<em class="matrx-em">$1</em>');
    
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
          processedHtml += '<ol class="matrx-list matrx-numbered-list">\n';
          listStack.push({type: 'ol', indent: indent, hasContent: false});
        }
        
        processedHtml += `<li class="matrx-list-item">${content}`;
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
          processedHtml += '\n<ul class="matrx-list matrx-bullet-list matrx-nested-list">\n';
          listStack.push({type: 'ul', indent: indent, hasContent: false});
          processedHtml += `<li class="matrx-list-item">${content}</li>\n`;
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
            processedHtml += '<ul class="matrx-list matrx-bullet-list">\n';
            listStack.push({type: 'ul', indent: indent, hasContent: false});
          }
          
          processedHtml += `<li class="matrx-list-item">${content}</li>\n`;
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
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a class="matrx-link" href="$2">$1</a>');
    
    // Handle blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote class="matrx-blockquote">$1</blockquote>');
    
    // Handle code blocks
    html = html.replace(/```([^`]+)```/gs, '<pre class="matrx-code-block"><code class="matrx-code">$1</code></pre>');
    
    // Handle inline code
    html = html.replace(/`([^`]+)`/g, '<code class="matrx-inline-code">$1</code>');
    
    // Handle paragraphs (for text not already in tags)
    html = html.replace(/^([^<\n].+)$/gm, '<p class="matrx-paragraph">$1</p>');
    
    // Clean up multiple paragraph tags
    html = html.replace(/<\/p>\s*<p class="matrx-paragraph">/g, '</p><p class="matrx-paragraph">');
    
    // Handle FAQ-specific patterns (common in content)
    html = html.replace(/<h3 class="matrx-h3">([^<]*\?[^<]*)<\/h3>/g, '<h3 class="matrx-faq-question">$1</h3>');
    
    // Convert paragraphs that immediately follow FAQ questions to FAQ answers
    html = html.replace(/(<h3 class="matrx-faq-question">[^<]*<\/h3>\s*)<p class="matrx-paragraph">([^<]*)<\/p>/g, '$1<p class="matrx-faq-answer">$2</p>');
    
    // Handle intro paragraphs (first paragraph after h1)
    html = html.replace(/(<h1 class="matrx-h1">[^<]*<\/h1>\s*)<p class="matrx-paragraph">([^<]*)<\/p>/g, '$1<p class="matrx-intro">$2</p>');
    
    // Wrap the entire content in a div for proper HTML structure
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
   * @param {boolean} [options.formatForWordPress=false] - Whether to format for WordPress
   * @param {boolean} [options.formatJson=true] - Whether to format JSON
   * @param {Function} [options.onSuccess] - Callback on successful copy
   * @param {Function} [options.onError] - Callback on copy error
   * @returns {Promise<boolean>} - Whether the copy was successful
   */
  export async function copyToClipboard(content: any, options: CopyOptions = {}) {
    const {
      isMarkdown = false,
      formatForWordPress = false,
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
      
      // Check if we need to handle this as markdown with WordPress formatting
      if (isMarkdown && formatForWordPress && typeof textToCopy === 'string') {
        // Convert markdown to HTML for WordPress
        const htmlContent = markdownToWordPressHTML(textToCopy);
        
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
