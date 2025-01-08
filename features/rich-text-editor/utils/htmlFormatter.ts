// htmlFormatter.ts
export interface FormattingOptions {
  indentSize: number;
  showLineNumbers: boolean;
  showNodeTypes: boolean;
  highlightChips: boolean;
}

const DEFAULT_OPTIONS: FormattingOptions = {
  indentSize: 4,
  showLineNumbers: true,
  showNodeTypes: true,
  highlightChips: true,
};

export const formatHTML = (html: string, options: Partial<FormattingOptions> = {}): string => {
  try {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // If input is empty or not a string, return empty string
    if (!html || typeof html !== 'string') return '';
    
    // First, let's clean up the input by normalizing whitespace
    let normalizedHtml = html
      .replace(/>\s+</g, '>\n<')  // Add newlines between tags
      .replace(/(<[^>]+>)([^<]+)(?=<)/g, '$1\n$2\n')  // Add newlines around text content
      .trim();
    
    const lines = normalizedHtml.split('\n');
    let indent = 0;
    let lineNumber = 1;
    const result: string[] = [];
    
    const getIndent = (size: number) => ' '.repeat(Math.max(0, size * finalOptions.indentSize));

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      try {
        // Handle closing tags
        if (line.startsWith('</')) {
          indent = Math.max(0, indent - 1);
        }

        // Build the formatted line
        let formattedLine = '';
        
        // Add line numbers if enabled
        if (finalOptions.showLineNumbers) {
          formattedLine += `${String(lineNumber).padStart(4, ' ')} `;
          lineNumber++;
        }
        
        // Add indentation
        formattedLine += getIndent(indent);
        
        // Add node type annotations if enabled
        if (finalOptions.showNodeTypes && line.startsWith('<') && !line.startsWith('</')) {
          const nodeMatch = line.match(/<([a-zA-Z0-9-]+)/);
          if (nodeMatch && nodeMatch[1]) {
            formattedLine += `[${nodeMatch[1]}] `;
          }
        }
        
        // Add the line content
        formattedLine += line;
        
        // Highlight chips if enabled
        if (finalOptions.highlightChips && 
            (line.toLowerCase().includes('chip') || 
             line.includes('data-chip'))) {
          formattedLine = `🔷 ${formattedLine}`;
        }
        
        result.push(formattedLine);

        // Handle opening tags
        if (line.startsWith('<') && 
            !line.startsWith('</') && 
            !line.endsWith('/>') && 
            !line.endsWith('>')) {
          indent++;
        }
      } catch (err) {
        // If there's an error processing a line, include it as-is
        result.push(line);
      }
    }

    return result.join('\n');
  } catch (err) {
    // If anything goes wrong, return the original HTML
    console.warn('Error formatting HTML:', err);
    return html;
  }
}


export const cleanHTML = (html: string) => {
  // Remove chip-related classes and data attributes
  return html
      .replace(/class="[^"]*"/g, '')
      .replace(/data-[^=]*="[^"]*"/g, '')
      .replace(/contenteditable="[^"]*"/g, '')
      .replace(/draggable="[^"]*"/g, '')
      .trim();
};

export const structureHTML = (html: string) => {
  // First clean up excessive spaces in tags
  let cleanedHtml = html.replace(/<(\/?)(\w+)\s+>/g, '<$1$2>');

  // Split into lines and prepare for processing
  const lines = cleanedHtml.split(/(<\/?(?:div|span)[^>]*>)/);
  let indentLevel = 0;
  let result = [];

  for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Handle closing tags
      if (line.match(/<\//)) {
          indentLevel = Math.max(0, indentLevel - 1);
          if (line) result.push('  '.repeat(indentLevel) + line);
          continue;
      }

      // Handle opening tags
      if (line.match(/<(?!\/)(?:div|span)/)) {
          if (line) result.push('  '.repeat(indentLevel) + line);
          indentLevel++;
          continue;
      }

      // Handle content
      if (line) {
          // Clean up multiple spaces and normalize &nbsp;
          line = line.replace(/\s+/g, ' ').replace(/(&nbsp;)+/g, ' ');
          result.push('  '.repeat(indentLevel) + line);
      }
  }

  return result.join('\n');
};
