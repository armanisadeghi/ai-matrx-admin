// useEditor.ts
import { useCallback, RefObject, useEffect } from 'react';
import {
    ensureValidContainer,
    extractTextContent,
    getSelectedText,
    insertWithRangeMethod,
    insertWithStructurePreservation,
    positionCursorAfterChip,
} from '../utils/editorUtils';
import { debugEditorState } from '../utils/debugUtils';
import { createCompleteChipStructure } from '../utils/chipService';
import { useEditorContext } from '../provider/EditorProvider';
import { useEditorStyles } from './useEditorStyles';
import { useDragAndDrop } from './useDragAndDrop';
import { ChipRequestOptions } from '../types/editor.types';

const DEBUG_MODE = false;

export const useEditor = (editorRef: RefObject<HTMLDivElement>, editorId: string) => {
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);
    const editor = editorRef.current;

    useEffect(() => {
        context.registerEditor(editorId);
        return () => context.unregisterEditor(editorId);
    }, [editorId]);

    const getText = useCallback(() => {
        return editorState.plainTextContent;
    }, [editorState.plainTextContent]);

    const focus = useCallback(() => {
        if (editor) {
            editor.focus();
        }
    }, [editorRef]);

    const updatePlainTextContent = useCallback(() => {
        if (!editor) return;
        const text = extractTextContent(editor);
        context.setPlainTextContent(editorId, text);
    }, [editorRef, editorId]);

    const normalizeContent = useCallback(() => {
        if (!editor) return;
        console.log('Normalizing content');
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);

        let node;
        while ((node = walker.nextNode())) {
            if (node.parentNode === editor) {
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

    const insertChip = useCallback(() => {
        const chipData = context.createNewChipData(editorId);
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
        createNewChipData: (options: ChipRequestOptions) => context.createNewChipData(editorId, options),
    };
};

export type EditorHookResult = ReturnType<typeof useEditor>;
