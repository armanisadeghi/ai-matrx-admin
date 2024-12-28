'use client';

import { useState, useRef, useCallback } from "react";
import { ContentItem } from "../types";

export const useInlineChipEditor = (initialContent?: ContentItem[]) => {
  const [content, setContent] = useState<ContentItem[]>(
    initialContent || [
      { type: "text", content: "Try typing some text and selecting words to\n" },
      { type: "chip", content: "convert into chips", id: "1" },
      { type: "text", content: "\nlike this one!" },
    ]
  );
  const nextChipId = useRef(2);

  const convertSelectionToChip = useCallback(() => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    let startNode = range.startContainer as Node;
    let endNode = range.endContainer as Node;

    if (startNode.nodeType === Node.TEXT_NODE) {
      startNode = startNode.parentNode as Node;
    }
    if (endNode.nodeType === Node.TEXT_NODE) {
      endNode = endNode.parentNode as Node;
    }

    let startNodeIndex = -1;
    let endNodeIndex = -1;

    content.forEach((item, index) => {
      if (item.type === "text") {
        if (startNode && startNode.textContent?.includes(item.content)) {
          startNodeIndex = index;
        }
        if (endNode && endNode.textContent?.includes(item.content)) {
          endNodeIndex = index;
        }
      }
    });

    if (startNodeIndex === -1) return;

    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    const beforeText = content[startNodeIndex].content.slice(0, startOffset);
    const afterText = content[startNodeIndex].content.slice(endOffset);
    const chipId = String(nextChipId.current++);

    const newItems: ContentItem[] = [
      ...content.slice(0, startNodeIndex),
      { type: "text" as const, content: beforeText },
      { type: "chip" as const, content: selectedText, id: chipId },
      { type: "text" as const, content: afterText },
      ...content.slice(startNodeIndex + 1),
    ].filter((item): item is ContentItem => item.content !== "");

    setContent(newItems);
    selection.removeAllRanges();
  }, [content]);

  const removeChip = useCallback((chipId: string) => {
    const newItems = content.map((item): ContentItem => {
      if (item.type === "chip" && item.id === chipId) {
        return { type: "text", content: item.content };
      }
      return item;
    });

    const mergedContent = newItems.reduce<ContentItem[]>((acc, curr) => {
      if (
        curr.type === "text" &&
        acc.length > 0 &&
        acc[acc.length - 1].type === "text"
      ) {
        acc[acc.length - 1].content += curr.content;
        return acc;
      }
      return [...acc, curr];
    }, []);

    setContent(mergedContent);
  }, [content]);

  const updateTextContent = useCallback((index: number, newContent: string) => {
    setContent((prev) => {
      const updated = [...prev];
      updated[index].content = newContent;
      return updated;
    });
  }, []);

  const getUniqueChips = useCallback(() => {
    return content
      .filter((item): item is ContentItem & { type: "chip" } => item.type === "chip")
      .reduce<ContentItem[]>((acc, curr) => {
        if (!acc.find((chip) => chip.id === curr.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);
  }, [content]);

  return {
    content,
    convertSelectionToChip,
    removeChip,
    updateTextContent,
    getUniqueChips,
  };
};