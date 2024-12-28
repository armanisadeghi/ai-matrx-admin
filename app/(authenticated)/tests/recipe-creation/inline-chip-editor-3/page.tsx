'use client';

import React, { useMemo } from "react";
import { Button } from '@/components/ui/button';
import { ChipList } from './chip-list';

import { initialContent, getUniqueChips } from './constants';
import TextWithBrokers from "./TextWithBrokers";
import { useEditorNew } from "./useEditor";
import { normalizeText } from "./utils";



const ChipEditor = () => {
  const {
    content,
    updateTextContent,
    convertSelectionToChip,
    removeChip,
  } = useEditorNew(initialContent);

  const uniqueChips = useMemo(() => getUniqueChips(content), [content]);

  const handleConvertToChip = () => {
    // Sync latest text from DOM into state
    const editorContainer = document.querySelector('[data-content-type="matrx-content"]');
    if (!editorContainer) return;
    console.log("- editorContainer starting with content:", content);
    console.log("editorContainer:", editorContainer);

    const textNodes = Array.from(editorContainer.querySelectorAll('[data-content-type="text"]'));
    textNodes.forEach((node, index) => {
      console.log('-> handleConvertToChip index, node:', index, node);
      const textContent = node.textContent || "";
      console.log('-> handleConvertToChip textContent:', textContent);
      updateTextContent(index, textContent); // Update the state with the latest text
    });

    // Perform chip conversion
    // convertSelectionToChip();
  };

  const handleConvertToChipNew = () => {
    // Sync latest text from DOM into state
    const editorContainer = document.querySelector('[data-content-type="matrx-content"]');
    if (!editorContainer) return;
    console.log("- editorContainer starting with content:", content);
    console.log("editorContainer:", editorContainer);

    const textNodes = Array.from(editorContainer.querySelectorAll('[data-content-type="text"]'));
    textNodes.forEach((node, index) => {
      console.log('-> handleConvertToChip index, node:', index, node);
      const rawText = node.textContent || "";
      const normalizedText = normalizeText(rawText); // Normalize raw text

      console.log('----> handleConvertToChip normalizedText:', normalizedText);
      updateTextContent(index, normalizedText); // Update the state with the latest text
    });

    // Perform chip conversion
    convertSelectionToChip();
  };


  return (
    <div className="space-y-4 pt-4">
      <TextWithBrokers
        content={content}
        onRemoveChip={removeChip}
        onUpdateText={updateTextContent}
      />
      
      <div className="flex">
        <Button onClick={handleConvertToChipNew}>
          Convert Selection to Chip
        </Button>
      </div>

      <ChipList 
        chips={uniqueChips} 
        onRemoveChip={removeChip} 
      />
    </div>
  );
};

export default ChipEditor;
