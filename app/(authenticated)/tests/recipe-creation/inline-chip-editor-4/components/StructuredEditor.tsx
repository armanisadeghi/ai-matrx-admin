"use client";

import React, { useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { CHIP_VARIANTS, getRandomChip } from "./Chip";
import { generateId, getCursorPosition, setCursorPosition } from "../utils";
import type { ContentBlock, DocumentState } from "../types";

const DEFAULT_CHIPS = ["Placeholder", "Task", "Note"];

interface StructuredEditorProps {
  onStateChange?: (state: DocumentState) => void;
  initialState?: DocumentState;
  showControls?: boolean;
}

export const StructuredEditor: React.FC<StructuredEditorProps> = ({
  onStateChange,
  initialState,
  showControls = true,
}) => {
  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [documentState, setDocumentState] = useState<DocumentState>(
    initialState || {
      blocks: [],
      version: 0,
      lastUpdate: Date.now(),
    }
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (editorRef.current && initialState) {
      renderBlocksToEditor(initialState.blocks);
    }
  }, [initialState]);

  useEffect(() => {
    onStateChange?.(documentState);
  }, [documentState, onStateChange]);

  const renderBlocksToEditor = (blocks: ContentBlock[]) => {
    if (!editorRef.current) return;

    // Clear existing content
    editorRef.current.innerHTML = "";

    let currentDiv = document.createElement("div");
    editorRef.current.appendChild(currentDiv);

    blocks.forEach((block, index) => {
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
          const chipContainer = document.createElement("span");
          chipContainer.setAttribute("data-chip-id", block.id);
          chipContainer.setAttribute("data-chip", "");
          chipContainer.setAttribute("data-chip-content", block.content);
          chipContainer.contentEditable = "false";

          const removeChip = () => {
            chipContainer.remove();
            processContent();
          };

          const Chip = CHIP_VARIANTS.chip
          
          createRoot(chipContainer).render(
            <Chip content={block.content} onRemove={removeChip} />
          );

          currentDiv.appendChild(chipContainer);

          // Add a zero-width space after chip for cursor positioning
          const cursorNode = document.createTextNode("\u200B");
          currentDiv.appendChild(cursorNode);
          break;
      }
    });
  };

  const ensureInitialStructure = () => {
    if (!editorRef.current) return;

    // If there's direct text content, wrap it in a div
    const nodes = Array.from(editorRef.current.childNodes);
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const div = document.createElement("div");
        div.appendChild(node.cloneNode());
        editorRef.current.replaceChild(div, node);
      }
    }
  };

  const captureContent = (): ContentBlock[] => {
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
            const content = node.getAttribute("data-chip-content") || "--";
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

    // Process each line div in the editor
    Array.from(editorRef.current.children).forEach((child) => {
      if (child instanceof HTMLElement && child.tagName === "DIV") {
        processLineContent(child);
      }
    });

    return blocks;
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Get the current line div or create one
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
        // Create new div for next line
        currentDiv = document.createElement("div");
        editorRef.current?.appendChild(currentDiv);
      }
    });

    processContent();
  };

  const insertChip = (chipContent: string) => {
    if (!editorRef.current) return;

    const cursorPos = getCursorPosition(editorRef.current);
    const selection = window.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);

    // Ensure we're inserting into a line div
    let lineDiv = range.startContainer;
    while (lineDiv && lineDiv.parentElement !== editorRef.current) {
      lineDiv = lineDiv.parentElement;
    }

    if (!lineDiv || !(lineDiv instanceof HTMLElement)) {
      lineDiv = document.createElement("div");
      editorRef.current.appendChild(lineDiv);
    }

    const chipId = generateId();
    const chipContainer = document.createElement("span");
    chipContainer.setAttribute("data-chip-id", chipId);
    chipContainer.setAttribute("data-chip", "");
    chipContainer.setAttribute("data-chip-content", chipContent);
    chipContainer.contentEditable = "false";

    range.deleteContents();
    range.insertNode(chipContainer);

    const removeChip = () => {
      chipContainer.remove();
      processContent();
    };

    const Chip = CHIP_VARIANTS.chip
    createRoot(chipContainer).render(
      <Chip content={chipContent} onRemove={removeChip} />
    );

    const cursorNode = document.createTextNode("\u200B");
    chipContainer.after(cursorNode);

    processContent();

    setTimeout(() => {
      if (editorRef.current) {
        setCursorPosition(editorRef.current, cursorPos + 1);
      }
    }, 0);
  };

  const processContent = () => {
    if (!editorRef.current) return;

    ensureInitialStructure();
    const cursorPos = getCursorPosition(editorRef.current);
    const blocks = captureContent();

    setDocumentState((prev) => ({
      blocks,
      version: prev.version + 1,
      lastUpdate: Date.now(),
    }));

    setTimeout(() => {
      if (editorRef.current) {
        setCursorPosition(editorRef.current, cursorPos);
      }
    }, 0);
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full">
      {showControls && (
        <div className="mb-4 flex gap-2">
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
            Process Content
          </button>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[200px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
        onPaste={handlePaste}
        onBlur={processContent}
      />
    </div>
  );
};
