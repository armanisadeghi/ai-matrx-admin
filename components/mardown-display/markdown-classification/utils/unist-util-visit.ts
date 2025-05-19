import { visit } from 'unist-util-visit';

// Extract plain text from a node, ignoring formatting
function getTextContent(node) {
  let text = '';
  if (node.type === 'text') {
    text += node.value;
  }
  if (node.children) {
    node.children.forEach(child => {
      text += getTextContent(child);
    });
  }
  return text.trim();
}

// Clean title by removing emojis and numbering (e.g., "🔍 1. " -> "Keyword Research")
function cleanTitle(text) {
  return text.replace(/[^a-zA-Z\s()]+|\d+\.\s/g, '').trim();
}

// Transform AST to simple data structure
export function transformAst(ast) {
  const result = { sections: [] };
  let currentSection = null;

  visit(ast, node => {
    // Handle headings for section titles
    if (node.type === 'heading' && node.depth === 3) {
      const rawTitle = getTextContent(node);
      const title = cleanTitle(rawTitle); // Remove emojis and numbering
      currentSection = { title, items: [] };
      result.sections.push(currentSection);
    }

    // Handle lists under headings
    if (node.type === 'list' && currentSection) {
      node.children.forEach(listItem => {
        const paragraph = listItem.children[0]; // List item contains a paragraph
        const children = paragraph.children;

        // Check for bolded text
        const strongNode = children.find(child => child.type === 'strong');
        if (strongNode) {
          const key = getTextContent(strongNode);
          // Get text after bolded part (or all text if no other text)
          const value = children
            .filter(child => child !== strongNode)
            .map(getTextContent)
            .join(' ')
            .trim()
            .replace(/^[:]/, '') // Remove leading colon if present
            .trim();
          currentSection.items.push({ [key]: value || getTextContent(paragraph) });
        } else {
          // No bolded text, store as plain string
          currentSection.items.push(getTextContent(paragraph));
        }
      });
    }
  });

  return result;
}

