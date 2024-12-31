"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { DocumentState } from "./types";
import CursorTracker from "./debug/CursorTracker";
import SelectionTracker from "./debug/SelectionTracker";
import { useMatrxEditor } from "./MatrxEditorContext";
import { useBrokersStore, Broker } from "./useBrokersStore";
import {
  setEditorContent,
  captureEditorContent,
  processEditorContent,
} from "./utils/editorUtils";
import { insertBrokerChipAtSelection } from "./brokerChipUtils";
import { convertSelectionToBrokerChip } from "./utils/convertSelectionToBrokerChip";
import { handleEditorPaste } from "./utils/pasteUtils";

export interface MatrxEditorRef {
  insertBroker: (broker: Broker) => void;
  convertToBroker: (broker: Broker) => void;
}

interface MatrxEditorProps {
  onStateChange?: (state: DocumentState) => void;
  editorId: string;
  showDebugControls?: boolean;
  onSelectionChange?: (selection: string | null) => void;
}

export const MatrxEditor = forwardRef<MatrxEditorRef, MatrxEditorProps>(
  (
    { onStateChange, editorId, showDebugControls = false, onSelectionChange },
    ref
  ) => {
    const [isClient, setIsClient] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const [documentState, setDocumentState] = useState<DocumentState>({
      blocks: [],
      version: 0,
      lastUpdate: Date.now(),
    });

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

    const processContent = useCallback(() => {
      if (!editorRef.current) return;
      const blocks = captureEditorContent(editorRef);
      processEditorContent(
        editorRef,
        blocks,
        documentState.version,
        setDocumentState
      );
    }, [documentState.version]);

    
    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        handleEditorPaste(e, editorRef, processContent);
      },
      [processContent]
    );

    useImperativeHandle(
      ref,
      () => ({
        insertBroker: (broker: Broker) => {
          if (!editorRef.current) return;
          insertBrokerChipAtSelection({
            broker,
            editorRef,
            onProcessContent: processContent,
          });
        },
        convertToBroker: (broker: Broker) => {
          if (!editorRef.current) return;
          convertSelectionToBrokerChip({
            broker,
            editorRef,
            onProcessContent: processContent,
          });
        },
      }),
      [processContent]
    );

    if (!isClient) {
      return null;
    }

    return (
      <div className="w-full h-full">
        {showDebugControls && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-4">
              <CursorTracker editorRef={editorRef} />
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
              <SelectionTracker editorRef={editorRef} />
            </div>
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="h-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
          onPaste={handlePaste}
        />
      </div>
    );
  }
);
