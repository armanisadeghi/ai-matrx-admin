"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { CHIP_VARIANTS, convertSelectionToChip, insertChipAtSelection, linkBrokerToChip } from "./Chip";
import { generateId, getCursorPosition, setCursorPosition } from "../utils/commonUtils";
import type { ContentBlock, DocumentState } from "../types";
import CursorTracker from "./CursorTracker";
import SelectionTracker from "./SelectionTracker";
import { createChipContainer } from "../utils/chipUtils";
import { useStructuredEditor } from "@/app/contexts/StructuredEditorContext";

const DEFAULT_CHIPS = ["Broker", "Task", "Note"];

interface StructuredEditorProps {
  onStateChange?: (state: DocumentState) => void;
  editorId: string;
  showControls?: boolean;
}

export const StructuredEditor: React.FC<StructuredEditorProps> = ({
    onStateChange,
    editorId,
    showControls = true,
  }) => {
    const { createVariableFromText } = useStructuredEditor();
    const linkBrokerToChip = useCallback(
      (text: string) => createVariableFromText(text),
      [createVariableFromText]
    );
  

  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [documentState, setDocumentState] = useState<DocumentState>({
    blocks: [],
    version: 0,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    onStateChange?.(documentState);
  }, [documentState, onStateChange]);

  const setContent = useCallback((newState: DocumentState) => {
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

          const root = createRoot(chipContainer);

          const removeChip = () => {
            root.unmount();
            chipContainer.remove();
            const debugBlocks = captureContent();
            processContent();
          };

          root.render(
            <CHIP_VARIANTS.chip content={block.content} onRemove={removeChip} />
          );

          currentDiv.appendChild(chipContainer);

          // Add a zero-width space after chip for cursor positioning
          const cursorNode = document.createTextNode("\u200B");
          currentDiv.appendChild(cursorNode);
          break;
      }
    });

    setDocumentState(newState);
  }, []);

  const captureContent = useCallback((): ContentBlock[] => {
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
  }, []);

  const processContent = useCallback(() => {
    if (!editorRef.current) return;

    const cursorPos = getCursorPosition(editorRef.current);
    const blocks = captureContent();
    const newState = {
      blocks,
      version: documentState.version + 1,
      lastUpdate: Date.now(),
    };

    setContent(newState);

    setTimeout(() => {
      if (editorRef.current) {
        setCursorPosition(editorRef.current, cursorPos);
      }
    }, 0);
  }, [documentState.version, captureContent, setContent]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    let currentDiv = range.startContainer;
    while (currentDiv && currentDiv.parentElement !== editorRef.current) {
      currentDiv = currentDiv.parentElement;
    }

    const lines = text.split(/\r\n|\r|\n/);
    lines.forEach((line, index) => {
      if (!currentDiv || !(currentDiv instanceof HTMLElement)) {
        currentDiv = document.createElement("div");
        editorRef.current?.appendChild(currentDiv);
      }

      const textNode = document.createTextNode(line);
      currentDiv.appendChild(textNode);

      if (index < lines.length - 1) {
        currentDiv = document.createElement("div");
        editorRef.current?.appendChild(currentDiv);
      }
    });

    processContent();
  }, []);

  const insertChip = useCallback((chipContent: string) => {
    insertChipAtSelection({
      content: chipContent,
      editorRef,
      onProcessContent: processContent
    });
  }, [processContent]);
  
  const handleConvertToChip = useCallback(() => {
    convertSelectionToChip({
      editorRef,
      onProcessContent: processContent,
      linkBrokerToChip
    });
  }, [processContent, linkBrokerToChip]);
  


  
  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full h-full">
      {showControls && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            {DEFAULT_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => insertChip(chip)}
                className="px-3 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Insert {chip}
              </button>
            ))}
            <button
              onClick={processContent}
              className="px-3 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
            >
              update
            </button>
            <button
              onClick={handleConvertToChip}
              className="px-3 py-1 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700"
            >
              Convert To Chip
            </button>
          </div>
          <div className="flex items-center gap-4">
            <CursorTracker editorRef={editorRef} />
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <SelectionTracker editorRef={editorRef} />
          </div>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="h-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
        onPaste={handlePaste}
        // onBlur={() => {
        //   setTimeout(() => processContent(), 0);
        // }}
      />
    </div>
  );
};
