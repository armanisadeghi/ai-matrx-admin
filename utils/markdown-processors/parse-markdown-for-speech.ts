export function parseMarkdownToText(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') return '';
  
    const numberToWords = (num: string): string => {
      const numbers = [
        'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
      ];
      const numInt = parseInt(num, 10);
      return numInt < 20 ? numbers[numInt] : `Number ${num}`;
    };
  
    let result = markdown
      // Replace code blocks
      .replace(/```[\s\S]*?```/g, 'Please see the code provided.')
      // Replace inline code
      .replace(/`([^`]+)`/g, '$1')
      // Replace headers
      .replace(/^#{1,6}\s+(.+)$/gm, 'Section: $1')
      // Replace bold
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      // Replace italic
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Replace links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1. Please see the link.")
      // Replace images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, ($0, alt) => alt ? `${alt}. Please see the image.` : 'Please see the image.')
      // Replace blockquotes
      .replace(/^>\s*(.+)$/gm, 'Quote: $1')
      // Replace unordered lists
      .replace(/^([-*+])\s+(.+)$/gm, 'Bullet point: $2')
      // Replace ordered lists
      .replace(/^(\d+)\.\s+(.+)$/gm, (_match, num, content) => `Number ${numberToWords(num)}: ${content}`)
      // Replace tables
      .replace(/^\|.*\|$/gm, 'Please see the table provided.')
      .replace(/^-{2,}\|-{2,}\|$/gm, '') // Remove table header separator
      // Replace horizontal rules
      .replace(/^(\*{3,}|-{3,}|_{3,})$/gm, '')
      // Remove HTML tags, keep content
      .replace(/<\/?[^>]+(>|$)/g, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim();
  
    return result;
  }