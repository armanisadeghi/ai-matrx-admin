// components\matrx-editor\utils\selection.ts

interface SelectionInfo {
  startNode: Node;
  endNode: Node;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  isMultiNode: boolean;
  isLineSelection: boolean;
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
  if (!node) return null; // Selection was outside editor

  const startNode = range.startContainer;
  const endNode = range.endContainer;
  const selectedText = range.toString().trim();

  // Detect line selection (double-click case)
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
  };
};



const getFullContent = (element: HTMLElement): string => {
    return Array.from(element.childNodes)
      .map((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent;
        }
        if (node instanceof HTMLElement) {
          if (node.tagName === "BR") return "\n";
          if (node.hasAttribute("data-chip")) {
            return (
              node.getAttribute("data-original-text") ||
              node.getAttribute("data-chip-content")
            );
          }
          return getFullContent(node);
        }
        return "";
      })
      .join("");
  };
  
  const getMultiNodeContent = (range: Range): string => {
    const div = document.createElement("div");
    div.appendChild(range.cloneContents());
    return getFullContent(div);
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
    };
  }
  
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
          isTextNode: false
        }
      };
    }
  
    if (selectionInfo.isMultiNode) {
      return {
        type: 'multi',
        content: getMultiNodeContent(range),
        range,
        insertionInfo: {
          container: range.startContainer,
          isTextNode: range.startContainer.nodeType === Node.TEXT_NODE
        }
      };
    }
  
    // Single node selection
    const startNode = range.startContainer;
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
        isTextNode: true
      }
    };
  };
  