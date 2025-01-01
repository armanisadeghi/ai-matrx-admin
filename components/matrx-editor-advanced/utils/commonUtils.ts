// untils.ts
import { createRoot } from 'react-dom/client';




const getSelectedTextInfo = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    
    // Get start and end nodes and offsets
    const startNode = range.startContainer;
    const startOffset = range.startOffset;
    const endNode = range.endContainer;
    const endOffset = range.endOffset;
    
    // Get the selected text
    const selectedText = range.toString();
    
    return {
      startNode,
      startOffset,
      endNode,
      endOffset,
      selectedText
    };
  };


/**
 * Finds the parent div element within the editor container
 */
export const findOrCreateLineDiv = (
    startContainer: Node, 
    editorRef: HTMLElement
  ): HTMLElement => {
    let lineDiv = startContainer;
    while (lineDiv && lineDiv.parentElement !== editorRef) {
      lineDiv = lineDiv.parentElement;
    }
  
    if (!lineDiv || !(lineDiv instanceof HTMLElement)) {
      lineDiv = document.createElement("div");
      editorRef.appendChild(lineDiv);
    }
  
    return lineDiv as HTMLElement;
  };
  
  /**
   * Creates a chip container element with the specified attributes
   */
  export const createChipContainer = (chipId: string, chipContent: string): HTMLElement => {
    const chipContainer = document.createElement("span");
    chipContainer.setAttribute("data-chip-id", chipId);
    chipContainer.setAttribute("data-chip", "");
    chipContainer.setAttribute("data-chip-content", chipContent);
    chipContainer.contentEditable = "false";
    return chipContainer;
  };
  
  /**
   * Creates an invisible cursor node after the chip
   */
  export const createCursorNode = (): Text => {
    return document.createTextNode(" ");
  };
  

/**
 * Creates a chip removal handler that properly cleans up React and DOM elements
 */
export const createChipRemovalHandler = (
  chipContainer: HTMLElement,
  root: ReturnType<typeof createRoot>,
  onProcessContent: () => void
): () => void => {
  return () => {
    root.unmount();
    chipContainer.remove();
    onProcessContent();
  };
};
