// Chip.tsx
"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createRoot } from "react-dom/client";
import { generateId } from "../utils/commonUtils";
import { useVariablesStore } from '@/app/contexts/useVariablesStore';
import { getSelectionInfo } from "../utils/selection";

interface ChipProps {
  content: string;
  id?: string;
  onRemove?: () => void;
  className?: string;
  brokerId?: string; // Add this
}

export const Chip: React.FC<ChipProps> = ({ content, brokerId, onRemove }) => {
  const displayName = useVariablesStore((state) =>
    brokerId ? state.variables[brokerId]?.displayName : content
  );

  return (
    <span
      contentEditable={false}
      className="inline-flex items-center gap-1 px-2 py-1 m-1 text-sm rounded-full 
                 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100
                 select-none cursor-default"
      data-chip
    >
      <span className="chip-content">{displayName || content}</span>
      <button
        onClick={onRemove}
        className="inline-flex items-center hover:text-blue-700 dark:hover:text-blue-300
                   focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        type="button"
      >
        <X size={14} />
      </button>
    </span>
  );
};


export const linkBrokerToChip = async (text: string, suggestedId?: string) => {
  console.log("Linking broker to chip:", {
    originalText: text,
    suggestedId,
    textLength: text.length,
    hasLineBreaks: text.includes("\n"),
    lines: text.split("\n"),
  });

  // Simulate some processing time
  await new Promise((resolve) => setTimeout(resolve, 50));

  const ChipId = generateId();

  // Return a mock result
  return {
    displayName: `My Favorite Chip ${ChipId}`,
    id: ChipId,
  };
};

interface ChipCreationOptions {
  content: string;
  editorRef: React.RefObject<HTMLDivElement>;
  onProcessContent: () => void;
  chipId?: string;
  linkBrokerToChip?: (
    text: string,
    suggestedId?: string
  ) => Promise<ChipLinkResult>;
}

export const createChipElement = ({
  content,
  onRemove,
  chipId,
}: {
  content: string;
  onRemove?: () => void;
  chipId?: string;
}) => {
  // Use provided ID or generate one
  const id = chipId || generateId();

  const chipContainer = document.createElement("span");
  chipContainer.setAttribute("data-chip-id", id);
  chipContainer.setAttribute("data-chip", "");
  chipContainer.setAttribute("data-chip-content", content);
  chipContainer.contentEditable = "false";

  return chipContainer;
};

export const renderChipInContainer = (
  container: HTMLElement,
  content: string,
  onProcessContent: () => void,
  brokerId: string
) => {
  const root = createRoot(container);

  const removeChip = () => {
    Promise.resolve().then(() => {
      root.unmount();
      container.remove();
      setTimeout(() => onProcessContent(), 0);
    });
  };

  root.render(
    <Chip content={content} brokerId={brokerId} onRemove={removeChip} />
  );

  // Add cursor positioning space
  const cursorNode = document.createTextNode("\u200B");
  container.after(cursorNode);

  return root;
};

export const insertChipAtSelection = async ({
  content,
  editorRef,
  onProcessContent,
  linkBrokerToChip,
}: ChipCreationOptions) => {
  if (!editorRef.current || !linkBrokerToChip) return;

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  // Create broker first
  const suggestedId = generateId();
  const linkResult = await linkBrokerToChip(content, suggestedId);

  // Ensure selection is within our editor
  const range = selection.getRangeAt(0);
  let node = range.startContainer;
  while (node && node !== editorRef.current) {
    node = node.parentNode;
  }
  if (!node) return;

  Promise.resolve().then(() => {
    const chipContainer = createChipElement({
      content: linkResult.displayName,
      chipId: linkResult.id,
    });
    range.deleteContents();
    range.insertNode(chipContainer);

    renderChipInContainer(
      chipContainer,
      linkResult.displayName,
      onProcessContent,
      linkResult.id
    );

    setTimeout(() => onProcessContent(), 0);
  });
};


interface ChipLinkResult {
  displayName: string;
  id: string;
}

