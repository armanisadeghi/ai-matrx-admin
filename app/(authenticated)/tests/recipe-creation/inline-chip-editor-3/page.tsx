'use client';

import React, { useMemo, useState } from "react";
import { Button } from '@/components/ui/button';
import { ChipList } from './chip-list';

import { initialContent, getUniqueChips } from './constants';
import TextWithBrokers from "./TextWithBrokers";
import { useEditorNew } from "./useEditor";
import { normalizeText } from "./utils";



const ChipEditor = () => {
  const [debugHeight, setDebugHeight] = useState(200); // Default height
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
    <div className="space-y-4 pt-4 min-h-screen flex flex-col">
      <div className="flex-grow">
        <TextWithBrokers
          content={content}
          onRemoveChip={removeChip}
          onUpdateText={updateTextContent}
        />
        
        <div className="flex mt-4">
          <Button onClick={handleConvertToChipNew}>
            Convert Selection to Chip
          </Button>
        </div>

        <ChipList 
          chips={uniqueChips} 
          onRemoveChip={removeChip} 
        />
      </div>

      {/* Resizable Debug Panel */}
      <div 
        className="w-full border-t-2 border-gray-200 bg-gray-50 relative"
        style={{ height: `${debugHeight}px` }}
      >
        {/* Resize Handle */}
        <div
          className="absolute top-0 left-0 right-0 h-2 bg-gray-300 cursor-row-resize hover:bg-gray-400"
          onMouseDown={e => {
            const startY = e.clientY;
            const startHeight = debugHeight;
            
            const onMouseMove = (e) => {
              const delta = startY - e.clientY;
              setDebugHeight(Math.max(100, startHeight + delta));
            };
            
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        />

        {/* Content Viewer */}
        <div className="p-4 h-full overflow-auto font-mono">
          <div className="text-sm text-gray-500 mb-2">Content State:</div>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ChipEditor;
