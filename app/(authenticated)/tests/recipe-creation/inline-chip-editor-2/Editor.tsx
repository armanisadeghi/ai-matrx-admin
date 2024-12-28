'use client';

import React, { useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Types remain the same
export interface ContentItem {
  type: "text" | "chip";
  content: string;
  id?: string;
}

interface EditorProps {
  content: ContentItem[];
  onRemoveChip?: (id: string) => void;
  onUpdateText: (index: number, content: string) => void;
  className?: string;
  editorRef?: React.RefObject<HTMLDivElement>;
  chipClassName?: string;
  textClassName?: string;
  renderChip?: (
    item: ContentItem,
    index: number,
    onRemove: () => void
  ) => React.ReactNode;
}

// Updated styles to ensure proper precedence
const styles = {
  editorContainer: "min-h-[200px] p-4 border rounded-lg bg-yellow-500 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-colors duration-200",
  chip: "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500 text-orange-500 text-sm mx-1",
  chipRemoveButton: "hover:bg-red-500 rounded-full p-0.5 transition-colors",
  textItem: "outline-none whitespace-pre-wrap text-foreground",
};

// Helper functions remain the same
const createTextNodeIfNeeded = (node: HTMLElement) => {
  if (!node.firstChild) {
    node.appendChild(document.createTextNode(""));
  }
};

const calculateCursorPosition = (
  e: React.MouseEvent<HTMLDivElement>,
  nodes: HTMLElement[]
) => {
  let targetNode: HTMLElement | null = null;
  let targetOffset = 0;

  for (const node of nodes) {
    const nodeRect = node.getBoundingClientRect();
    if (e.clientY >= nodeRect.top && e.clientY <= nodeRect.bottom) {
      targetNode = node;
      const relativeX = e.clientX - nodeRect.left;
      const charWidth = nodeRect.width / (node.textContent?.length || 1);
      targetOffset = Math.min(
        Math.max(Math.round(relativeX / charWidth), 0),
        node.textContent?.length || 0
      );
      break;
    }
  }

  return { targetNode, targetOffset };
};

const setCursorToPosition = (
  node: HTMLElement,
  offset: number
) => {
  const range = document.createRange();
  const selection = window.getSelection();
  createTextNodeIfNeeded(node);
  range.setStart(node.firstChild!, offset);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
  node.focus();
};

// Updated chip renderer to ensure proper class precedence
const defaultChipRender = (
  item: ContentItem,
  index: number,
  onRemove: () => void,
  chipClassName?: string
) => (
  <span
    key={`${item.id}-${index}`}
    className={chipClassName || styles.chip} // Changed to prioritize custom className
  >
    {item.content}
    {onRemove && (
      <button onClick={onRemove} className={styles.chipRemoveButton}>
        <X size={14} />
      </button>
    )}
  </span>
);

// Core Editor Component
export const Editor = React.memo(
  ({
    content,
    onRemoveChip,
    onUpdateText,
    className,
    editorRef: externalRef,
    chipClassName,
    textClassName,
    renderChip,
  }: EditorProps) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = externalRef || internalRef;

    const handleContainerClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === ref.current) {
          const textNodes = Array.from(
            ref.current.querySelectorAll('span[contenteditable="true"]')
          ).map((node) => node as HTMLElement);

          const { targetNode, targetOffset } = calculateCursorPosition(e, textNodes);

          if (targetNode) {
            setCursorToPosition(targetNode, targetOffset);
          }
        }
      },
      [ref]
    );

    return (
      <div
        ref={ref}
        className={cn(styles.editorContainer, className)} // Base styles first, then custom
        onClick={handleContainerClick}
      >
        {content.map((item, index) =>
          item.type === "chip" ? (
            renderChip ? (
              renderChip(item, index, () => onRemoveChip?.(item.id!))
            ) : (
              defaultChipRender(
                item,
                index,
                () => onRemoveChip?.(item.id!),
                chipClassName
              )
            )
          ) : (
            <span
              key={index}
              contentEditable={true}
              suppressContentEditableWarning={true}
              className={cn(styles.textItem, textClassName)}
              onBlur={(e) =>
                onUpdateText(index, e.currentTarget.textContent || "")
              }
            >
              {item.content}
            </span>
          )
        )}
      </div>
    );
  }
);

Editor.displayName = "Editor";