interface ChipProcessingOptions extends ChipCreationOptions {
  linkBrokerToChip: (
    text: string,
    suggestedId?: string
  ) => Promise<ChipLinkResult>;
}


// Updated creation function to handle the linking
const createAndLinkChip = async ({
  content,
  editorRef,
  onProcessContent,
  linkBrokerToChip,
}: ChipProcessingOptions) => {
  // First, get the link result
  const suggestedId = generateId();
  const linkResult = await linkBrokerToChip(content, suggestedId);

  // Create chip with the linked data
  const chipContainer = createChipElement({
    content: linkResult.displayName,
    chipId: linkResult.id,
  });

  // Store the original text as a data attribute for reference
  chipContainer.setAttribute("data-original-text", content);
  chipContainer.setAttribute("data-broker-id", linkResult.id);

  return {
    container: chipContainer,
    linkResult,
  };
};

// Update the conversion function
export const convertSelectionToChip = async ({
  editorRef,
  onProcessContent,
  linkBrokerToChip,
}: Omit<ChipProcessingOptions, "content">) => {
  if (!editorRef.current) return;

  const selectionInfo = getSelectionInfo(editorRef);
  if (!selectionInfo || !selectionInfo.selectedText) return;

  try {
    if (selectionInfo.isLineSelection) {
      // Handle double-click line selection
      const lineDiv = selectionInfo.startNode.parentElement;
      if (!lineDiv) return;

      const fullContent = getFullContent(lineDiv); // New helper to get exact content
      const { container: chipContainer, linkResult } = await createAndLinkChip({
        content: fullContent,
        editorRef,
        onProcessContent,
        linkBrokerToChip,
      });

      lineDiv.innerHTML = "";
      lineDiv.appendChild(chipContainer);

      renderChipInContainer(
        chipContainer,
        linkResult.displayName,
        onProcessContent,
        linkResult.id
      );
    } else if (selectionInfo.isMultiNode) {
      // Handle multi-node selection
      const range = window.getSelection()?.getRangeAt(0);
      if (!range) return;

      const fullContent = getMultiNodeContent(range); // New helper for multi-node content
      const { container: chipContainer, linkResult } = await createAndLinkChip({
        content: fullContent,
        editorRef,
        onProcessContent,
        linkBrokerToChip,
      });

      // Insert the linked chip
      const beforeNode = document.createTextNode(" ");
      const afterNode = document.createTextNode(" ");

      range.deleteContents();
      const firstInsertionPoint = range.startContainer;
      if (firstInsertionPoint.nodeType === Node.TEXT_NODE) {
        firstInsertionPoint.parentNode.insertBefore(
          beforeNode,
          firstInsertionPoint
        );
        firstInsertionPoint.parentNode.insertBefore(
          chipContainer,
          firstInsertionPoint
        );
        firstInsertionPoint.parentNode.insertBefore(
          afterNode,
          firstInsertionPoint
        );
        firstInsertionPoint.parentNode?.removeChild(firstInsertionPoint);
      } else {
        firstInsertionPoint.appendChild(beforeNode);
        firstInsertionPoint.appendChild(chipContainer);
        firstInsertionPoint.appendChild(afterNode);
      }

      renderChipInContainer(
        chipContainer,
        linkResult.displayName,
        onProcessContent,
        linkResult.id
      );
    } else {
      // Handle single node selection
      const range = window.getSelection()?.getRangeAt(0);
      if (!range) return;

      const { container: chipContainer, linkResult } = await createAndLinkChip({
        content: selectionInfo.selectedText,
        editorRef,
        onProcessContent,
        linkBrokerToChip,
      });

      const startNode = range.startContainer;
      const fullText = startNode.textContent || "";
      const beforeText = fullText.substring(0, range.startOffset);
      const afterText = fullText.substring(range.endOffset);

      const beforeNode = document.createTextNode(
        beforeText.length > 0 ? beforeText.trimEnd() + " " : ""
      );
      const afterNode = document.createTextNode(
        afterText.length > 0 ? " " + afterText.trimStart() : ""
      );

      startNode.parentNode?.replaceChild(beforeNode, startNode);
      beforeNode.parentNode?.insertBefore(
        chipContainer,
        beforeNode.nextSibling
      );
      chipContainer.parentNode?.insertBefore(
        afterNode,
        chipContainer.nextSibling
      );

      renderChipInContainer(
        chipContainer,
        linkResult.displayName,
        onProcessContent,
        linkResult.id
      );
    }

    setTimeout(() => onProcessContent(), 0);
  } catch (error) {
    console.error("Error linking broker to chip:", error);
    // Handle error appropriately
  }
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

export const createLinkBrokerToChip = (
  createVariableFromText: (
    text: string
  ) => Promise<{ id: string; displayName: string }>
) => {
  return async (
    text: string,
    suggestedId?: string
  ): Promise<ChipLinkResult> => {
    const result = await createVariableFromText(text);
    return {
      id: result.id,
      displayName: result.displayName,
    };
  };
};



// const handleLineSelection = async (
//   lineDiv: HTMLElement,
//   onProcessContent: () => void,
//   linkBrokerToChip: (
//     text: string,
//     suggestedId?: string
//   ) => Promise<ChipLinkResult>
// ) => {
//   const textContent = Array.from(lineDiv.childNodes)
//     .map((node) => {
//       if (node.nodeType === Node.TEXT_NODE) {
//         return node.textContent;
//       }
//       if (node instanceof HTMLElement && node.hasAttribute("data-chip")) {
//         return node.getAttribute("data-chip-content");
//       }
//       return "";
//     })
//     .join(" ")
//     .trim();

//   const suggestedId = generateId();
//   const linkResult = await linkBrokerToChip(textContent, suggestedId);

//   const chipContainer = createChipElement({
//     content: linkResult.displayName,
//     chipId: linkResult.id,
//   });

//   lineDiv.innerHTML = "";
//   lineDiv.appendChild(chipContainer);

//   renderChipInContainer(
//     chipContainer,
//     linkResult.displayName,
//     onProcessContent,
//     linkResult.id
//   );
//   return true;
// };

// const handleMultiNodeSelection = async (
//   range: Range,
//   selectedText: string,
//   onProcessContent: () => void,
//   linkBrokerToChip: (
//     text: string,
//     suggestedId?: string
//   ) => Promise<ChipLinkResult>
// ) => {
//   const suggestedId = generateId();
//   const linkResult = await linkBrokerToChip(selectedText, suggestedId);

//   const startNode = range.startContainer;
//   const endNode = range.endContainer;

//   // Create nodes for the chip and surrounding content
//   const beforeText =
//     startNode.textContent?.substring(0, range.startOffset) || "";
//   const afterText = endNode.textContent?.substring(range.endOffset) || "";

//   const beforeNode = document.createTextNode(
//     beforeText.length > 0 ? beforeText.trimEnd() + " " : ""
//   );

//   const chipContainer = createChipElement({ content: selectedText });

//   const afterNode = document.createTextNode(
//     afterText.length > 0 ? " " + afterText.trimStart() : ""
//   );

//   // Extract the common parent div
//   let commonAncestor = range.commonAncestorContainer;
//   if (commonAncestor.nodeType === Node.TEXT_NODE) {
//     commonAncestor = commonAncestor.parentNode;
//   }

//   // Delete the original content
//   range.deleteContents();

//   // Insert our new nodes
//   const firstInsertionPoint = range.startContainer;
//   if (firstInsertionPoint.nodeType === Node.TEXT_NODE) {
//     firstInsertionPoint.parentNode.insertBefore(
//       beforeNode,
//       firstInsertionPoint
//     );
//     firstInsertionPoint.parentNode.insertBefore(
//       chipContainer,
//       firstInsertionPoint
//     );
//     firstInsertionPoint.parentNode.insertBefore(afterNode, firstInsertionPoint);
//     firstInsertionPoint.parentNode?.removeChild(firstInsertionPoint);
//   } else {
//     firstInsertionPoint.appendChild(beforeNode);
//     firstInsertionPoint.appendChild(chipContainer);
//     firstInsertionPoint.appendChild(afterNode);
//   }

//   renderChipInContainer(
//     chipContainer,
//     linkResult.displayName,
//     onProcessContent,
//     linkResult.id
//   );
// };



// export const convertSelectionToChipOld = ({
//     editorRef,
//     onProcessContent,
//   }: Omit<ChipCreationOptions, "content">) => {
//     if (!editorRef.current) return;

//     const selectionInfo = getSelectionInfo(editorRef);
//     if (!selectionInfo || !selectionInfo.selectedText) return;

//     Promise.resolve().then(() => {
//       const selection = window.getSelection();
//       if (!selection) return;

//       const range = selection.getRangeAt(0);

//       if (selectionInfo.isLineSelection) {
//         // Handle double-click line selection
//         const lineDiv = selectionInfo.startNode.parentElement;
//         if (lineDiv) {
//           handleLineSelection(lineDiv, onProcessContent);
//         }
//       } else if (selectionInfo.isMultiNode) {
//         // Handle multi-node selection
//         handleMultiNodeSelection(
//           range,
//           selectionInfo.selectedText,
//           onProcessContent
//         );
//       } else {
//         // Handle single node selection (existing logic)
//         const startNode = range.startContainer;
//         const fullText = startNode.textContent || "";
//         const beforeText = fullText.substring(0, range.startOffset);
//         const afterText = fullText.substring(range.endOffset);

//         const beforeNode = document.createTextNode(
//           beforeText.length > 0 ? beforeText.trimEnd() + " " : ""
//         );

//         const chipContainer = createChipElement({
//           content: selectionInfo.selectedText,
//         });
//         const afterNode = document.createTextNode(
//           afterText.length > 0 ? " " + afterText.trimStart() : ""
//         );

//         startNode.parentNode?.replaceChild(beforeNode, startNode);
//         beforeNode.parentNode?.insertBefore(
//           chipContainer,
//           beforeNode.nextSibling
//         );
//         chipContainer.parentNode?.insertBefore(
//           afterNode,
//           chipContainer.nextSibling
//         );

//         renderChipInContainer(
//           chipContainer,
//           selectionInfo.selectedText,
//           onProcessContent
//         );
//       }

//       setTimeout(() => onProcessContent(), 0);
//     });
//   };

//   export const convertSelectionToChipSimple = ({
//     editorRef,
//     onProcessContent,
//   }: Omit<ChipCreationOptions, "content">) => {
//     if (!editorRef.current) return;

//     const selection = window.getSelection();
//     if (!selection || !selection.rangeCount) return;

//     // Ensure selection is within our editor
//     let node = selection.anchorNode;
//     while (node && node !== editorRef.current) {
//       node = node.parentNode;
//     }
//     if (!node) return; // Selection was outside editor

//     const range = selection.getRangeAt(0);
//     const selectedText = range.toString().trim();
//     if (!selectedText) return;

//     if (
//       range.startContainer !== range.endContainer ||
//       range.startContainer.nodeType !== Node.TEXT_NODE
//     ) {
//       console.log(
//         "Currently only supporting selections within a single text node"
//       );
//       return;
//     }

//     Promise.resolve().then(() => {
//       const startNode = range.startContainer;
//       const fullText = startNode.textContent || "";
//       const beforeText = fullText.substring(0, range.startOffset);
//       const afterText = fullText.substring(range.endOffset);

//       const beforeNode = document.createTextNode(
//         beforeText.length > 0 ? beforeText.trimEnd() + " " : ""
//       );

//       const chipContainer = createChipElement({ content: selectedText });
//       const afterNode = document.createTextNode(
//         afterText.length > 0 ? " " + afterText.trimStart() : ""
//       );

//       startNode.parentNode?.replaceChild(beforeNode, startNode);
//       beforeNode.parentNode?.insertBefore(chipContainer, beforeNode.nextSibling);
//       chipContainer.parentNode?.insertBefore(
//         afterNode,
//         chipContainer.nextSibling
//       );

//       renderChipInContainer(chipContainer, selectedText, onProcessContent);

//       setTimeout(() => onProcessContent(), 0);
//     });
//   };

