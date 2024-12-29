import { generateId } from "./commonUtils";

// types.ts
interface ChipLinkResult {
    displayName: string;
    id: string;
  }
  interface ChipCreationOptions {
    content: string;
    editorRef: React.RefObject<HTMLDivElement>;
    onProcessContent: () => void;
  }
  
  // chipUtils.ts
  interface ChipProcessingOptions extends ChipCreationOptions {
    linkBrokerToChip: (text: string, suggestedId?: string) => Promise<ChipLinkResult>;
  }
  

  const getFullContent = (element: HTMLElement): string => {
    return Array.from(element.childNodes)
      .map(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent;
        }
        if (node instanceof HTMLElement) {
          if (node.tagName === 'BR') return '\n';
          if (node.hasAttribute('data-chip')) {
            return node.getAttribute('data-original-text') || 
                   node.getAttribute('data-chip-content');
          }
          return getFullContent(node);
        }
        return '';
      })
      .join('');
  };
  
  const getMultiNodeContent = (range: Range): string => {
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    return getFullContent(div);
  };

