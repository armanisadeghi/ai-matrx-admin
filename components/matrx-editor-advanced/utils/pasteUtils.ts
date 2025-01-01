// pasteUtils.ts
import {
  createTextNode,
  createLineBreakNode,
  insertNodesWithRollback,
  type DOMNodeCreationResult
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

  // NEW: Ensure base structure exists
  if (!editorRef.current.hasChildNodes()) {
    const initialLineDiv = createLineBreakNode().node as HTMLElement;
    const br = document.createElement("br");
    initialLineDiv.appendChild(br);
    editorRef.current.appendChild(initialLineDiv);
  }

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

  // If we don't have a proper container, create one using our utility
  if (!targetContainer) {
    const { node: newLineDiv } = createLineBreakNode();
    
    if (!editorRef.current.hasChildNodes()) {
      editorRef.current.appendChild(newLineDiv);
      targetContainer = newLineDiv;
      range.setStart(newLineDiv, 0);
      range.collapse(true);
    } else {
      range.insertNode(newLineDiv);
      targetContainer = newLineDiv;
    }
  }

  try {
    // Split into lines, keeping empty strings between newlines
    const lines = text.split(/(\r\n|\n|\r)/g).filter(line => line !== '\r' && line !== '\n' && line !== '\r\n');
    const nodesToInsert: HTMLElement[] = [];
    const originalContentNode = targetContainer.cloneNode(true) as HTMLElement;

    lines.forEach((line) => {
      // Create a new line container for each line (empty or not)
      const lineContainer = createLineBreakNode();

      if (line.length === 0) {
        // Empty line - add br
        const br = document.createElement("br");
        lineContainer.node.appendChild(br);
      } else {
        // Non-empty line - just add the text node
        const textNode = createTextNode(line);
        lineContainer.node.appendChild(textNode.node);
      }

      nodesToInsert.push(lineContainer.node);
    });

    // If we haven't added any nodes, create an empty line
    if (nodesToInsert.length === 0) {
      const { node } = createLineBreakNode();
      const br = document.createElement("br");
      node.appendChild(br);
      nodesToInsert.push(node);
    }

    // Clear range contents
    range.deleteContents();

    // Insert content using our utility
    const insertResult = insertNodesWithRollback({
      nodes: nodesToInsert,
      target: targetContainer,
      position: range.startOffset === 0 ? "replaceWith" : "append",
      rollbackNodes: [originalContentNode]
    });

    if (!insertResult) {
      throw new Error("Failed to insert pasted content");
    }

    // Set selection to end of inserted content ONLY if we have a valid DOM structure
    try {
      // Find the last inserted node in the DOM
      const lastInsertedNode = targetContainer.lastChild;
      
      if (lastInsertedNode && lastInsertedNode.parentNode) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastInsertedNode);
        newRange.collapse(true);
        
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } catch (selectionError) {
      console.error("Error setting selection after paste:", selectionError);
      // Continue with processing even if selection fails
    }

    // Process content
    setTimeout(() => processContent(), 0);
  } catch (error) {
    console.error("Error handling paste:", error);
  }
};
