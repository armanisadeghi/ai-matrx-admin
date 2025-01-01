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
import type { ContentBlock, DocumentState, TextStyle } from "./types";
import {
  captureEditorContent,
  generateId,
  setEditorContent,
} from "./utils/editorUtils";
import { handleEditorPaste } from "./utils/pasteUtils";
import {
  BrokerChipCreationOptions,
  insertBrokerChipAtSelection,
  renderBrokerChipInContainer,
} from "./broker/BrokerChipRender";
import {
  useBrokers,
  BrokersProvider,
  type Broker,
} from "@/providers/brokers/BrokersProvider";
import {
  createLineBreakNode,
  createBrokerNode,
  createTextNode,
  insertNodesWithRollback,
  type InsertNodesOptions,
} from "./utils/core-dom-utils";
import { analyzeSelection } from "./utils/selection";
import SmartBrokerButton from "./broker/SmartBrokerButton";

export interface MatrxEditorRef {
  insertBroker: (broker: Broker) => void;
  convertToBroker: (broker: Broker) => void;
  updateContent: (state: DocumentState) => void;
  formatSelection: (style: Partial<TextStyle>) => void; // New method
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
    const [selectedText, setSelectedText] = useState<string | null>(null);

    const { updateBroker } = useBrokers();

    const [documentState, setDocumentState] = useState<DocumentState>({
      blocks: [
        // Initialize with an empty line break block
        {
          id: generateId(),
          type: "lineBreak",
          content: "",
          position: 0,
        },
        {
          id: generateId(),
          type: "text",
          content: "",
          position: 1,
        },
      ],
      version: 0,
      lastUpdate: Date.now(),
    });

    // Initialize editor structure when component mounts
    useEffect(() => {
      if (editorRef.current) {
        // Clear any existing content
        editorRef.current.innerHTML = "";

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
          const text = selection.toString() || null;
          setSelectedText(text);
          onSelectionChange?.(selection.toString() || null);
        }
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      return () =>
        document.removeEventListener("selectionchange", handleSelectionChange);
    }, [onSelectionChange]);

    const updateState = useCallback((blocks: ContentBlock[]) => {
      setDocumentState((prev) => ({
        blocks,
        version: prev.version + 1,
        lastUpdate: Date.now(),
      }));
    }, []);

    const convertSelectionToBrokerChip = useCallback(
      async ({
        editorRef,
        broker,
        onProcessContent,
      }: BrokerChipCreationOptions) => {
        if (!editorRef.current) return;

        const selectionResult = analyzeSelection(editorRef);
        if (!selectionResult) return;

        const { type, content, range, insertionInfo } = selectionResult;

        try {
          // Update broker with selected content
          try {
            await updateBroker(broker.id, { value: content });
          } catch (error) {
            console.error("Failed to update broker value:", error);
            return;
          }

          const updatedBroker = { ...broker, value: content };

          // Create broker node using our utility
          const { node: chipContainer } = createBrokerNode(updatedBroker);

          // Handle different selection types
          if (type === "line") {
            const lineDiv = insertionInfo.container as HTMLElement;
            const originalContent = lineDiv.innerHTML;

            try {
              const success = insertNodesWithRollback({
                nodes: [chipContainer],
                target: lineDiv,
                position: "append",
                rollbackNodes: Array.from(lineDiv.childNodes) as HTMLElement[],
              });

              if (!success) throw new Error("Failed to insert chip");

              renderBrokerChipInContainer(
                chipContainer,
                updatedBroker,
                onProcessContent
              );
            } catch (error) {
              lineDiv.innerHTML = originalContent;
              throw error;
            }
          } else if (type === "multi") {
            const { node: beforeNode } = createTextNode(" ");
            const { node: afterNode } = createTextNode(" ");
            const originalNodes = Array.from(range.cloneContents().childNodes);

            try {
              range.deleteContents();

              const nodes = [beforeNode, chipContainer, afterNode];
              const insertOptions: InsertNodesOptions = {
                nodes,
                target: insertionInfo.isTextNode
                  ? (insertionInfo.container.parentElement as HTMLElement)
                  : (insertionInfo.container as HTMLElement),
                position: insertionInfo.isTextNode ? "replaceWith" : "append",
              };

              const success = insertNodesWithRollback(insertOptions);
              if (!success) throw new Error("Failed to insert nodes");

              renderBrokerChipInContainer(
                chipContainer,
                updatedBroker,
                onProcessContent
              );
            } catch (error) {
              try {
                range.deleteContents();
                originalNodes.forEach((node) =>
                  range.insertNode(node.cloneNode(true))
                );
              } catch (rollbackError) {
                console.error("Failed to rollback DOM changes:", rollbackError);
              }
              throw error;
            }
          } else {
            // Single node case
            const { node: beforeNode } = createTextNode(
              insertionInfo.beforeText || ""
            );
            const { node: afterNode } = createTextNode(
              insertionInfo.afterText || ""
            );
            const container = insertionInfo.container as HTMLElement;
            const originalNode = container.cloneNode(true);

            try {
              const nodes = [beforeNode, chipContainer, afterNode];
              const success = insertNodesWithRollback({
                nodes,
                target: container,
                position: "replaceWith",
                rollbackNodes: [originalNode as HTMLElement],
              });

              if (!success) throw new Error("Failed to insert nodes");

              renderBrokerChipInContainer(
                chipContainer,
                updatedBroker,
                onProcessContent
              );
            } catch (error) {
              try {
                beforeNode.parentElement?.replaceChild(
                  originalNode,
                  beforeNode
                );
                chipContainer.remove();
                afterNode.remove();
              } catch (rollbackError) {
                console.error("Failed to rollback DOM changes:", rollbackError);
              }
              throw error;
            }
          }

          setTimeout(() => onProcessContent(), 0);
        } catch (error) {
          console.error("Error converting selection to broker chip:", error);
          try {
            updateBroker(broker.id, { value: broker.value });
          } catch (revertError) {
            console.error("Failed to revert broker update:", revertError);
          }
        }
      },
      [updateBroker]
    );

