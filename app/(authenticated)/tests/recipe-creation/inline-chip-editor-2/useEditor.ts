'use client';

import React, { useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
export interface ContentItem {
  type: "text" | "chip";
  content: string;
  id?: string;
}


export const useEditor = (initialContent?: ContentItem[]) => {
    const [content, setContent] = useState<ContentItem[]>(initialContent || [
      { type: "text", content: "" }
    ]);
    const nextChipId = useRef(1);
  
    const updateTextContent = useCallback((index: number, newContent: string) => {
      setContent(prev => {
        const updated = [...prev];
        updated[index].content = newContent;
        return updated;
      });
    }, []);
  
    const insertChip = useCallback((text: string, beforeIndex: number, afterIndex: number) => {
      const chipId = String(nextChipId.current++);
      setContent(prev => {
        const updated = [...prev];
        const beforeContent: ContentItem = { type: "text", content: text.slice(0, beforeIndex) };
        const chipContent: ContentItem = { type: "chip", content: text.slice(beforeIndex, afterIndex), id: chipId };
        const afterContent: ContentItem = { type: "text", content: text.slice(afterIndex) };
        
        updated.splice(updated.indexOf(prev[0]), 1, beforeContent, chipContent, afterContent);
        return updated.filter(item => item.content !== "") as ContentItem[];
      });
      return chipId;
    }, []);
  
    const removeChip = useCallback((chipId: string) => {
      setContent(prev => {
        const newContent = prev.map(item => {
          if (item.type === "chip" && item.id === chipId) {
            return { type: "text", content: item.content } as ContentItem;
          }
          return item;
        });
  
        return newContent.reduce((acc: ContentItem[], curr) => {
          if (curr.type === "text" && acc.length > 0 && acc[acc.length - 1].type === "text") {
            acc[acc.length - 1].content += curr.content;
            return acc;
          }
          return [...acc, curr];
        }, []);
      });
    }, []);
  
    return {
      content,
      setContent,
      updateTextContent,
      insertChip,
      removeChip,
    };
  };
  