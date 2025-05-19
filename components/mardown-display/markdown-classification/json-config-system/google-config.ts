// Define interfaces for the AST structure
interface Position {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  }
  
  interface AstNode {
    type: string;
    children?: AstNode[];
    value?: string;
    position?: Position;
    ordered?: boolean;
    start?: number;
    spread?: boolean;
    checked?: boolean | null;
  }
  
  // Define interfaces for the output structure
  interface ContentItem {
    id: number;
    title: string;
    text: string;
  }
  
  interface ContentSection {
    title: string; // Always a string, empty if no bold text
    text: string;
  }
  
  interface OutputContent {
    intro: ContentSection;
    items: ContentItem[];
    outro: ContentSection;
  }
  
  // Helper function to extract text from a node and its children
  function extractText(node: AstNode): string {
    if (node.type === 'text') {
      return node.value || '';
    }
    if (node.type === 'inlineCode') {
      return `\`${node.value || ''}\``;
    }
    if (node.type === 'strong') {
      return `**${node.children ? node.children.map(extractText).join('') : ''}**`;
    }
    if (node.type === 'emphasis') {
      return `*${node.children ? node.children.map(extractText).join('') : ''}*`;
    }
    if (node.children) {
      return node.children.map(extractText).join('');
    }
    return '';
  }
  
  // Helper function to extract title (from strong text) and remaining text
  function extractTitleAndText(paragraph: AstNode): { title: string; text: string } {
    let title = '';
    const textParts: string[] = [];
  
    if (paragraph.children) {
      for (const child of paragraph.children) {
        if (child.type === 'strong' && !title) {
          title = extractText(child).replace(/^\*\*|\*\*$/g, '');
        } else {
          textParts.push(extractText(child));
        }
      }
    }
  
    return {
      title: title, // Empty string if no strong text
      text: textParts.join('').trim() || extractText(paragraph).trim()
    };
  }
  
  // Main utility function to transform AST to desired output
  function transformAstToContent(ast: AstNode): OutputContent {
    const output: OutputContent = {
      intro: { title: '', text: '' },
      items: [],
      outro: { title: '', text: '' }
    };
  
    if (ast.type !== 'root' || !ast.children) {
      throw new Error('Invalid AST: Expected root node with children');
    }
  
    let listCounter = 0;
  
    for (const child of ast.children) {
      if (child.type === 'paragraph' && listCounter === 0) {
        // Handle intro (first paragraph before list)
        const { title, text } = extractTitleAndText(child);
        output.intro = { title, text: text || extractText(child) };
      } else if (child.type === 'list' && child.ordered) {
        // Handle ordered list
        listCounter++;
        if (child.children) {
          let id = 1;
          for (const listItem of child.children) {
            if (listItem.type === 'listItem' && listItem.children) {
              for (const itemChild of listItem.children) {
                if (itemChild.type === 'paragraph') {
                  const { title, text } = extractTitleAndText(itemChild);
                  output.items.push({
                    id: id++,
                    title: title || `Item ${id}`,
                    text: text || extractText(itemChild)
                  });
                }
              }
            }
          }
        }
      } else if (child.type === 'paragraph' && listCounter > 0) {
        // Handle outro (paragraph after list)
        const { title, text } = extractTitleAndText(child);
        output.outro = { title, text: text || extractText(child) };
      }
    }
  
    // Ensure all text fields are strings
    if (!output.intro.text) {
      output.intro.text = '';
    }
    if (!output.outro.text) {
      output.outro.text = '';
    }
  
    return output;
  }
  
  export { transformAstToContent };