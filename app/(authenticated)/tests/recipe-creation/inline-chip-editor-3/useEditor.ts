"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ContentItem } from "./types";
import { getNextId, getSelectionRange, normalizeText } from "./utils";





export const findTextIndex = (content, startNode) => {
  // Traverse up the DOM tree to locate the parent element that corresponds to the content array
  while (startNode && !startNode.dataset?.index) {
    startNode = startNode.parentNode;
  }
  // Use a `data-index` attribute to map DOM nodes back to the content array
  const textIndex = startNode ? parseInt(startNode.dataset.index, 10) : -1;

  console.log("-> findTextIndex textIndex:", textIndex);
  return textIndex;
};



export const splitAndUpdateContent = (
  content,
  textIndex,
  selectionText,
) => {
  console.log("splitAndUpdateContent content:", content);
  console.log("splitAndUpdateContent textIndex:", textIndex);
  console.log("splitAndUpdateContent selectionText:", selectionText);

  const startOffset = selectionText.startOffset;
  const endOffset = selectionText.endOffset;
  const nextAvailableid = getNextId(content);

  const beforeText = content[textIndex].content.slice(0, startOffset);
  const chipText = content[textIndex].content.slice(startOffset, endOffset);
  const afterText = content[textIndex].content.slice(endOffset);

  const updatedContent = [
    ...content.slice(0, textIndex),
    { type: "text", content: beforeText, id: nextAvailableid },
    { type: "chip", content: chipText, id: nextAvailableid + 1 },
    { type: "text", content: afterText, id: nextAvailableid + 2 },
  ].filter((item) => item.content !== "");

  console.log("-> splitAndUpdateContent updatedContent:", updatedContent);
  return updatedContent;
};



export const useEditorNew = (initialContent?: ContentItem[]) => {
  const [content, setContent] = useState<ContentItem[]>(
    initialContent || [{ type: "text", content: "" }]
  );
  const nextAvailableId = useRef(1);

  useEffect(() => {
    if (initialContent) {
      nextAvailableId.current = getNextId(initialContent);
    }
  }, [initialContent]);

  const updateTextContent = (index, newContent) => {
    if (index === undefined || index < 0) {
      console.error("Invalid index in updateTextContent:", index);
      return;
    }
  
    console.log("-- updateTextContent index, newContent:", index, newContent);
  
    setContent((prev) => {
      console.log("Incoming newContent:", newContent);
      console.log("Previous content:", prev);
  
      const updated = [...prev];
  
      // If the index doesn't exist, create a new text entry
      if (!updated[index]) {
        console.log("Creating new element at index:", index);
        updated[index] = {
          type: 'text',
          content: '',
          id: String(index + 1) // or however you're generating IDs
        };
      }
  
      // Let's see what the text looks like before and after normalization
      console.log("Before normalization:", newContent);
      const normalizedText = normalizeText(newContent);
      console.log("After normalization:", normalizedText);
  
      try {
        updated[index].content = normalizedText;
        console.log("Successfully updated content:", updated[index]);
      } catch (err) {
        console.error("Error updating content:", err);
      }
  
      return updated;
    });
  };


  const convertSelectionToChip = useCallback(() => {
    const selectionText = getSelectionRange();
    if (!selectionText) return;

    const selectedText = selectionText.toString().trim();
    if (!selectedText) return;

    let startNode = selectionText.startContainer;
    const textIndex = findTextIndex(content, startNode);
    if (textIndex === -1) return;


    setContent((prev) => {
      const updatedContent = splitAndUpdateContent(
        prev,
        textIndex,
        selectionText,
      );
      console.log("-> convertSelectionToChip updatedContent:", updatedContent);
      return updatedContent;
    });

    const selection = window.getSelection();
    selection.removeAllRanges();
  }, [content]);



  const removeChip = useCallback((chipId: string) => {
    setContent((prev) =>
      prev.reduce((acc: ContentItem[], curr) => {
        if (curr.type === "chip" && curr.id === chipId) {
          const lastItem = acc[acc.length - 1];
          if (lastItem?.type === "text") {
            lastItem.content += curr.content;
            return acc;
          }
          return [...acc, { type: "text", content: curr.content }];
        }

        if (
          curr.type === "text" &&
          acc.length > 0 &&
          acc[acc.length - 1].type === "text"
        ) {
          acc[acc.length - 1].content += curr.content;
          return acc;
        }

        return [...acc, curr];
      }, [])
    );
  }, []);

  return {
    content,
    updateTextContent,
    convertSelectionToChip,
    removeChip,
  };
};
