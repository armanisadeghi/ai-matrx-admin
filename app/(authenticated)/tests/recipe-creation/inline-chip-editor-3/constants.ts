'use client';

import { ContentItem } from './types';

export const CHIP_VARIANTS = [
  'default',
  'litup',
  'shimmer',
  'connect',
  'borderMagic',
  'playlist',
  'greenPop',
  'topGradient'
] as const;



export const initialContent: ContentItem[] = [
    { type: "text", content: "Starttext", id: "1" },
    { type: "chip", content: "first chip", id: "2" },
    { type: "text", content: " more text ", id: "3" },
    { type: "chip", content: "second chip", id: "4" },
    { type: "text", content: " final text ", id: "5" },
  ];
  
export const initialContent2: ContentItem[] = [
    { type: "chip", content: "chip1", id: "1" },
    { type: "text", content: " FinalText" }
  ];

  export const initialContent3: ContentItem[] = [
    { type: "text", content: "Try typing some text and selecting words to " },
    { type: "chip", content: "convert into chips", id: "1" },
    { type: "text", content: "like this one!" },
  ];
  

export const getUniqueChips = (content: ContentItem[]) => {
  return content
    .filter((item): item is ContentItem & { type: "chip"; id: string } =>
      item.type === "chip" && !!item.id
    )
    .reduce((acc: ContentItem[], curr) => {
      if (!acc.find(chip => chip.id === curr.id)) {
        acc.push(curr);
      }
      return acc;
    }, []);
};