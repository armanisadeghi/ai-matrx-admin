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
  
  export const formatHTML = (html: string, options: Partial<FormattingOptions> = {}) => {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    const lines = html.split('\n');
    let indent = 0;
    let lineNumber = 1;
    const result: string[] = [];
  
    const getIndent = (size: number) => ' '.repeat(size * finalOptions.indentSize);
  
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines between tags
      if (!line) continue;
      
      // Handle closing tags
      if (line.startsWith('</')) {
        indent--;
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
        const nodeType = line.match(/<([a-zA-Z0-9-]+)/)?.[1];
        if (nodeType) {
          formattedLine += `[${nodeType}] `;
        }
      }
      
      // Add the line content
      formattedLine += line;
      
      // Highlight chips if enabled
      if (finalOptions.highlightChips && line.includes('New Chip')) {
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
    }
  
    return result.join('\n');
  };
  
  // Example usage in InspectHtmlUtil component:
  /*
  const formattedHtml = formatHTML(rawHtml, {
    indentSize: 4,
    showLineNumbers: true,
    showNodeTypes: true,
    highlightChips: true
  });
  */