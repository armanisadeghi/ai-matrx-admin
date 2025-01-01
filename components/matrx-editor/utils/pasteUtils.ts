// pasteUtils.ts
import {
  createTextNode,
  createLineBreakNode,
  insertNodesWithRollback,
} from "./core-dom-utils";

export const handleEditorPaste = (
  e: React.ClipboardEvent,
  editorRef: React.RefObject<HTMLDivElement>,
  processContent: () => void
) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !editorRef.current) return;

  const range = selection.getRangeAt(0);

  // Find or create the containing line div
  let targetContainer: HTMLElement | null = null;
  let currentNode = range.startContainer;

  // If the current node is a text node, start with its parent
  if (currentNode.nodeType === Node.TEXT_NODE) {
    currentNode = currentNode.parentNode;
  }

  // Find the nearest div parent that's a direct child of the editor
  while (currentNode && currentNode !== editorRef.current) {
    if (
      currentNode instanceof HTMLElement &&
      currentNode.parentElement === editorRef.current
    ) {
      targetContainer = currentNode;
      break;
    }
    currentNode = currentNode.parentNode;
  }

  // If we don't have a proper container or we're at the root, create a new line div
  if (!targetContainer) {
    const newLineDiv = createLineBreakNode().node as HTMLElement;
    
    if (!editorRef.current.hasChildNodes()) {
      // If editor is empty, simply append the new div
      editorRef.current.appendChild(newLineDiv);
      targetContainer = newLineDiv;
    } else {
      // Insert at current selection point
      range.insertNode(newLineDiv);
      targetContainer = newLineDiv;
    }
    
    // Always ensure range points to the new container
    range.setStart(newLineDiv, 0);
    range.collapse(true);
  }

  try {
    // Store original content for potential rollback
    const originalContentNode = targetContainer.cloneNode(true) as HTMLElement;

    // Split text into lines while preserving all whitespace
    const lines = text.split(/(\r\n|\n|\r)/g);
    const nodesToInsert: HTMLElement[] = [];

    let currentLineDiv = createLineBreakNode().node as HTMLElement;

    // Process each line and line break
    lines.forEach((line) => {
      // Check if this is a line break
      if (line.match(/\r\n|\n|\r/)) {
        // Always push current line if it has content
        if (currentLineDiv.hasChildNodes()) {
          nodesToInsert.push(currentLineDiv);
        }
        currentLineDiv = createLineBreakNode().node as HTMLElement;
        return;
      }

      // Handle the actual content
      if (line === "") {
        // Empty line - add BR
        const br = document.createElement("br");
        currentLineDiv.appendChild(br);
      } else {
        // Preserve all whitespace in the line
        const { node: textNode } = createTextNode(line);
        // Set CSS to preserve whitespace
        textNode.style.whiteSpace = "pre";
        currentLineDiv.appendChild(textNode);
      }
    });

    // Add the last line if it hasn't been added and has content
    if (currentLineDiv.hasChildNodes()) {
      nodesToInsert.push(currentLineDiv);
    }

    // Ensure range is properly positioned before deletion
    if (range.startContainer === editorRef.current) {
      range.setStart(targetContainer, 0);
      range.collapse(true);
    }

    // Clear the range contents
    range.deleteContents();

    // Determine insert position based on whether we're inserting at the start of a line
    const isStartOfLine = range.startOffset === 0;

    // Insert all nodes
    const insertResult = insertNodesWithRollback({
      nodes: nodesToInsert,
      target: targetContainer,
      position: isStartOfLine ? "replaceWith" : "append",
      rollbackNodes: [originalContentNode],
    });

    if (!insertResult) {
      throw new Error("Failed to insert pasted content");
    }

    // Create a new selection range at the end of inserted content
    const newRange = document.createRange();
    const lastNode = nodesToInsert[nodesToInsert.length - 1];
    newRange.setStartAfter(lastNode);
    newRange.collapse(true);
    
    // Update the selection
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Process the content after successful insertion
    setTimeout(() => processContent(), 0);
  } catch (error) {
    console.error("Error handling paste:", error);

    // Attempt to restore original state
    try {
      if (targetContainer.parentElement) {
        const parent = targetContainer.parentElement;
        const originalClone = targetContainer.cloneNode(true);
        parent.replaceChild(originalClone, targetContainer);
      }
    } catch (rollbackError) {
      console.error("Failed to rollback paste operation:", rollbackError);
    }
  }
};