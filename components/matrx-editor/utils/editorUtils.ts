// editorUtils.ts
import { generateId, getCursorPosition, setCursorPosition } from "../utils/commonUtils";
import { createChipContainer } from "../utils/chipUtils";
import type { ContentBlock, DocumentState } from "../types";
import { renderChipInContainer } from "../components/Chip";

export const setEditorContent = (
  editorRef: React.RefObject<HTMLDivElement>,
  newState: DocumentState,
  setDocumentState: (state: DocumentState) => void
) => {
  if (!editorRef.current) return;

  console.log("Setting content with blocks:", newState.blocks);

  editorRef.current.innerHTML = "";

  let currentDiv = document.createElement("div");
  editorRef.current.appendChild(currentDiv);

  newState.blocks.forEach((block) => {
    switch (block.type) {
      case "lineBreak":
        currentDiv = document.createElement("div");
        editorRef.current?.appendChild(currentDiv);
        break;
      case "text":
        if (block.content === "") {
          const br = document.createElement("br");
          currentDiv.appendChild(br);
        } else {
          const textNode = document.createTextNode(block.content);
          currentDiv.appendChild(textNode);
        }
        break;
      case "chip":
        console.log("Recreating chip:", block.content);

        const chipContainer = createChipContainer(block.id, block.content);
        const onProcessContent = () => {
          const blocks = captureEditorContent(editorRef);
          processEditorContent(editorRef, blocks, newState.version, setDocumentState);
        };
        
        renderChipInContainer(
          chipContainer, 
          block.content, 
          onProcessContent,
          block.id // Using block.id as brokerId, adjust if needed
        );

        currentDiv.appendChild(chipContainer);
        break;
    }
  });

  setDocumentState(newState);
};

export const captureEditorContent = (
  editorRef: React.RefObject<HTMLDivElement>
): ContentBlock[] => {
  if (!editorRef.current) return [];

  const blocks: ContentBlock[] = [];
  let position = 0;

  const addBlock = (type: ContentBlock["type"], content: string = "") => {
    blocks.push({
      id: generateId(),
      type,
      content,
      position: position++,
    });
  };

  // Process a line div's content
  const processLineContent = (lineDiv: HTMLElement) => {
    // Add line break for every div except the first one
    if (blocks.length > 0) {
      addBlock("lineBreak", "");
    }

    const childNodes = Array.from(lineDiv.childNodes);

    // Check if this is an empty line
    if (childNodes.length === 1 && childNodes[0] instanceof HTMLBRElement) {
      addBlock("text", "");
      return;
    }

    // Process each child node in the line
    childNodes.forEach((node) => {
      if (node instanceof HTMLElement) {
        if (node.hasAttribute("data-chip")) {
          const content = node.getAttribute("data-chip-content") || "";
          addBlock("chip", content);
        } else if (node.tagName === "BR") {
          // Handle explicit line breaks within content
          addBlock("text", "");
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        // Skip zero-width spaces used for cursor positioning
        if (node.textContent !== "\u200B") {
          addBlock("text", node.textContent);
        }
      }
    });
  };

  // First process any direct text nodes in the root
  const rootNodes = Array.from(editorRef.current.childNodes);
  const directTextNodes = rootNodes.filter(
    (node) =>
      node.nodeType === Node.TEXT_NODE &&
      node.textContent &&
      node.textContent !== "\u200B"
  );

  if (directTextNodes.length > 0) {
    directTextNodes.forEach((node) => {
      addBlock("text", node.textContent);
    });
  }

  // Then process all div children
  Array.from(editorRef.current.children).forEach((child) => {
    if (child instanceof HTMLElement && child.tagName === "DIV") {
      processLineContent(child);
    }
  });

  return blocks;
};

export const processEditorContent = (
  editorRef: React.RefObject<HTMLDivElement>,
  blocks: ContentBlock[],
  version: number,
  setDocumentState: (state: DocumentState) => void
) => {
  if (!editorRef.current) return;

  const cursorPos = getCursorPosition(editorRef.current);
  const newState = {
    blocks,
    version: version + 1,
    lastUpdate: Date.now(),
  };

  setEditorContent(editorRef, newState, setDocumentState);

  setTimeout(() => {
    if (editorRef.current) {
      setCursorPosition(editorRef.current, cursorPos);
    }
  }, 0);
};

