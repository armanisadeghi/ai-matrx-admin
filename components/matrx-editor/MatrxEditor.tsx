// MatrxEditor.tsx
"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { ContentBlock, DocumentState } from "./types";

import { captureEditorContent, setEditorContent } from "./utils/editorUtils";
import { handleEditorPaste } from "./utils/pasteUtils";
import { insertBrokerChipAtSelection } from "./broker/BrokerChipRender";
import { convertSelectionToBrokerChip } from "./broker/convertSelectionToBrokerChip";
import { createLineBreakNode } from "./utils/core-dom-utils";
import { generateId } from "./utils/commonUtils";
import { useBrokers, BrokersProvider, type Broker } from '@/providers/brokers/BrokersProvider';

export interface MatrxEditorRef {
  insertBroker: (broker: Broker) => void;
  convertToBroker: (broker: Broker) => void;
  updateContent: (state: DocumentState) => void;
}

interface MatrxEditorProps {
  onStateChange?: (state: DocumentState) => void;
  editorId: string;
  onSelectionChange?: (selection: string | null) => void;
}

export const MatrxEditor = forwardRef<MatrxEditorRef, MatrxEditorProps>(
  ({ onStateChange, editorId, onSelectionChange }, ref) => {
    const [isClient, setIsClient] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const [documentState, setDocumentState] = useState<DocumentState>({
      blocks: [
        // Initialize with an empty line break block
        {
          id: generateId(),
          type: "lineBreak",
          content: "",
          position: 0
        },
        {
          id: generateId(),
          type: "text",
          content: "",
          position: 1
        }
      ],
      version: 0,
      lastUpdate: Date.now(),
    });

    // Initialize editor structure when component mounts
    useEffect(() => {
      if (editorRef.current) {
        // Clear any existing content
        editorRef.current.innerHTML = '';
        
        // Create initial line break div if none exists
        const initialLineDiv = createLineBreakNode().node as HTMLElement;
        const br = document.createElement("br");
        initialLineDiv.appendChild(br);
        editorRef.current.appendChild(initialLineDiv);
      }
    }, [isClient]); // Run once when client-side rendering is ready

    useEffect(() => {
      setIsClient(true);
    }, []);

    useEffect(() => {
      onStateChange?.(documentState);
    }, [documentState, onStateChange]);

    useEffect(() => {
      const handleSelectionChange = () => {
        if (!editorRef.current) return;
        const selection = window.getSelection();
        if (!selection) return;

        if (editorRef.current.contains(selection.anchorNode)) {
          onSelectionChange?.(selection.toString() || null);
        }
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      return () =>
        document.removeEventListener("selectionchange", handleSelectionChange);
    }, [onSelectionChange]);

    const updateState = useCallback((blocks: ContentBlock[]) => {
      setDocumentState(prev => ({
        blocks,
        version: prev.version + 1,
        lastUpdate: Date.now(),
      }));
    }, []);

    const handleBlur = useCallback(() => {
      if (!editorRef.current) return;
      const blocks = captureEditorContent(editorRef);
      updateState(blocks);
    }, [updateState]);

    const handleContentUpdate = useCallback((newState: DocumentState) => {
      if (!editorRef.current) return;
      setEditorContent(editorRef, newState, (updatedState) => {
        setDocumentState(updatedState);
        onStateChange?.(updatedState);
      });
    }, [onStateChange]);

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        handleEditorPaste(e, editorRef, handleBlur);
      },
      [handleBlur]
    );

    useImperativeHandle(
      ref,
      () => ({
        insertBroker: (broker: Broker) => {
          if (!editorRef.current) return;
          insertBrokerChipAtSelection({
            broker,
            editorRef,
            onProcessContent: handleBlur,
          });
        },
        convertToBroker: (broker: Broker) => {
          if (!editorRef.current) return;
          convertSelectionToBrokerChip({
            broker,
            editorRef,
            onProcessContent: handleBlur,
          });
        },
        updateContent: handleContentUpdate,
      }),
      [handleBlur, handleContentUpdate]
    );

    if (!isClient) {
      return null;
    }

    return (
      <div className="w-full h-full flex flex-col overflow-auto min-h-0">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="h-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                    dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                    border-gray-200 dark:border-gray-700 whitespace-pre-wrap"
          onPaste={handlePaste}
          onBlur={handleBlur}
          data-editor-id={editorId}
        >
          <div data-type="lineBreak" data-id={generateId()}><br /></div>
        </div>
      </div>
    );
  }
);

MatrxEditor.displayName = "MatrxEditor";