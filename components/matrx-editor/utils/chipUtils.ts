// editorUtils.ts
import { createRoot } from "react-dom/client";

export const isNodeWithinEditor = (
  node: Node,
  editorElement: HTMLElement
): boolean => {
  let current = node.parentElement;
  while (current) {
    if (current === editorElement) return true;
    current = current.parentElement;
  }
  return false;
};

export function createCursorNode(): Text {
  return document.createTextNode("\u200B");
}
export const queueStateUpdate = (callback: () => void) => {
  setTimeout(callback, 0);
};

export const queueDOMOperation = (operation: () => void) => {
  Promise.resolve().then(operation);
};

/**
 * Finds or creates a line div within the editor
 */
export function findOrCreateLineDiv(
  startContainer: Node,
  editorRef: HTMLElement
): HTMLElement {
  let currentNode = startContainer;
  let lineDiv: HTMLElement | null = null;

  while (currentNode && currentNode.parentElement !== editorRef) {
    currentNode = currentNode.parentElement;
  }

  if (currentNode && currentNode instanceof HTMLElement) {
    lineDiv = currentNode;
  } else {
    lineDiv = document.createElement("div");
    editorRef.appendChild(lineDiv);
  }

  return lineDiv;
}

/**
 * Creates a chip container element
 */
export function createChipContainer(
  chipId: string,
  chipContent: string
): HTMLSpanElement {
  const chipContainer = document.createElement("span");
  chipContainer.setAttribute("data-chip-id", chipId);
  chipContainer.setAttribute("data-chip", "");
  chipContainer.setAttribute("data-chip-content", chipContent);
  chipContainer.contentEditable = "false";
  return chipContainer;
}

/**
 * Handles the removal of a chip
 */
export function handleChipRemoval(
  chipContainer: HTMLElement,
  root: ReturnType<typeof createRoot>,
  processContent: () => void,
  captureContent?: () => any
) {
  root.unmount();
  chipContainer.remove();

  if (captureContent) {
    const debugBlocks = captureContent();
    console.log("Captured blocks after removal:", debugBlocks);
  }

  processContent();
}

/**
 * Creates text nodes for selection conversion
 */
export function createTextNodes(
  fullText: string,
  startOffset: number,
  endOffset: number
): { beforeNode: Text; afterNode: Text } {
  const beforeText = fullText.substring(0, startOffset);
  const afterText = fullText.substring(endOffset);

  return {
    beforeNode: document.createTextNode(
      beforeText.length > 0 ? beforeText.trimEnd() + " " : ""
    ),
    afterNode: document.createTextNode(
      afterText.length > 0 ? " " + afterText.trimStart() : ""
    ),
  };
}

export function validateSelection(range: Range): boolean {
  return (
    range.startContainer === range.endContainer &&
    range.startContainer.nodeType === Node.TEXT_NODE
  );
}

/**
 * Gets the parent line div for a node
 */
export function getParentLineDiv(
  node: Node,
  editorRef: HTMLElement
): HTMLElement | null {
  let lineDiv = node.parentElement;
  while (lineDiv && lineDiv.parentElement !== editorRef) {
    lineDiv = lineDiv.parentElement;
  }
  return lineDiv;
}

/**
 * Updates the DOM with new nodes after conversion
 */
export function updateDOMWithChip(
  startNode: Node,
  beforeNode: Text,
  chipContainer: HTMLElement,
  afterNode: Text,
  cursorNode: Text
) {
  startNode.parentNode?.replaceChild(beforeNode, startNode);
  beforeNode.parentNode?.insertBefore(chipContainer, beforeNode.nextSibling);
  chipContainer.parentNode?.insertBefore(afterNode, chipContainer.nextSibling);
  chipContainer.after(cursorNode);
}
