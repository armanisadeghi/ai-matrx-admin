// Chip.tsx
"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createRoot } from "react-dom/client";
import { generateId } from "../utils/commonUtils";
import { useVariablesStore } from '@/app/contexts/old/useVariablesStore';

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

export const SimpleChip = ({ content, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full",
        "bg-primary/10 text-primary text-sm",
        className
      )}
    >
      {content}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
          aria-label="Remove chip"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
};

export const GlowBorderChip = ({ content, onRemove, className }: ChipProps) => {
  return (
    <span className={cn("p-[3px] relative inline-flex items-center")}>
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg" />
      <div className="px-8 py-2 bg-black rounded-[6px] relative group transition duration-200 text-white hover:bg-transparent flex items-center gap-1">
        {content}
        {onRemove && (
          <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            aria-label="Remove chip"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </span>
  );
};

export const ShimmerChip = ({ content, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
      )}
    >
      {content}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
          aria-label="Remove chip"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
};

export const TailwindConnectChip = ({
  content,
  onRemove,
  className,
}: ChipProps) => {
  return (
    <span
      className={cn(
        "bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-xs font-semibold leading-6 text-white inline-block"
      )}
    >
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </span>
      <div className="relative flex items-center z-10 rounded-full bg-zinc-950 py-0.5 px-4 ring-1 ring-white/10">
        <span>{content}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
            aria-label="Remove chip"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
    </span>
  );
};

export const BorderMagicChip = ({
  content,
  onRemove,
  className,
}: ChipProps) => {
  return (
    <span
      className={cn(
        "relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50",
        className
      )}
    >
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
      <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
        {content}
        {onRemove && (
          <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
            aria-label="Remove chip"
          >
            <X size={14} />
          </button>
        )}
      </span>
    </span>
  );
};

export const PlaylistChip = ({ content, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "shadow-[inset_0_0_0_2px_#616467] text-black px-12 py-4 rounded-full tracking-widest uppercase font-bold bg-transparent hover:bg-[#616467] hover:text-white dark:text-neutral-200 transition duration-200 inline-flex items-center",
        className
      )}
    >
      {content}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
          aria-label="Remove chip"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
};

export const GreenPopChip = ({ content, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "px-12 py-4 rounded-full bg-[#1ED760] font-bold text-white tracking-widest uppercase transform hover:scale-105 hover:bg-[#21e065] transition-colors duration-200 inline-flex items-center",
        className
      )}
    >
      {content}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
          aria-label="Remove chip"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
};

export const TopGradientChip = ({
  content,
  onRemove,
  className,
}: ChipProps) => {
  return (
    <div
      className={cn(
        "inline-block px-8 py-2 rounded-full relative bg-slate-700 text-white text-sm hover:shadow-2xl hover:shadow-white/[0.1] transition duration-200 border border-slate-600 items-center",
        className
      )}
      contentEditable={false} // Entire chip is non-editable
      data-content-type="matrx-content" // Add the data attribute here
      style={{ userSelect: "none" }} // Disable text selection
    >
      <div className="absolute inset-x-0 h-px w-1/2 mx-auto -top-px shadow-2xl bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
      <span className="relative z-20" data-content-type="text">
        {content}
        {onRemove && (
          <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
            aria-label="Remove chip"
          >
            <X size={14} />
          </button>
        )}
      </span>
    </div>
  );
};

export const CHIP_VARIANTS = {
  chip: Chip,
  simpleChip: SimpleChip,
  glowBorderChip: GlowBorderChip,
  shimmerChip: ShimmerChip,
  tailwindConnectChip: TailwindConnectChip,
  borderMagicChip: BorderMagicChip,
  playlistChip: PlaylistChip,
  greenPopChip: GreenPopChip,
  topGradientChip: TopGradientChip,
};

export const getRandomChip = () => {
  const keys = Object.keys(CHIP_VARIANTS);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return CHIP_VARIANTS[randomKey];
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
  variant = "chip",
  onRemove,
  chipId,
}: {
  content: string;
  variant?: keyof typeof CHIP_VARIANTS;
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

interface SelectionInfo {
  startNode: Node;
  endNode: Node;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  isMultiNode: boolean;
  isLineSelection: boolean;
}

const getSelectionInfo = (
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

const handleLineSelection = async (
  lineDiv: HTMLElement,
  onProcessContent: () => void,
  linkBrokerToChip: (
    text: string,
    suggestedId?: string
  ) => Promise<ChipLinkResult>
) => {
  const textContent = Array.from(lineDiv.childNodes)
    .map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      if (node instanceof HTMLElement && node.hasAttribute("data-chip")) {
        return node.getAttribute("data-chip-content");
      }
      return "";
    })
    .join(" ")
    .trim();

  const suggestedId = generateId();
  const linkResult = await linkBrokerToChip(textContent, suggestedId);

  const chipContainer = createChipElement({
    content: linkResult.displayName,
    chipId: linkResult.id,
  });

  lineDiv.innerHTML = "";
  lineDiv.appendChild(chipContainer);

  renderChipInContainer(
    chipContainer,
    linkResult.displayName,
    onProcessContent,
    linkResult.id
  );
  return true;
};

const handleMultiNodeSelection = async (
  range: Range,
  selectedText: string,
  onProcessContent: () => void,
  linkBrokerToChip: (
    text: string,
    suggestedId?: string
  ) => Promise<ChipLinkResult>
) => {
  const suggestedId = generateId();
  const linkResult = await linkBrokerToChip(selectedText, suggestedId);

  const startNode = range.startContainer;
  const endNode = range.endContainer;

  // Create nodes for the chip and surrounding content
  const beforeText =
    startNode.textContent?.substring(0, range.startOffset) || "";
  const afterText = endNode.textContent?.substring(range.endOffset) || "";

  const beforeNode = document.createTextNode(
    beforeText.length > 0 ? beforeText.trimEnd() + " " : ""
  );

  const chipContainer = createChipElement({ content: selectedText });

  const afterNode = document.createTextNode(
    afterText.length > 0 ? " " + afterText.trimStart() : ""
  );

  // Extract the common parent div
  let commonAncestor = range.commonAncestorContainer;
  if (commonAncestor.nodeType === Node.TEXT_NODE) {
    commonAncestor = commonAncestor.parentNode;
  }

  // Delete the original content
  range.deleteContents();

  // Insert our new nodes
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
    firstInsertionPoint.parentNode.insertBefore(afterNode, firstInsertionPoint);
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
};

// types.ts
interface ChipLinkResult {
  displayName: string;
  id: string;
}

// chipUtils.ts
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
