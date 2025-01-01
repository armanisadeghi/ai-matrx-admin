// selection.ts
interface SelectionInfo {
  startNode: Node;
  endNode: Node;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  isMultiNode: boolean;
  isLineSelection: boolean;
  containerId?: string;  // Add ID tracking
}

interface NodeContent {
  content: string;
  id?: string;
  type?: string;
  attributes?: Record<string, string>;
}

const getNodeContent = (node: Node): NodeContent => {
  if (node.nodeType === Node.TEXT_NODE) {
    const parentElement = node.parentElement;
    return {
      content: node.textContent || '',
      id: parentElement?.getAttribute('data-id'),
      type: parentElement?.getAttribute('data-type'),
      attributes: parentElement ? extractDataAttributes(parentElement) : undefined
    };
  }
  
  if (node instanceof HTMLElement) {
    if (node.tagName === 'BR') {
      return { content: '\n' };
    }
    if (node.hasAttribute('data-chip')) {
      return {
        content: node.getAttribute('data-original-text') || node.getAttribute('data-chip-content') || '',
        id: node.getAttribute('data-id'),
        type: 'chip',
        attributes: extractDataAttributes(node)
      };
    }
    return {
      content: getFullContent(node),
      id: node.getAttribute('data-id'),
      type: node.getAttribute('data-type'),
      attributes: extractDataAttributes(node)
    };
  }
  
  return { content: '' };
};

const extractDataAttributes = (element: HTMLElement): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-')) {
      attributes[attr.name] = attr.value;
    }
  }
  return attributes;
};

const getFullContent = (element: HTMLElement): string => {
  return Array.from(element.childNodes)
    .map(node => getNodeContent(node).content)
    .join('');
};

const getMultiNodeContent = (range: Range): NodeContent => {
  const div = document.createElement('div');
  div.appendChild(range.cloneContents());
  
  // For multi-node selections, we want to preserve any existing IDs
  const firstNode = div.firstElementChild as HTMLElement | null;
  return {
    content: getFullContent(div),
    id: firstNode?.getAttribute('data-id'),
    type: firstNode?.getAttribute('data-type'),
    attributes: firstNode ? extractDataAttributes(firstNode) : undefined
  };
};

interface SelectionResult {
  type: 'line' | 'multi' | 'single';
  content: string;
  range: Range;
  insertionInfo: {
    container: Node;
    beforeText?: string;
    afterText?: string;
    isTextNode: boolean;
    containerId?: string;
    containerAttributes?: Record<string, string>;
  };
}

export const getSelectionInfo = (
  editorRef: React.RefObject<HTMLDivElement>
): SelectionInfo | null => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;

  const range = selection.getRangeAt(0);

  // Ensure selection is within our editor
  let node = selection.anchorNode;
  while (node && node !== editorRef.current) {
    node = node.parentNode;
  }
  if (!node) return null;

  const startNode = range.startContainer;
  const endNode = range.endContainer;
  const selectedText = range.toString().trim();

  // Get container ID if available
  const containerElement = startNode instanceof HTMLElement ? 
    startNode : 
    startNode.parentElement;
  const containerId = containerElement?.getAttribute('data-id');

  const isLineSelection =
    endNode instanceof HTMLElement &&
    endNode.tagName === "DIV" &&
    range.endOffset === 0;

  return {
    startNode,
    endNode,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    selectedText,
    isMultiNode: startNode !== endNode,
    isLineSelection,
    containerId
  };
};

export const analyzeSelection = (
  editorRef: React.RefObject<HTMLDivElement>
): SelectionResult | null => {
  const selectionInfo = getSelectionInfo(editorRef);
  if (!selectionInfo || !selectionInfo.selectedText) return null;

  const range = window.getSelection()?.getRangeAt(0);
  if (!range) return null;

  if (selectionInfo.isLineSelection) {
    const lineDiv = selectionInfo.startNode.parentElement;
    if (!lineDiv) return null;

    return {
      type: 'line',
      content: getFullContent(lineDiv),
      range,
      insertionInfo: {
        container: lineDiv,
        isTextNode: false,
        containerId: lineDiv.getAttribute('data-id'),
        containerAttributes: extractDataAttributes(lineDiv)
      }
    };
  }

  if (selectionInfo.isMultiNode) {
    const nodeContent = getMultiNodeContent(range);
    return {
      type: 'multi',
      content: nodeContent.content,
      range,
      insertionInfo: {
        container: range.startContainer,
        isTextNode: range.startContainer.nodeType === Node.TEXT_NODE,
        containerId: nodeContent.id,
        containerAttributes: nodeContent.attributes
      }
    };
  }

  // Single node selection
  const startNode = range.startContainer;
  const nodeContent = getNodeContent(startNode);
  const fullText = startNode.textContent || '';
  const beforeText = fullText.substring(0, range.startOffset);
  const afterText = fullText.substring(range.endOffset);

  return {
    type: 'single',
    content: selectionInfo.selectedText,
    range,
    insertionInfo: {
      container: startNode,
      beforeText: beforeText.length > 0 ? beforeText.trimEnd() + ' ' : '',
      afterText: afterText.length > 0 ? ' ' + afterText.trimStart() : '',
      isTextNode: true,
      containerId: nodeContent.id,
      containerAttributes: nodeContent.attributes
    }
  };
};