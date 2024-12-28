"use client";

import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { calculateCursorOffset, normalizeText, setCursor } from "./utils";
import { ContentItem } from "./types";
import { GlowBorderChip, TailwindConnectChip, TopGradientChip } from "./ChipVariants";

interface EditorProps {
  content: ContentItem[];
  onRemoveChip?: (id: string) => void;
  onUpdateText: (index: number, content: string) => void;
  className?: string;
}

export const TextWithBrokers = ({
  content,
  onRemoveChip,
  onUpdateText,
  className,
}: EditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === editorRef.current) {
        const textNodes = Array.from(
          editorRef.current.querySelectorAll("matrx-content")
        ).map((node) => node as HTMLElement);

        for (const node of textNodes) {
          const nodeRect = node.getBoundingClientRect();
          if (e.clientY >= nodeRect.top && e.clientY <= nodeRect.bottom) {
            const offset = calculateCursorOffset(e, node);
            setCursor(node, offset);
            break;
          }
        }
      }
    },
    []
  );

  const handleTextInput = (index: number) => (e: React.FormEvent<HTMLSpanElement>) => {
    const updatedText = e.currentTarget.textContent || ""; // Get the current text
    console.log("handleTextInput index, updatedText:", index, updatedText);
    onUpdateText(index, updatedText); // Update the corresponding content item
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent the browser's default paste behavior
  
    const plainText = e.clipboardData.getData('text/plain'); // Get plain text
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
  
    const range = selection.getRangeAt(0);
    const targetNode = range.startContainer.parentNode as HTMLElement;
  
    const index = parseInt(targetNode.dataset.index || "", 10);
    if (!isNaN(index)) {
      const existingText = targetNode.textContent || "";
      const updatedText = normalizeText(existingText + plainText);
        onUpdateText(index, updatedText);
    }
  };
  
  return (
    <div
      ref={editorRef}
      className={cn(
        "min-h-[200px] p-4 border rounded-lg",
        "bg-background transition-colors duration-200",
        "focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent",
        className
      )}
      contentEditable
      suppressContentEditableWarning={true}
      onPaste={handlePaste}
      onClick={handleContainerClick}
      data-content-type="matrx-content"
    >
      {content.map((item, index) =>
        item.type === "chip" ? (
          <TopGradientChip
            key={`${item.id}-${index}`}
            label={item.content}
            data-chip-id={item.id}
            onRemove={onRemoveChip ? () => onRemoveChip(item.id!) : undefined}
          />
        ) : (
          <span
            key={index}
            data-index={index}
            contentEditable={true}
            suppressContentEditableWarning={true}
            className="outline-none whitespace-pre-wrap text-foreground"
            data-content-type="text"
            onInput={handleTextInput(index)} // Capture input and update text
          >
            {item.content}
          </span>
        )
      )}
    </div>
  );
};

export default TextWithBrokers;
