'use client';

import React, { useCallback } from "react";
import { Editor, ContentItem } from "./editor";
import { cn } from "@/lib/utils";
import { useEditor } from "./useEditor";
import { X } from "lucide-react";

// Initial content stays the same
const initialContent: ContentItem[] = [
  { type: "text", content: "Try typing some text and selecting words to " },
  { type: "chip", content: "convert into chips", id: "1" },
  { type: "text", content: " like this one!" },
];

// Updated styles with more specific classes
const styles = {
  button: cn(
    "px-4 py-2 rounded",
    "bg-blue-500",
    "hover:bg-blue-600",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    "transition-colors"
  ),
  chip: cn(
    "inline-flex items-center gap-1 px-2 py-1 rounded-full",
    "!bg-green-100 dark:!bg-green-900",
    "!text-green-800 dark:!text-green-100",
    "text-sm"
  ),
  chipRemoveButton: cn(
    "hover:bg-red-500 dark:hover:bg-red-800 rounded-full p-0.5 transition-colors"
  ),
  referencedChipsContainer: cn(
    "p-4 border rounded-lg",
    "bg-gray-100 dark:bg-gray-800",
    "transition-colors"
  ),
};

// Helper functions stay the same
const calculateUniqueChips = (content: ContentItem[]): ContentItem[] => {
  return content
    .filter(
      (item): item is ContentItem & { type: "chip"; id: string } =>
        item.type === "chip" && !!item.id
    )
    .reduce((acc: ContentItem[], curr) => {
      if (!acc.find((chip) => chip.id === curr.id)) {
        acc.push(curr);
      }
      return acc;
    }, []);
};

const handleConvertSelectionHelper = (
  content: ContentItem[],
  insertChip: (text: string, start: number, end: number) => void
) => {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  let startNode = range.startContainer as Node;
  if (startNode.nodeType === Node.TEXT_NODE) {
    startNode = startNode.parentNode as Node;
  }

  const textIndex = content.findIndex(
    (item) =>
      item.type === "text" && startNode.textContent?.includes(item.content)
  );

  if (textIndex === -1) return;

  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  insertChip(content[textIndex].content, startOffset, endOffset);
  selection.removeAllRanges();
};

const ChipEditor = () => {
  const { content, updateTextContent, removeChip, insertChip } =
    useEditor(initialContent);

  const handleConvertSelection = useCallback(() => {
    handleConvertSelectionHelper(content, insertChip);
  }, [content, insertChip]);

  const uniqueChips = calculateUniqueChips(content);

  // Custom chip renderer to ensure our styles take precedence
  const customChipRender = (
    item: ContentItem,
    index: number,
    onRemove: () => void
  ) => (
    <span key={`${item.id}-${index}`} className={styles.chip}>
      {item.content}
      <button onClick={onRemove} className={styles.chipRemoveButton}>
        <X size={14} />
      </button>
    </span>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Editor
        content={content}
        onRemoveChip={removeChip}
        onUpdateText={updateTextContent}
        className="mb-4"
        renderChip={customChipRender}  // Use custom renderer instead of chipClassName
      />

      <div className="mt-4 space-y-4">
        <div className="flex gap-4">
          <button onClick={handleConvertSelection} className={styles.button}>
            Convert Selection to Chip
          </button>
        </div>

        {uniqueChips.length > 0 && (
          <div className={styles.referencedChipsContainer}>
            <h3 className="text-sm font-medium text-foreground mb-2">
              Referenced Chips:
            </h3>
            <div className="flex flex-wrap gap-2">
              {uniqueChips.map((chip) => (
                <span key={chip.id} className={styles.chip}>
                  {chip.content}
                  <button
                    onClick={() => removeChip(chip.id!)}
                    className={styles.chipRemoveButton}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChipEditor;