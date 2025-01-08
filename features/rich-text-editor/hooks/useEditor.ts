// useEditor.ts
import { useCallback, RefObject, useEffect } from 'react';
import { ensureValidContainer, extractTextContent, getSelectedText } from '../utils/editorUtils';
import { debugEditorState } from '../utils/debugUtils';
import { createChipElement, createCompleteChipStructure } from '../utils/chipService';
import { useEditorContext } from '../provider/EditorProvider';
import { useEditorStyles } from './useEditorStyles';
import { useDragAndDrop } from './useDragAndDrop';

const DEBUG_MODE = false;

export const useEditor = (editorRef: RefObject<HTMLDivElement>, editorId: string) => {
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);

    useEffect(() => {
        context.registerEditor(editorId);
        return () => context.unregisterEditor(editorId);
    }, [editorId]);

    const getText = useCallback(() => {
        return editorState.plainTextContent;
    }, [editorState.plainTextContent]);

    const focus = useCallback(() => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
    }, [editorRef]);

    const updatePlainTextContent = useCallback(() => {
        if (!editorRef.current) return;
        const text = extractTextContent(editorRef.current);
        context.setPlainTextContent(editorId, text);
    }, [editorRef, editorId]);

    const normalizeContent = useCallback(() => {
        if (!editorRef.current) return;
        console.log('Normalizing content');
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null);

        let node;
        while ((node = walker.nextNode())) {
            if (node.parentNode === editorRef.current) {
                const span = document.createElement('span');
                node.parentNode.insertBefore(span, node);
                span.appendChild(node);
            }
        }
    }, [editorRef]);

    const { handleNativeDragStart, handleNativeDragEnd, handleDragOver, handleDrop, dragConfig } = useDragAndDrop(editorRef, editorId, {
        normalizeContent,
        updatePlainTextContent,
    });

    const { handleStyleChange } = useEditorStyles(editorRef, editorId, {
        updatePlainTextContent,
    });

    function positionCursorAfterChip(anchorNode: Text, selection: Selection) {
        const finalRange = document.createRange();
        finalRange.setStart(anchorNode, 0);
        finalRange.setEnd(anchorNode, 0);
        selection.removeAllRanges();
        selection.addRange(finalRange);
    }

    // Insertion strategies
    function insertWithStructurePreservation(insertionWrapper: HTMLElement, currentRange: Range, parent: Node | null | undefined, container: Node): boolean {
        try {
            // Store our conditions for clarity
            const isRangeCollapsed = currentRange.collapsed;
            const insertPosition = currentRange.startContainer;
            const isTextNode = insertPosition.nodeType === Node.TEXT_NODE;

            switch (true) {
                case isRangeCollapsed && isTextNode: {
                    const textNode = insertPosition as Text;
                    const afterText = textNode.splitText(currentRange.startOffset);
                    parent?.insertBefore(insertionWrapper, afterText.parentNode?.nextSibling || null);
                    break;
                }

                case isRangeCollapsed: {
                    parent?.insertBefore(insertionWrapper, container.nextSibling);
                    break;
                }

                default: {
                    currentRange.deleteContents();
                    currentRange.insertNode(insertionWrapper);
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    function insertWithRangeMethod(insertionWrapper: HTMLElement, range: Range) {
        range.deleteContents();
        range.insertNode(insertionWrapper);
    }

    // Main component functions
    const insertChip = useCallback(() => {
        const chipData = context.createNewChipData(editorId);
        const editor = editorRef.current;
        const beforeState = debugEditorState(editor);
        const selection = window.getSelection();

        if (!editor || !selection) return;

        const currentRange = ensureValidContainer(editor, selection);

        const { insertionWrapper, anchorNode } = createCompleteChipStructure(chipData, dragConfig, DEBUG_MODE);

        // Handle container setup
        let container = currentRange.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }

        if (container === editor) {
            const span = document.createElement('span');
            span.appendChild(document.createTextNode('\u200B'));

            if (currentRange.startContainer === editor) {
                editor.insertBefore(span, editor.firstChild);
            } else {
                editor.appendChild(span);
            }

            container = span;
            currentRange.selectNode(span);
        }

        const parent = currentRange.endContainer.parentNode;

        // Try structure-preserving insertion first, fall back to range method if needed
        const structurePreserved = insertWithStructurePreservation(insertionWrapper, currentRange, parent, container);

        if (!structurePreserved) {
            insertWithRangeMethod(insertionWrapper, currentRange);
        }

        // Position cursor and handle post-insertion tasks
        positionCursorAfterChip(anchorNode, selection);

        const afterState = debugEditorState(editor);
        if (afterState.diffSummary.nestedSpans > beforeState.diffSummary.nestedSpans) {
            console.warn('Nested spans increased during chip insertion');
        }

        context.incrementChipCounter(editorId);
        context.addChipData(editorId, chipData);
        updatePlainTextContent();
    }, [editorId, editorRef, context, dragConfig, updatePlainTextContent]);

    const convertSelectionToChip = useCallback(() => {
        const { text, range } = getSelectedText();
        const chipData = context.createNewChipData(editorId, { stringValue: text });
        const editor = editorRef.current;

        if (!editor) return;

        const { insertionWrapper, anchorNode } = createCompleteChipStructure(chipData, dragConfig, DEBUG_MODE);

        insertWithRangeMethod(insertionWrapper, range);

        positionCursorAfterChip(anchorNode, window.getSelection()!);

        context.incrementChipCounter(editorId);
        context.addChipData(editorId, chipData);
        updatePlainTextContent();
        return true;
    }, [editorId, editorRef, context, dragConfig, updatePlainTextContent]);

    return {
        // State from editorState
        chipCounter: editorState.chipCounter,
        draggedChip: editorState.draggedChip,
        plainTextContent: editorState.plainTextContent,
        chipData: editorState.chipData,
        colorAssignments: editorState.colorAssignments,

        // Ref Manager methods
        insertChip,
        convertSelectionToChip,
        applyStyle: handleStyleChange,
        getText,
        normalize: normalizeContent,
        updateContent: updatePlainTextContent,
        focus,

        // Event handlers
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver,
        handleDrop,
        handleStyleChange,
        updatePlainTextContent,
        normalizeContent,
        removeChipData: (chipId: string) => context.removeChipData(editorId, chipId),
        createNewChipData: (options) => context.createNewChipData(editorId, options),
    };
};

export type EditorHookResult = ReturnType<typeof useEditor>;
