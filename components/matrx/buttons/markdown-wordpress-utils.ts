/**
 * Markdown WordPress Utilities
 * A collection of utility functions for copying content formatted for WordPress with matrx- classes
 */

// Import the removeThinkingContent function
import { removeThinkingContent } from './markdown-copy-utils';

/**
 * Converts markdown text to WordPress-friendly HTML with matrx- classes
 * @param {string} markdown - The markdown content to convert
 * @returns {string} - Clean HTML formatted for WordPress with matrx- classes
 */
function convertMarkdownTables(html) {
    // Match markdown table patterns
    const tableRegex = /^(\|.*\|)\s*\n(\|[-\s:|]*\|)\s*\n((?:\|.*\|\s*\n?)*)/gm;
    
    return html.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
        // Parse header row
        const headers = headerRow.split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '');
        
        // Parse body rows
        const rows = bodyRows.trim().split('\n')
            .filter(row => row.trim())
            .map(row => 
                row.split('|')
                    .map(cell => cell.trim())
                    .filter(cell => cell !== '')
            );
        
        // Build HTML table
        let tableHtml = '<table class="matrx-table">\n';
        
        // Add header
        if (headers.length > 0) {
            tableHtml += '<thead class="matrx-table-head">\n<tr class="matrx-table-row">\n';
            headers.forEach(header => {
                tableHtml += `<th class="matrx-table-header">${header}</th>\n`;
            });
            tableHtml += '</tr>\n</thead>\n';
        }
        
        // Add body
        if (rows.length > 0) {
            tableHtml += '<tbody class="matrx-table-body">\n';
            rows.forEach(row => {
                if (row.length > 0) {
                    tableHtml += '<tr class="matrx-table-row">\n';
                    row.forEach(cell => {
                        tableHtml += `<td class="matrx-table-cell">${cell}</td>\n`;
                    });
                    tableHtml += '</tr>\n';
                }
            });
            tableHtml += '</tbody>\n';
        }
        
        tableHtml += '</table>\n';
        return tableHtml;
    });
}

export function markdownToWordPressHTML(markdown: string, includeThinking: boolean = false): string {
    if (!markdown) return '';
    
    // Use a specific matrx container for WordPress targeting
    const startWrapper = '<div class="matrx-content-container">';
    const endWrapper = '</div>';
    
    // Remove <thinking> tags and all their content unless specifically requested
    let html = includeThinking ? markdown : removeThinkingContent(markdown);
    
    // Handle horizontal rules (must be processed first before headings and lists)
    html = html.replace(/^[\-]{3,}$/gm, '<hr class="matrx-hr">');
    
    // Handle links FIRST with improved regex and placeholder system to prevent interference
    const linkPlaceholders = [];
    let linkIndex = 0;
    
    // Use a more robust regex that handles URLs with underscores and other special characters
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
        const placeholder = `ΩLINKΩ${linkIndex}ΩLINKΩ`;
        linkPlaceholders.push({
            placeholder,
            html: `<a class="matrx-link" href="${url}">${linkText}</a>`
        });
        linkIndex++;
        return placeholder;
    });
    
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
    
    // Handle blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote class="matrx-blockquote">$1</blockquote>');
    
    // Handle code blocks
    html = html.replace(/```([^`]+)```/gs, '<pre class="matrx-code-block"><code class="matrx-code">$1</code></pre>');
    
    // Handle inline code
    html = html.replace(/`([^`]+)`/g, '<code class="matrx-inline-code">$1</code>');
    
    // Handle markdown tables
    html = convertMarkdownTables(html);
    
    // Handle existing HTML tables (add classes to any remaining HTML tables)
    html = html.replace(/<table>/g, '<table class="matrx-table">');
    html = html.replace(/<thead>/g, '<thead class="matrx-table-head">');
    html = html.replace(/<tbody>/g, '<tbody class="matrx-table-body">');
    html = html.replace(/<tr>/g, '<tr class="matrx-table-row">');
    html = html.replace(/<th>/g, '<th class="matrx-table-header">');
    html = html.replace(/<td>/g, '<td class="matrx-table-cell">');
    
    // Handle images (if any exist)
    html = html.replace(/<img([^>]*)>/g, '<img class="matrx-image"$1>');
    
    // Handle divs (if any exist) - add matrx prefix to existing divs
    html = html.replace(/<div(?!\s+class="matrx-)([^>]*)>/g, '<div class="matrx-div"$1>');
    
    // Handle spans (if any exist)
    html = html.replace(/<span([^>]*)>/g, '<span class="matrx-span"$1>');
    
    // Handle paragraphs (for text not already in tags)
    html = html.replace(/^([^<\n].+)$/gm, '<p class="matrx-paragraph">$1</p>');
    
    // Clean up multiple paragraph tags
    html = html.replace(/<\/p>\s*<p class="matrx-paragraph">/g, '</p><p class="matrx-paragraph">');
    
    // Handle intro paragraphs (first paragraph after h1) - MOVED BEFORE FAQ PROCESSING
    html = html.replace(/(<h1 class="matrx-h1">[\s\S]*?<\/h1>\s*)<p class="matrx-paragraph">([\s\S]*?)<\/p>/g, '$1<p class="matrx-intro">$2</p>');
    
    // FIXED FAQ HANDLING - More specific and careful approach
    
    // Step 1: Find h3 elements that end with a question mark and convert to FAQ questions
    // But be more careful about what we match
    html = html.replace(/<h3 class="matrx-h3">([^<]*\?[^<]*)<\/h3>/g, '<div class="matrx-faq-question">$1</div>');
    
    // Step 2: Find FAQ questions followed immediately by paragraphs and wrap them properly
    // This regex is more specific and handles the complete FAQ item structure
    html = html.replace(
      /(<div class="matrx-faq-question">[^<]*<\/div>)\s*(<p class="matrx-paragraph">[\s\S]*?<\/p>)/g, 
      '<div class="matrx-faq-item">$1<div class="matrx-faq-answer">$2</div></div>'
    );
    
    // Step 3: Clean up any remaining standalone FAQ questions by wrapping them
    html = html.replace(
      /(<div class="matrx-faq-question">[^<]*<\/div>)(?!\s*<div class="matrx-faq-answer">)/g,
      '<div class="matrx-faq-item">$1<div class="matrx-faq-answer"></div></div>'
    );
    
    // Step 4: Remove the inner <p> tags from FAQ answers since we already have the wrapper
    html = html.replace(
      /(<div class="matrx-faq-answer">)<p class="matrx-paragraph">([\s\S]*?)<\/p>(<\/div>)/g,
      '$1$2$3'
    );
    
    // Restore link placeholders with actual HTML links
    linkPlaceholders.forEach(({ placeholder, html: linkHtml }) => {
        if (html.includes(placeholder)) {
            html = html.replaceAll(placeholder, linkHtml);
        }
    });
    
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