    const handleBlur = useCallback(() => {
      if (!editorRef.current) return;
      const blocks = captureEditorContent(editorRef);
      updateState(blocks);
    }, [updateState]);

    const handleContentUpdate = useCallback(
      (newState: DocumentState) => {
        if (!editorRef.current) return;
        setEditorContent(editorRef, newState, (updatedState) => {
          setDocumentState(updatedState);
          onStateChange?.(updatedState);
        });
      },
      [onStateChange]
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        handleEditorPaste(e, editorRef, handleBlur);
      },
      [handleBlur]
    );

    const formatSelection = useCallback(
      (style: Partial<TextStyle>) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedContent = range.toString();

        if (!selectedContent) return;

        // Create new styled span
        const { node: styledNode } = createTextNode(
          selectedContent,
          undefined,
          style
        );

        // Replace selection with styled content
        range.deleteContents();
        range.insertNode(styledNode);

        // Update state
        handleBlur();
      },
      [handleBlur]
    );

    // Add these handlers near your other handlers
    const handleBrokerCreate = useCallback(
      (broker: Broker) => {
        insertBrokerChipAtSelection({
          broker,
          editorRef,
          onProcessContent: handleBlur,
        });
      },
      [handleBlur]
    );

    const handleBrokerConvert = useCallback(
      (broker: Broker) => {
        convertSelectionToBrokerChip({
          broker,
          editorRef,
          onProcessContent: handleBlur,
        });
      },
      [handleBlur, convertSelectionToBrokerChip]
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
          console.log("🔄 Inserting broker chip at selection");
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
        formatSelection, // Add this line
      }),
      [handleBlur, handleContentUpdate, formatSelection] // Add formatSelection to dependencies
    );

    if (!isClient) {
      return null;
    }

    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 min-h-0 w-full flex flex-col relative">
          <div
            className="absolute top-0 right-1 z-10"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur
          >
            <SmartBrokerButton
              getSelectedText={() => selectedText}
              onBrokerCreate={handleBrokerCreate}
              onBrokerConvert={handleBrokerConvert}
            />
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="flex-1 overflow-auto p-1 border rounded-lg focus:outline-none 
                      focus:ring-2 focus:ring-blue-500 text-sm dark:focus:ring-blue-400 
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                      border-gray-200 dark:border-gray-700 whitespace-pre-wrap 
                      break-words w-full"
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
            onPaste={handlePaste}
            onBlur={handleBlur}
            data-editor-id={editorId}
          >
            <div data-type="lineBreak" data-id={generateId()}>
              <br />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MatrxEditor.displayName = "MatrxEditor";
