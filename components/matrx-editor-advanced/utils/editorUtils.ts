// editorUtils.ts
import { toBrokerChip, type ContentBlock, type DocumentState, type EditorBroker } from "../types";

import {
  createTextNode,
  createBrokerNode,
  createLineBreakNode,
  createCursorNode,
} from "./core-dom-utils";
import { renderBrokerChipInContainer } from "../broker/BrokerChipRender";

import { getCursorPosition, setCursorPosition } from "./cursorPosition";
import { useBrokerSync } from "@/providers/brokerSync/BrokerSyncProvider";

export const generateId = () => Math.random().toString(36).substring(2, 11);

const reconstructBrokerFromBlock = (
  block: ContentBlock, 
  editorId: string
): EditorBroker | null => {
  if (block.type !== "chip") return null;

  const { brokerData, getConnectionStatus } = useBrokerSync();
  const broker = brokerData.selectedBrokers[block.id];
  
  if (!broker) {
    console.warn(`No broker found for block ${block.id}`);
    return null;
  }

  // Get connection info for this broker
  const connectionStatus = getConnectionStatus(block.id);
  
  // Convert to EditorBroker with connection info
  return toBrokerChip(broker, {
    color: connectionStatus?.color,
    isTemporary: false,
    editorId
  });
};

export const setEditorContent = (
  editorRef: React.RefObject<HTMLDivElement>,
  newState: DocumentState,
  setDocumentState: (state: DocumentState) => void
) => {
  if (!editorRef.current) return;
  const editorId = editorRef.current.dataset.editorId || '';

  editorRef.current.innerHTML = "";
  let currentDiv = createLineBreakNode().node as HTMLElement;
  editorRef.current.appendChild(currentDiv);

  newState.blocks.forEach((block) => {
    switch (block.type) {
      case "lineBreak":
        currentDiv = createLineBreakNode().node as HTMLElement;
        editorRef.current?.appendChild(currentDiv);
        break;

      case "text": {
        if (block.content === "") {
          const br = document.createElement("br");
          currentDiv.appendChild(br);
        } else {
          const { node: textSpan } = createTextNode(block.content, block.id);
          currentDiv.appendChild(textSpan);
        }
        break;
      }

      case "chip": {
        const broker = reconstructBrokerFromBlock(block, editorId);
        if (!broker) {
          console.warn(`Skipping chip reconstruction for block ${block.id}`);
          break;
        }
    
        const onProcessContent = () => {
          const blocks = captureEditorContent(editorRef);
          processEditorContent(
            editorRef,
            blocks,
            newState.version,
            setDocumentState
          );
        };

        const { node: chipContainer } = createBrokerNode(broker);
        currentDiv.appendChild(chipContainer);
        renderBrokerChipInContainer(chipContainer, broker, onProcessContent);

        const cursorNode = createCursorNode();
        chipContainer.after(cursorNode);
        break;
      }
    }
  });

  setDocumentState(newState);
};

export const captureEditorContent = (
  editorRef: React.RefObject<HTMLDivElement>
): ContentBlock[] => {
  console.log('📸 Starting content capture');
  if (!editorRef.current) return [];

  const blocks: ContentBlock[] = [];
  let position = 0;

  const addBlock = (
    type: ContentBlock["type"],
    content: string = "",
    id?: string,
    node?: HTMLElement
  ) => {
    const style = node?.getAttribute("data-style");
    blocks.push({
      id: id || generateId(),
      type,
      content,
      position: position++,
      style: style ? JSON.parse(style) : undefined
    });
  };

  const processNode = (node: Node) => {
    if (node instanceof HTMLElement) {
      const nodeId = node.getAttribute("data-id");
      const nodeType = node.getAttribute("data-type");

      if (nodeType === "chip") {
        const content = node.getAttribute("data-chip-content") || "";
        addBlock("chip", content, nodeId, node);
      } else if (node.tagName === "BR") {
        addBlock("text", "", nodeId);
      } else if (nodeType === "text") {
        // If it's a text node, process its children
        const children = Array.from(node.childNodes);
        if (children.length > 0) {
          children.forEach(child => processNode(child));
        } else {
          addBlock("text", node.textContent || "", nodeId, node);
        }
      } else {
        // For any other element, process its children
        Array.from(node.childNodes).forEach(child => processNode(child));
      }
    } else if (
      node.nodeType === Node.TEXT_NODE &&
      node.textContent &&
      node.textContent !== "\u200B"
    ) {
      addBlock("text", node.textContent);
    }
  };

  const processLineContent = (lineDiv: HTMLElement) => {
    if (blocks.length > 0) {
      const lineBreakId = lineDiv.getAttribute("data-id");
      addBlock("lineBreak", "", lineBreakId);
    }

    const childNodes = Array.from(lineDiv.childNodes);

    // Empty line check
    if (childNodes.length === 1 && childNodes[0] instanceof HTMLBRElement) {
      addBlock("text", "");
      return;
    }

    // Process each child node recursively
    childNodes.forEach(node => processNode(node));
  };

  // Process direct text nodes in root
  const rootNodes = Array.from(editorRef.current.childNodes);
  rootNodes
    .filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        node.textContent &&
        node.textContent !== "\u200B"
    )
    .forEach((node) => {
      addBlock("text", node.textContent);
    });

  // Process div children
  Array.from(editorRef.current.children).forEach((child) => {
    if (child instanceof HTMLElement && child.tagName === "DIV") {
      processLineContent(child);
    }
  });

  console.log('📦 Finished capturing content', { blockCount: blocks.length });
  return blocks;
};

export const processEditorContent = (
  editorRef: React.RefObject<HTMLDivElement>,
  blocks: ContentBlock[],
  version: number,
  setDocumentState: (state: DocumentState) => void
) => {
  console.log('🔄 Starting content processing', { 
    version,
    blockCount: blocks.length 
  });

  if (!editorRef.current) return;

  const cursorPos = getCursorPosition(editorRef.current);
  console.log('📍 Cursor position before processing', cursorPos);

  const newState = {
    blocks,
    version: version + 1,
    lastUpdate: Date.now(),
  };

  console.log('🔄 Setting editor content');
  // setEditorContent(editorRef, newState, setDocumentState);

  setTimeout(() => {
    console.log('📍 Restoring cursor position');
    if (editorRef.current) {
      setCursorPosition(editorRef.current, cursorPos);
    }
  }, 0);
};
